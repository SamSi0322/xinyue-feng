const cells = document.querySelectorAll(".cell");
const statusText = document.getElementById("status");
const restartBtn = document.getElementById("restartBtn");
const resetScoreBtn = document.getElementById("resetScoreBtn");

const playerScoreEl = document.getElementById("playerScore");
const aiScoreEl = document.getElementById("aiScore");
const drawScoreEl = document.getElementById("drawScore");

let board = ["", "", "", "", "", "", "", "", ""];
let gameActive = true;

const HUMAN = "X";
const AI = "O";

let playerScore = 0;
let aiScore = 0;
let drawScore = 0;

const winningConditions = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

function handleCellClick(event) {
  const clickedCell = event.target;
  const clickedIndex = Number(clickedCell.getAttribute("data-index"));

  if (!gameActive || board[clickedIndex] !== "") {
    return;
  }

  makeMove(clickedIndex, HUMAN);

  if (checkWinner(HUMAN)) {
    statusText.textContent = "You win this round!";
    playerScore++;
    updateScores();
    gameActive = false;
    return;
  }

  if (isDraw()) {
    statusText.textContent = "This round is a draw!";
    drawScore++;
    updateScores();
    gameActive = false;
    return;
  }

  statusText.textContent = "AI is thinking...";

  setTimeout(() => {
    const aiIndex = getBestMove();
    if (aiIndex !== -1) {
      makeMove(aiIndex, AI);
    }

    if (checkWinner(AI)) {
      statusText.textContent = "AI wins this round!";
      aiScore++;
      updateScores();
      gameActive = false;
      return;
    }

    if (isDraw()) {
      statusText.textContent = "This round is a draw!";
      drawScore++;
      updateScores();
      gameActive = false;
      return;
    }

    statusText.textContent = "Your turn";
  }, 500);
}

function makeMove(index, player) {
  board[index] = player;
  cells[index].textContent = player;
}

function checkWinner(player) {
  return winningConditions.some(condition => {
    return condition.every(index => board[index] === player);
  });
}

function isDraw() {
  return board.every(cell => cell !== "");
}

function getBestMove() {
  // 1. If AI can win, take that move
  for (let i = 0; i < board.length; i++) {
    if (board[i] === "") {
      board[i] = AI;
      if (checkWinner(AI)) {
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
      if (checkWinner(HUMAN)) {
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
    return availableCorners[Math.floor(Math.random() * availableCorners.length)];
  }

  // 5. Take any remaining side
  const availableCells = board
    .map((value, index) => (value === "" ? index : null))
    .filter(value => value !== null);

  if (availableCells.length > 0) {
    return availableCells[Math.floor(Math.random() * availableCells.length)];
  }

  return -1;
}

function restartRound() {
  board = ["", "", "", "", "", "", "", "", ""];
  gameActive = true;
  statusText.textContent = "Your turn";
  cells.forEach(cell => {
    cell.textContent = "";
  });
}

function resetScores() {
  playerScore = 0;
  aiScore = 0;
  drawScore = 0;
  updateScores();
  restartRound();
}

function updateScores() {
  playerScoreEl.textContent = playerScore;
  aiScoreEl.textContent = aiScore;
  drawScoreEl.textContent = drawScore;
}

cells.forEach(cell => {
  cell.addEventListener("click", handleCellClick);
});

restartBtn.addEventListener("click", restartRound);
resetScoreBtn.addEventListener("click", resetScores);