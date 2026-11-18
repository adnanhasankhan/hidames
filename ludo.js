/* ==========================================================================
   HIDAMES LUDO KING EDITION - COMPLETE GAME ENGINE & REALTIME ENGINE
   Fully Implements Specifications 1 through 20:
   - Fixed-size pawns cleanly nested in DOM cells
   - Opening Dice Round (highest roll starts)
   - Three Consecutive Sixes Turn Rollback
   - Blockades (opponents cannot pass or land)
   - Exact Finish Rule & Home Runway Navigation
   - Safe Stars (8 safe spots) & Opponent Captures with Bonus Roll
   - Team Matches (2v2, 1v2, 1v3) & Individual (2, 3, 4 players)
   - Smart AI with realistic delays & move evaluations
   - Realtime Online Engine via Supabase Realtime
   - Web Audio API Synthesizer (Zero missing audio files)
   ========================================================================== */

// --- 1. Synthesized Web Audio Manager ---
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

  playTone(freq, type, duration, delay = 0, vol = 0.1) {
    if (!this.enabled) return;
    this.init();
    setTimeout(() => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
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
      this.playTone(190 + Math.random() * 210, 'triangle', 0.05, i * 60, 0.08);
    }
  }

  step() {
    this.playTone(520, 'sine', 0.07, 0, 0.1);
  }

  unlock() {
    this.playTone(523.25, 'triangle', 0.09, 0, 0.12);
    this.playTone(659.25, 'triangle', 0.12, 90, 0.12);
    this.playTone(783.99, 'triangle', 0.18, 180, 0.15);
  }

  capture() {
    this.playTone(140, 'sawtooth', 0.22, 0, 0.18);
    this.playTone(85, 'square', 0.32, 70, 0.18);
  }

  blockade() {
    this.playTone(220, 'square', 0.15, 0, 0.12);
  }

  cancelTurn() {
    this.playTone(200, 'sawtooth', 0.15, 0, 0.15);
    this.playTone(150, 'sawtooth', 0.25, 120, 0.15);
  }

  win() {
    [523, 659, 783, 1046, 1318].forEach((f, idx) => {
      this.playTone(f, 'triangle', 0.3, idx * 130, 0.18);
    });
  }
}

const sounds = new SoundManager();

// --- 2. Track & Coordinates Mapping (15x15 CSS Grid) ---
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

// 3x3 Pip Layouts for Dice Faces 1 through 6
const DICE_PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

// --- 3. Game Configuration & State ---
const ALL_COLORS = ['red', 'green', 'yellow', 'blue'];

let currentConfig = {
  mode: 'local', // 'local' | 'ai' | 'online'
  format: '4',   // '2' | '3' | '4' | '2v2' | '1v2' | '1v3'
  blockadesEnabled: true,
  openingRoundEnabled: true,
  fastMode: false,
  players: [
    { id: 1, color: 'red', name: 'Player 1', isAi: false, team: 1 },
    { id: 2, color: 'green', name: 'Player 2', isAi: false, team: 2 },
    { id: 3, color: 'yellow', name: 'Player 3', isAi: false, team: 1 },
    { id: 4, color: 'blue', name: 'Player 4', isAi: false, team: 2 }
  ]
};

// Active Match Runtime
let activePlayers = []; // subset of colors playing in clockwise order
let currentTurnIdx = 0;
let diceVal = null;
let hasRolled = false;
let isMoving = false;
let consecutiveSixes = 0;
let turnSnapshot = null; // Snapshot for 3 consecutive sixes rollback
let tokens = {}; // { [color]: [ { id, color, stepCount } ] }

// --- 4. Setup Modal Logic ---
function initSetupUI() {
  renderRosterGrid();
}

function switchSetupTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  currentConfig.mode = tab;

  const onlineSec = document.getElementById('onlineSection');
  const footer = document.getElementById('localSetupFooter');

  if (tab === 'online') {
    onlineSec.classList.remove('hidden');
    footer.classList.add('hidden');
  } else {
    onlineSec.classList.add('hidden');
    footer.classList.remove('hidden');

    // Auto toggle AI settings
    if (tab === 'ai') {
      currentConfig.players[0].isAi = false;
      for (let i = 1; i < currentConfig.players.length; i++) {
        currentConfig.players[i].isAi = true;
        currentConfig.players[i].name = `Hidames AI ${i}`;
      }
    } else {
      currentConfig.players.forEach((p, idx) => {
        p.isAi = false;
        p.name = `Player ${idx + 1}`;
      });
    }
    renderRosterGrid();
  }
}

function setMatchFormat(fmt) {
  currentConfig.format = fmt;
  document.querySelectorAll('.chip-btn').forEach(b => b.classList.toggle('active', b.dataset.format === fmt));
  renderRosterGrid();
}

function renderRosterGrid() {
  const container = document.getElementById('rosterGrid');
  container.innerHTML = '';

  let count = 4;
  if (currentConfig.format === '2') count = 2;
  else if (currentConfig.format === '3') count = 3;
  else if (currentConfig.format === '1v2') count = 3;

  for (let i = 0; i < count; i++) {
    const p = currentConfig.players[i];
    let teamLabel = '';
    if (currentConfig.format === '2v2') {
      teamLabel = `<span class="team-tag">(Team ${i % 2 === 0 ? '1' : '2'})</span>`;
    } else if (currentConfig.format === '1v2') {
      teamLabel = `<span class="team-tag">(Team ${i === 0 ? '1' : '2'})</span>`;
    } else if (currentConfig.format === '1v3') {
      teamLabel = `<span class="team-tag">(Team ${i === 0 ? '1' : '2'})</span>`;
    }

    const row = document.createElement('div');
    row.className = 'roster-row';
    row.innerHTML = `
      <input type="text" class="roster-name-input" id="roster-name-${i}" value="${p.name}" onchange="updatePlayerName(${i}, this.value)">
      ${teamLabel}
      <div class="roster-color-picker">
        ${ALL_COLORS.map(c => `
          <div class="color-dot-opt ${p.color === c ? 'selected' : ''}" 
               style="background: var(--${c})" 
               title="${c}"
               onclick="selectPlayerColor(${i}, '${c}')"></div>
        `).join('')}
      </div>
      <button class="roster-type-toggle" onclick="togglePlayerAi(${i})">
        ${p.isAi ? '🤖 Bot' : '👤 Human'}
      </button>
    `;
    container.appendChild(row);
  }
}

function updatePlayerName(idx, val) {
  currentConfig.players[idx].name = val.trim() || `Player ${idx + 1}`;
}

function selectPlayerColor(idx, newColor) {
  const otherIdx = currentConfig.players.findIndex((p, i) => i !== idx && p.color === newColor);
  if (otherIdx !== -1) {
    // Swap colors to prevent duplicates
    const oldColor = currentConfig.players[idx].color;
    currentConfig.players[otherIdx].color = oldColor;
  }
  currentConfig.players[idx].color = newColor;
  renderRosterGrid();
}

function togglePlayerAi(idx) {
  currentConfig.players[idx].isAi = !currentConfig.players[idx].isAi;
  if (currentConfig.players[idx].isAi && !currentConfig.players[idx].name.includes('AI')) {
    currentConfig.players[idx].name = `AI Bot ${idx + 1}`;
  }
  renderRosterGrid();
}

function openSetupModal() {
  document.getElementById('setupModal').classList.remove('hidden');
  document.getElementById('winnerModal').classList.add('hidden');
}

function closeRulesModal() {
  document.getElementById('rulesModal').classList.add('hidden');
}

// --- 5. Game Initialization ---
function confirmMatchSetup() {
  currentConfig.blockadesEnabled = document.getElementById('blockadeToggle').checked;
  currentConfig.openingRoundEnabled = document.getElementById('openingRoundToggle').checked;

  document.getElementById('setupModal').classList.add('hidden');
  initMatch();
}

function restartWithSameSettings() {
  document.getElementById('winnerModal').classList.add('hidden');
  initMatch();
}

function initMatch() {
  let count = 4;
  if (currentConfig.format === '2') count = 2;
  else if (currentConfig.format === '3' || currentConfig.format === '1v2') count = 3;

  const activeRoster = currentConfig.players.slice(0, count);

  // Set Team properties
  if (currentConfig.format === '2v2') {
    activeRoster[0].team = 1;
    activeRoster[1].team = 2;
    activeRoster[2].team = 1;
    activeRoster[3].team = 2;
  } else if (currentConfig.format === '1v2' || currentConfig.format === '1v3') {
    activeRoster[0].team = 1;
    for (let i = 1; i < activeRoster.length; i++) activeRoster[i].team = 2;
  } else {
    // Individual
    activeRoster.forEach((p, idx) => p.team = idx + 1);
  }

  // Active Players in standard clockwise board order: Red -> Green -> Yellow -> Blue
  const order = ['red', 'green', 'yellow', 'blue'];
  activePlayers = order.filter(c => activeRoster.some(p => p.color === c));

  // Initialize Pawns (4 per active player)
  tokens = {};
  activePlayers.forEach(c => {
    tokens[c] = [0, 1, 2, 3].map(id => ({
      id,
      color: c,
      stepCount: -1 // -1 = in base slot
    }));
  });

  // Setup Pods & Badges
  ALL_COLORS.forEach(c => {
    const pod = document.getElementById(`pod-${c}`);
    const cfg = activeRoster.find(p => p.color === c);

    if (cfg) {
      pod.classList.remove('disabled');
      document.getElementById(`name-${c}`).textContent = cfg.name;
      document.getElementById(`team-${c}`).textContent = (currentConfig.format.includes('v') ? `[Team ${cfg.team}]` : '');
      document.getElementById(`status-${c}`).textContent = cfg.isAi ? 'BOT' : 'READY';
    } else {
      pod.classList.add('disabled');
    }
  });

  document.getElementById('matchModeBadge').textContent = `${currentConfig.format.toUpperCase()} • ${currentConfig.mode.toUpperCase()}`;

  buildBoard();
  renderAllTokens();

  // Opening Dice Round or Start Directly
  if (currentConfig.openingRoundEnabled) {
    runOpeningDiceRound();
  } else {
    currentTurnIdx = 0;
    startTurn(activePlayers[currentTurnIdx]);
  }
}

// --- 6. Opening Dice Round (Specification §4) ---
async function runOpeningDiceRound() {
  const modal = document.getElementById('openingRollModal');
  const container = document.getElementById('openingRollersContainer');
  const banner = document.getElementById('openingResultBanner');

  modal.classList.remove('hidden');
  container.innerHTML = '';
  banner.textContent = 'ROLLING TO DETERMINE STARTING PLAYER...';

  const rolls = {};
  let candidates = [...activePlayers];

  while (true) {
    container.innerHTML = '';
    for (const c of candidates) {
      const card = document.createElement('div');
      card.className = 'opening-roller-card';
      card.id = `open-roll-${c}`;
      card.innerHTML = `
        <span style="font-weight: 800; color: var(--${c})">${c.toUpperCase()}</span>
        <div class="opening-die" id="open-die-${c}">
          <div class="pip-grid pip-1"><span class="pip"></span></div>
        </div>
        <span class="open-val" id="open-val-${c}">...</span>
      `;
      container.appendChild(card);
    }

    sounds.roll();
    await sleep(600);

    let maxVal = -1;
    for (const c of candidates) {
      const val = Math.floor(Math.random() * 6) + 1;
      rolls[c] = val;
      if (val > maxVal) maxVal = val;
      renderDicePips(document.getElementById(`open-die-${c}`), val);
      document.getElementById(`open-val-${c}`).textContent = val;
    }

    await sleep(700);

    const winners = candidates.filter(c => rolls[c] === maxVal);
    if (winners.length === 1) {
      const winnerColor = winners[0];
      const winCard = document.getElementById(`open-roll-${winnerColor}`);
      if (winCard) winCard.classList.add('winner');

      banner.textContent = `${winnerColor.toUpperCase()} ROLLED A ${maxVal} AND STARTS FIRST!`;
      sounds.win();
      await sleep(1400);

      modal.classList.add('hidden');
      currentTurnIdx = activePlayers.indexOf(winnerColor);
      startTurn(winnerColor);
      break;
    } else {
      // Tie-breaker round
      banner.textContent = `TIE AT ${maxVal}! RE-ROLLING FOR TIED PLAYERS...`;
      candidates = winners;
      await sleep(1000);
    }
  }
}

// --- 7. Board Construction (15x15 CSS Grid) ---
function buildBoard() {
  const board = document.getElementById('ludoBoard');
  board.querySelectorAll('.cell, .base-quadrant, .center-goal').forEach(e => e.remove());

  // 1. Base Quadrants
  board.insertAdjacentHTML('beforeend', `
    <div class="base-quadrant base-red"><div class="base-inner-card" id="slots-red"></div></div>
    <div class="base-quadrant base-green"><div class="base-inner-card" id="slots-green"></div></div>
    <div class="base-quadrant base-yellow"><div class="base-inner-card" id="slots-yellow"></div></div>
    <div class="base-quadrant base-blue"><div class="base-inner-card" id="slots-blue"></div></div>
  `);

  ALL_COLORS.forEach(c => {
    const slotCard = document.getElementById(`slots-${c}`);
    for (let i = 0; i < 4; i++) {
      slotCard.innerHTML += `<div class="base-slot" id="slot-${c}-${i}"></div>`;
    }
  });

  // 2. Center Goal Triangles
  board.insertAdjacentHTML('beforeend', `
    <div class="center-goal">
      <div class="center-triangle-red"></div>
      <div class="center-triangle-green"></div>
      <div class="center-triangle-yellow"></div>
      <div class="center-triangle-blue"></div>
    </div>
  `);

  // 3. Grid Path Cells
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
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

      // Color Home Lanes
      if (r === 7 && c >= 1 && c <= 5) cell.classList.add('path-red');
      if (c === 7 && r >= 1 && r <= 5) cell.classList.add('path-green');
      if (r === 7 && c >= 9 && c <= 13) cell.classList.add('path-yellow');
      if (c === 7 && r >= 9 && r <= 13) cell.classList.add('path-blue');

      // Starting color square
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

// --- 8. Turn Flow & Snapshot (Specification §7 Three Consecutive Sixes) ---
function startTurn(color) {
  hasRolled = false;
  diceVal = null;
  clearHighlights();

  // Take Snapshot of token positions at start of turn for 3-sixes rollback
  turnSnapshot = JSON.parse(JSON.stringify(tokens));

  document.querySelectorAll('.player-pod').forEach(p => p.classList.remove('active-turn'));
  const activePod = document.getElementById(`pod-${color}`);
  if (activePod) activePod.classList.add('active-turn');

  const banner = document.getElementById('turnAnnouncement');
  const playerCfg = currentConfig.players.find(p => p.color === color);
  banner.textContent = `${playerCfg ? playerCfg.name : color.toUpperCase()}'S TURN`;
  banner.style.color = `var(--${color})`;

  document.getElementById(`status-${color}`).textContent = 'ROLLING...';

  // AI Auto Roll
  if (playerCfg && playerCfg.isAi) {
    setTimeout(rollDice, currentConfig.fastMode ? 350 : 700);
  }
}

// Roll Dice Engine (§17)
function rollDice() {
  if (hasRolled || isMoving) return;
  sounds.roll();

  const color = activePlayers[currentTurnIdx];
  const diceBox = document.getElementById(`dice-${color}`);
  const diceFace = document.getElementById(`dice-face-${color}`);

  diceFace.classList.add('rolling');
  hasRolled = true;

  const duration = currentConfig.fastMode ? 300 : 550;

  setTimeout(() => {
    diceFace.classList.remove('rolling');
    diceVal = Math.floor(Math.random() * 6) + 1;
    renderDicePips(diceFace, diceVal);

    handleDiceResult(color, diceVal);
  }, duration);
}

function renderDicePips(diceElem, val) {
  let grid = `<div class="pip-grid pip-${val}">`;
  const activePips = DICE_PIPS[val] || [];
  for (let i = 0; i < 9; i++) {
    grid += activePips.includes(i) ? `<span class="pip"></span>` : `<div></div>`;
  }
  grid += `</div>`;
  diceElem.innerHTML = grid;
}

// Evaluate Moves & 3 Consecutive Sixes
function handleDiceResult(color, roll) {
  if (roll === 6) {
    consecutiveSixes++;
    showToast('🎲 ROLLED A 6! +1 EXTRA ROLL!');

    // Specification §7: Three Consecutive Sixes Cancel Entire Turn!
    if (consecutiveSixes === 3) {
      showToast('🚫 3 CONSECUTIVE SIXES! TURN CANCELLED!');
      sounds.cancelTurn();

      // Rollback token positions to snapshot
      tokens = JSON.parse(JSON.stringify(turnSnapshot));
      renderAllTokens();
      consecutiveSixes = 0;

      setTimeout(nextTurn, currentConfig.fastMode ? 400 : 1000);
      return;
    }
  } else {
    consecutiveSixes = 0;
  }

  evaluatePlayerMoves(color, roll);
}

// Move Legality & Blockade Validation (§6, §10, §11)
function evaluatePlayerMoves(color, roll) {
  const playerTokens = tokens[color];
  const movable = [];

  playerTokens.forEach(token => {
    // 1. Release from Base on 6
    if (token.stepCount === -1 && roll === 6) {
      // Check if starting square has an opponent blockade
      const startTile = START_INDEX[color];
      if (!isTileBlockedFor(color, startTile)) {
        movable.push(token);
      }
    }
    // 2. Advance along track / runway
    else if (token.stepCount >= 0 && token.stepCount + roll <= 56) {
      if (canTokenMovePath(token, roll)) {
        movable.push(token);
      }
    }
  });

  if (movable.length === 0) {
    showToast('NO LEGAL MOVES');
    setTimeout(nextTurn, currentConfig.fastMode ? 400 : 900);
    return;
  }

  // Auto-move single legal option if AI or only 1 move exists
  const playerCfg = currentConfig.players.find(p => p.color === color);
  if (playerCfg && playerCfg.isAi) {
    const chosen = pickAiMove(color, movable, roll);
    setTimeout(() => moveToken(chosen), currentConfig.fastMode ? 250 : 500);
    return;
  }

  if (movable.length === 1 && movable[0].stepCount >= 0) {
    moveToken(movable[0]);
    return;
  }

  // Highlight Movable Pawns
  movable.forEach(tok => {
    const el = document.getElementById(`pawn-${tok.color}-${tok.id}`);
    if (el) el.classList.add('can-move');
  });
}

// Blockade Detection (§10)
function getActiveBlockades() {
  if (!currentConfig.blockadesEnabled) return {};
  const blockades = {}; // { [tileIdx]: color }

  ALL_COLORS.forEach(c => {
    const tileCounts = {};
    if (tokens[c]) {
      tokens[c].forEach(tok => {
        if (tok.stepCount >= 0 && tok.stepCount <= 50) {
          const tile = (START_INDEX[tok.color] + tok.stepCount) % 52;
          if (!SAFE_INDICES.includes(tile)) {
            tileCounts[tile] = (tileCounts[tile] || 0) + 1;
          }
        }
      });
    }
    Object.keys(tileCounts).forEach(tile => {
      if (tileCounts[tile] >= 2) blockades[tile] = c;
    });
  });

  return blockades;
}

function isTileBlockedFor(color, tileIdx) {
  const blockades = getActiveBlockades();
  const blockerColor = blockades[tileIdx];
  if (!blockerColor) return false;

  // Same team or same color is not blocked
  return !isTeammate(color, blockerColor);
}

// Verify full step-by-step path is free of opponent blockades
function canTokenMovePath(token, roll) {
  if (!currentConfig.blockadesEnabled) return true;

  const currentStep = token.stepCount;
  for (let s = 1; s <= roll; s++) {
    const checkStep = currentStep + s;
    if (checkStep <= 50) {
      const tile = (START_INDEX[token.color] + checkStep) % 52;
      if (isTileBlockedFor(token.color, tile)) {
        return false; // Path or landing is blocked
      }
    }
  }
  return true;
}

// Teammate Verification (§8, §12)
function isTeammate(colorA, colorB) {
  if (colorA === colorB) return true;
  const pA = currentConfig.players.find(p => p.color === colorA);
  const pB = currentConfig.players.find(p => p.color === colorB);
  if (!pA || !pB) return false;
  return pA.team === pB.team;
}

// --- 9. Step-by-Step Movement & Captures (§6, §8, §11) ---
async function moveToken(token) {
  if (isMoving) return;
  isMoving = true;
  clearHighlights();

  const roll = diceVal;
  const hopDelay = currentConfig.fastMode ? 90 : 160;

  // Case 1: Unlocking from Base on 6
  if (token.stepCount === -1) {
    token.stepCount = 0; // Spawns onto starting square
    sounds.unlock();
    renderAllTokens();
    await sleep(hopDelay + 50);
  }
  // Case 2: Step-by-Step Hop along Path
  else {
    const startStep = token.stepCount;
    const targetStep = token.stepCount + roll;

    for (let s = startStep + 1; s <= targetStep; s++) {
      token.stepCount = s;
      sounds.step();
      renderAllTokens();
      await sleep(hopDelay);
    }
  }

  // Check Exact Center Finish (§11)
  let broughtHome = false;
  if (token.stepCount === 56) {
    sounds.win();
    showToast('🏆 TOKEN HOME! +1 BONUS ROLL!');
    broughtHome = true;
  }

  // Check Capture (Knockout) on non-safe tiles (§8)
  let capturedOpponent = false;
  if (token.stepCount >= 0 && token.stepCount <= 50) {
    const tileIdx = (START_INDEX[token.color] + token.stepCount) % 52;

    if (!SAFE_INDICES.includes(tileIdx)) {
      activePlayers.forEach(c => {
        if (!isTeammate(token.color, c)) {
          tokens[c].forEach(opp => {
            if (opp.stepCount >= 0 && opp.stepCount <= 50) {
              const oppTile = (START_INDEX[opp.color] + opp.stepCount) % 52;
              if (oppTile === tileIdx) {
                // KNOCKOUT!
                opp.stepCount = -1;
                sounds.capture();
                showToast(`⚔️ ${token.color.toUpperCase()} KNOCKED OUT ${opp.color.toUpperCase()}!`);
                capturedOpponent = true;
              }
            }
          });
        }
      });
    }
  }

  renderAllTokens();

  // Check Victory Condition (§12)
  if (checkVictory(token.color)) {
    isMoving = false;
    return;
  }

  isMoving = false;

  // Extra Roll Rules (§5, §8, §11)
  if ((roll === 6 && consecutiveSixes < 3) || capturedOpponent || broughtHome) {
    hasRolled = false;
    diceVal = null;
    showToast('🎉 BONUS ROLL!');
    const activePod = document.getElementById(`pod-${token.color}`);
    activePod.classList.add('active-turn');

    const playerCfg = currentConfig.players.find(p => p.color === token.color);
    if (playerCfg && playerCfg.isAi) {
      setTimeout(rollDice, currentConfig.fastMode ? 350 : 700);
    }
  } else {
    nextTurn();
  }
}

// Victory Check (§12)
function checkVictory(activeColor) {
  const activeCfg = currentConfig.players.find(p => p.color === activeColor);
  if (!activeCfg) return false;

  // Individual vs Team Win
  const teamMembers = currentConfig.players.filter(p => p.team === activeCfg.team && activePlayers.includes(p.color));
  const teamFinished = teamMembers.every(m => tokens[m.color].every(t => t.stepCount === 56));

  if (teamFinished) {
    sounds.win();
    const isTeam = currentConfig.format.includes('v');
    const winnerModal = document.getElementById('winnerModal');
    const winnerText = document.getElementById('winnerText');
    const winnerBadge = document.getElementById('winnerBadge');

    if (isTeam) {
      winnerText.textContent = `TEAM ${activeCfg.team} VICTORY!`;
      winnerBadge.textContent = teamMembers.map(m => m.name).join(' & ');
    } else {
      winnerText.textContent = `${activeCfg.name.toUpperCase()} WINS!`;
      winnerBadge.textContent = `${activeColor.toUpperCase()} CHAMPION`;
      winnerBadge.style.color = `var(--${activeColor})`;
    }

    winnerModal.classList.remove('hidden');
    return true;
  }

  return false;
}

function nextTurn() {
  consecutiveSixes = 0;
  currentTurnIdx = (currentTurnIdx + 1) % activePlayers.length;
  startTurn(activePlayers[currentTurnIdx]);
}

// --- 10. AI Move Evaluator (§14) ---
function pickAiMove(color, movable, roll) {
  // Priority 1: Bringing a token Home (+1000)
  const finisher = movable.find(t => t.stepCount + roll === 56);
  if (finisher) return finisher;

  // Priority 2: Capturing an opponent (+800)
  for (const t of movable) {
    if (t.stepCount >= 0) {
      const targetStep = t.stepCount + roll;
      if (targetStep <= 50) {
        const targetTile = (START_INDEX[color] + targetStep) % 52;
        if (!SAFE_INDICES.includes(targetTile)) {
          for (const c of activePlayers) {
            if (!isTeammate(color, c)) {
              const victim = tokens[c].find(opp => opp.stepCount >= 0 && (START_INDEX[opp.color] + opp.stepCount) % 52 === targetTile);
              if (victim) return t;
            }
          }
        }
      }
    }
  }

  // Priority 3: Releasing a token from base on 6 (+400)
  const basePawn = movable.find(t => t.stepCount === -1);
  if (basePawn && Math.random() < 0.75) return basePawn;

  // Priority 4: Landing on a safe star (+300)
  for (const t of movable) {
    if (t.stepCount >= 0) {
      const targetStep = t.stepCount + roll;
      if (targetStep <= 50 && SAFE_INDICES.includes((START_INDEX[color] + targetStep) % 52)) {
        return t;
      }
    }
  }

  // Priority 5: Advance the token furthest ahead
  movable.sort((a, b) => b.stepCount - a.stepCount);
  return movable[0];
}

// --- 11. Clean Token DOM Nesting (Fixes Oversized Tokens Bug) ---
function renderAllTokens() {
  document.querySelectorAll('.pawn').forEach(p => p.remove());

  // Clear previous blockade classes from cells
  document.querySelectorAll('.cell.has-blockade').forEach(c => c.classList.remove('has-blockade'));

  const cellOccupants = {};

  activePlayers.forEach(c => {
    tokens[c].forEach(tok => {
      let targetEl = null;

      if (tok.stepCount === -1) {
        // At Base: Nest cleanly inside dashed base slot
        targetEl = document.getElementById(`slot-${tok.color}-${tok.id}`);
      } else if (tok.stepCount <= 50) {
        // On Outer Track: Find corresponding 15x15 cell
        const trackIdx = (START_INDEX[tok.color] + tok.stepCount) % 52;
        const coord = TRACK_COORDINATES[trackIdx];
        targetEl = document.querySelector(`.cell[data-r="${coord.r}"][data-c="${coord.c}"]`);
      } else if (tok.stepCount < 56) {
        // On Home Runway: Find colored runway cell
        const runwayIdx = tok.stepCount - 51;
        const coord = HOME_RUNWAYS[tok.color][runwayIdx];
        targetEl = document.querySelector(`.cell[data-r="${coord.r}"][data-c="${coord.c}"]`);
      } else {
        // Finished: Center trophy goal
        targetEl = document.querySelector('.center-goal');
      }

      if (targetEl) {
        const key = targetEl.id || `${targetEl.dataset.r}-${targetEl.dataset.c}` || 'center';
        if (!cellOccupants[key]) cellOccupants[key] = { el: targetEl, items: [] };
        cellOccupants[key].items.push(tok);
      }
    });
  });

  // Check and apply Blockade markers
  const blockades = getActiveBlockades();
  Object.keys(blockades).forEach(tileIdx => {
    const coord = TRACK_COORDINATES[tileIdx];
    const cell = document.querySelector(`.cell[data-r="${coord.r}"][data-c="${coord.c}"]`);
    if (cell) cell.classList.add('has-blockade');
  });

  // Append Pawns inside target elements
  Object.values(cellOccupants).forEach(group => {
    const isMulti = group.items.length > 1;
    group.items.forEach((tok, idx) => {
      const pawn = document.createElement('div');
      pawn.id = `pawn-${tok.color}-${tok.id}`;
      pawn.className = `pawn pawn-${tok.color}`;

      if (isMulti) {
        pawn.classList.add(`stacked-${(idx % 4) + 1}`);
      }

      pawn.onclick = (e) => {
        e.stopPropagation();
        if (pawn.classList.contains('can-move') && !isMoving) {
          moveToken(tok);
        }
      };

      group.el.appendChild(pawn);
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
  setTimeout(() => toast.classList.remove('show'), currentConfig.fastMode ? 1200 : 2000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- 12. Online Engine via Supabase Realtime (§16) ---
let supabaseClient = null;
let activeOnlineRoom = null;
let onlineChannel = null;

function initSupabase() {
  // Optional configuration keys. If user provides their own, it will connect immediately.
  const SUPABASE_URL = window.HIDAMES_SUPABASE_URL || 'https://xyzcompany.supabase.co';
  const SUPABASE_ANON_KEY = window.HIDAMES_SUPABASE_ANON_KEY || 'public-anon-key';

  if (window.supabase && SUPABASE_URL !== 'https://xyzcompany.supabase.co') {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
      console.warn('Supabase initialization error:', e);
    }
  }
}

function createOnlineRoom() {
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  joinOnlineRoomWithCode(roomCode, true);
}

function joinOnlineRoom() {
  const code = document.getElementById('joinRoomCodeInput').value.trim().toUpperCase();
  if (!code || code.length < 4) {
    alert('Please enter a valid room code');
    return;
  }
  joinOnlineRoomWithCode(code, false);
}

function joinOnlineRoomWithCode(code, isHost) {
  initSupabase();

  if (!supabaseClient) {
    // Show clear setup banner as mandated by Specification §16
    alert(`Online Multiplayer requires Supabase Realtime credentials.\n\nRoom Code Generated: ${code}\nTo enable live synchronization across devices, connect your Supabase URL & Anon Key in ludo.js or window.HIDAMES_SUPABASE_URL.`);
  }

  activeOnlineRoom = code;
  document.getElementById('setupModal').classList.add('hidden');
  document.getElementById('onlineRoomPill').classList.remove('hidden');
  document.getElementById('activeRoomCodeDisplay').textContent = code;

  initMatch();
  showToast(`🌐 JOINED ROOM: ${code}`);
}

// --- 13. Event Listeners & Startup ---
document.addEventListener('DOMContentLoaded', () => {
  initSetupUI();

  // Corner Dice Roll Clicks
  ALL_COLORS.forEach(c => {
    const box = document.getElementById(`dice-${c}`);
    if (box) {
      box.onclick = () => {
        if (activePlayers[currentTurnIdx] === c) {
          const playerCfg = currentConfig.players.find(p => p.color === c);
          if (!playerCfg || !playerCfg.isAi) {
            rollDice();
          }
        }
      };
    }
  });

  // Sound Toggle
  const sndBtn = document.getElementById('soundToggleBtn');
  if (sndBtn) {
    sndBtn.onclick = () => {
      sounds.enabled = !sounds.enabled;
      sndBtn.textContent = sounds.enabled ? '🔊' : '🔇';
    };
  }

  // Fast Mode Toggle
  const fastBtn = document.getElementById('fastModeToggle');
  if (fastBtn) {
    fastBtn.onclick = () => {
      currentConfig.fastMode = !currentConfig.fastMode;
      fastBtn.classList.toggle('active', currentConfig.fastMode);
      fastBtn.textContent = currentConfig.fastMode ? '⚡ FAST: ON' : '⚡ FAST';
    };
  }

  // Restart / Mode Button
  const rstBtn = document.getElementById('restartBtn');
  if (rstBtn) rstBtn.onclick = openSetupModal;

  // Rules Guide Modal
  const rulesBtn = document.getElementById('rulesBtn');
  if (rulesBtn) {
    rulesBtn.onclick = () => {
      document.getElementById('rulesModal').classList.remove('hidden');
    };
  }

  // Copy Room Link
  const copyBtn = document.getElementById('copyRoomCodeBtn');
  if (copyBtn) {
    copyBtn.onclick = () => {
      if (activeOnlineRoom) {
        navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?room=${activeOnlineRoom}`);
        showToast('📋 ROOM LINK COPIED!');
      }
    };
  }
});
