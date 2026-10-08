/*
 * script.js — the game on the page: board, controls, scores and the
 * "Show AI thinking" view. The AI itself lives in ai.js.
 *
 * Grown from Lily's original script.js (kept in original/): the same board
 * array, the same rhythm (your move, a short pause, the AI's move) and the
 * same function names wherever they still fit.
 */
import {
  chooseMove,
  compareMove,
  evaluateMoves,
  explainScore,
  findWinningMove,
  getWinner,
  isDraw,
  ruleFor
} from "./ai.js";

const HUMAN = "X";
const AI = "O";

const LEVELS = {
  easy: { name: "Easy" },
  medium: { name: "Medium" },
  hard: { name: "Hard" }
};

const AI_DELAY = 450; // ms: the AI's short "thinking" pause, as in the original
const AI_DELAY_THINKING = 1000; // ms: a longer pause while its scores are on screen, so you can read them
const STORAGE_KEY = "play-with-ai:tic-tac-toe";

const MARK_X =
  '<svg class="mark mark--x" viewBox="0 0 100 100" focusable="false">' +
  '<path pathLength="1" d="M29 28.5C41 40 57 56.5 71.5 71" />' +
  '<path pathLength="1" d="M71 29C59 40.5 42.5 57 28.5 71.5" />' +
  "</svg>";
const MARK_O =
  '<svg class="mark mark--o" viewBox="0 0 100 100" focusable="false">' +
  '<path pathLength="1" d="M44 27.2C51 24.6 64 25.2 70.4 33.4C75.8 40.6 75.6 58.4 68.6 66.6C61 75.2 44.6 76.2 35.2 70C26.4 64 23.6 48.6 28.8 38.6C33.4 29.6 43.6 25 56 26.2" />' +
  "</svg>";

/* ---------- Page elements ------------------------------------------------ */

const root = document.documentElement;
const gameEl = document.getElementById("game");
const boardEl = document.getElementById("board");
const cells = Array.from(document.querySelectorAll(".cell"));
const markEls = cells.map(cell => cell.querySelector(".cell__mark"));
const evalEls = cells.map(cell => cell.querySelector(".cell__eval"));
const evalScoreEls = cells.map(cell => cell.querySelector(".eval__score"));
const evalLabelEls = cells.map(cell => cell.querySelector(".eval__label"));
const strikeEl = document.getElementById("strike");

const statusEl = document.getElementById("status");
const statusText = document.getElementById("statusText");
const statusDetail = document.getElementById("statusDetail");

const restartBtn = document.getElementById("restartBtn");
const resetScoreBtn = document.getElementById("resetScoreBtn");
const resetScopeEl = document.getElementById("resetScope");

const playerScoreEl = document.getElementById("playerScore");
const aiScoreEl = document.getElementById("aiScore");
const drawScoreEl = document.getElementById("drawScore");
const scoreLevelEl = document.getElementById("scoreLevel");

const difficultyInputs = Array.from(document.querySelectorAll('input[name="difficulty"]'));
const firstMoveInputs = Array.from(document.querySelectorAll('input[name="firstMove"]'));
const thinkingToggle = document.getElementById("thinkingToggle");
const thinkingPanel = document.getElementById("thinking");
const thinkingMode = document.getElementById("thinkingMode");
const lastMoveEl = document.getElementById("lastMove");
const lastMoveText = document.getElementById("lastMoveText");

/* ---------- Game state ----------------------------------------------------- */

let board = ["", "", "", "", "", "", "", "", ""];
let gameActive = true;
let currentPlayer = HUMAN;
let round = 0; // goes up with every new round, so a stale AI move is ignored
let aiTimer = 0;
let focusIndex = 4; // the square Tab lands on (the centre: at most two arrow presses to anywhere)
let lastAiMove = null; // what the AI just did and why, for the thinking panel
let evaluation = null; // minimax scores for the current position (cached)

const settings = { difficulty: "medium", firstMove: "you", thinking: false };
const savedSettings = { ...settings }; // what we remember; URL options don't overwrite it
const scores = emptyScores();

function emptyScores() {
  return {
    easy: { you: 0, ai: 0, draws: 0 },
    medium: { you: 0, ai: 0, draws: 0 },
    hard: { you: 0, ai: 0, draws: 0 }
  };
}

function isLevel(value) {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(LEVELS, value);
}

/* ---------- Remembering scores (localStorage is optional) ------------------ */

function readStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // blocked storage, private mode, or a corrupted value
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, scores, settings: savedSettings }));
  } catch {
    // No storage: the game still works, it just won't remember.
  }
}

function loadSaved() {
  const data = readStorage();
  if (!data || typeof data !== "object") {
    return;
  }
  if (data.scores && typeof data.scores === "object") {
    for (const level of Object.keys(LEVELS)) {
      const tally = data.scores[level];
      for (const key of ["you", "ai", "draws"]) {
        const value = tally && tally[key];
        if (Number.isSafeInteger(value) && value >= 0) {
          scores[level][key] = value;
        }
      }
    }
  }
  const saved = data.settings || {};
  if (isLevel(saved.difficulty)) {
    savedSettings.difficulty = saved.difficulty;
  }
  if (saved.firstMove === "you" || saved.firstMove === "ai") {
    savedSettings.firstMove = saved.firstMove;
  }
  if (typeof saved.thinking === "boolean") {
    savedSettings.thinking = saved.thinking;
  }
}

/** ?difficulty=easy|medium|hard, ?first=you|ai, ?thinking=1|0 (handy for embeds). */
function applyUrlOptions() {
  const params = new URLSearchParams(window.location.search);
  const difficulty = params.get("difficulty");
  if (isLevel(difficulty)) {
    settings.difficulty = difficulty;
  }
  const first = params.get("first");
  if (first === "you" || first === "ai") {
    settings.firstMove = first;
  }
  const thinking = params.get("thinking");
  if (thinking === "1" || thinking === "true") {
    settings.thinking = true;
  } else if (thinking === "0" || thinking === "false") {
    settings.thinking = false;
  }
}

/* ---------- Words -------------------------------------------------------------- */

function cellName(index) {
  return `row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatScore(score) {
  if (score > 0) {
    return `+${score}`;
  }
  if (score < 0) {
    return `−${-score}`; // a real minus sign
  }
  return "0";
}

function spokenScore(score) {
  if (score > 0) {
    return `plus ${score}`;
  }
  if (score < 0) {
    return `minus ${-score}`;
  }
  return "0";
}

const OUTCOME_LABELS = { win: "AI wins", draw: "Draw", loss: "AI loses" };

function describeOutcome(score) {
  const { outcome, moves } = explainScore(score);
  if (outcome === "draw") {
    return "a draw";
  }
  const unit = moves === 1 ? "move" : "moves";
  return outcome === "win" ? `AI wins in ${moves} ${unit}` : `AI loses in ${moves} ${unit}`;
}

/* ---------- Minimax view --------------------------------------------------------- */

/**
 * Minimax scores for the player about to move, always counted from the AI's
 * side, plus the score minimax would pick (highest for the AI, lowest for you).
 */
function currentEvaluation() {
  const key = board.join(",") + currentPlayer;
  if (!evaluation || evaluation.key !== key) {
    const moves = evaluateMoves(board, currentPlayer);
    // evaluateMoves scores moves for whoever is moving; on your turn flip the
    // sign so a positive number always means "good for the AI".
    const forAI = currentPlayer === AI ? moves : moves.map(move => ({ index: move.index, score: -move.score || 0 }));
    const values = forAI.map(move => move.score);
    evaluation = {
      key,
      scores: new Map(forAI.map(move => [move.index, move.score])),
      best: currentPlayer === AI ? Math.max(...values) : Math.min(...values)
    };
  }
  return evaluation;
}

/** Why the AI played `index` on the board `before`, and how minimax rates it. */
function describeAiMove(before, index) {
  const scored = evaluateMoves(before, AI);
  const score = scored.find(move => move.index === index).score;
  const best = Math.max(...scored.map(move => move.score));
  const ties = scored.filter(move => move.score === best).length;

  let reason;
  if (settings.difficulty === "hard") {
    reason = ties > 1 ? `Minimax: one of ${ties} equally good squares, picked at random` : "Minimax: the single best square";
  } else if (settings.difficulty === "medium") {
    const rule = ruleFor(before, AI);
    reason = `Lily’s rule ${rule.number}: ${rule.text}`;
  } else {
    const after = before.slice();
    after[index] = AI;
    if (getWinner(after)) {
      reason = "Spotted a winning square";
    } else if (findWinningMove(before, AI) !== -1) {
      reason = "A random square (it missed a win)";
    } else {
      reason = "A random square";
    }
  }

  let verdict = ""; // stays empty when the AI found a best move
  const chosen = explainScore(score).outcome;
  const possible = explainScore(best).outcome;
  const comparison = compareMove(score, best);
  if (comparison === "slower") {
    verdict = chosen === "win" ? "it still wins, just more slowly" : "it loses sooner";
  } else if (comparison === "worse") {
    if (possible === "win") {
      verdict = chosen === "draw" ? "a forced win slips to a draw" : "it throws away a win";
    } else {
      verdict = "now you can force a win"; // a draw was there for the taking
    }
  }
  return { index, reason, score, best, verdict };
}

function renderLastMove(move) {
  const name = document.createElement("strong");
  name.textContent = capitalize(cellName(move.index));
  const pill = document.createElement("span");
  pill.className = "pill";
  pill.dataset.tone = explainScore(move.score).outcome;
  pill.textContent = formatScore(move.score);

  // e.g. "Row 1, column 3 · Lily's rule 4: take a random corner. Minimax score −6;
  //       the best was 0, so now you can force a win."
  const parts = [name, ` · ${move.reason}. Minimax score `, pill];
  if (move.verdict) {
    parts.push(`; the best was ${formatScore(move.best)}, so ${move.verdict}.`);
  } else {
    parts.push(", the best available.");
  }
  lastMoveText.replaceChildren(...parts);
}

function renderThinkingPanel() {
  thinkingPanel.hidden = !settings.thinking;
  if (!settings.thinking) {
    return;
  }

  let mode;
  if (!gameActive) {
    mode = "Round over. Start a new round to see fresh scores.";
  } else if (currentPlayer === HUMAN) {
    mode = "Your move. The AI hopes you pick a high number; your best reply is the lowest.";
  } else if (settings.difficulty === "hard") {
    mode = "The AI’s move. It maximizes, so it will play a top score.";
  } else if (settings.difficulty === "medium") {
    mode = "The AI’s move. Lily’s rules don’t read these scores. Will it find the best one?";
  } else {
    mode = "The AI’s move. Easy mostly ignores these scores.";
  }
  thinkingMode.textContent = mode;

  lastMoveEl.hidden = !lastAiMove;
  if (lastAiMove) {
    renderLastMove(lastAiMove);
  }
}

/* ---------- Drawing the board ---------------------------------------------- */

function render() {
  const scored = settings.thinking && gameActive ? currentEvaluation() : null;

  boardEl.dataset.turn = gameActive ? (currentPlayer === HUMAN ? "human" : "ai") : "over";
  boardEl.dataset.thinking = scored ? "on" : "off";
  gameEl.dataset.state = gameActive ? "playing" : "over";

  cells.forEach((cell, index) => {
    const value = board[index];
    const playable = gameActive && currentPlayer === HUMAN && value === "";
    cell.setAttribute("aria-disabled", String(!playable));
    cell.tabIndex = index === focusIndex ? 0 : -1;

    let label = `${capitalize(cellName(index))}, ${value || "empty"}`;
    if (cell.classList.contains("is-winning")) {
      label += ", part of the winning line";
    }

    const evalEl = evalEls[index];
    if (scored && value === "") {
      const score = scored.scores.get(index);
      const { outcome } = explainScore(score);
      const isBest = score === scored.best;
      evalEl.dataset.tone = outcome;
      evalEl.toggleAttribute("data-best", isBest);
      evalScoreEls[index].textContent = formatScore(score);
      evalLabelEls[index].textContent = OUTCOME_LABELS[outcome];
      evalEl.classList.add("is-shown");
      label += `. Minimax score ${spokenScore(score)}: ${describeOutcome(score)}`;
      if (isBest) {
        label += currentPlayer === HUMAN ? ", your best move" : ", the AI’s best move";
      }
    } else {
      evalEl.classList.remove("is-shown");
      evalEl.removeAttribute("data-best");
    }
    cell.setAttribute("aria-label", label);
  });

  renderThinkingPanel();
}

function makeMove(index, player) {
  board[index] = player;
  markEls[index].innerHTML = player === HUMAN ? MARK_X : MARK_O;
  // A slight random tilt, so no two marks look stamped.
  markEls[index].firstElementChild.style.setProperty("--tilt", `${(Math.random() * 8 - 4).toFixed(1)}deg`);
}

function drawStrike(line) {
  const centre = index => [50 + (index % 3) * 100, 50 + Math.floor(index / 3) * 100];
  const [x1, y1] = centre(line[0]);
  const [x2, y2] = centre(line[2]);
  const length = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  const reach = 34; // run past the outer marks, like a pen stroke
  const bow = 5; // and curve a touch, so it looks drawn rather than ruled
  const sx = x1 - ux * reach;
  const sy = y1 - uy * reach;
  const ex = x2 + ux * reach;
  const ey = y2 + uy * reach;
  const cx = (sx + ex) / 2 - uy * bow;
  const cy = (sy + ey) / 2 + ux * bow;
  const n = value => Math.round(value * 10) / 10;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("pathLength", "1");
  path.setAttribute("d", `M${n(sx)} ${n(sy)}Q${n(cx)} ${n(cy)} ${n(ex)} ${n(ey)}`);
  strikeEl.replaceChildren(path);
}

function setStatus(state, text, detail = "") {
  statusEl.dataset.state = state;
  statusDetail.textContent = detail ? `${detail} ` : "";
  statusText.textContent = text;
  statusText.classList.remove("is-new");
  void statusText.offsetWidth; // restart the fade-in
  statusText.classList.add("is-new");
}

function updateScores(changedEl) {
  const tally = scores[settings.difficulty];
  playerScoreEl.textContent = tally.you;
  aiScoreEl.textContent = tally.ai;
  drawScoreEl.textContent = tally.draws;
  scoreLevelEl.textContent = LEVELS[settings.difficulty].name;
  resetScopeEl.textContent = ` for ${LEVELS[settings.difficulty].name}`;
  if (changedEl) {
    changedEl.classList.remove("is-bumped");
    void changedEl.offsetWidth;
    changedEl.classList.add("is-bumped");
  }
}

/* ---------- Playing a round -------------------------------------------------- */

function handleCellClick(event) {
  const clickedCell = event.currentTarget;
  const clickedIndex = Number(clickedCell.dataset.index);
  setFocusIndex(clickedIndex);

  if (!gameActive || currentPlayer !== HUMAN || board[clickedIndex] !== "") {
    return;
  }

  makeMove(clickedIndex, HUMAN);
  if (endRoundIfOver()) {
    return;
  }
  currentPlayer = AI;
  scheduleAiMove();
}

function scheduleAiMove() {
  const thisRound = round;
  setStatus("thinking", "AI is thinking…");
  render();
  window.clearTimeout(aiTimer);
  aiTimer = window.setTimeout(() => {
    if (thisRound === round && gameActive && currentPlayer === AI) {
      playAiMove();
    }
  }, settings.thinking ? AI_DELAY_THINKING : AI_DELAY);
}

function playAiMove() {
  const before = board.slice();
  const aiIndex = chooseMove(settings.difficulty, before, AI);
  if (aiIndex === -1) {
    return;
  }
  lastAiMove = describeAiMove(before, aiIndex);
  makeMove(aiIndex, AI);
  currentPlayer = HUMAN;

  const detail = `AI played ${cellName(aiIndex)}.`;
  if (endRoundIfOver(detail)) {
    return;
  }
  setStatus("human", "Your turn", detail);
  render();
}

/** Scores and announces the round if it just ended; returns true if it did. */
function endRoundIfOver(detail = "") {
  const winner = getWinner(board);
  const tally = scores[settings.difficulty];

  if (winner) {
    const humanWon = winner.player === HUMAN;
    gameActive = false;
    winner.line.forEach(index => cells[index].classList.add("is-winning"));
    drawStrike(winner.line);
    boardEl.dataset.result = humanWon ? "win" : "loss";
    if (humanWon) {
      tally.you++;
    } else {
      tally.ai++;
    }
    setStatus(humanWon ? "win" : "loss", humanWon ? "You win!" : "AI wins", detail);
    updateScores(humanWon ? playerScoreEl : aiScoreEl);
  } else if (isDraw(board)) {
    gameActive = false;
    boardEl.dataset.result = "draw";
    tally.draws++;
    setStatus("draw", "Draw", detail);
    updateScores(drawScoreEl);
  } else {
    return false;
  }

  persist();
  render();
  return true;
}

function restartRound() {
  round++;
  window.clearTimeout(aiTimer);
  board = ["", "", "", "", "", "", "", "", ""];
  gameActive = true;
  lastAiMove = null;
  evaluation = null;

  markEls.forEach(el => el.replaceChildren());
  cells.forEach(cell => cell.classList.remove("is-winning"));
  strikeEl.replaceChildren();
  delete boardEl.dataset.result;

  currentPlayer = settings.firstMove === "ai" ? AI : HUMAN;
  if (currentPlayer === AI) {
    scheduleAiMove();
  } else {
    setStatus("human", "Your turn");
    render();
  }
}

function resetScores() {
  scores[settings.difficulty] = { you: 0, ai: 0, draws: 0 };
  updateScores();
  persist();
  restartRound();
}

/* ---------- Keyboard: arrow keys move around the grid ---------------------- */

function setFocusIndex(index) {
  focusIndex = index;
  cells.forEach((cell, i) => {
    cell.tabIndex = i === index ? 0 : -1;
  });
}

function handleBoardKeydown(event) {
  const cell = event.target.closest(".cell");
  if (!cell || event.altKey || event.metaKey) {
    return;
  }
  const index = Number(cell.dataset.index);
  const row = Math.floor(index / 3);
  const col = index % 3;
  let next;
  switch (event.key) {
    case "ArrowUp":
      next = row > 0 ? index - 3 : index;
      break;
    case "ArrowDown":
      next = row < 2 ? index + 3 : index;
      break;
    case "ArrowLeft":
      next = col > 0 ? index - 1 : index;
      break;
    case "ArrowRight":
      next = col < 2 ? index + 1 : index;
      break;
    case "Home":
      next = event.ctrlKey ? 0 : row * 3;
      break;
    case "End":
      next = event.ctrlKey ? 8 : row * 3 + 2;
      break;
    default:
      return;
  }
  event.preventDefault();
  setFocusIndex(next);
  cells[next].focus();
}

/* ---------- Embedding: tell the parent page how tall we are ------------------ */

function reportHeightToParent() {
  if (window.parent === window || typeof ResizeObserver !== "function") {
    return;
  }
  let lastHeight = 0;
  const report = () => {
    const height = Math.ceil(document.body.getBoundingClientRect().height);
    if (height !== lastHeight) {
      lastHeight = height;
      window.parent.postMessage({ type: "tic-tac-toe:height", height }, "*");
    }
  };
  new ResizeObserver(report).observe(document.body);
  // Also report right away and once everything has loaded, in case the page
  // isn't being rendered yet (e.g. a background tab) when the observer starts.
  report();
  window.addEventListener("load", report, { once: true });
}

/* ---------- Start --------------------------------------------------------------- */

function init() {
  loadSaved();
  Object.assign(settings, savedSettings);
  applyUrlOptions();

  difficultyInputs.forEach(input => {
    input.checked = input.value === settings.difficulty;
    input.addEventListener("change", () => {
      if (!input.checked) {
        return;
      }
      settings.difficulty = savedSettings.difficulty = input.value;
      persist();
      updateScores();
      restartRound();
    });
  });

  firstMoveInputs.forEach(input => {
    input.checked = input.value === settings.firstMove;
    input.addEventListener("change", () => {
      if (!input.checked) {
        return;
      }
      settings.firstMove = savedSettings.firstMove = input.value;
      persist();
      restartRound();
    });
  });

  thinkingToggle.checked = settings.thinking;
  thinkingToggle.addEventListener("change", () => {
    settings.thinking = savedSettings.thinking = thinkingToggle.checked;
    persist();
    render();
  });

  cells.forEach(cell => {
    cell.addEventListener("click", handleCellClick);
    cell.addEventListener("focus", () => setFocusIndex(Number(cell.dataset.index)));
  });
  boardEl.addEventListener("keydown", handleBoardKeydown);
  restartBtn.addEventListener("click", restartRound);
  resetScoreBtn.addEventListener("click", resetScores);

  updateScores();
  restartRound();
  root.dataset.ready = "true";

  if (root.classList.contains("is-embed")) {
    reportHeightToParent();
  }
}

init();
