(function (global) {
  "use strict";

  function mount(root, { onScore }) {
    root.innerHTML = `
      <div class="snake-wrap">
        <div class="game-hud">
          <div><span class="hud-label">Score</span><strong id="snake-score">0</strong></div>
          <div><span class="hud-label">Level</span><strong id="snake-level">1</strong></div>
          <div><span class="hud-label">Best</span><strong id="snake-best">0</strong></div>
        </div>
        <canvas id="snake-canvas" width="360" height="360" aria-label="Snake game"></canvas>
        <p class="game-hint" id="snake-hint">Arrows / WASD · swipe · P pause · food raises level</p>
        <div class="game-actions">
          <button type="button" class="btn primary" id="snake-start">Start / Restart</button>
        </div>
      </div>
    `;

    const canvas = root.querySelector("#snake-canvas");
    const ctx = canvas.getContext("2d");
    const scoreEl = root.querySelector("#snake-score");
    const bestEl = root.querySelector("#snake-best");
    const levelEl = root.querySelector("#snake-level");
    const hintEl = root.querySelector("#snake-hint");

    const COLS = 18;
    const ROWS = 18;
    const cell = canvas.width / COLS;

    let snake, dir, nextDir, food, hazards, score, level, foodsThisLevel, running, tickMs, timer, submitted;

    bestEl.textContent = String(window.ArcadeScores?.getState()?.highScores?.snake?.best || 0);

    function levelConfig(lv) {
      return {
        tick: Math.max(48, 150 - (lv - 1) * 10),
        need: 3 + Math.floor((lv - 1) / 1),
        hazards: Math.min(10, Math.floor((lv - 1) / 2)),
        wrap: lv < 4, // early levels wrap edges; later = solid walls
        bonus: 10 + (lv - 1) * 4,
      };
    }

    function reset() {
      snake = [
        { x: 8, y: 9 },
        { x: 7, y: 9 },
        { x: 6, y: 9 },
      ];
      dir = { x: 1, y: 0 };
      nextDir = { ...dir };
      score = 0;
      level = 1;
      foodsThisLevel = 0;
      hazards = [];
      submitted = false;
      const cfg = levelConfig(level);
      tickMs = cfg.tick;
      placeFood();
      scoreEl.textContent = "0";
      levelEl.textContent = "1";
      hintEl.textContent = cfg.wrap
        ? "Eat green food · avoid red ✕ spikes"
        : "Solid walls · eat green · avoid red ✕";
    }

    function occupied(x, y) {
      return snake.some((s) => s.x === x && s.y === y) || hazards.some((h) => h.x === x && h.y === y);
    }

    function placeFood() {
      let tries = 0;
      do {
        food = {
          x: Math.floor(Math.random() * COLS),
          y: Math.floor(Math.random() * ROWS),
        };
        tries++;
      } while (occupied(food.x, food.y) && tries < 80);
    }

    function rebuildHazards(count) {
      hazards = [];
      let tries = 0;
      while (hazards.length < count && tries < 200) {
        tries++;
        const h = {
          x: Math.floor(Math.random() * COLS),
          y: Math.floor(Math.random() * ROWS),
        };
        // keep spawn corridor free
        if (h.y === 9 && h.x >= 5 && h.x <= 10) continue;
        if (occupied(h.x, h.y) || (food && food.x === h.x && food.y === h.y)) continue;
        hazards.push(h);
      }
    }

    function draw() {
      const cfg = levelConfig(level);
      ctx.fillStyle = "#060b14";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(45,212,191,0.06)";
      for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cell, 0);
        ctx.lineTo(i * cell, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cell);
        ctx.lineTo(canvas.width, i * cell);
        ctx.stroke();
      }
      // hazards — clear danger tiles (do NOT hit)
      const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 180);
      hazards.forEach((h) => {
        const x = h.x * cell;
        const y = h.y * cell;
        const pad = 1.5;
        const s = cell - pad * 2;

        // outer danger glow
        ctx.shadowColor = `rgba(251, 50, 50, ${0.45 + pulse * 0.35})`;
        ctx.shadowBlur = 10 + pulse * 6;
        ctx.fillStyle = "#450a0a";
        ctx.fillRect(x + pad, y + pad, s, s);
        ctx.shadowBlur = 0;

        // hazard body: red base
        const g = ctx.createLinearGradient(x, y, x + cell, y + cell);
        g.addColorStop(0, "#ef4444");
        g.addColorStop(0.5, "#b91c1c");
        g.addColorStop(1, "#7f1d1d");
        ctx.fillStyle = g;
        ctx.fillRect(x + pad, y + pad, s, s);

        // yellow/black warning stripes
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + pad, y + pad, s, s);
        ctx.clip();
        ctx.strokeStyle = `rgba(250, 204, 21, ${0.55 + pulse * 0.35})`;
        ctx.lineWidth = 3;
        for (let d = -cell; d < cell * 2; d += 5) {
          ctx.beginPath();
          ctx.moveTo(x + d, y);
          ctx.lineTo(x + d + cell, y + cell);
          ctx.stroke();
        }
        ctx.restore();

        // thick red border
        ctx.strokeStyle = "#fca5a5";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + pad + 0.5, y + pad + 0.5, s - 1, s - 1);

        // big "✕" so it's obvious: do not touch
        ctx.fillStyle = "#fff7ed";
        ctx.font = `bold ${Math.floor(cell * 0.62)}px Outfit, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.65)";
        ctx.shadowBlur = 4;
        ctx.fillText("✕", x + cell / 2, y + cell / 2 + 0.5);
        ctx.shadowBlur = 0;
      });

      // food — clearly edible (green, not danger-red)
      const fx = food.x * cell + 3;
      const fy = food.y * cell + 3;
      const fs = cell - 6;
      ctx.shadowColor = "#4ade80";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(fx, fy, fs, fs);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#bbf7d0";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(fx + 0.5, fy + 0.5, fs - 1, fs - 1);
      ctx.fillStyle = "#ecfdf5";
      ctx.beginPath();
      ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell * 0.18, 0, Math.PI * 2);
      ctx.fill();
      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? "#2dd4bf" : `rgba(56,189,248,${1 - (i / snake.length) * 0.6})`;
        ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
      });
      if (!cfg.wrap) {
        ctx.strokeStyle = "rgba(251,113,133,0.45)";
        ctx.lineWidth = 3;
        ctx.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3);
      }
    }

    function step() {
      if (!running) return;
      const cfg = levelConfig(level);
      dir = nextDir;
      let head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      if (cfg.wrap) {
        head.x = (head.x + COLS) % COLS;
        head.y = (head.y + ROWS) % ROWS;
      } else if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
        gameOver();
        return;
      }

      if (snake.some((s) => s.x === head.x && s.y === head.y) || hazards.some((h) => h.x === head.x && h.y === head.y)) {
        gameOver();
        return;
      }

      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        ArcadeSFX?.eat();
        score += cfg.bonus;
        foodsThisLevel += 1;
        scoreEl.textContent = String(score);
        if (foodsThisLevel >= cfg.need) {
          level += 1;
          foodsThisLevel = 0;
          const next = levelConfig(level);
          tickMs = next.tick;
          rebuildHazards(next.hazards);
          levelEl.textContent = String(level);
          hintEl.textContent = next.wrap
            ? `Level ${level} · wrap on · avoid red ✕ spikes (${next.hazards})`
            : `Level ${level} · solid walls · avoid red ✕ spikes (${next.hazards})`;
          ArcadeSFX?.levelUp();
          clearInterval(timer);
          timer = setInterval(step, tickMs);
        }
        placeFood();
      } else {
        snake.pop();
      }
      draw();
    }

    function gameOver() {
      running = false;
      clearInterval(timer);
      ArcadeSFX?.lose();
      ctx.fillStyle = "rgba(5,8,15,0.65)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#e8eef9";
      ctx.font = "bold 22px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 12);
      ctx.font = "14px JetBrains Mono, monospace";
      ctx.fillStyle = "#2dd4bf";
      ctx.fillText(`Score ${score} · Lv ${level}`, canvas.width / 2, canvas.height / 2 + 16);
      if (!submitted && onScore) {
        submitted = true;
        onScore({ score, meta: { level } });
        bestEl.textContent = String(window.ArcadeScores?.getState()?.highScores?.snake?.best || score);
      }
    }

    function start() {
      clearInterval(timer);
      ArcadeSFX?.unlock();
      ArcadeSFX?.click();
      reset();
      running = true;
      draw();
      timer = setInterval(step, tickMs);
    }

    function setDir(nx, ny) {
      if (dir.x === -nx && dir.y === -ny) return;
      nextDir = { x: nx, y: ny };
      ArcadeSFX?.move();
    }

    function onKey(e) {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "p"].includes(k)) {
        e.preventDefault();
      }
      if (k === "arrowup" || k === "w") setDir(0, -1);
      if (k === "arrowdown" || k === "s") setDir(0, 1);
      if (k === "arrowleft" || k === "a") setDir(-1, 0);
      if (k === "arrowright" || k === "d") setDir(1, 0);
      if (k === "p") {
        if (running) {
          running = false;
          clearInterval(timer);
        } else if (snake) {
          running = true;
          timer = setInterval(step, tickMs);
        }
      }
    }

    let touchStart = null;
    function onTouchStart(e) {
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    }
    function onTouchEnd(e) {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
      else setDir(0, dy > 0 ? 1 : -1);
      touchStart = null;
    }

    window.addEventListener("keydown", onKey);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });
    root.querySelector("#snake-start").addEventListener("click", start);

    reset();
    draw();

    return {
      destroy() {
        running = false;
        clearInterval(timer);
        window.removeEventListener("keydown", onKey);
        root.innerHTML = "";
      },
    };
  }

  global.GameSnake = { mount };
})(window);
