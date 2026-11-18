/* ==========================================================================
   HIDAMES LUDO KING - COMPLETE ENGINE & FLAWLESS MULTIPLAYER SYNCHRONIZATION
   Features:
   - Complete Tab Isolation (Online Rooms vs Same Device & AI)
   - Centered HIDAMES Gold Logo in Center Finish Goal
   - Authoritative Realtime Synchronization for Captures & Extra Turns
   - Zero-Freeze PeerJS WebRTC P2P Multiplayer
   - WhatsApp Share & 6-Character Room Codes (e.g. HD82K9)
   - Fixed-Size Pawns & 15x15 Grid Track Coordinates
   - Web Audio API Sound Synthesis
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
    this.playTone(140, 'sawtooth', 0.22, 0, 0.2);
    this.playTone(85, 'square', 0.32, 70, 0.2);
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

// --- 2. Track & Coordinates Mapping (15x15 Grid) ---
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

const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];
const START_INDEX = { red: 0, green: 13, yellow: 26, blue: 39 };

const HOME_RUNWAYS = {
  red:    [{r: 7, c: 1}, {r: 7, c: 2}, {r: 7, c: 3}, {r: 7, c: 4}, {r: 7, c: 5}],
  green:  [{r: 1, c: 7}, {r: 2, c: 7}, {r: 3, c: 7}, {r: 4, c: 7}, {r: 5, c: 7}],
  yellow: [{r: 7, c: 13}, {r: 7, c: 12}, {r: 7, c: 11}, {r: 7, c: 10}, {r: 7, c: 9}],
  blue:   [{r: 13, c: 7}, {r: 12, c: 7}, {r: 11, c: 7}, {r: 10, c: 7}, {r: 9, c: 7}]
};

const BASE_SLOTS = {
  red:    [{r: 1, c: 1}, {r: 1, c: 4}, {r: 4, c: 1}, {r: 4, c: 4}],
  green:  [{r: 1, c: 10}, {r: 1, c: 13}, {r: 4, c: 10}, {r: 4, c: 13}],
  yellow: [{r: 10, c: 10}, {r: 10, c: 13}, {r: 13, c: 10}, {r: 13, c: 13}],
  blue:   [{r: 10, c: 1}, {r: 10, c: 4}, {r: 13, c: 1}, {r: 13, c: 4}]
};

const DICE_PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

const ALL_COLORS = ['red', 'green', 'yellow', 'blue'];

// --- 3. Game Configuration & State ---
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

let activePlayers = [];
let currentTurnIdx = 0;
let diceVal = null;
let hasRolled = false;
let isMoving = false;
let consecutiveSixes = 0;
let turnSnapshot = null;
let tokens = {};

// Online State
let onlineRole = null;
let myOnlineColor = null;
let onlineCapacity = 4;

// --- 4. Setup Modal Logic & Strict Tab Isolation ---
function switchSetupTab(tab) {
  currentConfig.mode = tab;

  document.querySelectorAll('.tab-group .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  const localWrapper = document.getElementById('localSettingsWrapper');
  const onlineSection = document.getElementById('onlineSection');

  if (tab === 'online') {
    localWrapper.style.display = 'none';
    onlineSection.style.display = 'block';

    const savedName = localStorage.getItem('hidames_player_name') || 'Player ' + Math.floor(100 + Math.random() * 900);
    document.getElementById('onlineNicknameInput').value = savedName;
  } else {
    onlineSection.style.display = 'none';
    localWrapper.style.display = 'block';

    if (tab === 'ai') {
      currentConfig.players[0].isAi = false;
      currentConfig.players[0].name = localStorage.getItem('hidames_player_name') || 'You';
      for (let i = 1; i < currentConfig.players.length; i++) {
        currentConfig.players[i].isAi = true;
        currentConfig.players[i].name = `Hidames AI ${i}`;
      }
      document.getElementById('rosterTitleLabel').textContent = 'Your Name & AI Bot Opponents:';
    } else {
      currentConfig.players.forEach((p, idx) => {
        p.isAi = false;
        p.name = `Player ${idx + 1}`;
      });
      document.getElementById('rosterTitleLabel').textContent = 'Player Roster & Color Selection:';
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
  else if (currentConfig.format === '3' || currentConfig.format === '1v2') count = 3;

  for (let i = 0; i < count; i++) {
    const p = currentConfig.players[i];
    let teamLabel = '';
    if (currentConfig.format === '2v2') {
      teamLabel = `<span class="team-tag">(Team ${i % 2 === 0 ? '1' : '2'})</span>`;
    } else if (currentConfig.format === '1v2' || currentConfig.format === '1v3') {
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
  if (idx === 0) localStorage.setItem('hidames_player_name', currentConfig.players[0].name);
}

function selectPlayerColor(idx, newColor) {
  const otherIdx = currentConfig.players.findIndex((p, i) => i !== idx && p.color === newColor);
  if (otherIdx !== -1) {
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

function setOnlineCapacity(num) {
  onlineCapacity = num;
  document.querySelectorAll('.capacity-pills .cap-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.cap) === num);
  });
}

function openSetupModal() {
  document.getElementById('setupModal').classList.remove('hidden');
  document.getElementById('winnerModal').classList.add('hidden');
  document.getElementById('onlineLobbyModal').classList.add('hidden');
  switchSetupTab('local');
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

  if (currentConfig.format === '2v2') {
    activeRoster[0].team = 1;
    activeRoster[1].team = 2;
    activeRoster[2].team = 1;
    activeRoster[3].team = 2;
  } else if (currentConfig.format === '1v2' || currentConfig.format === '1v3') {
    activeRoster[0].team = 1;
    for (let i = 1; i < activeRoster.length; i++) activeRoster[i].team = 2;
  } else {
    activeRoster.forEach((p, idx) => p.team = idx + 1);
  }

  const order = ['red', 'green', 'yellow', 'blue'];
  activePlayers = order.filter(c => activeRoster.some(p => p.color === c));

  tokens = {};
  activePlayers.forEach(c => {
    tokens[c] = [0, 1, 2, 3].map(id => ({
      id,
      color: c,
      stepCount: -1
    }));
  });

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

  const modeText = currentConfig.mode === 'online' ? 'ONLINE MULTIPLAYER' : currentConfig.mode === 'ai' ? 'VS HIDAMES AI' : 'SAME DEVICE';
  document.getElementById('matchModeBadge').textContent = `${activePlayers.length} PLAYERS • ${modeText}`;

  buildBoard();
  renderAllTokens();

  if (currentConfig.openingRoundEnabled && currentConfig.mode !== 'online') {
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
      banner.textContent = `TIE AT ${maxVal}! RE-ROLLING FOR TIED PLAYERS...`;
      candidates = winners;
      await sleep(1000);
    }
  }
}

// --- 7. Board Construction (15x15 CSS Grid with Centered Logo) ---
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

  // 2. Center Goal Triangles with Beautifully Centered HIDAMES Gold Logo
  board.insertAdjacentHTML('beforeend', `
    <div class="center-goal">
      <div class="center-triangle-red"></div>
      <div class="center-triangle-green"></div>
      <div class="center-triangle-yellow"></div>
      <div class="center-triangle-blue"></div>
      <div class="center-trophy">
        <div class="crown-icon">👑</div>
        <div class="trophy-brand">HID<span>AMES</span></div>
      </div>
    </div>
  `);

  // 3. 15x15 Grid Path Cells
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

      // Color Home Runways
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

// --- 8. Turn Flow & Snapshot ---
function startTurn(color) {
  hasRolled = false;
  diceVal = null;
  clearHighlights();

  turnSnapshot = JSON.parse(JSON.stringify(tokens));

  document.querySelectorAll('.player-pod').forEach(p => p.classList.remove('active-turn'));
  const activePod = document.getElementById(`pod-${color}`);
  if (activePod) activePod.classList.add('active-turn');

  const banner = document.getElementById('turnAnnouncement');
  const playerCfg = currentConfig.players.find(p => p.color === color);
  
  if (currentConfig.mode === 'online') {
    if (color === myOnlineColor) {
      banner.textContent = 'YOUR TURN - ROLL DICE!';
      banner.style.color = 'var(--gold)';
    } else {
      banner.textContent = `${playerCfg ? playerCfg.name : color.toUpperCase()}'S TURN`;
      banner.style.color = `var(--${color})`;
    }
  } else {
    banner.textContent = `${playerCfg ? playerCfg.name : color.toUpperCase()}'S TURN`;
    banner.style.color = `var(--${color})`;
  }

  document.getElementById(`status-${color}`).textContent = 'ROLLING...';

  if (currentConfig.mode !== 'online' && playerCfg && playerCfg.isAi) {
    setTimeout(rollDice, currentConfig.fastMode ? 350 : 700);
  }
}

// Roll Dice Engine
function rollDice(forcedVal = null) {
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
    diceVal = forcedVal !== null ? forcedVal : Math.floor(Math.random() * 6) + 1;
    renderDicePips(diceFace, diceVal);

    if (currentConfig.mode === 'online' && forcedVal === null) {
      onlineEngine.broadcast({ type: 'DICE_ROLLED', color, val: diceVal });
    }

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

function handleDiceResult(color, roll) {
  if (roll === 6) {
    consecutiveSixes++;
    showToast('🎲 ROLLED A 6! +1 EXTRA ROLL!');

    if (consecutiveSixes === 3) {
      showToast('🚫 3 CONSECUTIVE SIXES! TURN CANCELLED!');
      sounds.cancelTurn();

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

function evaluatePlayerMoves(color, roll) {
  const playerTokens = tokens[color];
  const movable = [];

  playerTokens.forEach(token => {
    if (token.stepCount === -1 && roll === 6) {
      const startTile = START_INDEX[color];
      if (!isTileBlockedFor(color, startTile)) {
        movable.push(token);
      }
    } else if (token.stepCount >= 0 && token.stepCount + roll <= 56) {
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

  if (currentConfig.mode === 'online' && color !== myOnlineColor) {
    movable.forEach(tok => {
      const el = document.getElementById(`pawn-${tok.color}-${tok.id}`);
      if (el) el.classList.add('can-move');
    });
    return;
  }

  const playerCfg = currentConfig.players.find(p => p.color === color);
  if (currentConfig.mode !== 'online' && playerCfg && playerCfg.isAi) {
    const chosen = pickAiMove(color, movable, roll);
    setTimeout(() => moveToken(chosen), currentConfig.fastMode ? 250 : 500);
    return;
  }

  if (movable.length === 1 && movable[0].stepCount >= 0) {
    moveToken(movable[0]);
    return;
  }

  movable.forEach(tok => {
    const el = document.getElementById(`pawn-${tok.color}-${tok.id}`);
    if (el) el.classList.add('can-move');
  });
}

function getActiveBlockades() {
  if (!currentConfig.blockadesEnabled) return {};
  const blockades = {};

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
  return !isTeammate(color, blockerColor);
}

function canTokenMovePath(token, roll) {
  if (!currentConfig.blockadesEnabled) return true;
  const currentStep = token.stepCount;
  for (let s = 1; s <= roll; s++) {
    const checkStep = currentStep + s;
    if (checkStep <= 50) {
      const tile = (START_INDEX[token.color] + checkStep) % 52;
      if (isTileBlockedFor(token.color, tile)) return false;
    }
  }
  return true;
}

function isTeammate(colorA, colorB) {
  if (colorA === colorB) return true;
  const pA = currentConfig.players.find(p => p.color === colorA);
  const pB = currentConfig.players.find(p => p.color === colorB);
  if (!pA || !pB) return false;
  return pA.team === pB.team;
}

// --- 9. Step-by-Step Movement, Full Synchronized Knockouts & Bonus Rolls ---
async function moveToken(token, isRemote = false, remoteData = null) {
  if (isMoving) return;
  isMoving = true;
  clearHighlights();

  const roll = diceVal;
  const hopDelay = currentConfig.fastMode ? 90 : 160;

  if (token.stepCount === -1) {
    token.stepCount = 0;
    sounds.unlock();
    renderAllTokens();
    await sleep(hopDelay + 50);
  } else {
    const startStep = token.stepCount;
    const targetStep = remoteData ? remoteData.targetStep : token.stepCount + roll;

    for (let s = startStep + 1; s <= targetStep; s++) {
      token.stepCount = s;
      sounds.step();
      renderAllTokens();
      await sleep(hopDelay);
    }
  }

  let broughtHome = false;
  if (token.stepCount === 56) {
    sounds.win();
    showToast('🏆 TOKEN HOME! +1 BONUS ROLL!');
    broughtHome = true;
  }

  // Knockout Detection
  let capturedTokenInfo = null;

  if (!isRemote) {
    // Local player determined the move outcome
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
                  capturedTokenInfo = { color: opp.color, id: opp.id };
                }
              }
            });
          }
        });
      }
    }
  } else if (remoteData && remoteData.capturedToken) {
    // Explicit remote knockout payload received
    const opp = tokens[remoteData.capturedToken.color].find(t => t.id === remoteData.capturedToken.id);
    if (opp) {
      opp.stepCount = -1;
      sounds.capture();
      showToast(`⚔️ ${token.color.toUpperCase()} KNOCKED OUT ${remoteData.capturedToken.color.toUpperCase()}!`);
    }
  }

  renderAllTokens();

  if (checkVictory(token.color)) {
    isMoving = false;
    return;
  }

  const earnedBonus = (roll === 6 && consecutiveSixes < 3) || !!capturedTokenInfo || broughtHome;
  const nextPlayerIdx = (currentTurnIdx + 1) % activePlayers.length;
  const nextTurnColor = earnedBonus ? token.color : activePlayers[nextPlayerIdx];

  // Broadcast Authoritative Synchronized Outcome to Remote Peers
  if (currentConfig.mode === 'online' && !isRemote) {
    onlineEngine.broadcast({
      type: 'TOKEN_MOVED_SYNC',
      color: token.color,
      id: token.id,
      roll: diceVal,
      targetStep: token.stepCount,
      capturedToken: capturedTokenInfo,
      bonusRoll: earnedBonus,
      nextTurnColor: nextTurnColor
    });
  }

  isMoving = false;

  // Decide next turn locally
  const isBonus = remoteData ? remoteData.bonusRoll : earnedBonus;

  if (isBonus) {
    hasRolled = false;
    diceVal = null;
    showToast('🎉 BONUS ROLL!');
    const activePod = document.getElementById(`pod-${token.color}`);
    activePod.classList.add('active-turn');

    const playerCfg = currentConfig.players.find(p => p.color === token.color);
    if (currentConfig.mode !== 'online' && playerCfg && playerCfg.isAi) {
      setTimeout(rollDice, currentConfig.fastMode ? 350 : 700);
    }
  } else {
    if (remoteData) {
      currentTurnIdx = activePlayers.indexOf(remoteData.nextTurnColor);
      startTurn(remoteData.nextTurnColor);
    } else {
      nextTurn();
    }
  }
}

function checkVictory(activeColor) {
  const activeCfg = currentConfig.players.find(p => p.color === activeColor);
  if (!activeCfg) return false;

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

function pickAiMove(color, movable, roll) {
  const finisher = movable.find(t => t.stepCount + roll === 56);
  if (finisher) return finisher;

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

  const basePawn = movable.find(t => t.stepCount === -1);
  if (basePawn && Math.random() < 0.75) return basePawn;

  for (const t of movable) {
    if (t.stepCount >= 0) {
      const targetStep = t.stepCount + roll;
      if (targetStep <= 50 && SAFE_INDICES.includes((START_INDEX[color] + targetStep) % 52)) {
        return t;
      }
    }
  }

  movable.sort((a, b) => b.stepCount - a.stepCount);
  return movable[0];
}

// --- 10. Clean Token DOM Nesting (Fixed Sizing) ---
function renderAllTokens() {
  document.querySelectorAll('.pawn').forEach(p => p.remove());
  document.querySelectorAll('.cell.has-blockade').forEach(c => c.classList.remove('has-blockade'));

  const cellOccupants = {};

  activePlayers.forEach(c => {
    tokens[c].forEach(tok => {
      let targetEl = null;

      if (tok.stepCount === -1) {
        targetEl = document.getElementById(`slot-${tok.color}-${tok.id}`);
      } else if (tok.stepCount <= 50) {
        const trackIdx = (START_INDEX[tok.color] + tok.stepCount) % 52;
        const coord = TRACK_COORDINATES[trackIdx];
        targetEl = document.querySelector(`.cell[data-r="${coord.r}"][data-c="${coord.c}"]`);
      } else if (tok.stepCount < 56) {
        const runwayIdx = tok.stepCount - 51;
        const coord = HOME_RUNWAYS[tok.color][runwayIdx];
        targetEl = document.querySelector(`.cell[data-r="${coord.r}"][data-c="${coord.c}"]`);
      } else {
        targetEl = document.querySelector('.center-goal');
      }

      if (targetEl) {
        const key = targetEl.id || `${targetEl.dataset.r}-${targetEl.dataset.c}` || 'center';
        if (!cellOccupants[key]) cellOccupants[key] = { el: targetEl, items: [] };
        cellOccupants[key].items.push(tok);
      }
    });
  });

  const blockades = getActiveBlockades();
  Object.keys(blockades).forEach(tileIdx => {
    const coord = TRACK_COORDINATES[tileIdx];
    const cell = document.querySelector(`.cell[data-r="${coord.r}"][data-c="${coord.c}"]`);
    if (cell) cell.classList.add('has-blockade');
  });

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
          if (currentConfig.mode === 'online' && tok.color !== myOnlineColor) return;
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

// ==========================================================================
// --- 11. HIDAMES ONLINE ENGINE (REALTIME WEBRTC VIA PEERJS) ---
// ==========================================================================

class HidamesOnlineEngine {
  constructor() {
    this.peer = null;
    this.connections = [];
    this.hostConnection = null;
    this.roomCode = null;
    this.isHost = false;
    this.lobbyPlayers = [];
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'HD';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  getInviteUrl(code) {
    const base = window.location.origin + window.location.pathname;
    return `${base}?room=${code}`;
  }

  createRoom() {
    const nameInput = document.getElementById('onlineNicknameInput');
    const myName = (nameInput.value.trim()) || 'Host';
    localStorage.setItem('hidames_player_name', myName);

    this.roomCode = this.generateRoomCode();
    this.isHost = true;
    onlineRole = 'host';
    myOnlineColor = 'red';

    const peerId = `hidames-ludo-${this.roomCode}`;
    this.peer = new Peer(peerId);

    this.peer.on('open', (id) => {
      document.getElementById('setupModal').classList.add('hidden');
      document.getElementById('onlineLobbyModal').classList.remove('hidden');

      this.lobbyPlayers = [
        { id: 1, name: myName, color: 'red', isHost: true, status: 'ready' }
      ];

      this.updateLobbyUI();
    });

    this.peer.on('connection', (conn) => {
      conn.on('open', () => {
        conn.on('data', (data) => {
          this.handleHostReceivedData(conn, data);
        });
      });

      conn.on('close', () => {
        this.handleGuestDisconnected(conn);
      });
    });

    this.peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        alert('Room code collision. Please click Create Room again.');
      } else {
        alert('Connection notice: ' + err.message);
      }
    });
  }

  joinWithCode(customCode = null) {
    const codeInput = document.getElementById('joinRoomCodeInput');
    const code = (customCode || codeInput.value).trim().toUpperCase();

    if (!code || code.length < 4) {
      alert('Please enter a valid room code (e.g. HD82K9)');
      return;
    }

    const nameInput = document.getElementById('onlineNicknameInput');
    const myName = (nameInput.value.trim()) || 'Player ' + Math.floor(100 + Math.random() * 900);
    localStorage.setItem('hidames_player_name', myName);

    this.connectToHost(code, myName);
  }

  connectToHost(code, myName) {
    this.roomCode = code;
    this.isHost = false;
    onlineRole = 'guest';

    this.peer = new Peer();

    this.peer.on('open', (id) => {
      const hostPeerId = `hidames-ludo-${code}`;
      const conn = this.peer.connect(hostPeerId, { reliable: true });

      conn.on('open', () => {
        this.hostConnection = conn;
        conn.send({ type: 'JOIN_REQUEST', name: myName });

        document.getElementById('setupModal').classList.add('hidden');
        document.getElementById('inviteJoinModal').classList.add('hidden');
        document.getElementById('onlineLobbyModal').classList.remove('hidden');
      });

      conn.on('data', (data) => {
        this.handleGuestReceivedData(data);
      });

      conn.on('error', () => {
        alert('Could not connect to room ' + code + '. Please check the code.');
      });

      conn.on('close', () => {
        showToast('🔴 Disconnected from room');
      });
    });

    this.peer.on('error', () => {
      alert('Room not found or host has closed the room.');
    });
  }

  handleHostReceivedData(conn, data) {
    if (data.type === 'JOIN_REQUEST') {
      if (this.lobbyPlayers.length >= onlineCapacity) {
        conn.send({ type: 'ROOM_FULL', message: 'Room is already full!' });
        conn.close();
        return;
      }

      const colorOrder = ['red', 'green', 'yellow', 'blue'];
      const assignedColor = colorOrder[this.lobbyPlayers.length];

      const newPlayer = {
        id: this.lobbyPlayers.length + 1,
        name: data.name,
        color: assignedColor,
        isHost: false,
        status: 'ready',
        peerId: conn.peer
      };

      conn._playerColor = assignedColor;
      this.connections.push(conn);
      this.lobbyPlayers.push(newPlayer);

      conn.send({
        type: 'JOIN_CONFIRMED',
        color: assignedColor,
        players: this.lobbyPlayers,
        capacity: onlineCapacity,
        roomCode: this.roomCode
      });

      this.broadcastLobbyUpdate();
      this.updateLobbyUI();
      sounds.unlock();
    } else if (data.type === 'DICE_ROLLED') {
      this.broadcast(data, conn);
      rollDice(data.val);
    } else if (data.type === 'TOKEN_MOVED_SYNC') {
      this.broadcast(data, conn);
      const token = tokens[data.color].find(t => t.id === data.id);
      if (token) moveToken(token, true, data);
    }
  }

  handleGuestDisconnected(conn) {
    this.lobbyPlayers = this.lobbyPlayers.filter(p => p.color !== conn._playerColor);
    this.connections = this.connections.filter(c => c !== conn);
    this.broadcastLobbyUpdate();
    this.updateLobbyUI();
  }

  handleGuestReceivedData(data) {
    if (data.type === 'JOIN_CONFIRMED') {
      myOnlineColor = data.color;
      this.lobbyPlayers = data.players;
      onlineCapacity = data.capacity;
      this.roomCode = data.roomCode;
      this.updateLobbyUI();
      sounds.unlock();
    } else if (data.type === 'LOBBY_UPDATE') {
      this.lobbyPlayers = data.players;
      onlineCapacity = data.capacity;
      this.updateLobbyUI();
    } else if (data.type === 'START_MATCH') {
      document.getElementById('onlineLobbyModal').classList.add('hidden');
      document.getElementById('onlineRoomPill').classList.remove('hidden');
      document.getElementById('activeRoomCodeDisplay').textContent = this.roomCode;

      currentConfig.mode = 'online';
      currentConfig.format = `${data.players.length}`;
      currentConfig.players = data.players.map((p, idx) => ({
        id: idx + 1,
        color: p.color,
        name: p.name,
        isAi: false,
        team: idx + 1
      }));

      initMatch();
    } else if (data.type === 'DICE_ROLLED') {
      rollDice(data.val);
    } else if (data.type === 'TOKEN_MOVED_SYNC') {
      const token = tokens[data.color].find(t => t.id === data.id);
      if (token) moveToken(token, true, data);
    } else if (data.type === 'ROOM_FULL') {
      alert(data.message || 'Room is full!');
      location.reload();
    } else if (data.type === 'KICKED') {
      alert('You have been removed from the room by the host.');
      location.reload();
    }
  }

  updateLobbyUI() {
    document.getElementById('lobbyRoomCodeVal').textContent = this.roomCode;
    document.getElementById('lobbyCountDisplay').textContent = `${this.lobbyPlayers.length}/${onlineCapacity}`;

    const grid = document.getElementById('lobbySlotsGrid');
    grid.innerHTML = '';

    const colorOrder = ['red', 'green', 'yellow', 'blue'].slice(0, onlineCapacity);

    colorOrder.forEach((color) => {
      const player = this.lobbyPlayers.find(p => p.color === color);
      const slotCard = document.createElement('div');

      if (player) {
        slotCard.className = 'lobby-slot-card occupied';
        slotCard.innerHTML = `
          <div class="slot-left">
            <div class="slot-avatar" style="background: var(--${color})">
              ${player.isHost ? '👑' : '👤'}
            </div>
            <div class="slot-info">
              <span class="slot-name">${player.name} ${player.color === myOnlineColor ? '(You)' : ''}</span>
              <span class="slot-meta" style="color: var(--${color})">
                ${color.toUpperCase()} • ${player.isHost ? '<span class="host-tag">Host</span>' : 'Player'}
              </span>
            </div>
          </div>
          <div class="slot-right">
            <span class="slot-status-pill ready">Ready</span>
            ${(this.isHost && !player.isHost) ? `<button class="slot-kick-btn" onclick="onlineEngine.kickPlayer('${player.color}')" title="Kick Player">✕</button>` : ''}
          </div>
        `;
      } else {
        slotCard.className = 'lobby-slot-card empty';
        slotCard.innerHTML = `
          <div class="slot-left">
            <div class="slot-avatar" style="background: #222; border-color: #444;">⏳</div>
            <div class="slot-info">
              <span class="slot-name" style="color: #666">Empty Slot</span>
              <span class="slot-meta" style="color: #555">${color.toUpperCase()} • Waiting for player...</span>
            </div>
          </div>
          <div class="slot-right">
            <span class="slot-status-pill waiting">Waiting</span>
          </div>
        `;
      }
      grid.appendChild(slotCard);
    });

    const startBtn = document.getElementById('lobbyStartGameBtn');
    const statusHint = document.getElementById('lobbyStatusHint');

    if (this.isHost) {
      startBtn.style.display = 'block';
      if (this.lobbyPlayers.length >= 2) {
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
        statusHint.textContent = 'All set! You can start the match.';
      } else {
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        statusHint.textContent = 'Waiting for friends to join...';
      }
    } else {
      startBtn.style.display = 'none';
      statusHint.textContent = 'Waiting for Host to start the game...';
    }
  }

  broadcastLobbyUpdate() {
    this.broadcast({
      type: 'LOBBY_UPDATE',
      players: this.lobbyPlayers,
      capacity: onlineCapacity
    });
  }

  broadcast(message, excludeConn = null) {
    if (this.isHost) {
      this.connections.forEach(conn => {
        if (conn !== excludeConn && conn.open) {
          conn.send(message);
        }
      });
    } else if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send(message);
    }
  }

  hostStartGame() {
    if (!this.isHost || this.lobbyPlayers.length < 2) return;

    this.broadcast({
      type: 'START_MATCH',
      players: this.lobbyPlayers
    });

    document.getElementById('onlineLobbyModal').classList.add('hidden');
    document.getElementById('onlineRoomPill').classList.remove('hidden');
    document.getElementById('activeRoomCodeDisplay').textContent = this.roomCode;

    currentConfig.mode = 'online';
    currentConfig.format = `${this.lobbyPlayers.length}`;
    currentConfig.players = this.lobbyPlayers.map((p, idx) => ({
      id: idx + 1,
      color: p.color,
      name: p.name,
      isAi: false,
      team: idx + 1
    }));

    initMatch();
  }

  kickPlayer(color) {
    const conn = this.connections.find(c => c._playerColor === color);
    if (conn) {
      conn.send({ type: 'KICKED' });
      conn.close();
      this.handleGuestDisconnected(conn);
    }
  }

  leaveRoom() {
    if (this.peer) this.peer.destroy();
    location.reload();
  }

  copyRoomCode() {
    if (!this.roomCode) return;
    navigator.clipboard.writeText(this.roomCode);
    showToast(`📋 ROOM CODE ${this.roomCode} COPIED!`);
  }

  copyInviteLink() {
    if (!this.roomCode) return;
    const url = this.getInviteUrl(this.roomCode);
    navigator.clipboard.writeText(url);
    showToast('🔗 INVITATION LINK COPIED!');
  }

  shareWhatsApp() {
    if (!this.roomCode) return;
    const url = this.getInviteUrl(this.roomCode);
    const msg = `Hey! Join my HIDAMES Ludo game.\n\nRoom Code: ${this.roomCode}\n\nClick the link to join:\n${url}\n\nLet's play together!`;
    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  }

  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const code = roomParam.trim().toUpperCase();
      document.getElementById('inviteDetectedCode').textContent = code;
      const savedName = localStorage.getItem('hidames_player_name') || 'Guest ' + Math.floor(100 + Math.random() * 900);
      document.getElementById('inviteNameInput').value = savedName;

      document.getElementById('inviteJoinModal').classList.remove('hidden');
      document.getElementById('setupModal').classList.add('hidden');
    }
  }

  confirmInviteJoin() {
    const code = document.getElementById('inviteDetectedCode').textContent;
    const nameInput = document.getElementById('inviteNameInput');
    const myName = (nameInput.value.trim()) || 'Guest';
    localStorage.setItem('hidames_player_name', myName);

    this.connectToHost(code, myName);
  }
}

const onlineEngine = new HidamesOnlineEngine();

// --- 12. Startup & Click Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  renderRosterGrid();

  ALL_COLORS.forEach(c => {
    const box = document.getElementById(`dice-${c}`);
    if (box) {
      box.onclick = () => {
        if (activePlayers[currentTurnIdx] === c) {
          if (currentConfig.mode === 'online' && c !== myOnlineColor) {
            showToast("Wait for your turn!");
            return;
          }

          const playerCfg = currentConfig.players.find(p => p.color === c);
          if (!playerCfg || !playerCfg.isAi) {
            rollDice();
          }
        }
      };
    }
  });

  const sndBtn = document.getElementById('soundToggleBtn');
  if (sndBtn) {
    sndBtn.onclick = () => {
      sounds.enabled = !sounds.enabled;
      sndBtn.textContent = sounds.enabled ? '🔊' : '🔇';
    };
  }

  const fastBtn = document.getElementById('fastModeToggle');
  if (fastBtn) {
    fastBtn.onclick = () => {
      currentConfig.fastMode = !currentConfig.fastMode;
      fastBtn.classList.toggle('active', currentConfig.fastMode);
      fastBtn.textContent = currentConfig.fastMode ? '⚡ FAST: ON' : '⚡ FAST';
    };
  }

  const rstBtn = document.getElementById('restartBtn');
  if (rstBtn) rstBtn.onclick = openSetupModal;

  const rulesBtn = document.getElementById('rulesBtn');
  if (rulesBtn) {
    rulesBtn.onclick = () => {
      document.getElementById('rulesModal').classList.remove('hidden');
    };
  }

  const copyHeaderBtn = document.getElementById('copyRoomCodeBtn');
  if (copyHeaderBtn) {
    copyHeaderBtn.onclick = () => {
      if (onlineEngine.roomCode) onlineEngine.copyInviteLink();
    };
  }

  onlineEngine.checkUrlParams();
});
