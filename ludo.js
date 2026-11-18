/* ==========================================================================
   HIDAMES LUDO KING - COMPLETE ENGINE & GAMEPLAY LOGIC
   Features: 15x15 Coordinate Mapping, Safe Stars, Hop Animation, Audio Synth
   ========================================================================== */

// --- 1. Synthesized Web Audio Engine (Zero External Audio Files Needed) ---
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playTone(freq, type, duration, delay = 0) {
    if (!this.enabled) return;
    this.init();
    setTimeout(() => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    }, delay);
  }

  roll() {
    for (let i = 0; i < 6; i++) {
      this.playTone(180 + Math.random() * 200, 'triangle', 0.05, i * 60);
    }
  }

  step() {
    this.playTone(480, 'sine', 0.08);
  }

  unlock() {
    this.playTone(523.25, 'triangle', 0.1, 0);
    this.playTone(659.25, 'triangle', 0.15, 100);
    this.playTone(783.99, 'triangle', 0.2, 200);
  }

  capture() {
    this.playTone(150, 'sawtooth', 0.25);
    this.playTone(90, 'square', 0.35, 80);
  }

  win() {
    [523, 659, 783, 1046].forEach((f, idx) => {
      this.playTone(f, 'triangle', 0.3, idx * 140);
    });
  }
}

const sounds = new SoundManager();

// --- 2. Track & Coordinates Mapping (15x15 Grid) ---
// 52 Common Outer Tiles in Clockwise Order
const TRACK_COORDINATES = [
  /* Red Arm: 0 to 4 */
  {r: 6, c: 1}, {r: 6, c: 2}, {r: 6, c: 3}, {r: 6, c: 4}, {r: 6, c: 5},
  /* Up Col 6: 5 to 10 */
  {r: 5, c: 6}, {r: 4, c: 6}, {r: 3, c: 6}, {r: 2, c: 6}, {r: 1, c: 6}, {r: 0, c: 6},
  /* Top Edge: 11, 12 */
  {r: 0, c: 7}, {r: 0, c: 8},
  /* Down Col 8 (Green Start at 13): 13 to 17 */
  {r: 1, c: 8}, {r: 2, c: 8}, {r: 3, c: 8}, {r: 4, c: 8}, {r: 5, c: 8},
  /* Green Arm: 18 to 23 */
  {r: 6, c: 9}, {r: 6, c: 10}, {r: 6, c: 11}, {r: 6, c: 12}, {r: 6, c: 13}, {r: 6, c: 14},
  /* Right Edge: 24, 25 */
  {r: 7, c: 14}, {r: 8, c: 14},
  /* Left Row 8 (Yellow Start at 26): 26 to 30 */
  {r: 8, c: 13}, {r: 8, c: 12}, {r: 8, c: 11}, {r: 8, c: 10}, {r: 8, c: 9},
  /* Down Col 8: 31 to 36 */
  {r: 9, c: 8}, {r: 10, c: 8}, {r: 11, c: 8}, {r: 12, c: 8}, {r: 13, c: 8}, {r: 14, c: 8},
  /* Bottom Edge: 37, 38 */
  {r: 14, c: 7}, {r: 14, c: 6},
  /* Up Col 6 (Blue Start at 39): 39 to 43 */
  {r: 13, c: 6}, {r: 12, c: 6}, {r: 11, c: 6}, {r: 10, c: 6}, {r: 9, c: 6},
  /* Left Row 8: 44 to 49 */
  {r: 8, c: 5}, {r: 8, c: 4}, {r: 8, c: 3}, {r: 8, c: 2}, {r: 8, c: 1}, {r: 8, c: 0},
  /* Left Edge: 50, 51 */
  {r: 7, c: 0}, {r: 6, c: 0}
];

// 8 Safe Spots on Track (Indestructible Tiles)
const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

// Player Starting Indices on Outer Track
const START_INDEX = { red: 0, green: 13, yellow: 26, blue: 39 };

// Colored Home Runways (5 tiles each leading to Center)
const HOME_RUNWAYS = {
  red:    [{r: 7, c: 1}, {r: 7, c: 2}, {r: 7, c: 3}, {r: 7, c: 4}, {r: 7, c: 5}],
  green:  [{r: 1, c: 7}, {r: 2, c: 7}, {r: 3, c: 7}, {r: 4, c: 7}, {r: 5, c: 7}],
  yellow: [{r: 7, c: 13}, {r: 7, c: 12}, {r: 7, c: 11}, {r: 7, c: 10}, {r: 7, c: 9}],
  blue:   [{r: 13, c: 7}, {r: 12, c: 7}, {r: 11, c: 7}, {r: 10, c: 7}, {r: 9, c: 7}]
};

// Base Slot Coordinates (Row & Col) for the 4 tokens resting at base
const BASE_SLOTS = {
  red:    [{r: 1, c: 1}, {r: 1, c: 4}, {r: 4, c: 1}, {r: 4, c: 4}],
  green:  [{r: 1, c: 10}, {r: 1, c: 13}, {r: 4, c: 10}, {r: 4, c: 13}],
  yellow: [{r: 10, c: 10}, {r: 10, c: 13}, {r: 13, c: 10}, {r: 13, c: 13}],
  blue:   [{r: 10, c: 1}, {r: 10, c: 4}, {r: 13, c: 1}, {r: 13, c: 4}]
};

// --- 3. Pip Layouts for 3D Dice ---
const DICE_PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

// --- 4. Game State ---
let players = ['red', 'green', 'yellow', 'blue'];
let currentTurnIdx = 0;
let diceVal = null;
let hasRolled = false;
let isMoving = false;
let isAiMode = false;
let consecutiveSixes = 0;

// Tokens: 4 per active player
// stepCount: -1 = in base, 0..50 = track, 51..55 = home runway, 56 = finished goal
let tokens = {};

// Initialize Game
function startLudoGame(playerCount = 4, vsAi = false) {
  document.getElementById('modeModal').classList.add('hidden');
  isAiMode = vsAi;

  if (playerCount === 2) {
    players = ['red', 'yellow'];
  } else {
    players = ['red', 'green', 'yellow', 'blue'];
  }

  // Set up Pod visibility
  ['red', 'green', 'yellow', 'blue'].forEach(color => {
    const pod = document.getElementById(`pod-${color}`);
    if (players.includes(color)) {
      pod.classList.remove('disabled');
      if (isAiMode && color !== 'red') {
        pod.querySelector('.player-name').textContent = 'Hidames AI';
      }
    } else {
      pod.classList.add('disabled');
    }
  });

  // Initialize Pawns
  tokens = {};
  players.forEach(c => {
    tokens[c] = [0, 1, 2, 3].map(id => ({
      id,
      color: c,
      stepCount: -1 // at base
    }));
  });

  buildBoard();
  renderAllTokens();
  currentTurnIdx = 0;
  setActiveTurn(players[currentTurnIdx]);
}

// Build the 15x15 Grid Cells
function buildBoard() {
  const board = document.getElementById('ludoBoard');
  board.querySelectorAll('.cell, .base-quadrant, .center-goal').forEach(e => e.remove());

  // 1. Add 4 Base Quadrants
  board.insertAdjacentHTML('beforeend', `
    <div class="base-quadrant base-red"><div class="base-inner-card" id="slots-red"></div></div>
    <div class="base-quadrant base-green"><div class="base-inner-card" id="slots-green"></div></div>
    <div class="base-quadrant base-yellow"><div class="base-inner-card" id="slots-yellow"></div></div>
    <div class="base-quadrant base-blue"><div class="base-inner-card" id="slots-blue"></div></div>
  `);

  ['red', 'green', 'yellow', 'blue'].forEach(c => {
    const slotCard = document.getElementById(`slots-${c}`);
    for (let i = 0; i < 4; i++) {
      slotCard.innerHTML += `<div class="base-slot" id="slot-${c}-${i}"></div>`;
    }
  });

  // 2. Add Center Goal Triangles
  board.insertAdjacentHTML('beforeend', `
    <div class="center-goal">
      <div class="center-triangle-red"></div>
      <div class="center-triangle-green"></div>
      <div class="center-triangle-yellow"></div>
      <div class="center-triangle-blue"></div>
    </div>
  `);

  // 3. Add Path Cells (Row 0 to 14, Col 0 to 14)
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      // Skip cells inside the 4 bases or center goal
      const inRedBase = (r < 6 && c < 6);
      const inGreenBase = (r < 6 && c > 8);
      const inBlueBase = (r > 8 && c < 6);
      const inYellowBase = (r > 8 && c > 8);
      const inCenter = (r >= 6 && r <= 8 && c >= 6 && c <= 8);

      if (inRedBase || inGreenBase || inBlueBase || inYellowBase || inCenter) continue;

      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.style.gridRowStart = r + 1;
      cell.style.gridColumnStart = c + 1;

      // Color Home Runways
      if (r === 7 && c >= 1 && c <= 5) cell.classList.add('path-red');
      if (c === 7 && r >= 1 && r <= 5) cell.classList.add('path-green');
      if (r === 7 && c >= 9 && c <= 13) cell.classList.add('path-yellow');
      if (c === 7 && r >= 9 && r <= 13) cell.classList.add('path-blue');

      // Starting color tiles
      if (r === 6 && c === 1) cell.classList.add('path-red');
      if (r === 1 && c === 8) cell.classList.add('path-green');
      if (r === 8 && c === 13) cell.classList.add('path-yellow');
      if (r === 13 && c === 6) cell.classList.add('path-blue');

      // Safe Stars
      TRACK_COORDINATES.forEach((coord, idx) => {
        if (coord.r === r && coord.c === c && SAFE_INDICES.includes(idx)) {
          cell.classList.add('safe-star');
        }
      });

      board.appendChild(cell);
    }
  }
}

// Active Turn Switcher
function setActiveTurn(color) {
  hasRolled = false;
  diceVal = null;
  clearHighlights();

  document.querySelectorAll('.player-pod').forEach(p => p.classList.remove('active-turn'));
  const activePod = document.getElementById(`pod-${color}`);
  if (activePod) activePod.classList.add('active-turn');

  const banner = document.getElementById('turnBanner');
  banner.textContent = `${color.toUpperCase()}'S TURN - ROLL THE DICE!`;
  banner.style.color = `var(--${color})`;

  // If AI's turn, trigger roll automatically
  if (isAiMode && color !== 'red') {
    setTimeout(rollDice, 900);
  }
}

// Dice Rolling
function rollDice() {
  if (hasRolled || isMoving) return;
  sounds.roll();

  const color = players[currentTurnIdx];
  const diceBox = document.getElementById(`dice-${color}`);
  const diceElem = diceBox.querySelector('.dice');

  diceElem.classList.add('rolling');
  hasRolled = true;

  setTimeout(() => {
    diceElem.classList.remove('rolling');
    diceVal = Math.floor(Math.random() * 6) + 1;
    renderDicePips(diceElem, diceVal);

    if (diceVal === 6) {
      consecutiveSixes++;
      showToast('🎲 ROLLED A 6! +1 EXTRA ROLL!');
    } else {
      consecutiveSixes = 0;
    }

    evaluateMoves(color, diceVal);
  }, 600);
}

function renderDicePips(diceElem, val) {
  let grid = `<div class="pip-grid pip-${val}">`;
  const activePips = DICE_PIPS[val] || [];
  for (let i = 0; i < 9; i++) {
    grid += activePips.includes(i) ? `<span></span>` : `<div></div>`;
  }
  grid += `</div>`;
  diceElem.innerHTML = grid;
}

// Evaluate Eligible Moves for Current Player
function evaluateMoves(color, roll) {
  const playerTokens = tokens[color];
  const movable = [];

  playerTokens.forEach(token => {
    // 1. Can exit base on a 6
    if (token.stepCount === -1 && roll === 6) {
      movable.push(token);
    }
    // 2. Can advance along track/runway
    else if (token.stepCount >= 0 && token.stepCount + roll <= 56) {
      movable.push(token);
    }
  });

  if (movable.length === 0) {
    showToast('NO VALID MOVES');
    setTimeout(nextTurn, 1000);
    return;
  }

  // If only 1 piece can move, auto move it for swift play
  if (movable.length === 1 && (isAiMode || movable[0].stepCount >= 0)) {
    moveToken(movable[0]);
    return;
  }

  // Highlight all eligible pawns
  movable.forEach(tok => {
    const el = document.getElementById(`pawn-${tok.color}-${tok.id}`);
    if (el) el.classList.add('can-move');
  });

  // AI Choice: Prefer knocking opponents, or moving closest to finish, or unlocking
  if (isAiMode && color !== 'red') {
    setTimeout(() => {
      const best = movable.find(t => t.stepCount === -1) || movable[0];
      moveToken(best);
    }, 700);
  }
}

// Move Token Step-by-Step
async function moveToken(token) {
  if (isMoving) return;
  isMoving = true;
  clearHighlights();

  const roll = diceVal;

  // Case 1: Unlocking from Base
  if (token.stepCount === -1) {
    token.stepCount = 0; // Spawn onto starting square
    sounds.unlock();
    renderAllTokens();
    await sleep(250);
  }
  // Case 2: Advance along track with Hop Animation
  else {
    const startStep = token.stepCount;
    const targetStep = token.stepCount + roll;

    for (let step = startStep + 1; step <= targetStep; step++) {
      token.stepCount = step;
      sounds.step();
      renderAllTokens();
      await sleep(160);
    }
  }

  // Check Captures (Knockouts)
  let awardedExtraRoll = false;
  if (token.stepCount >= 0 && token.stepCount <= 50) {
    const tileIdx = (START_INDEX[token.color] + token.stepCount) % 52;

    // Check if not on a safe star
    if (!SAFE_INDICES.includes(tileIdx)) {
      // Find opponent on the same tile
      players.forEach(c => {
        if (c !== token.color) {
          tokens[c].forEach(opp => {
            if (opp.stepCount >= 0 && opp.stepCount <= 50) {
              const oppTile = (START_INDEX[opp.color] + opp.stepCount) % 52;
              if (oppTile === tileIdx) {
                // KNOCKOUT!
                opp.stepCount = -1;
                sounds.capture();
                showToast(`⚔️ ${token.color.toUpperCase()} KNOCKED OUT ${opp.color.toUpperCase()}!`);
                awardedExtraRoll = true;
              }
            }
          });
        }
      });
    }
  }

  // Check Win Condition
  const hasWon = tokens[token.color].every(t => t.stepCount === 56);
  if (hasWon) {
    sounds.win();
    document.getElementById('winnerText').textContent = `${token.color.toUpperCase()} WINS!`;
    document.getElementById('winnerModal').classList.remove('hidden');
    isMoving = false;
    return;
  }

  isMoving = false;

  // Extra Roll on 6 or Knockout
  if ((roll === 6 && consecutiveSixes < 3) || awardedExtraRoll) {
    hasRolled = false;
    diceVal = null;
    showToast('🎉 BONUS ROLL!');
    const activePod = document.getElementById(`pod-${token.color}`);
    activePod.classList.add('active-turn');
    if (isAiMode && token.color !== 'red') setTimeout(rollDice, 900);
  } else {
    nextTurn();
  }
}

// Next Player Turn
function nextTurn() {
  currentTurnIdx = (currentTurnIdx + 1) % players.length;
  setActiveTurn(players[currentTurnIdx]);
}

// Render All Tokens on the Board
function renderAllTokens() {
  // Clear existing rendered pawns
  document.querySelectorAll('.pawn').forEach(p => p.remove());

  // Count overlaps to neatly cluster stacked pawns
  const cellOccupants = {};

  players.forEach(c => {
    tokens[c].forEach(tok => {
      let r, col;

      if (tok.stepCount === -1) {
        // In Base Slot
        const slot = BASE_SLOTS[tok.color][tok.id];
        r = slot.r;
        col = slot.c;
      } else if (tok.stepCount <= 50) {
        // On Outer Track
        const trackIdx = (START_INDEX[tok.color] + tok.stepCount) % 52;
        r = TRACK_COORDINATES[trackIdx].r;
        col = TRACK_COORDINATES[trackIdx].c;
      } else if (tok.stepCount < 56) {
        // On Home Runway
        const runwayIdx = tok.stepCount - 51;
        r = HOME_RUNWAYS[tok.color][runwayIdx].r;
        col = HOME_RUNWAYS[tok.color][runwayIdx].c;
      } else {
        // Finished in Center
        r = 7; col = 7;
      }

      const key = `${r}-${col}`;
      if (!cellOccupants[key]) cellOccupants[key] = [];
      cellOccupants[key].push({ tok, r, col });
    });
  });

  // Inject Pawns with Stack offsets
  Object.keys(cellOccupants).forEach(key => {
    const list = cellOccupants[key];
    list.forEach((item, stackIdx) => {
      const { tok, r, col } = item;
      const pawn = document.createElement('div');
      pawn.id = `pawn-${tok.color}-${tok.id}`;
      pawn.className = `pawn pawn-${tok.color}`;

      if (list.length > 1) {
        pawn.classList.add(`stacked-${(stackIdx % 4) + 1}`);
      }

      pawn.style.gridRowStart = r + 1;
      pawn.style.gridColumnStart = col + 1;

      pawn.onclick = () => {
        if (pawn.classList.contains('can-move') && !isMoving) {
          moveToken(tok);
        }
      };

      document.getElementById('ludoBoard').appendChild(pawn);
    });
  });
}

function clearHighlights() {
  document.querySelectorAll('.pawn').forEach(p => p.classList.remove('can-move'));
}

function showToast(msg) {
  const toast = document.getElementById('eventToast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Bind Click Listeners to Player Dice Boxes
document.addEventListener('DOMContentLoaded', () => {
  ['red', 'green', 'yellow', 'blue'].forEach(c => {
    const box = document.getElementById(`dice-${c}`);
    if (box) {
      box.onclick = () => {
        if (players[currentTurnIdx] === c && (!isAiMode || c === 'red')) {
          rollDice();
        }
      };
    }
  });

  // Sound Toggle Button
  const sndBtn = document.getElementById('soundToggleBtn');
  if (sndBtn) {
    sndBtn.onclick = () => {
      sounds.enabled = !sounds.enabled;
      sndBtn.textContent = sounds.enabled ? '🔊' : '🔇';
    };
  }

  // Restart Button
  const rstBtn = document.getElementById('restartBtn');
  if (rstBtn) {
    rstBtn.onclick = () => {
      document.getElementById('modeModal').classList.remove('hidden');
    };
  }
});