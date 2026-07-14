(function (global) {
  "use strict";

  const ICONS = ["🚀", "⭐", "🎮", "🧠", "⚡", "🐟", "🎯", "👾"];

  function mount(root, { onScore }) {
    root.innerHTML = `
      <div class="memory-wrap">
        <div class="game-hud">
          <div><span class="hud-label">Moves</span><strong id="mem-moves">0</strong></div>
          <div><span class="hud-label">Matched</span><strong id="mem-matched">0/8</strong></div>
          <div><span class="hud-label">Score</span><strong id="mem-score">0</strong></div>
        </div>
        <div class="mem-grid" id="mem-grid"></div>
        <div class="game-actions">
          <button type="button" class="btn primary" id="mem-restart">New game</button>
        </div>
      </div>
    `;

    const grid = root.querySelector("#mem-grid");
    const movesEl = root.querySelector("#mem-moves");
    const matchedEl = root.querySelector("#mem-matched");
    const scoreEl = root.querySelector("#mem-score");

    let cards, flipped, lock, moves, matched, submitted;

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function start() {
      const deck = shuffle([...ICONS, ...ICONS]).map((icon, i) => ({
        id: i,
        icon,
        matched: false,
      }));
      cards = deck;
      flipped = [];
      lock = false;
      moves = 0;
      matched = 0;
      submitted = false;
      movesEl.textContent = "0";
      matchedEl.textContent = "0/8";
      scoreEl.textContent = "0";
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
      flipped.push(i);
      render();
      if (flipped.length < 2) return;

      moves += 1;
      movesEl.textContent = String(moves);
      const [a, b] = flipped;
      if (cards[a].icon === cards[b].icon) {
        cards[a].matched = cards[b].matched = true;
        matched += 1;
        matchedEl.textContent = `${matched}/8`;
        flipped = [];
        const score = Math.max(50, 800 - moves * 25 + matched * 40);
        scoreEl.textContent = String(score);
        render();
        if (matched === 8) {
          const finalScore = Math.max(100, 1000 - moves * 30);
          scoreEl.textContent = String(finalScore);
          if (!submitted && onScore) {
            submitted = true;
            onScore({ score: finalScore, meta: { moves } });
          }
        }
      } else {
        lock = true;
        setTimeout(() => {
          flipped = [];
          lock = false;
          render();
        }, 650);
      }
    }

    root.querySelector("#mem-restart").addEventListener("click", start);
    start();

    return {
      destroy() {
        root.innerHTML = "";
      },
    };
  }

  global.GameMemory = { mount };
})(window);
