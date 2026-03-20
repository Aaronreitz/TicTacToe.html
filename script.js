// ── DOM ──
const cells             = document.querySelectorAll(".cell");
const statusText        = document.getElementById("status");
const nextRoundBtn      = document.getElementById("nextRoundBtn");
const resetAllBtn       = document.getElementById("resetAllBtn");
const scoreXEl          = document.getElementById("scoreX");
const scoreOEl          = document.getElementById("scoreO");
const scoreDrawEl       = document.getElementById("scoreDraw");
const labelXEl          = document.getElementById("labelX");
const labelOEl          = document.getElementById("labelO");
const historyList       = document.getElementById("historyList");
const nameXInput        = document.getElementById("nameX");
const nameOInput        = document.getElementById("nameO");
const leaderboardList   = document.getElementById("leaderboardList");
const darkToggle        = document.getElementById("darkToggle");
const muteToggle        = document.getElementById("muteToggle");
const roundModal        = document.getElementById("roundModal");
const modalText         = document.getElementById("modalText");
const modalNextBtn      = document.getElementById("modalNextBtn");
const modalResetBtn     = document.getElementById("modalResetBtn");
const confettiCanvas    = document.getElementById("confettiCanvas");
const modeBtns          = document.querySelectorAll(".mode-btn");
const diffBtns          = document.querySelectorAll(".diff-btn");
const difficultySection = document.getElementById("difficultySection");

// ── State ──
let board         = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let gameOver      = false;
let round         = 1;
let scores        = { X: 0, O: 0, draw: 0 };
let gameMode      = "pvp";    // "pvp" | "pvc"
let aiDifficulty  = "medium"; // "easy" | "medium" | "unbeatable"
let audioMuted    = localStorage.getItem("muted") === "true";

const EMPTY_BOARD = ["", "", "", "", "", "", "", "", ""];

const winPatterns = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

// ── Audio ──
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || /** @type {any} */ (window).webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = "sine", vol = 0.22) {
  if (audioMuted) return;
  const ctx  = getAudioCtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playClick() { playTone(520, 0.08, "sine", 0.15); }
function playWin()   { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.28), i * 110)); }
function playDraw()  { [380, 320, 260].forEach((f, i) => setTimeout(() => playTone(f, 0.22, "triangle", 0.18), i * 120)); }

// ── Konfetti ──
let confettiFrame = null;
const CONFETTI_COLORS = ["#2563eb", "#dc2626", "#d97706", "#16a34a", "#9333ea", "#0891b2", "#f59e0b"];

function launchConfetti() {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  const ctx = confettiCanvas.getContext("2d");

  const pieces = Array.from({ length: 110 }, () => ({
    x:     Math.random() * confettiCanvas.width,
    y:     Math.random() * -320,
    w:     Math.random() * 11 + 5,
    h:     Math.random() * 6 + 3,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    speed: Math.random() * 4 + 2,
    angle: Math.random() * 360,
    spin:  Math.random() * 8 - 4,
    drift: Math.random() * 2 - 1,
  }));

  cancelAnimationFrame(confettiFrame);

  function draw() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let alive = false;
    pieces.forEach(p => {
      p.y += p.speed;
      p.x += p.drift;
      p.angle += p.spin;
      if (p.y < confettiCanvas.height + 20) alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.angle * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (alive) confettiFrame = requestAnimationFrame(draw);
    // no else-clearRect needed — clearRect at the top of draw() already covers it
  }
  draw();
}

// ── Modal ──
function showModal(text) {
  modalText.textContent = text;
  roundModal.classList.remove("hidden");
}

function hideModal() {
  roundModal.classList.add("hidden");
}

// ── Hilfsfunktionen ──
function getPlayerName(player) {
  if (gameMode === "pvc" && player === "O") return "KI";
  const input = player === "X" ? nameXInput : nameOInput;
  return input.value.trim() || `Spieler ${player}`;
}

// Check win for any board state (used by both game logic and minimax)
function hasWon(player, b) {
  return winPatterns.some(p => p.every(i => b[i] === player));
}

function getWinningPattern(player) {
  return winPatterns.find(p => p.every(i => board[i] === player)) || null;
}

function disableAllCells() {
  cells.forEach(c => c.disabled = true);
}

// Shared cell-reset used by startNextRound and resetAll
function resetCells() {
  cells.forEach(cell => {
    cell.querySelector(".cell-symbol").textContent = "";
    cell.disabled = false;
    cell.classList.remove("x", "o", "winner", "placed", "draw-flash");
  });
}

// Trigger AI move if it's AI's turn, otherwise re-enable empty cells for human
function maybeStartAI() {
  if (gameMode === "pvc" && currentPlayer === "O") {
    disableAllCells();
    setTimeout(doAIMove, 520);
  } else {
    cells.forEach((cell, i) => { if (board[i] === "") cell.disabled = false; });
  }
}

// ── Spiellogik ──
function handleCellClick(event) {
  const index = Number(event.target.dataset.index);
  if (board[index] !== "" || gameOver) return;
  placeMove(index, currentPlayer);
}

function placeMove(index, player) {
  board[index] = player;
  cells[index].querySelector(".cell-symbol").textContent = player;
  cells[index].disabled = true;
  cells[index].classList.add(player.toLowerCase(), "placed");
  playClick();

  // Gewinn prüfen
  const winPattern = getWinningPattern(player);
  if (winPattern) {
    winPattern.forEach(i => cells[i].classList.add("winner"));
    const name = getPlayerName(player);
    statusText.textContent = `${name} hat Runde ${round} gewonnen!`;
    gameOver = true;
    scores[player]++;
    updateScoreboard();
    addHistoryEntry(`Runde ${round}: ${name} gewinnt`);
    if (gameMode !== "pvc") addToLeaderboard(name);
    playWin();
    launchConfetti();
    setTimeout(() => showModal(`🏆 ${name} gewinnt Runde ${round}!`), 800);
    endRound();
    return;
  }

  // Unentschieden prüfen
  if (board.every(c => c !== "")) {
    cells.forEach(c => c.classList.add("draw-flash"));
    setTimeout(() => cells.forEach(c => c.classList.remove("draw-flash")), 700);
    statusText.textContent = `Runde ${round} endet unentschieden!`;
    gameOver = true;
    scores.draw++;
    updateScoreboard();
    addHistoryEntry(`Runde ${round}: Unentschieden`);
    playDraw();
    setTimeout(() => showModal(`🤝 Unentschieden in Runde ${round}!`), 750);
    endRound();
    return;
  }

  currentPlayer = player === "X" ? "O" : "X";
  statusText.textContent = `${getPlayerName(currentPlayer)} ist am Zug`;
  maybeStartAI();
}

function doAIMove() {
  if (gameOver) return;
  const move = getAIMove();
  if (move !== -1) placeMove(move, "O");
}

function endRound() {
  disableAllCells();
  nextRoundBtn.disabled = false;
}

function startNextRound() {
  hideModal();
  round++;
  board = [...EMPTY_BOARD];
  currentPlayer = round % 2 === 1 ? "X" : "O";
  gameOver = false;
  statusText.textContent = `${getPlayerName(currentPlayer)} ist am Zug`;
  resetCells();
  nextRoundBtn.disabled = true;
  maybeStartAI();
}

function resetAll() {
  hideModal();
  cancelAnimationFrame(confettiFrame);
  confettiCanvas.getContext("2d").clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  board = [...EMPTY_BOARD];
  currentPlayer = "X";
  gameOver = false;
  round = 1;
  scores = { X: 0, O: 0, draw: 0 };

  updateScoreboard();
  statusText.textContent = `${getPlayerName("X")} ist am Zug`;
  nextRoundBtn.disabled = true;
  resetCells();
  historyList.innerHTML = '<li class="history-empty">Noch keine Spiele abgeschlossen</li>';
}

function updateScoreboard() {
  labelXEl.textContent = getPlayerName("X");
  labelOEl.textContent = getPlayerName("O");
  scoreXEl.textContent = scores.X;
  scoreOEl.textContent = scores.O;
  scoreDrawEl.textContent = scores.draw;
}

function addHistoryEntry(text) {
  const emptyItem = historyList.querySelector(".history-empty");
  if (emptyItem) emptyItem.remove();
  const li = document.createElement("li");
  li.textContent = text;
  historyList.prepend(li);
}

// ── Bestenliste ──
function loadLeaderboard() {
  return JSON.parse(localStorage.getItem("tictactoe-leaderboard") || "{}");
}

function saveLeaderboard(lb) {
  localStorage.setItem("tictactoe-leaderboard", JSON.stringify(lb));
}

function addToLeaderboard(name) {
  const lb = loadLeaderboard();
  lb[name] = (lb[name] || 0) + 1;
  saveLeaderboard(lb);
  renderLeaderboard(lb); // pass lb directly — avoids a second localStorage read
}

function renderLeaderboard(lb = loadLeaderboard()) {
  const entries = Object.entries(lb).sort((a, b) => b[1] - a[1]).slice(0, 10);

  if (entries.length === 0) {
    leaderboardList.innerHTML = '<li class="leaderboard-empty">Noch keine Einträge</li>';
    return;
  }

  const rankClasses = ["gold", "silver", "bronze"];
  leaderboardList.innerHTML = entries.map(([name, wins], i) =>
    `<li>
      <span class="lb-rank ${rankClasses[i] || ""}">${i + 1}.</span>
      <span class="lb-name">${name}</span>
      <span class="lb-wins">${wins} ${wins === 1 ? "Sieg" : "Siege"}</span>
    </li>`
  ).join("");
}

// ── KI ──
const aiStrategies = {
  easy:        () => getRandomMove(),
  medium:      () => Math.random() < 0.65 ? getBestMove() : getRandomMove(),
  unbeatable:  () => getBestMove(),
};

function getAIMove() {
  return (aiStrategies[aiDifficulty] || aiStrategies.unbeatable)();
}

function getRandomMove() {
  const indices = [];
  board.forEach((v, i) => { if (v === "") indices.push(i); });
  return indices.length ? indices[Math.floor(Math.random() * indices.length)] : -1;
}

function getBestMove() {
  let bestScore = -Infinity, bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] === "") {
      board[i] = "O";
      const score = minimax(board, false);
      board[i] = "";
      if (score > bestScore) { bestScore = score; bestMove = i; }
    }
  }
  return bestMove;
}

function minimax(b, isMax) {
  if (hasWon("O", b)) return 10;
  if (hasWon("X", b)) return -10;
  if (b.every(c => c !== "")) return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] === "") { b[i] = "O"; best = Math.max(best, minimax(b, false)); b[i] = ""; }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] === "") { b[i] = "X"; best = Math.min(best, minimax(b, true)); b[i] = ""; }
    }
    return best;
  }
}

// ── Spielmodus-Auswahl ──
function setActiveBtn(btns, active) {
  btns.forEach(b => b.classList.toggle("active", b === active));
}

modeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    gameMode = btn.dataset.mode;
    setActiveBtn(modeBtns, btn);
    difficultySection.classList.toggle("hidden", gameMode !== "pvc");
    nameOInput.disabled = gameMode === "pvc";
    nameOInput.value = "";
    nameOInput.placeholder = gameMode === "pvc" ? "KI" : "Name eingeben...";
    resetAll();
  });
});

diffBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    aiDifficulty = btn.dataset.diff;
    setActiveBtn(diffBtns, btn);
    resetAll();
  });
});

// ── Dark Mode ──
function applyDark(dark) {
  document.body.classList.toggle("dark", dark);
  darkToggle.textContent = dark ? "☀️" : "🌙";
}

applyDark(localStorage.getItem("darkMode") === "true");

darkToggle.addEventListener("click", () => {
  const isDark = !document.body.classList.contains("dark");
  applyDark(isDark);
  localStorage.setItem("darkMode", isDark);
});

// ── Mute ──
function applyMute(muted) {
  audioMuted = muted;
  muteToggle.textContent = muted ? "🔇" : "🔊";
}

applyMute(audioMuted);

muteToggle.addEventListener("click", () => {
  applyMute(!audioMuted);
  localStorage.setItem("muted", audioMuted);
});

// ── Event Listener ──
cells.forEach(cell => cell.addEventListener("click", handleCellClick));
nextRoundBtn.addEventListener("click", startNextRound);
resetAllBtn.addEventListener("click", resetAll);
modalNextBtn.addEventListener("click", startNextRound);
modalResetBtn.addEventListener("click", resetAll);

document.addEventListener("keydown", (e) => {
  // Ignore keypresses when user is typing in an input field
  if (e.target.tagName === "INPUT") return;

  if (e.key === "Enter" && !roundModal.classList.contains("hidden")) {
    startNextRound();
    return;
  }
  const num = parseInt(e.key);
  if (num >= 1 && num <= 9) {
    // Numpad-Layout: 7=oben-links ... 1=unten-links
    const numToIndex = [null, 6, 7, 8, 3, 4, 5, 0, 1, 2];
    const index = numToIndex[num];
    if (board[index] === "" && !gameOver) placeMove(index, currentPlayer);
  }
});

updateScoreboard();
renderLeaderboard();
