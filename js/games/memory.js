(function (global) {
  "use strict";

  const LEVELS = [
    { pairs: 4, icons: ["🚀", "⭐", "🎮", "🧠"], label: "Lv1 · 4 pairs", flipMs: 700, cols: 4 },
    { pairs: 6, icons: ["🚀", "⭐", "🎮", "🧠", "⚡", "🐟"], label: "Lv2 · 6 pairs", flipMs: 600, cols: 4 },
    { pairs: 8, icons: ["🚀", "⭐", "🎮", "🧠", "⚡", "🐟", "🎯", "👾"], label: "Lv3 · 8 pairs", flipMs: 520, cols: 4 },
    {
      pairs: 10,
      icons: ["🚀", "⭐", "🎮", "🧠", "⚡", "🐟", "🎯", "👾", "🪐", "💎"],
      label: "Lv4 · 10 pairs",
      flipMs: 420,
      cols: 5,
    },
  ];

  function mount(root, { onScore }) {
    let level = 0;
    let maxOpen = 0;
    let cards = [];
    let flipped = [];
    let lock = false;
    let moves = 0;
    let matched = 0;
    let totalScore = 0;
    let submittedFinal = false;

    root.innerHTML = `
      <div class="memory-wrap">
        <div class="diff-bar" id="mem-levels"></div>
        <div class="game-hud">
          <div><span class="hud-label">Moves</span><strong id="mem-moves">0</strong></div>
          <div><span class="hud-label">Matched</span><strong id="mem-matched">0/4</strong></div>
          <div><span class="hud-label">Score</span><strong id="mem-score">0</strong></div>
        </div>
        <div class="mem-grid" id="mem-grid"></div>
        <p class="game-hint" id="mem-hint">Clear a board to open the next level.</p>
        <div class="game-actions">
          <button type="button" class="btn primary" id="mem-restart">Restart level</button>
        </div>
      </div>
    `;

    const grid = root.querySelector("#mem-grid");
    const movesEl = root.querySelector("#mem-moves");
    const matchedEl = root.querySelector("#mem-matched");
    const scoreEl = root.querySelector("#mem-score");
    const levelsEl = root.querySelector("#mem-levels");
    const hintEl = root.querySelector("#mem-hint");

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function paintLevels() {
      levelsEl.innerHTML = LEVELS.map((l, i) => {
        const locked = i > maxOpen;
        return `<button type="button" class="diff-chip${i === level ? " active" : ""}${locked ? " locked" : ""}" data-l="${i}" ${locked ? "disabled" : ""}>${i + 1}</button>`;
      }).join("");
      levelsEl.querySelectorAll("[data-l]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const i = Number(btn.dataset.l);
          if (i > maxOpen) return;
          level = i;
          ArcadeSFX?.click();
          startLevel();
        });
      });
    }

    function startLevel() {
      const L = LEVELS[level];
      cards = shuffle([...L.icons, ...L.icons]).map((icon, i) => ({
        id: i,
        icon,
        matched: false,
      }));
      flipped = [];
      lock = false;
      moves = 0;
      matched = 0;
      movesEl.textContent = "0";
      matchedEl.textContent = `0/${L.pairs}`;
      scoreEl.textContent = String(totalScore);
      hintEl.textContent = L.label;
      grid.style.gridTemplateColumns = `repeat(${L.cols}, 1fr)`;
      paintLevels();
      render();
    }

    function render() {
      grid.innerHTML = "";
      cards.forEach((c, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "mem-card" +
          (c.matched ? " matched" : "") +
          (flipped.includes(i) || c.matched ? " face-up" : "");
        btn.innerHTML = `<span class="mem-face">${c.matched || flipped.includes(i) ? c.icon : "?"}</span>`;
        btn.disabled = c.matched || lock;
        btn.addEventListener("click", () => flip(i));
        grid.appendChild(btn);
      });
    }

    function flip(i) {
      if (lock || cards[i].matched || flipped.includes(i)) return;
      ArcadeSFX?.flip();
      flipped.push(i);
      render();
      if (flipped.length < 2) return;

      moves += 1;
      movesEl.textContent = String(moves);
      const [a, b] = flipped;
      const L = LEVELS[level];

      if (cards[a].icon === cards[b].icon) {
        cards[a].matched = cards[b].matched = true;
        matched += 1;
        matchedEl.textContent = `${matched}/${L.pairs}`;
        flipped = [];
        ArcadeSFX?.match();
        render();

        if (matched === L.pairs) {
          const levelScore = Math.max(80, 500 - moves * 18 + L.pairs * 35);
          totalScore += levelScore;
          scoreEl.textContent = String(totalScore);
          ArcadeSFX?.win();

          if (level === LEVELS.length - 1) {
            hintEl.textContent = `All clear · ${totalScore} pts`;
            if (!submittedFinal) {
              submittedFinal = true;
              onScore?.({ score: totalScore, meta: { moves, level: level + 1 } });
            }
          } else {
            maxOpen = Math.max(maxOpen, level + 1);
            hintEl.textContent = `+${levelScore} · next level unlocked`;
            onScore?.({ score: totalScore, meta: { partial: true, level: level + 1 } });
            setTimeout(() => {
              level += 1;
              ArcadeSFX?.levelUp();
              startLevel();
            }, 650);
          }
          paintLevels();
        }
      } else {
        lock = true;
        setTimeout(() => {
          flipped = [];
          lock = false;
          render();
        }, L.flipMs);
      }
    }

    root.querySelector("#mem-restart").addEventListener("click", () => {
      ArcadeSFX?.click();
      startLevel();
    });

    startLevel();

    return {
      destroy() {
        root.innerHTML = "";
      },
    };
  }

  global.GameMemory = { mount };
})(window);
