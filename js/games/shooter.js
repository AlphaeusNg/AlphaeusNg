(function (global) {
  "use strict";

  function mount(root, { onScore }) {
    root.innerHTML = `
      <div class="shooter-wrap">
        <div class="game-hud">
          <div><span class="hud-label">Score</span><strong id="sh-score">0</strong></div>
          <div><span class="hud-label">Lives</span><strong id="sh-lives">3</strong></div>
          <div><span class="hud-label">Wave</span><strong id="sh-wave">1</strong></div>
        </div>
        <canvas id="sh-canvas" width="420" height="520" aria-label="Space shooter"></canvas>
        <p class="game-hint">← → / A D move · Space / tap to shoot · P pause</p>
        <div class="game-actions">
          <button type="button" class="btn primary" id="sh-start">Launch</button>
        </div>
      </div>
    `;

    const canvas = root.querySelector("#sh-canvas");
    const ctx = canvas.getContext("2d");
    const scoreEl = root.querySelector("#sh-score");
    const livesEl = root.querySelector("#sh-lives");
    const waveEl = root.querySelector("#sh-wave");

    const W = canvas.width;
    const H = canvas.height;

    let ship, bullets, enemies, particles, keys, score, lives, wave, running, raf, last, spawnTimer, submitted;

    function init() {
      ship = { x: W / 2, y: H - 48, w: 28, h: 22, cool: 0 };
      bullets = [];
      enemies = [];
      particles = [];
      keys = {};
      score = 0;
      lives = 3;
      wave = 1;
      spawnTimer = 0;
      submitted = false;
      scoreEl.textContent = "0";
      livesEl.textContent = "3";
      waveEl.textContent = "1";
    }

    function spawnEnemy() {
      enemies.push({
        x: 30 + Math.random() * (W - 60),
        y: -20,
        w: 22 + Math.random() * 10,
        h: 18,
        vy: 1.2 + wave * 0.25 + Math.random(),
        hp: 1 + Math.floor(wave / 3),
        hue: 180 + Math.random() * 80,
      });
    }

    function burst(x, y, color, n = 10) {
      for (let i = 0; i < n; i++) {
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 30 + Math.random() * 20,
          color,
        });
      }
    }

    function drawShip() {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.fillStyle = "#2dd4bf";
      ctx.shadowColor = "#2dd4bf";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(0, -ship.h / 2);
      ctx.lineTo(ship.w / 2, ship.h / 2);
      ctx.lineTo(0, ship.h / 4);
      ctx.lineTo(-ship.w / 2, ship.h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function frame(ts) {
      if (!running) return;
      if (!last) last = ts;
      const dt = Math.min(32, ts - last) / 16.67;
      last = ts;

      // bg
      ctx.fillStyle = "#04070e";
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97 + ts * 0.02) % W;
        const sy = (i * 53 + ts * 0.08 * ((i % 3) + 1)) % H;
        ctx.fillStyle = `rgba(200,220,255,${0.15 + (i % 5) * 0.08})`;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // input
      if (keys["ArrowLeft"] || keys["a"]) ship.x -= 5.2 * dt;
      if (keys["ArrowRight"] || keys["d"]) ship.x += 5.2 * dt;
      ship.x = Math.max(18, Math.min(W - 18, ship.x));
      if (ship.cool > 0) ship.cool -= dt;
      if ((keys[" "] || keys["Space"]) && ship.cool <= 0) {
        bullets.push({ x: ship.x, y: ship.y - 16, vy: -9 });
        ship.cool = 8;
      }

      // spawn
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnEnemy();
        spawnTimer = Math.max(18, 55 - wave * 3);
      }
      if (score > 0 && score >= wave * 120) {
        wave += 1;
        waveEl.textContent = String(wave);
      }

      // bullets
      bullets = bullets.filter((b) => {
        b.y += b.vy * dt;
        ctx.fillStyle = "#fbbf24";
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x - 2, b.y, 4, 10);
        ctx.shadowBlur = 0;
        return b.y > -10;
      });

      // enemies
      enemies = enemies.filter((e) => {
        e.y += e.vy * dt;
        ctx.fillStyle = `hsl(${e.hue} 80% 55%)`;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
        ctx.shadowBlur = 0;

        // hit bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          if (Math.abs(b.x - e.x) < e.w / 2 && Math.abs(b.y - e.y) < e.h / 2) {
            bullets.splice(i, 1);
            e.hp -= 1;
            if (e.hp <= 0) {
              score += 10 * wave;
              scoreEl.textContent = String(score);
              burst(e.x, e.y, `hsl(${e.hue} 80% 60%)`);
              return false;
            }
          }
        }

        // hit ship
        if (
          Math.abs(e.x - ship.x) < (e.w + ship.w) / 2.4 &&
          Math.abs(e.y - ship.y) < (e.h + ship.h) / 2.4
        ) {
          lives -= 1;
          livesEl.textContent = String(lives);
          burst(ship.x, ship.y, "#fb7185", 16);
          if (lives <= 0) {
            endGame();
            return false;
          }
          return false;
        }

        return e.y < H + 30;
      });

      // particles
      particles = particles.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        ctx.globalAlpha = Math.max(0, p.life / 40);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 2, 2);
        ctx.globalAlpha = 1;
        return p.life > 0;
      });

      drawShip();
      raf = requestAnimationFrame(frame);
    }

    function endGame() {
      running = false;
      cancelAnimationFrame(raf);
      ctx.fillStyle = "rgba(4,7,14,0.72)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#e8eef9";
      ctx.font = "bold 26px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Ship Down", W / 2, H / 2 - 10);
      ctx.font = "14px JetBrains Mono, monospace";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`Final score ${score}`, W / 2, H / 2 + 20);
      if (!submitted && onScore) {
        submitted = true;
        onScore({ score });
      }
    }

    function start() {
      cancelAnimationFrame(raf);
      init();
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    }

    function onKeyDown(e) {
      keys[e.key] = true;
      keys[e.key.toLowerCase()] = true;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        keys[" "] = true;
        keys.Space = true;
      }
      if (e.key.toLowerCase() === "p" && running) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (e.key.toLowerCase() === "p" && !running && ship) {
        running = true;
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    }
    function onKeyUp(e) {
      keys[e.key] = false;
      keys[e.key.toLowerCase()] = false;
      if (e.key === " " || e.code === "Space") {
        keys[" "] = false;
        keys.Space = false;
      }
    }

    // mobile: tap to shoot, drag to move
    let dragging = false;
    canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      const r = canvas.getBoundingClientRect();
      ship.x = ((e.clientX - r.left) / r.width) * W;
      if (ship.cool <= 0) {
        bullets.push({ x: ship.x, y: ship.y - 16, vy: -9 });
        ship.cool = 8;
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging || !ship) return;
      const r = canvas.getBoundingClientRect();
      ship.x = ((e.clientX - r.left) / r.width) * W;
    });
    canvas.addEventListener("pointerup", () => {
      dragging = false;
    });

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    root.querySelector("#sh-start").addEventListener("click", start);

    init();
    ctx.fillStyle = "#04070e";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#93a4c3";
    ctx.font = "16px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Press Launch to begin", W / 2, H / 2);

    return {
      destroy() {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        root.innerHTML = "";
      },
    };
  }

  global.GameShooter = { mount };
})(window);
