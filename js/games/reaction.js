(function (global) {
  "use strict";

  function mount(root, { onScore }) {
    root.innerHTML = `
      <div class="reaction-wrap">
        <div class="game-hud">
          <div><span class="hud-label">Last</span><strong id="rx-last">—</strong></div>
          <div><span class="hud-label">Best</span><strong id="rx-best">—</strong></div>
          <div><span class="hud-label">Tries</span><strong id="rx-tries">0</strong></div>
        </div>
        <button type="button" class="rx-pad wait" id="rx-pad" aria-live="polite">
          <span id="rx-msg">Tap / click to start</span>
        </button>
        <p class="game-hint">Wait for green, then click ASAP. Early clicks = foul.</p>
      </div>
    `;

    const pad = root.querySelector("#rx-pad");
    const msg = root.querySelector("#rx-msg");
    const lastEl = root.querySelector("#rx-last");
    const bestEl = root.querySelector("#rx-best");
    const triesEl = root.querySelector("#rx-tries");

    let phase = "idle"; // idle | wait | go | result
    let timer = null;
    let startAt = 0;
    let tries = 0;

    const bestSaved = window.ArcadeScores?.getState()?.highScores?.reaction?.best;
    bestEl.textContent = bestSaved != null ? `${bestSaved} ms` : "—";

    function clearT() {
      if (timer) clearTimeout(timer);
      timer = null;
    }

    function setPhase(p, text, cls) {
      phase = p;
      msg.textContent = text;
      pad.className = "rx-pad " + cls;
    }

    function beginWait() {
      clearT();
      setPhase("wait", "Wait for green…", "wait");
      const delay = 1200 + Math.random() * 2800;
      timer = setTimeout(() => {
        startAt = performance.now();
        setPhase("go", "NOW!", "go");
      }, delay);
    }

    pad.addEventListener("click", () => {
      if (phase === "idle" || phase === "result") {
        beginWait();
        return;
      }
      if (phase === "wait") {
        clearT();
        setPhase("result", "Too soon! 😅 Tap to retry", "foul");
        return;
      }
      if (phase === "go") {
        const ms = Math.round(performance.now() - startAt);
        tries += 1;
        triesEl.textContent = String(tries);
        lastEl.textContent = `${ms} ms`;
        setPhase("result", `${ms} ms — ${rating(ms)}. Tap again!`, "result");
        if (onScore) onScore({ score: ms });
        const b = window.ArcadeScores?.getState()?.highScores?.reaction?.best;
        bestEl.textContent = b != null ? `${b} ms` : "—";
      }
    });

    function rating(ms) {
      if (ms < 180) return "alien reflexes";
      if (ms < 230) return "blazing";
      if (ms < 280) return "solid";
      if (ms < 350) return "human";
      return "warmup lap";
    }

    return {
      destroy() {
        clearT();
        root.innerHTML = "";
      },
    };
  }

  global.GameReaction = { mount };
})(window);
