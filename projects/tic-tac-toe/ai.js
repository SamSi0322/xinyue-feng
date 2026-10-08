/*
 * ai.js — the "AI" half of Play with AI.
 *
 * Pure functions only: no DOM, no globals, no side effects. The browser game
 * (script.js) and the test suite (tests/ai.test.js) import exactly this code.
 *
 * A board is an array of 9 cells, each "X", "O" or "" (empty):
 *
 *      0 | 1 | 2
 *     ---+---+---
 *      3 | 4 | 5
 *     ---+---+---
 *      6 | 7 | 8
 *
 * Three opponents:
 *   easy   → easyMove       mostly random, sometimes spots a win
 *   medium → ruleBasedMove  Lily's original Unit 10 algorithm, unchanged
 *   hard   → minimaxMove    searches the whole game tree and never loses
 *
 * Every move function returns a cell index (0–8), or -1 if no move is left.
 * Functions that choose at random take an optional `random` function
 * (Math.random by default) so the tests can make them repeatable.
 */

export const EMPTY = "";

export const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

/* ---------- Board helpers ------------------------------------------------ */

/** "X" ↔ "O". */
export function otherPlayer(player) {
  return player === "X" ? "O" : "X";
}

/** Indices of the empty cells, in board order. */
export function emptyCells(board) {
  return board
    .map((value, index) => (value === EMPTY ? index : null))
    .filter(value => value !== null);
}

/**
 * Who has three in a row, and where: { player, line } or null.
 * (If one move completes two lines at once, the first in WINNING_LINES wins.)
 */
export function getWinner(board) {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] !== EMPTY && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a], line: line.slice() };
    }
  }
  return null;
}

/** Every cell is filled and nobody has three in a row. */
export function isDraw(board) {
  return board.every(cell => cell !== EMPTY) && getWinner(board) === null;
}

/** The round is over: somebody won, or the board is full. */
export function isGameOver(board) {
  return getWinner(board) !== null || board.every(cell => cell !== EMPTY);
}

/** Lily's original win check; the only change is that the board is passed in. */
export function checkWinner(board, player) {
  return WINNING_LINES.some(condition => {
    return condition.every(index => board[index] === player);
  });
}

/** First empty cell (in board order) that completes a line for `player`, or -1. */
export function findWinningMove(board, player) {
  const test = board.slice();
  for (const index of emptyCells(board)) {
    test[index] = player;
    const wins = checkWinner(test, player);
    test[index] = EMPTY;
    if (wins) {
      return index;
    }
  }
  return -1;
}

function pick(options, random) {
  const i = Math.floor(random() * options.length);
  return options[Math.min(Math.max(i, 0), options.length - 1)];
}

/* ---------- Easy: mostly random ------------------------------------------ */

/** How often Easy bothers to look for a move that wins on the spot. */
export const EASY_WIN_CHANCE = 0.5;

/**
 * EASY — plays a random empty cell. About half the time it first checks for
 * a move that wins immediately and takes it, so it still pounces now and then.
 * It never blocks you.
 */
export function easyMove(board, aiPlayer = "O", random = Math.random) {
  const free = emptyCells(board);
  if (free.length === 0) {
    return -1;
  }
  if (random() < EASY_WIN_CHANCE) {
    const win = findWinningMove(board, aiPlayer);
    if (win !== -1) {
      return win;
    }
  }
  return pick(free, random);
}

/* ---------- Medium: Lily's original rule-based AI ------------------------ */

/**
 * MEDIUM — the original Unit 10 algorithm.
 *
 * This is getBestMove() from Lily's Unit 10 AS1 "Play with AI" assignment
 * (April 2026, preserved in original/script.js), kept rule for rule and
 * comment for comment. Only the plumbing changed:
 *   - the board and the players arrive as arguments instead of globals;
 *   - it tries moves on a copy, so the caller's board is never touched;
 *   - Math.random can be swapped for `random` to make tests repeatable.
 *
 * It looks exactly one move ahead, which is why a fork can beat it.
 */
export function ruleBasedMove(board, aiPlayer = "O", random = Math.random) {
  const AI = aiPlayer;
  const HUMAN = otherPlayer(aiPlayer);
  board = board.slice();

  // 1. If AI can win, take that move
  for (let i = 0; i < board.length; i++) {
    if (board[i] === "") {
      board[i] = AI;
      if (checkWinner(board, AI)) {
        board[i] = "";
        return i;
      }
      board[i] = "";
    }
  }

  // 2. Block the player if the player can win
  for (let i = 0; i < board.length; i++) {
    if (board[i] === "") {
      board[i] = HUMAN;
      if (checkWinner(board, HUMAN)) {
        board[i] = "";
        return i;
      }
      board[i] = "";
    }
  }

  // 3. Take center
  if (board[4] === "") {
    return 4;
  }

  // 4. Take a corner
  const corners = [0, 2, 6, 8];
  const availableCorners = corners.filter(index => board[index] === "");
  if (availableCorners.length > 0) {
    return availableCorners[Math.floor(random() * availableCorners.length)];
  }

  // 5. Take any remaining side
  const availableCells = board
    .map((value, index) => (value === "" ? index : null))
    .filter(value => value !== null);

  if (availableCells.length > 0) {
    return availableCells[Math.floor(random() * availableCells.length)];
  }

  return -1;
}

/** Lily's five rules, in the order her AI tries them. */
export const RULES = Object.freeze([
  { number: 1, name: "win", text: "win if it can" },
  { number: 2, name: "block", text: "block your winning move" },
  { number: 3, name: "center", text: "take the center" },
  { number: 4, name: "corner", text: "take a random corner" },
  { number: 5, name: "side", text: "take a side" }
]);

/**
 * Which rule ruleBasedMove applies to this board — used by the "why did it
 * play there?" note. It doesn't make a choice of its own; it only reports
 * which rule fires first. null when the board is full.
 */
export function ruleFor(board, aiPlayer = "O") {
  if (emptyCells(board).length === 0) {
    return null;
  }
  if (findWinningMove(board, aiPlayer) !== -1) {
    return RULES[0];
  }
  if (findWinningMove(board, otherPlayer(aiPlayer)) !== -1) {
    return RULES[1];
  }
  if (board[4] === EMPTY) {
    return RULES[2];
  }
  if ([0, 2, 6, 8].some(index => board[index] === EMPTY)) {
    return RULES[3];
  }
  return RULES[4];
}

/* ---------- Hard: minimax with alpha-beta pruning ------------------------ */

/** A finished game is worth +10 to the winner and -10 to the loser; a draw is 0. */
export const WIN_SCORE = 10;

/*
 * The minimax value of `board`, with `toMove` about to play, from aiPlayer's
 * point of view. `depth` counts the moves made since the position we started
 * from, and every move costs a point: a win in 1 move scores 9, a win in
 * 3 moves scores 7, a loss in 2 moves scores -8. So the AI prefers the
 * fastest win and, when it is lost, the slowest loss.
 *
 * alpha = the score the AI can already guarantee elsewhere;
 * beta  = the score the opponent can already hold it to elsewhere.
 * Once alpha >= beta, nothing else in this branch can change the decision,
 * so the remaining moves are skipped ("pruned").
 */
function minimax(board, toMove, aiPlayer, depth, alpha, beta) {
  const winner = getWinner(board);
  if (winner !== null) {
    return winner.player === aiPlayer ? WIN_SCORE - depth : depth - WIN_SCORE;
  }
  if (!board.includes(EMPTY)) {
    return 0;
  }

  const maximizing = toMove === aiPlayer;
  let best = maximizing ? -Infinity : Infinity;

  for (let i = 0; i < board.length; i++) {
    if (board[i] !== EMPTY) {
      continue;
    }
    board[i] = toMove;
    const score = minimax(board, otherPlayer(toMove), aiPlayer, depth + 1, alpha, beta);
    board[i] = EMPTY;

    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }
    if (alpha >= beta) {
      break;
    }
  }
  return best;
}

/**
 * Score every empty cell as a move by aiPlayer: [{ index, score }] in board
 * order. Each move gets its own full search, so every score is exact (the
 * "Show AI thinking" view displays all of them, not just the best one).
 *   score > 0  aiPlayer can force a win      (10 minus moves to the win)
 *   score = 0  best play on both sides draws
 *   score < 0  aiPlayer loses against best play (moves to the loss minus 10)
 * Returns [] when the round is already over.
 */
export function evaluateMoves(board, aiPlayer = "O") {
  if (isGameOver(board)) {
    return [];
  }
  const work = board.slice();
  const opponent = otherPlayer(aiPlayer);
  return emptyCells(work).map(index => {
    work[index] = aiPlayer;
    const score = minimax(work, opponent, aiPlayer, 1, -Infinity, Infinity);
    work[index] = EMPTY;
    return { index, score };
  });
}

/** Every cell that shares the top minimax score for aiPlayer (empty if none). */
export function bestMoves(board, aiPlayer = "O") {
  const scored = evaluateMoves(board, aiPlayer);
  if (scored.length === 0) {
    return [];
  }
  const top = Math.max(...scored.map(move => move.score));
  return scored.filter(move => move.score === top).map(move => move.index);
}

/**
 * HARD — minimax with alpha-beta pruning. Plays a highest-scoring move and
 * breaks ties at random, so games vary. Unbeatable: the best you can do is draw.
 */
export function minimaxMove(board, aiPlayer = "O", random = Math.random) {
  const options = bestMoves(board, aiPlayer);
  return options.length > 0 ? pick(options, random) : -1;
}

/** What a score means: { outcome: "win" | "draw" | "loss", moves } for aiPlayer. */
export function explainScore(score) {
  if (score > 0) {
    return { outcome: "win", moves: WIN_SCORE - score };
  }
  if (score < 0) {
    return { outcome: "loss", moves: WIN_SCORE + score };
  }
  return { outcome: "draw", moves: 0 };
}

/**
 * How a chosen move compares with the best one, given both minimax scores:
 *   "best"    it was a best move;
 *   "slower"  same result, but a slower win or a quicker loss;
 *   "worse"   it gives a result away (win → draw, win → loss, draw → loss).
 */
export function compareMove(score, bestScore) {
  if (score === bestScore) {
    return "best";
  }
  return explainScore(score).outcome === explainScore(bestScore).outcome ? "slower" : "worse";
}

/* ---------- Picking a strategy ------------------------------------------- */

export const STRATEGIES = Object.freeze({
  easy: easyMove,
  medium: ruleBasedMove,
  hard: minimaxMove
});

/** The move the chosen difficulty would play for aiPlayer. */
export function chooseMove(difficulty, board, aiPlayer = "O", random = Math.random) {
  const strategy = STRATEGIES[difficulty];
  if (!strategy) {
    throw new Error(`Unknown difficulty: ${difficulty}`);
  }
  return strategy(board, aiPlayer, random);
}
