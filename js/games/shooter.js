(function (global) {
  "use strict";

  function mount(root, { onScore }) {
    root.innerHTML = `
      <div class="shooter-wrap">
        <div class="game-hud">
          <div><span class="hud-label">Score</span><strong id="sh-score">0</strong></div>
          <div><span class="hud-label">Lives</span><strong id="sh-lives" class="sh-lives">3</strong></div>
          <div><span class="hud-label">Wave</span><strong id="sh-wave">1</strong></div>
        </div>
        <div class="sh-stage">
          <canvas id="sh-canvas" width="420" height="520" aria-label="Space shooter"></canvas>
          <div class="sh-hit-flash" id="sh-hit-flash" hidden aria-hidden="true"></div>
          <div class="sh-life-banner" id="sh-life-banner" hidden aria-live="assertive">
            <span class="sh-life-banner-main">LIFE LOST</span>
            <span class="sh-life-banner-sub" id="sh-life-banner-sub">−1</span>
          </div>
        </div>
        <p class="game-hint" id="sh-hint">← → / A D or drag · auto-fire · P pause</p>
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
    const hintEl = root.querySelector("#sh-hint");
    const hitFlashEl = root.querySelector("#sh-hit-flash");
    const lifeBannerEl = root.querySelector("#sh-life-banner");
    const lifeBannerSub = root.querySelector("#sh-life-banner-sub");

    const W = canvas.width;
    const H = canvas.height;

    let ship,
      bullets,
      eBullets,
      enemies,
      particles,
      keys,
      score,
      lives,
      wave,
      running,
      raf,
      last,
      spawnTimer,
      submitted,
      waveAnnounce,
      invuln,
      hitAnim,
      hitBannerTimer;

    function waveMods(w) {
      return {
        spawnEvery: Math.max(12, 52 - w * 3.2),
        enemySpeed: 1.15 + w * 0.28,
        enemyHp: 1 + Math.floor((w - 1) / 2),
        zig: w >= 3,
        shooters: w >= 4,
        shootRate: Math.max(40, 110 - w * 6),
        swarm: w >= 6,
      };
    }

    function init() {
      ship = { x: W / 2, y: H - 48, w: 28, h: 22, cool: 0 };
      bullets = [];
      eBullets = [];
      enemies = [];
      particles = [];
      keys = {};
      score = 0;
      lives = 3;
      wave = 1;
      spawnTimer = 0;
      submitted = false;
      waveAnnounce = 90;
      invuln = 0;
      hitAnim = 0;
      clearTimeout(hitBannerTimer);
      hitFlashEl.hidden = true;
      lifeBannerEl.hidden = true;
      livesEl.classList.remove("lost");
      scoreEl.textContent = "0";
      livesEl.textContent = "3";
      waveEl.textContent = "1";
      hintEl.textContent = "Wave 1 — warm-up · auto-fire on";
    }

    function spawnEnemy() {
      const m = waveMods(wave);
      const kind = m.shooters && Math.random() < 0.35 ? "shooter" : m.swarm && Math.random() < 0.4 ? "swarm" : "grunt";
      enemies.push({
        x: 30 + Math.random() * (W - 60),
        y: -20,
        w: kind === "swarm" ? 14 : 22 + Math.random() * 10,
        h: kind === "swarm" ? 14 : 18,
        vy: m.enemySpeed * (kind === "swarm" ? 1.35 : 1) + Math.random() * 0.5,
        vx: m.zig ? (Math.random() < 0.5 ? -1 : 1) * (0.8 + wave * 0.1) : 0,
        hp: kind === "shooter" ? m.enemyHp + 1 : m.enemyHp,
        kind,
        hue: kind === "shooter" ? 320 : kind === "swarm" ? 45 : 180 + Math.random() * 60,
        cool: 20 + Math.random() * 40,
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
      // Blink while invulnerable after a hit
      if (invuln > 0 && Math.floor(invuln / 4) % 2 === 0) return;

      ctx.save();
      ctx.translate(ship.x, ship.y);
      if (hitAnim > 0) {
        const shake = Math.sin(hitAnim * 1.8) * 4;
        ctx.translate(shake, 0);
        ctx.fillStyle = "#fb7185";
        ctx.shadowColor = "#fb7185";
        ctx.shadowBlur = 22;
      } else {
        ctx.fillStyle = "#2dd4bf";
        ctx.shadowColor = "#2dd4bf";
        ctx.shadowBlur = 14;
      }
      ctx.beginPath();
      ctx.moveTo(0, -ship.h / 2);
      ctx.lineTo(ship.w / 2, ship.h / 2);
      ctx.lineTo(0, ship.h / 4);
      ctx.lineTo(-ship.w / 2, ship.h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function playHitFeedback() {
      // Full-screen red flash + banner over the canvas
      hitFlashEl.hidden = false;
      hitFlashEl.classList.remove("play");
      // reflow so animation restarts
      void hitFlashEl.offsetWidth;
      hitFlashEl.classList.add("play");

      lifeBannerSub.textContent = lives > 0 ? `${lives} left` : "LAST CHANCE…";
      if (lives <= 0) lifeBannerSub.textContent = "0 left";
      lifeBannerEl.querySelector(".sh-life-banner-main").textContent =
        lives > 0 ? "LIFE LOST" : "SHIP DOWN";
      lifeBannerEl.hidden = false;
      lifeBannerEl.classList.remove("play");
      void lifeBannerEl.offsetWidth;
      lifeBannerEl.classList.add("play");

      livesEl.classList.remove("lost");
      void livesEl.offsetWidth;
      livesEl.classList.add("lost");

      clearTimeout(hitBannerTimer);
      hitBannerTimer = setTimeout(() => {
        hitFlashEl.hidden = true;
        hitFlashEl.classList.remove("play");
        lifeBannerEl.hidden = true;
        lifeBannerEl.classList.remove("play");
        livesEl.classList.remove("lost");
      }, 900);
    }

    function maybeAdvanceWave() {
      const threshold = wave * 100 + (wave - 1) * 40;
      if (score >= threshold) {
        wave += 1;
        waveEl.textContent = String(wave);
        waveAnnounce = 80;
        ArcadeSFX?.levelUp();
        const m = waveMods(wave);
        const bits = [];
        if (m.zig) bits.push("zigzag");
        if (m.shooters) bits.push("shooters");
        if (m.swarm) bits.push("swarm");
        hintEl.textContent = `Wave ${wave}${bits.length ? " · " + bits.join(" · ") : ""}`;
      }
    }

    function frame(ts) {
      if (!running) return;
      if (!last) last = ts;
      const dt = Math.min(32, ts - last) / 16.67;
      last = ts;
      const m = waveMods(wave);

      ctx.fillStyle = "#04070e";
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97 + ts * 0.02) % W;
        const sy = (i * 53 + ts * 0.08 * ((i % 3) + 1)) % H;
        ctx.fillStyle = `rgba(200,220,255,${0.15 + (i % 5) * 0.08})`;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      if (invuln > 0) invuln -= dt;
      if (hitAnim > 0) hitAnim -= dt;

      if (keys.ArrowLeft || keys.a) ship.x -= (5.2 + wave * 0.08) * dt;
      if (keys.ArrowRight || keys.d) ship.x += (5.2 + wave * 0.08) * dt;
      ship.x = Math.max(18, Math.min(W - 18, ship.x));

      // Auto-fire
      if (ship.cool > 0) ship.cool -= dt;
      if (ship.cool <= 0 && invuln < 35) {
        bullets.push({ x: ship.x, y: ship.y - 16, vy: -9.5 });
        ship.cool = Math.max(5.5, 10 - wave * 0.2);
        ArcadeSFX?.shoot();
      }

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnEnemy();
        if (m.swarm && Math.random() < 0.4) spawnEnemy();
        spawnTimer = m.spawnEvery;
      }

      bullets = bullets.filter((b) => {
        b.y += b.vy * dt;
        ctx.fillStyle = "#fbbf24";
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x - 2, b.y, 4, 10);
        ctx.shadowBlur = 0;
        return b.y > -10;
      });

      eBullets = eBullets.filter((b) => {
        b.y += b.vy * dt;
        b.x += (b.vx || 0) * dt;
        ctx.fillStyle = "#fb7185";
        ctx.fillRect(b.x - 2, b.y, 4, 8);
        if (invuln <= 0 && Math.abs(b.x - ship.x) < 14 && Math.abs(b.y - ship.y) < 14) {
          hurt();
          return false;
        }
        return b.y < H + 20;
      });

      enemies = enemies.filter((e) => {
        e.y += e.vy * dt;
        e.x += e.vx * dt;
        if (e.x < 16 || e.x > W - 16) e.vx *= -1;
        e.cool -= dt;
        if (e.kind === "shooter" && e.cool <= 0 && e.y > 20 && e.y < H * 0.7) {
          eBullets.push({
            x: e.x,
            y: e.y + e.h / 2,
            vy: 3.2 + wave * 0.15,
            vx: (ship.x - e.x) * 0.01,
          });
          e.cool = m.shootRate;
          ArcadeSFX?.tick();
        }

        ctx.fillStyle = `hsl(${e.hue} 80% 55%)`;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
        ctx.shadowBlur = 0;

        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          if (Math.abs(b.x - e.x) < e.w / 2 && Math.abs(b.y - e.y) < e.h / 2) {
            bullets.splice(i, 1);
            e.hp -= 1;
            ArcadeSFX?.hit();
            if (e.hp <= 0) {
              score += 10 * wave + (e.kind === "shooter" ? 15 : 0);
              scoreEl.textContent = String(score);
              burst(e.x, e.y, `hsl(${e.hue} 80% 60%)`);
              ArcadeSFX?.explode();
              maybeAdvanceWave();
              return false;
            }
          }
        }

        if (
          invuln <= 0 &&
          Math.abs(e.x - ship.x) < (e.w + ship.w) / 2.4 &&
          Math.abs(e.y - ship.y) < (e.h + ship.h) / 2.4
        ) {
          hurt();
          burst(e.x, e.y, "#fb7185", 12);
          return false;
        }

        return e.y < H + 30;
      });

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

      // Canvas-side hit pulse ring
      if (hitAnim > 0) {
        const t = hitAnim / 45;
        ctx.strokeStyle = `rgba(251,113,133,${t})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, 20 + (1 - t) * 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(251,113,133,${0.12 * t})`;
        ctx.fillRect(0, 0, W, H);
      }

      if (waveAnnounce > 0) {
        waveAnnounce -= dt;
        ctx.fillStyle = `rgba(45,212,191,${Math.min(1, waveAnnounce / 40)})`;
        ctx.font = "bold 28px Outfit, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`WAVE ${wave}`, W / 2, H * 0.35);
      }

      raf = requestAnimationFrame(frame);
    }

    function hurt() {
      if (invuln > 0 || !running) return;
      lives -= 1;
      livesEl.textContent = String(lives);
      invuln = 70; // brief i-frames so one collision ≠ multi-death
      hitAnim = 45;
      ArcadeSFX?.explode();
      burst(ship.x, ship.y, "#fb7185", 28);
      burst(ship.x, ship.y, "#fbbf24", 14);
      playHitFeedback();
      // clear nearby enemy bullets so you can recover
      eBullets = eBullets.filter(
        (b) => Math.hypot(b.x - ship.x, b.y - ship.y) > 60
      );
      if (lives <= 0) {
        // short beat so the animation is readable, then game over
        setTimeout(() => {
          if (lives <= 0) endGame();
        }, 650);
      }
    }

    function endGame() {
      running = false;
      cancelAnimationFrame(raf);
      ArcadeSFX?.lose();
      ctx.fillStyle = "rgba(4,7,14,0.72)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#e8eef9";
      ctx.font = "bold 26px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Ship Down", W / 2, H / 2 - 10);
      ctx.font = "14px JetBrains Mono, monospace";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`Score ${score} · Wave ${wave}`, W / 2, H / 2 + 20);
      if (!submitted && onScore) {
        submitted = true;
        onScore({ score, meta: { wave } });
      }
    }

    function start() {
      cancelAnimationFrame(raf);
      ArcadeSFX?.unlock();
      ArcadeSFX?.click();
      init();
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    }

    function onKeyDown(e) {
      keys[e.key] = true;
      keys[e.key.toLowerCase()] = true;
      if (e.key === " " || e.code === "Space") e.preventDefault();
      if (e.key.toLowerCase() === "p" && running) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (e.key.toLowerCase() === "p" && !running && ship && lives > 0) {
        running = true;
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    }
    function onKeyUp(e) {
      keys[e.key] = false;
      keys[e.key.toLowerCase()] = false;
    }

    let dragging = false;
    canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      canvas.setPointerCapture?.(e.pointerId);
      const r = canvas.getBoundingClientRect();
      if (ship) ship.x = ((e.clientX - r.left) / r.width) * W;
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging || !ship) return;
      const r = canvas.getBoundingClientRect();
      ship.x = ((e.clientX - r.left) / r.width) * W;
    });
    canvas.addEventListener("pointerup", () => {
      dragging = false;
    });
    canvas.addEventListener("pointercancel", () => {
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
    ctx.fillText("Press Launch", W / 2, H / 2);

    return {
      destroy() {
        running = false;
        cancelAnimationFrame(raf);
        clearTimeout(hitBannerTimer);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        root.innerHTML = "";
      },
    };
  }

  global.GameShooter = { mount };
})(window);
