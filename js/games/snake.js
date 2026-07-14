(function (global) {
  "use strict";

  function mount(root, { onScore }) {
    root.innerHTML = `
      <div class="snake-wrap">
        <div class="game-hud">
          <div><span class="hud-label">Score</span><strong id="snake-score">0</strong></div>
          <div><span class="hud-label">Best</span><strong id="snake-best">0</strong></div>
          <div><span class="hud-label">Speed</span><strong id="snake-speed">1</strong></div>
        </div>
        <canvas id="snake-canvas" width="360" height="360" aria-label="Snake game"></canvas>
        <p class="game-hint">Arrows / WASD · swipe on mobile · pause: P</p>
        <div class="game-actions">
          <button type="button" class="btn primary" id="snake-start">Start / Restart</button>
        </div>
      </div>
    `;

    const canvas = root.querySelector("#snake-canvas");
    const ctx = canvas.getContext("2d");
    const scoreEl = root.querySelector("#snake-score");
    const bestEl = root.querySelector("#snake-best");
    const speedEl = root.querySelector("#snake-speed");

    const COLS = 18;
    const ROWS = 18;
    const cell = canvas.width / COLS;

    let snake, dir, nextDir, food, score, running, tickMs, timer, submitted;

    const bestSaved = window.ArcadeScores?.getState()?.highScores?.snake?.best || 0;
    bestEl.textContent = String(bestSaved);

    function reset() {
      snake = [
        { x: 8, y: 9 },
        { x: 7, y: 9 },
        { x: 6, y: 9 },
      ];
      dir = { x: 1, y: 0 };
      nextDir = { ...dir };
      score = 0;
      tickMs = 140;
      submitted = false;
      placeFood();
      scoreEl.textContent = "0";
      speedEl.textContent = "1";
    }

    function placeFood() {
      do {
        food = {
          x: Math.floor(Math.random() * COLS),
          y: Math.floor(Math.random() * ROWS),
        };
      } while (snake.some((s) => s.x === food.x && s.y === food.y));
    }

    function draw() {
      ctx.fillStyle = "#060b14";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // grid
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
      // food
      ctx.fillStyle = "#fb7185";
      ctx.shadowColor = "#fb7185";
      ctx.shadowBlur = 12;
      ctx.fillRect(food.x * cell + 2, food.y * cell + 2, cell - 4, cell - 4);
      ctx.shadowBlur = 0;
      // snake
      snake.forEach((s, i) => {
        const t = i / snake.length;
        ctx.fillStyle = i === 0 ? "#2dd4bf" : `rgba(56,189,248,${1 - t * 0.6})`;
        ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
      });
    }

    function step() {
      if (!running) return;
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (
        head.x < 0 ||
        head.y < 0 ||
        head.x >= COLS ||
        head.y >= ROWS ||
        snake.some((s) => s.x === head.x && s.y === head.y)
      ) {
        gameOver();
        return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = String(score);
        if (score % 50 === 0) {
          tickMs = Math.max(60, tickMs - 12);
          speedEl.textContent = String(Math.round((140 / tickMs) * 10) / 10);
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
      ctx.fillStyle = "rgba(5,8,15,0.65)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#e8eef9";
      ctx.font = "bold 22px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 8);
      ctx.font = "14px JetBrains Mono, monospace";
      ctx.fillStyle = "#2dd4bf";
      ctx.fillText(`Score ${score}`, canvas.width / 2, canvas.height / 2 + 18);
      if (!submitted && onScore) {
        submitted = true;
        onScore({ score });
        const b = window.ArcadeScores?.getState()?.highScores?.snake?.best || score;
        bestEl.textContent = String(b);
      }
    }

    function start() {
      clearInterval(timer);
      reset();
      running = true;
      draw();
      timer = setInterval(step, tickMs);
    }

    function setDir(nx, ny) {
      if (dir.x === -nx && dir.y === -ny) return;
      nextDir = { x: nx, y: ny };
    }

    function onKey(e) {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "p"].includes(k) || e.key.startsWith("Arrow")) {
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

    // touch swipe
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
