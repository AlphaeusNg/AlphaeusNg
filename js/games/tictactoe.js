(function (global) {
  "use strict";

  const WINS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  function empty() {
    return Array(9).fill(null);
  }

  function winner(board) {
    for (const [a, b, c] of WINS) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { player: board[a], line: [a, b, c] };
      }
    }
    if (board.every(Boolean)) return { player: "draw", line: [] };
    return null;
  }

  function minimax(board, isMax) {
    const w = winner(board);
    if (w) {
      if (w.player === "O") return { score: 10 };
      if (w.player === "X") return { score: -10 };
      return { score: 0 };
    }
    let best = isMax ? { score: -Infinity } : { score: Infinity };
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      board[i] = isMax ? "O" : "X";
      const result = minimax(board, !isMax);
      board[i] = null;
      result.index = i;
      if (isMax) {
        if (result.score > best.score) best = result;
      } else if (result.score < best.score) {
        best = result;
      }
    }
    return best;
  }

  function mount(root, { onScore }) {
    let board = empty();
    let locked = false;
    let streak = 0;

    root.innerHTML = `
      <div class="ttt-wrap">
        <div class="game-hud">
          <div><span class="hud-label">You</span><strong id="ttt-you">X</strong></div>
          <div><span class="hud-label">Streak</span><strong id="ttt-streak">0</strong></div>
          <div><span class="hud-label">AI</span><strong id="ttt-ai">O</strong></div>
        </div>
        <p class="game-status" id="ttt-status">Your move — beat the perfect AI if you can</p>
        <div class="ttt-board" id="ttt-board" role="grid" aria-label="Tic tac toe board"></div>
        <div class="game-actions">
          <button type="button" class="btn ghost" id="ttt-reset">New round</button>
        </div>
      </div>
    `;

    const boardEl = root.querySelector("#ttt-board");
    const statusEl = root.querySelector("#ttt-status");
    const streakEl = root.querySelector("#ttt-streak");

    function render() {
      boardEl.innerHTML = "";
      board.forEach((cell, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ttt-cell" + (cell ? ` filled ${cell.toLowerCase()}` : "");
        btn.textContent = cell || "";
        btn.disabled = !!cell || locked;
        btn.setAttribute("aria-label", `Cell ${i + 1}`);
        btn.addEventListener("click", () => play(i));
        boardEl.appendChild(btn);
      });
    }

    function endRound(result) {
      locked = true;
      let msg = "";
      let scoreResult = result;
      if (result === "win") {
        streak += 1;
        msg = `You win! 🎉 Streak ×${streak}`;
      } else if (result === "draw") {
        streak = 0;
        msg = "Draw — solid defense.";
      } else {
        streak = 0;
        msg = "AI wins. Rematch?";
      }
      streakEl.textContent = String(streak);
      statusEl.textContent = msg;
      if (onScore) {
        onScore({
          score: result === "win" ? streak : 0,
          result: scoreResult,
          meta: { streak },
        });
      }
    }

    function play(i) {
      if (locked || board[i]) return;
      board[i] = "X";
      render();
      let w = winner(board);
      if (w) {
        if (w.player === "X") endRound("win");
        else if (w.player === "draw") endRound("draw");
        else endRound("loss");
        highlight(w.line);
        return;
      }
      locked = true;
      statusEl.textContent = "AI thinking…";
      setTimeout(() => {
        const move = minimax([...board], true);
        if (move.index != null) board[move.index] = "O";
        locked = false;
        render();
        w = winner(board);
        if (w) {
          if (w.player === "O") endRound("loss");
          else if (w.player === "draw") endRound("draw");
          highlight(w.line);
        } else {
          statusEl.textContent = "Your move";
        }
      }, 280);
    }

    function highlight(line) {
      if (!line?.length) return;
      [...boardEl.children].forEach((el, i) => {
        if (line.includes(i)) el.classList.add("win");
      });
    }

    function reset() {
      board = empty();
      locked = false;
      statusEl.textContent = "Your move";
      render();
    }

    root.querySelector("#ttt-reset").addEventListener("click", reset);
    render();

    return {
      destroy() {
        root.innerHTML = "";
      },
    };
  }

  global.GameTicTacToe = { mount };
})(window);
