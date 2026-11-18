
/* ==========================================
   HIDAMES LUDO - COMPLETE GAME ENGINE
   Computer + Same Phone + Team Matches
   Online multiplayer requires backend setup.
========================================== */

document.addEventListener("DOMContentLoaded", function () {

    const $ = id => document.getElementById(id);

    /* ==========================================
       HTML ELEMENTS
    ========================================== */

    const setupScreen = $("setupScreen");
    const matchSection = $("matchSection");
    const onlineSetup = $("onlineSetup");
    const nameSection = $("nameSection");
    const teamSection = $("teamSection");
    const gameLayout = $("gameLayout");
    const winnerScreen = $("winnerScreen");

    const setupMessage = $("setupMessage");
    const startGameBtn = $("startGameBtn");

    const track = $("trackCells");
    const board = $("ludoBoard");
    const dice = $("dice");
    const rollButton = $("rollBtn");

    const turnName = $("turnName");
    const turnSubtitle = $("turnSubtitle");
    const diceMessage = $("diceMessage");
    const lastRoll = $("lastRoll");

    const requiredElements = [
        setupScreen,
        matchSection,
        nameSection,
        gameLayout,
        winnerScreen,
        track,
        board,
        dice,
        rollButton,
        turnName,
        turnSubtitle,
        diceMessage,
        lastRoll,
        startGameBtn
    ];

    if (requiredElements.some(element => !element)) {
        console.error(
            "Some required Ludo HTML elements are missing. Check your ludo.html IDs."
        );
        return;
    }

    /* ==========================================
       PLAYER CONFIGURATION
    ========================================== */

    const players = [
        {
            color: "Red",
            emoji: "🔴",
            laneClass: "lane-red",
            startClass: "start-red",
            startIndex: 0,
            lane: [
                [8, 2], [8, 3], [8, 4],
                [8, 5], [8, 6], [8, 7]
            ]
        },
        {
            color: "Green",
            emoji: "🟢",
            laneClass: "lane-green",
            startClass: "start-green",
            startIndex: 13,
            lane: [
                [2, 8], [3, 8], [4, 8],
                [5, 8], [6, 8], [7, 8]
            ]
        },
        {
            color: "Yellow",
            emoji: "🟡",
            laneClass: "lane-yellow",
            startClass: "start-yellow",
            startIndex: 39,
            lane: [
                [14, 8], [13, 8], [12, 8],
                [11, 8], [10, 8], [9, 8]
            ]
        },
        {
            color: "Blue",
            emoji: "🔵",
            laneClass: "lane-blue",
            startClass: "start-blue",
            startIndex: 26,
            lane: [
                [8, 14], [8, 13], [8, 12],
                [8, 11], [8, 10], [8, 9]
            ]
        }
    ];

    // Turn order: Red -> Green -> Blue -> Yellow
    const turnOrder = [0, 1, 3, 2];

    const mainPath = [
        [7, 2], [7, 3], [7, 4], [7, 5], [7, 6],
        [6, 7], [5, 7], [4, 7], [3, 7], [2, 7],
        [1, 7], [1, 8], [1, 9],

        [2, 9], [3, 9], [4, 9], [5, 9], [6, 9],
        [7, 10], [7, 11], [7, 12], [7, 13], [7, 14],
        [7, 15], [8, 15], [9, 15],

        [9, 14], [9, 13], [9, 12], [9, 11], [9, 10],
        [10, 9], [11, 9], [12, 9], [13, 9], [14, 9],
        [15, 9], [15, 8], [15, 7],

        [14, 7], [13, 7], [12, 7], [11, 7], [10, 7],
        [9, 6], [9, 5], [9, 4], [9, 3], [9, 2],
        [9, 1], [8, 1], [7, 1]
    ];

    const safePositions = [0, 8, 13, 21, 26, 34, 39, 47];

    if (mainPath.length !== 52) {
        console.error("The board path must contain 52 cells.");
        return;
    }

    /* ==========================================
       TOKEN CONFIGURATION
    ========================================== */

    const tokens = players.map((player, playerIndex) => {

        return Array.from({ length: 4 }, (_, tokenIndex) => {

            const element = $(`token-${playerIndex}-${tokenIndex}`);

            if (element) {
                element.setAttribute("role", "button");
                element.setAttribute("tabindex", "0");
            }

            return {
                playerIndex,
                tokenIndex,
                progress: -1,
                finished: false,
                element,
                homeElement: element
                    ? element.closest(".home-inner")
                    : null
            };
        });
    });

    if (tokens.flat().some(token => !token.element || !token.homeElement)) {
        console.error(
            "Ludo token elements are missing. Check token IDs and .home-inner elements."
        );
        return;
    }

    /* ==========================================
       GAME STATE
    ========================================== */

    let selectedMode = "";
    let selectedMatch = "";

    let activePlayers = [];
    let currentPlayer = 0;
    let currentRoll = 0;

    let isRolling = false;
    let isMoving = false;
    let waitingForToken = false;
    let gameOver = false;

    let pendingTimers = [];

    const pathCells = [];
    const cellMap = new Map();

    /* ==========================================
       TIMER MANAGEMENT
    ========================================== */

    function schedule(callback, delay) {

        const timer = setTimeout(() => {
            pendingTimers = pendingTimers.filter(item => item !== timer);

            if (!gameOver) {
                callback();
            }
        }, delay);

        pendingTimers.push(timer);

        return timer;
    }

    function clearPendingTimers() {
        pendingTimers.forEach(timer => clearTimeout(timer));
        pendingTimers = [];
    }

    /* ==========================================
       SETUP SCREEN
    ========================================== */

    function showScreen(screen) {

        setupScreen.hidden = screen !== "setup";
        gameLayout.hidden = screen !== "game";
        winnerScreen.hidden = screen !== "winner";
    }

    function getMatchConfiguration(match) {

        const configurations = {

            "individual-2": {
                players: [0, 1],
                teams: false
            },

            "individual-3": {
                players: [0, 1, 3],
                teams: false
            },

            "individual-4": {
                players: [0, 1, 3, 2],
                teams: false
            },

            "1v1": {
                players: [0, 1],
                teams: true,
                teamA: [0],
                teamB: [1]
            },

            "2v2": {
                players: [0, 1, 3, 2],
                teams: true,
                teamA: [0, 2],
                teamB: [1, 3]
            },

            "1v2": {
                players: [0, 1, 3],
                teams: true,
                teamA: [0],
                teamB: [1, 3]
            },

            "1v3": {
                players: [0, 1, 3, 2],
                teams: true,
                teamA: [0],
                teamB: [1, 3, 2]
            }
        };

        return configurations[match] || null;
    }

    /* ==========================================
       GAME MODE SELECTION
    ========================================== */

    document.querySelectorAll(".mode-card").forEach(button => {

        button.addEventListener("click", function () {

            selectedMode = button.dataset.mode;

            document.querySelectorAll(".mode-card").forEach(item => {
                item.classList.toggle("active", item === button);
                item.classList.remove("selected");
            });

            document.querySelectorAll(".match-option").forEach(item => {
                item.classList.remove("active", "selected");
            });

            selectedMatch = "";
            startGameBtn.disabled = true;

            matchSection.hidden = false;
            nameSection.hidden = true;
            teamSection.hidden = true;

            onlineSetup.hidden = selectedMode !== "online";

            if (selectedMode === "online") {

                setupMessage.textContent =
                    "Online multiplayer is coming soon. A real-time server connection is required.";

            } else {

                setupMessage.textContent =
                    "Now choose your match type.";
            }
        });
    });

    /* ==========================================
       MATCH TYPE SELECTION
    ========================================== */

    document.querySelectorAll(".match-option").forEach(button => {

        button.addEventListener("click", function () {

            if (!selectedMode || selectedMode === "online") {

                setupMessage.textContent =
                    "Online multiplayer is not available yet.";

                return;
            }

            selectedMatch = button.dataset.match;

            document.querySelectorAll(".match-option").forEach(item => {
                item.classList.toggle("active", item === button);
                item.classList.remove("selected");
            });

            const config = getMatchConfiguration(selectedMatch);

            if (!config) {
                setupMessage.textContent = "Invalid match selection.";
                startGameBtn.disabled = true;
                return;
            }

            if (selectedMode === "local" && config.players.length < 2) {
                setupMessage.textContent = "Choose at least two players.";
                return;
            }

            nameSection.hidden = false;
            teamSection.hidden = !config.teams;

            document.querySelectorAll(".name-field").forEach(field => {

                const index = Number(field.dataset.playerName);

                field.hidden = !config.players.includes(index);
            });

            renderTeamAssignment(config);

            startGameBtn.disabled = false;

            setupMessage.textContent =
                selectedMode === "computer"
                    ? "Enter your name. The remaining players will be computers."
                    : "Enter player names and start your game.";
        });
    });

    /* ==========================================
       ONLINE ROOM BUTTONS
    ========================================== */

    const onlineMessage =
        "Online multiplayer is not connected yet. Real rooms, invitation links and room codes will require a backend.";

    if ($("createRoomBtn")) {
        $("createRoomBtn").addEventListener("click", () => {
            setupMessage.textContent = onlineMessage;
        });
    }

    if ($("joinRoomBtn")) {
        $("joinRoomBtn").addEventListener("click", () => {
            setupMessage.textContent = onlineMessage;
        });
    }

    /* ==========================================
       PLAYER NAMES
    ========================================== */

    function getPlayerName(index) {

        const input = $(`playerName${index}`);

        return input && input.value.trim()
            ? input.value.trim()
            : `Player ${index + 1}`;
    }

    if ($("skipNamesBtn")) {

        $("skipNamesBtn").addEventListener("click", () => {

            players.forEach((player, index) => {

                const input = $(`playerName${index}`);

                if (input) {
                    input.value = "";
                }
            });

            setupMessage.textContent =
                "Default player names selected.";

            if (selectedMatch) {
                const config = getMatchConfiguration(selectedMatch);

                if (config && config.teams) {
                    renderTeamAssignment(config);
                }
            }
        });
    }

    /* ==========================================
       TEAM ASSIGNMENT DISPLAY
    ========================================== */

    function renderTeamAssignment(config) {

        if (!config.teams) return;

        const teamA = $("teamAPlayers");
        const teamB = $("teamBPlayers");

        if (!teamA || !teamB) return;

        teamA.innerHTML = "";
        teamB.innerHTML = "";

        function addTeamPlayers(container, indexes) {

            indexes.forEach(index => {

                const player = players[index];
                const label = document.createElement("p");

                label.textContent =
                    `${player.emoji} ${getPlayerName(index)}`;

                container.appendChild(label);
            });
        }

        addTeamPlayers(teamA, config.teamA);
        addTeamPlayers(teamB, config.teamB);
    }

    /* ==========================================
       CREATE BOARD
    ========================================== */

    function createCell(row, col, className, index = null) {

        const cell = document.createElement("div");

        cell.classList.add("track-cell", className);

        cell.style.gridRow = String(row);
        cell.style.gridColumn = String(col);

        if (index !== null) {
            cell.dataset.trackIndex = String(index);
        }

        track.appendChild(cell);

        cellMap.set(`${row}-${col}`, cell);

        return cell;
    }

    function updateTokenLabel(token) {

        const player = players[token.playerIndex];

        let status = "inside home";

        if (token.finished) {

            status = "finished";

        } else if (token.progress >= 0) {

            status = token.progress <= 51
                ? "on the main track"
                : "in the home lane";
        }

        token.element.setAttribute(
            "aria-label",
            `${player.color} token ${token.tokenIndex + 1}, ${status}`
        );
    }

    function createBoard() {

        track.innerHTML = "";

        pathCells.length = 0;
        cellMap.clear();

        // Create the 52 main track cells.
        mainPath.forEach(([row, col], index) => {

            const cell = createCell(row, col, "main-track", index);

            if (safePositions.includes(index)) {
                cell.classList.add("safe-cell");
            }

            pathCells.push(cell);
        });

        // Create all four players' home lanes.
        players.forEach(player => {

            player.lane.forEach(([row, col], index) => {

                const cell = createCell(
                    row,
                    col,
                    player.laneClass
                );

                cell.classList.add("home-lane");

                cell.dataset.laneIndex = String(index);
            });
        });

        // Mark each player's starting cell.
        players.forEach(player => {

            const startCell = pathCells[player.startIndex];

            if (startCell) {
                startCell.classList.add(player.startClass);
            }
        });

        // Return all tokens to their home positions.
        tokens.flat().forEach(token => {

            token.progress = -1;
            token.finished = false;

            token.homeElement.appendChild(token.element);

            token.element.classList.remove(
                "movable",
                "selected-token"
            );

            updateTokenLabel(token);
        });
    }

    /* ==========================================
       TOKEN POSITION HELPERS
    ========================================== */

    function getMainTrackIndex(token) {

        if (token.progress < 0 || token.progress > 51) {
            return null;
        }

        const player = players[token.playerIndex];

        return (
            player.startIndex + token.progress
        ) % 52;
    }

    function getTokenCell(token) {

        if (token.progress < 0) {
            return null;
        }

        if (token.progress <= 51) {

            return pathCells[getMainTrackIndex(token)] || null;
        }

        if (token.progress <= 57) {

            const player = players[token.playerIndex];

            const laneIndex = token.progress - 52;

            const [row, col] = player.lane[laneIndex];

            return cellMap.get(`${row}-${col}`) || null;
        }

        return null;
    }

    /* ==========================================
       PLAYER HELPERS
    ========================================== */

    function isActivePlayer(index) {

        return activePlayers.some(player => player.index === index);
    }

    function getCurrentPlayer() {

        return activePlayers.find(
            player => player.index === currentPlayer
        );
    }

    function getPlayerTeam(index) {

        const config = getMatchConfiguration(selectedMatch);

        if (!config || !config.teams) {
            return null;
        }

        if (config.teamA.includes(index)) {
            return "A";
        }

        if (config.teamB.includes(index)) {
            return "B";
        }

        return null;
    }

    function isBot(index) {

        const player = activePlayers.find(
            item => item.index === index
        );

        return player ? player.isBot : false;
    }

    /* ==========================================
       PLAYER DISPLAY
    ========================================== */

    function updatePlayerDisplay() {

        players.forEach((player, index) => {

            const card = $(`player-${index}`);

            const nameDisplay = $(`playerNameDisplay${index}`);

            const rollBtn = $(`playerRollBtn${index}`);

            const active = isActivePlayer(index);

            const activePlayer = activePlayers.find(
                item => item.index === index
            );

            if (card) {

                card.hidden = !active;

                card.classList.toggle(
                    "active-player",
                    active && index === currentPlayer
                );

                const oldIndicator =
                    card.querySelector(".turn-indicator");

                if (oldIndicator) {
                    oldIndicator.remove();
                }

                if (active && index === currentPlayer) {

                    const indicator = document.createElement("span");

                    indicator.className = "turn-indicator";
                    indicator.textContent = "YOUR TURN";

                    card.appendChild(indicator);
                }
            }

            if (nameDisplay && activePlayer) {
                nameDisplay.textContent = activePlayer.name;
            }

            if (rollBtn) {

                rollBtn.hidden = !active;

                rollBtn.disabled =
                    !active ||
                    index !== currentPlayer ||
                    !activePlayer ||
                    activePlayer.isBot ||
                    isRolling ||
                    isMoving ||
                    waitingForToken ||
                    gameOver;
            }
        });
    }

    function updatePlayerTurn() {

        const player = getCurrentPlayer();

        if (!player || gameOver) return;

        turnName.textContent = player.name;

        turnSubtitle.textContent =
            `${players[currentPlayer].color} player's move`;

        updatePlayerDisplay();
    }

    /* ==========================================
       TOKEN MOVEMENT OPTIONS
    ========================================== */

    function getMovableTokens(playerIndex, diceValue) {

        return tokens[playerIndex].filter(token => {

            if (token.finished) {
                return false;
            }

            if (token.progress === -1) {
                return diceValue === 6;
            }

            return token.progress + diceValue <= 57;
        });
    }

    function clearTokenHighlights() {

        tokens.flat().forEach(token => {

            token.element.classList.remove(
                "movable",
                "selected-token"
            );
        });
    }

    function showMovableTokens(movableTokens) {

        clearTokenHighlights();

        movableTokens.forEach(token => {
            token.element.classList.add("movable");
        });
    }

    /* ==========================================
       DICE CONTROLS
    ========================================== */

    function setDiceDisabled(disabled) {

        rollButton.disabled = disabled;

        dice.disabled = disabled;

        updatePlayerDisplay();
    }

    function enableDice() {

        if (gameOver) return;

        waitingForToken = false;
        isRolling = false;
        isMoving = false;

        clearTokenHighlights();

        updatePlayerTurn();

        const player = getCurrentPlayer();

        if (!player) return;

        const bot = player.isBot;

        setDiceDisabled(bot);

        diceMessage.textContent = bot
            ? `${player.name} is thinking...`
            : `${player.name}, roll the dice!`;

        if (bot) {
            schedule(botRoll, 900);
        }
    }

    function rollDice() {

        if (
            isRolling ||
            isMoving ||
            waitingForToken ||
            gameOver ||
            isBot(currentPlayer)
        ) {
            return;
        }

        performRoll();
    }

    function performRoll() {

        if (
            isRolling ||
            isMoving ||
            waitingForToken ||
            gameOver
        ) {
            return;
        }

        isRolling = true;

        setDiceDisabled(true);

        dice.classList.remove("rolling");

        void dice.offsetWidth;

        dice.classList.add("rolling");

        diceMessage.textContent = "Rolling the dice...";

        const result = Math.floor(Math.random() * 6) + 1;

        schedule(() => {

            if (gameOver) return;

            currentRoll = result;

            dice.dataset.value = String(result);

            dice.setAttribute(
                "aria-label",
                `Dice showing ${result}`
            );

            lastRoll.textContent = String(result);

            dice.classList.remove("rolling");

            isRolling = false;

            const movable = getMovableTokens(
                currentPlayer,
                result
            );

            if (movable.length === 0) {

                diceMessage.textContent = result === 6
                    ? "Six! No legal move. Roll again!"
                    : "No legal move. Next player's turn.";

                schedule(() => {

                    if (gameOver) return;

                    if (result === 6) {
                        enableDice();
                    } else {
                        nextPlayer();
                    }

                }, 1000);

                return;
            }

            waitingForToken = true;

            showMovableTokens(movable);

            const player = getCurrentPlayer();

            diceMessage.textContent = result === 6
                ? `${player.name} rolled a SIX! Select a token.`
                : `${player.name} rolled ${result}. Select a highlighted token.`;

            if (player.isBot) {
                schedule(botChooseToken, 700);
            }

            updatePlayerDisplay();

        }, 650);
    }

    /* ==========================================
       COMPUTER PLAYER
    ========================================== */

    function botRoll() {

        if (gameOver || !isBot(currentPlayer)) {
            return;
        }

        performRoll();
    }

    function botChooseToken() {

        if (
            gameOver ||
            !waitingForToken ||
            !isBot(currentPlayer)
        ) {
            return;
        }

        const movable = getMovableTokens(
            currentPlayer,
            currentRoll
        );

        if (!movable.length) return;

        // Prefer a move that finishes a token.
        let chosen = movable.find(token => {

            return token.progress >= 0 &&
                token.progress + currentRoll === 57;
        });

        // Otherwise prefer capturing an opponent.
        if (!chosen) {

            chosen = movable.find(token => {

                if (
                    token.progress < 0 ||
                    token.progress > 51
                ) {
                    return false;
                }

                const landingIndex = (
                    players[currentPlayer].startIndex +
                    token.progress +
                    currentRoll
                ) % 52;

                return !safePositions.includes(landingIndex) &&
                    tokens.flat().some(other => {

                        return other.playerIndex !== currentPlayer &&
                            !other.finished &&
                            other.progress >= 0 &&
                            other.progress <= 51 &&
                            getMainTrackIndex(other) === landingIndex;
                    });
            });
        }

        // Prefer bringing a token out of home.
        if (!chosen) {

            chosen = movable.find(
                token => token.progress === -1
            );
        }

        // Otherwise move the token furthest along.
        if (!chosen) {

            chosen = movable.reduce((best, token) => {

                return token.progress > best.progress
                    ? token
                    : best;
            });
        }

        selectToken(chosen);
    }

    /* ==========================================
       CAPTURE OPPONENT TOKENS
    ========================================== */

    function captureOpponentTokens(movingToken) {

        const landingIndex = getMainTrackIndex(movingToken);

        if (landingIndex === null) return 0;

        if (safePositions.includes(landingIndex)) {
            return 0;
        }

        const opponents = tokens.flat().filter(other => {

            if (
                other.finished ||
                other.playerIndex === movingToken.playerIndex
            ) {
                return false;
            }

            return getMainTrackIndex(other) === landingIndex;
        });

        if (opponents.length !== 1) {
            return 0;
        }

        const captured = opponents[0];

        captured.progress = -1;
        captured.finished = false;

        captured.homeElement.appendChild(captured.element);

        updateTokenLabel(captured);

        return 1;
    }

    /* ==========================================
       SELECT TOKEN
    ========================================== */

    function selectToken(token) {

        if (
            !waitingForToken ||
            isMoving ||
            gameOver ||
            token.playerIndex !== currentPlayer
        ) {
            return;
        }

        const movable = getMovableTokens(
            currentPlayer,
            currentRoll
        );

        if (!movable.includes(token)) {
            return;
        }

        waitingForToken = false;

        isMoving = true;

        clearTokenHighlights();

        token.element.classList.add("selected-token");

        setDiceDisabled(true);

        moveToken(token);
    }

    /* ==========================================
       MOVE TOKEN
    ========================================== */

    function moveToken(token) {

        const diceValue = currentRoll;

        // Bring a token out of home on a six.
        if (token.progress === -1) {

            token.progress = 0;

            const startCell = getTokenCell(token);

            if (!startCell) {

                console.error("Starting cell not found.");

                finishTokenMove(token);

                return;
            }

            startCell.appendChild(token.element);

            updateTokenLabel(token);

            finishTokenMove(token);

            return;
        }

        let stepsMoved = 0;

        function moveOneStep() {

            if (stepsMoved >= diceValue) {

                finishTokenMove(token);

                return;
            }

            token.progress++;

            stepsMoved++;

            const targetCell = getTokenCell(token);

            if (!targetCell) {

                console.error("Token destination not found.");

                finishTokenMove(token);

                return;
            }

            targetCell.appendChild(token.element);

            updateTokenLabel(token);

            schedule(moveOneStep, 180);
        }

        moveOneStep();
    }

    /* ==========================================
       WIN CHECK
    ========================================== */

    function getWinningTeam(playerIndex) {

        const team = getPlayerTeam(playerIndex);

        // Individual match.
        if (!team) {

            return tokens[playerIndex].every(
                token => token.finished
            )
                ? "individual"
                : null;
        }

        // Team match.
        const config = getMatchConfiguration(selectedMatch);

        const teammates = team === "A"
            ? config.teamA
            : config.teamB;

        const teamHasWon = teammates.every(index => {

            return tokens[index].every(
                token => token.finished
            );
        });

        return teamHasWon ? team : null;
    }

    function showWinner(playerIndex, winningTeam) {

        gameOver = true;

        clearPendingTimers();

        clearTokenHighlights();

        setDiceDisabled(true);

        const player = activePlayers.find(
            item => item.index === playerIndex
        );

        if (!player) return;

        let title = "CONGRATULATIONS!";

        let message =
            `${player.name} has won HIDAMES Ludo!`;

        let winnerName = player.name;

        if (
            winningTeam === "A" ||
            winningTeam === "B"
        ) {

            title = "TEAM VICTORY!";

            winnerName = `Team ${winningTeam}`;

            message =
                `Team ${winningTeam} has won HIDAMES Ludo!`;
        }

        $("winnerTitle").textContent = title;

        $("winnerMessage").textContent = message;

        $("winnerName").textContent = winnerName;

        showScreen("winner");

        console.log(`${winnerName} won HIDAMES Ludo!`);
    }

    /* ==========================================
       FINISH TOKEN MOVEMENT
    ========================================== */

    function finishTokenMove(token) {

        isMoving = false;

        token.element.classList.remove("selected-token");

        const capturedCount = captureOpponentTokens(token);

        if (token.progress === 57) {

            token.finished = true;

            updateTokenLabel(token);

            diceMessage.textContent =
                `${getCurrentPlayer().name} finished a token!`;

        } else {

            diceMessage.textContent =
                `${getCurrentPlayer().name} moved ${currentRoll} steps.`;
        }

        if (capturedCount > 0) {

            diceMessage.textContent +=
                " Opponent token captured!";
        }

        const winningTeam = getWinningTeam(currentPlayer);

        if (winningTeam) {

            showWinner(currentPlayer, winningTeam);

            return;
        }

        updatePlayerDisplay();

        if (currentRoll === 6) {

            diceMessage.textContent += " Extra turn!";

            schedule(enableDice, 800);

        } else {

            schedule(nextPlayer, 800);
        }
    }

    /* ==========================================
       NEXT PLAYER
    ========================================== */

    function nextPlayer() {

        if (gameOver || activePlayers.length === 0) {
            return;
        }

        waitingForToken = false;

        clearTokenHighlights();

        const currentPosition = activePlayers.findIndex(
            player => player.index === currentPlayer
        );

        const nextPosition =
            (currentPosition + 1) % activePlayers.length;

        currentPlayer = activePlayers[nextPosition].index;

        enableDice();
    }

    /* ==========================================
       START GAME
    ========================================== */

    function startGame() {

        if (!selectedMode || !selectedMatch) {
            return;
        }

        if (selectedMode === "online") {

            setupMessage.textContent = onlineMessage;

            return;
        }

        const config = getMatchConfiguration(selectedMatch);

        if (!config) return;

        clearPendingTimers();

        activePlayers = config.players.map((index, position) => {

            return {
                index,
                name: getPlayerName(index),
                isBot: selectedMode === "computer" && position !== 0
            };
        });

        // Update team labels with the latest player names.
        if (config.teams) {
            renderTeamAssignment(config);
        }

        currentPlayer = activePlayers[0].index;

        currentRoll = 0;

        isRolling = false;
        isMoving = false;
        waitingForToken = false;
        gameOver = false;

        createBoard();

        // Reset the dice display.
        dice.classList.remove("rolling");

        dice.dataset.value = "1";

        dice.setAttribute(
            "aria-label",
            "Dice showing 1"
        );

        lastRoll.textContent = "—";

        showScreen("game");

        enableDice();

        console.log("HIDAMES Ludo game started.");
    }

    startGameBtn.addEventListener("click", startGame);

    /* ==========================================
       RESET / PLAY AGAIN
    ========================================== */

    function restartGame() {

        if (!activePlayers.length) {

            showScreen("setup");

            return;
        }

        clearPendingTimers();

        currentPlayer = activePlayers[0].index;

        currentRoll = 0;

        isRolling = false;
        isMoving = false;
        waitingForToken = false;
        gameOver = false;

        createBoard();

        dice.classList.remove("rolling");

        dice.dataset.value = "1";

        dice.setAttribute(
            "aria-label",
            "Dice showing 1"
        );

        lastRoll.textContent = "—";

        showScreen("game");

        enableDice();
    }

    if ($("playAgainBtn")) {

        $("playAgainBtn").addEventListener(
            "click",
            restartGame
        );
    }

    /* ==========================================
       BACK TO MENU
    ========================================== */

    function backToMenu() {

        clearPendingTimers();

        gameOver = true;

        isRolling = false;
        isMoving = false;
        waitingForToken = false;

        clearTokenHighlights();

        activePlayers = [];

        selectedMode = "";
        selectedMatch = "";

        document.querySelectorAll(
            ".mode-card, .match-option"
        ).forEach(button => {

            button.classList.remove(
                "active",
                "selected"
            );
        });

        matchSection.hidden = true;

        onlineSetup.hidden = true;

        nameSection.hidden = true;

        teamSection.hidden = true;

        startGameBtn.disabled = true;

        setupMessage.textContent =
            "Select a game mode to continue.";

        showScreen("setup");
    }

    if ($("backToMenuBtn")) {

        $("backToMenuBtn").addEventListener(
            "click",
            backToMenu
        );
    }

    if ($("winnerMenuBtn")) {

        $("winnerMenuBtn").addEventListener(
            "click",
            backToMenu
        );
    }

    /* ==========================================
       TOKEN CLICK / KEYBOARD EVENTS
    ========================================== */

    tokens.flat().forEach(token => {

        token.element.addEventListener("click", () => {

            selectToken(token);
        });

        token.element.addEventListener("keydown", event => {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();

                selectToken(token);
            }
        });
    });

    /* ==========================================
       DICE BUTTON EVENTS
    ========================================== */

    rollButton.addEventListener(
        "click",
        rollDice
    );

    dice.addEventListener(
        "click",
        rollDice
    );

    document.querySelectorAll(
        "[data-player-roll]"
    ).forEach(button => {

        button.addEventListener("click", function () {

            const playerIndex =
                Number(button.dataset.playerRoll);

            if (playerIndex !== currentPlayer) {
                return;
            }

            rollDice();
        });
    });

    /* ==========================================
       INITIAL STATE
    ========================================== */

    createBoard();

    showScreen("setup");

    matchSection.hidden = true;
    onlineSetup.hidden = true;
    nameSection.hidden = true;
    teamSection.hidden = true;

    startGameBtn.disabled = true;

    console.log("HIDAMES Ludo setup is ready!");

});
