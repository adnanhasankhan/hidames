
/* =========================================================
   HIDAMES LUDO — RULEBOOK GAME ENGINE
   Computer | Same Device | Team Matches
   Online multiplayer requires a real backend.
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const $ = id => document.getElementById(id);

    /* =====================================================
       1. HTML ELEMENTS
    ===================================================== */

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

    const openingRollStatus = $("openingRollStatus");
    const gameStatus = $("gameStatus");
    const colorMessage = $("colorMessage");

    const required = [
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

    if (required.some(element => !element)) {
        console.error(
            "HIDAMES Ludo: Required HTML elements are missing. Check ludo.html."
        );
        return;
    }

    /* =====================================================
       2. COLOUR CONFIGURATION
    ===================================================== */

    const colorConfig = {
        red: {
            name: "Red",
            emoji: "🔴",
            hex: "#e53935",
            startIndex: 0,
            startClass: "start-red",
            laneClass: "lane-red",
            homeClass: "home-red",
            lane: [
                [8, 2], [8, 3], [8, 4],
                [8, 5], [8, 6], [8, 7]
            ]
        },

        green: {
            name: "Green",
            emoji: "🟢",
            hex: "#43a047",
            startIndex: 13,
            startClass: "start-green",
            laneClass: "lane-green",
            homeClass: "home-green",
            lane: [
                [2, 8], [3, 8], [4, 8],
                [5, 8], [6, 8], [7, 8]
            ]
        },

        yellow: {
            name: "Yellow",
            emoji: "🟡",
            hex: "#fbc02d",
            startIndex: 39,
            startClass: "start-yellow",
            laneClass: "lane-yellow",
            homeClass: "home-yellow",
            lane: [
                [14, 8], [13, 8], [12, 8],
                [11, 8], [10, 8], [9, 8]
            ]
        },

        blue: {
            name: "Blue",
            emoji: "🔵",
            hex: "#1e88e5",
            startIndex: 26,
            startClass: "start-blue",
            laneClass: "lane-blue",
            homeClass: "home-blue",
            lane: [
                [8, 14], [8, 13], [8, 12],
                [8, 11], [8, 10], [8, 9]
            ]
        }
    };

    const playerSlots = [0, 1, 2, 3];

    const players = playerSlots.map(index => ({
        index,
        colorKey: ["red", "green", "yellow", "blue"][index],
        name: `Player ${index + 1}`
    }));

    /* Standard clockwise order. */
    const turnOrder = [0, 1, 3, 2];

    /* =====================================================
       3. MAIN TRACK
    ===================================================== */

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

    const safePositions = [
        0, 8, 13, 21, 26, 34, 39, 47
    ];

    if (mainPath.length !== 52) {
        console.error("Invalid Ludo path: expected 52 cells.");
        return;
    }

    /* =====================================================
       4. TOKEN CONFIGURATION
    ===================================================== */

    const tokens = players.map(player => {

        return Array.from({ length: 4 }, (_, tokenIndex) => {

            const element = $(
                `token-${player.index}-${tokenIndex}`
            );

            if (!element) {
                console.error(
                    `Missing token-${player.index}-${tokenIndex}`
                );
            }

            if (element) {
                element.setAttribute("role", "button");
                element.setAttribute("tabindex", "0");
            }

            return {
                playerIndex: player.index,
                tokenIndex,
                progress: -1,
                finished: false,
                element,
                homeElement: null
            };
        });
    });

    if (tokens.flat().some(token => !token.element)) {
        console.error("Some Ludo tokens are missing in ludo.html.");
        return;
    }

    /* =====================================================
       5. GAME STATE
    ===================================================== */

    let selectedMode = "";
    let selectedMatch = "";

    let activePlayers = [];
    let currentPlayer = 0;
    let currentRoll = 0;

    let isRolling = false;
    let isMoving = false;
    let waitingForToken = false;
    let gameOver = false;
    let openingRound = false;

    let consecutiveSixes = 0;

    /*
       Snapshot before the first roll of a turn.
       If the third consecutive six occurs, all positions
       are restored to this snapshot.
    */
    let turnSnapshot = null;

    let pendingTimers = [];

    const cellMap = new Map();
    const pathCells = [];

    /* =====================================================
       6. TIMER MANAGEMENT
    ===================================================== */

    function schedule(callback, delay) {

        const timer = setTimeout(() => {

            pendingTimers = pendingTimers.filter(
                item => item !== timer
            );

            if (!gameOver) {
                callback();
            }

        }, delay);

        pendingTimers.push(timer);

        return timer;
    }

    function clearPendingTimers() {

        pendingTimers.forEach(clearTimeout);

        pendingTimers = [];
    }

    /* =====================================================
       7. SCREEN MANAGEMENT
    ===================================================== */

    function showScreen(screen) {

        setupScreen.hidden = screen !== "setup";
        gameLayout.hidden = screen !== "game";
        winnerScreen.hidden = screen !== "winner";
    }

    function setStatus(message) {

        if (gameStatus) {
            gameStatus.textContent = message;
        }
    }

    /* =====================================================
       8. MATCH CONFIGURATION
    ===================================================== */

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

    /* =====================================================
       9. COLOUR SELECTION
    ===================================================== */

    function readSelectedColors() {

        return players.map(player => {

            const select = $(`playerColor${player.index}`);

            return select && select.value
                ? select.value.toLowerCase()
                : player.colorKey;
        });
    }

    function validateColors() {

        const selected = readSelectedColors();

        const active = selected.slice(
            0,
            4
        );

        const valid = active.every(
            color => Boolean(colorConfig[color])
        );

        const unique = new Set(active).size === active.length;

        if (!valid) {

            if (colorMessage) {
                colorMessage.textContent =
                    "Choose a valid colour for every player.";
            }

            return false;
        }

        if (!unique) {

            if (colorMessage) {
                colorMessage.textContent =
                    "Each player must have a different colour.";
            }

            return false;
        }

        players.forEach((player, index) => {
            player.colorKey = selected[index];
        });

        if (colorMessage) {
            colorMessage.textContent =
                "All player colours are valid.";
        }

        return true;
    }

    document.querySelectorAll(".player-color-select").forEach(select => {

        select.addEventListener("change", () => {

            const selected = readSelectedColors();

            const duplicate =
                new Set(selected).size !== selected.length;

            if (colorMessage) {

                colorMessage.textContent = duplicate
                    ? "Duplicate colours are not allowed."
                    : "Player colours updated.";
            }

            startGameBtn.disabled =
                !selectedMode ||
                !selectedMatch ||
                duplicate;
        });
    });

    function getPlayerConfig(index) {

        return colorConfig[players[index].colorKey];
    }

    function getPlayerName(index) {

        const input = $(`playerName${index}`);

        return input && input.value.trim()
            ? input.value.trim()
            : `Player ${index + 1}`;
    }

    /* =====================================================
       10. GAME MODE SELECTION
    ===================================================== */

    document.querySelectorAll(".mode-card").forEach(button => {

        button.addEventListener("click", () => {

            selectedMode = button.dataset.mode;

            document.querySelectorAll(".mode-card").forEach(item => {
                item.classList.toggle("active", item === button);
            });

            document.querySelectorAll(".match-option").forEach(item => {
                item.classList.remove("active", "selected");
            });

            selectedMatch = "";
            startGameBtn.disabled = true;

            matchSection.hidden = false;
            nameSection.hidden = true;
            teamSection.hidden = true;

            if (onlineSetup) {
                onlineSetup.hidden = selectedMode !== "online";
            }

            setupMessage.textContent =
                selectedMode === "online"
                    ? "Online multiplayer requires a real backend connection. It is not available yet."
                    : "Choose your match type.";
        });
    });

    /* =====================================================
       11. MATCH TYPE SELECTION
    ===================================================== */

    document.querySelectorAll(".match-option").forEach(button => {

        button.addEventListener("click", () => {

            if (!selectedMode || selectedMode === "online") {
                return;
            }

            selectedMatch = button.dataset.match;

            document.querySelectorAll(".match-option").forEach(item => {
                item.classList.toggle("active", item === button);
            });

            const config = getMatchConfiguration(selectedMatch);

            if (!config) {

                setupMessage.textContent = "Invalid match selection.";

                startGameBtn.disabled = true;

                return;
            }

            nameSection.hidden = false;

            if (teamSection) {
                teamSection.hidden = !config.teams;
            }

            document.querySelectorAll(".name-field").forEach(field => {

                const index = Number(field.dataset.playerName);

                field.hidden = !config.players.includes(index);
            });

            renderTeamAssignment(config);

            startGameBtn.disabled = false;

            setupMessage.textContent =
                selectedMode === "computer"
                    ? "Enter your name. Other players will be computers."
                    : "Enter player names and prepare your match.";
        });
    });

    /* =====================================================
       12. ONLINE MODE
    ===================================================== */

    const onlineMessage =
        "Online multiplayer is not connected. A real backend such as Supabase Realtime is required.";

    ["createRoomBtn", "joinRoomBtn"].forEach(id => {

        const button = $(id);

        if (button) {
            button.addEventListener("click", () => {
                setupMessage.textContent = onlineMessage;
            });
        }
    });

    /* =====================================================
       13. PLAYER NAMES AND TEAMS
    ===================================================== */

    function renderTeamAssignment(config) {

        if (!config || !config.teams) return;

        const teamA = $("teamAPlayers");
        const teamB = $("teamBPlayers");

        if (!teamA || !teamB) return;

        teamA.innerHTML = "";
        teamB.innerHTML = "";

        function addPlayers(container, indexes) {

            indexes.forEach(index => {

                const label = document.createElement("p");

                label.textContent =
                    `${getPlayerConfig(index).emoji} ${getPlayerName(index)}`;

                container.appendChild(label);
            });
        }

        addPlayers(teamA, config.teamA);
        addPlayers(teamB, config.teamB);
    }

    if ($("skipNamesBtn")) {

        $("skipNamesBtn").addEventListener("click", () => {

            players.forEach(player => {

                const input = $(`playerName${player.index}`);

                if (input) {
                    input.value = "";
                }
            });

            setupMessage.textContent =
                "Default player names selected.";

            const config = getMatchConfiguration(selectedMatch);

            if (config) {
                renderTeamAssignment(config);
            }
        });
    }

    /* =====================================================
       14. TEAM HELPERS
    ===================================================== */

    function getPlayerTeam(index) {

        const config = getMatchConfiguration(selectedMatch);

        if (!config || !config.teams) {
            return null;
        }

        if (config.teamA.includes(index)) return "A";
        if (config.teamB.includes(index)) return "B";

        return null;
    }

    function areTeammates(firstIndex, secondIndex) {

        const firstTeam = getPlayerTeam(firstIndex);
        const secondTeam = getPlayerTeam(secondIndex);

        return Boolean(
            firstTeam &&
            secondTeam &&
            firstTeam === secondTeam
        );
    }

    function isOpponent(firstIndex, secondIndex) {

        if (firstIndex === secondIndex) {
            return false;
        }

        if (areTeammates(firstIndex, secondIndex)) {
            return false;
        }

        return true;
    }

    /* =====================================================
       15. TOKEN HOME POSITIONS
    ===================================================== */

    function assignTokenHomes() {

        tokens.flat().forEach(token => {

            const player = players[token.playerIndex];

            const config = getPlayerConfig(player.index);

            const home = board.querySelector(
                `.${config.homeClass} .home-inner`
            );

            token.homeElement = home;

            if (!home) {
                console.error(
                    `Missing home area for ${config.name}. Check ludo.html.`
                );
                return;
            }

            token.element.style.backgroundColor = config.hex;
            token.element.style.borderColor = "#ffffff";
        });
    }

    /* =====================================================
       16. BOARD GENERATION
    ===================================================== */

    function createCell(row, col, className, index = null) {

        const cell = document.createElement("div");

        cell.className = `track-cell ${className}`;

        cell.style.gridRow = String(row);
        cell.style.gridColumn = String(col);

        if (index !== null) {
            cell.dataset.trackIndex = String(index);
        }

        track.appendChild(cell);

        cellMap.set(`${row}-${col}`, cell);

        return cell;
    }

    function getMainTrackIndex(token) {

        if (token.progress < 0 || token.progress > 51) {
            return null;
        }

        const config = getPlayerConfig(token.playerIndex);

        return (
            config.startIndex + token.progress
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

            const config = getPlayerConfig(token.playerIndex);

            const laneIndex = token.progress - 52;

            const [row, col] = config.lane[laneIndex];

            return cellMap.get(`${row}-${col}`) || null;
        }

        return null;
    }

    function updateTokenLabel(token) {

        const player = players[token.playerIndex];

        let status = "in base";

        if (token.finished) {
            status = "finished";
        } else if (token.progress <= 51 && token.progress >= 0) {
            status = "on the main track";
        } else if (token.progress >= 52) {
            status = "in the home lane";
        }

        token.element.setAttribute(
            "aria-label",
            `${player.name}, ${getPlayerConfig(player.index).name} token ${token.tokenIndex + 1}, ${status}`
        );
    }

    function createBoard() {

        track.innerHTML = "";

        pathCells.length = 0;
        cellMap.clear();

        assignTokenHomes();

        mainPath.forEach(([row, col], index) => {

            const cell = createCell(row, col, "main-track", index);

            if (safePositions.includes(index)) {
                cell.classList.add("safe-cell");
            }

            pathCells.push(cell);
        });

        players.forEach(player => {

            const config = getPlayerConfig(player.index);

            config.lane.forEach(([row, col], index) => {

                const cell = createCell(
                    row,
                    col,
                    `home-lane ${config.laneClass}`
                );

                cell.dataset.laneIndex = String(index);
            });
        });

        /* Clear old starting-square markings. */
        pathCells.forEach(cell => {

            Object.values(colorConfig).forEach(config => {
                cell.classList.remove(config.startClass);
            });
        });

        players.forEach(player => {

            const config = getPlayerConfig(player.index);

            const startCell = pathCells[config.startIndex];

            if (startCell) {
                startCell.classList.add(config.startClass);
                startCell.style.backgroundColor = config.hex;
            }
        });

        tokens.flat().forEach(token => {

            token.progress = -1;
            token.finished = false;

            token.element.classList.remove(
                "movable",
                "selected-token"
            );

            token.element.style.backgroundColor =
                getPlayerConfig(token.playerIndex).hex;

            token.homeElement.appendChild(token.element);

            updateTokenLabel(token);
        });
    }

    /* =====================================================
       17. PLAYER STATE
    ===================================================== */

    function isActivePlayer(index) {

        return activePlayers.some(
            player => player.index === index
        );
    }

    function getCurrentPlayer() {

        return activePlayers.find(
            player => player.index === currentPlayer
        );
    }

    function isBot(index) {

        const player = activePlayers.find(
            item => item.index === index
        );

        return player ? player.isBot : false;
    }

    function updatePlayerDisplay() {

        players.forEach(player => {

            const index = player.index;

            const card = $(`player-${index}`);
            const nameDisplay = $(`playerNameDisplay${index}`);
            const rollBtn = $(`playerRollBtn${index}`);

            const activePlayer = activePlayers.find(
                item => item.index === index
            );

            const active = Boolean(activePlayer);

            if (card) {

                card.hidden = !active;

                card.classList.toggle(
                    "active",
                    active && index === currentPlayer
                );

                card.style.borderLeft =
                    `4px solid ${getPlayerConfig(index).hex}`;
            }

            if (nameDisplay && activePlayer) {
                nameDisplay.textContent = activePlayer.name;
            }

            if (rollBtn) {

                rollBtn.hidden = !active;

                rollBtn.disabled =
                    !active ||
                    index !== currentPlayer ||
                    isBot(index) ||
                    isRolling ||
                    isMoving ||
                    waitingForToken ||
                    gameOver ||
                    openingRound;
            }
        });
    }

    function updatePlayerTurn() {

        const player = getCurrentPlayer();

        if (!player) return;

        const config = getPlayerConfig(currentPlayer);

        turnName.textContent = player.name;

        turnSubtitle.textContent =
            `${config.emoji} ${config.name} player's turn`;

        updatePlayerDisplay();
    }

    /* =====================================================
       18. BLOCKADE RULES
    ===================================================== */

    /*
       A blockade exists when two tokens belonging to the
       same player occupy the same main-track square.

       An opponent cannot pass through or land on it.
       Teammates are not treated as opponents.
    */

    function getBlockadeOwner(trackIndex) {

        const counts = new Map();

        tokens.flat().forEach(token => {

            if (token.finished || token.progress < 0 ||
                token.progress > 51) {
                return;
            }

            if (getMainTrackIndex(token) !== trackIndex) {
                return;
            }

            counts.set(
                token.playerIndex,
                (counts.get(token.playerIndex) || 0) + 1
            );
        });

        for (const [playerIndex, count] of counts) {

            if (count >= 2) {
                return playerIndex;
            }
        }

        return null;
    }

    function isBlockedForPlayer(trackIndex, movingPlayer) {

        const owner = getBlockadeOwner(trackIndex);

        if (owner === null) return false;

        return isOpponent(movingPlayer, owner);
    }

    function canMoveThroughBlockades(token, diceValue) {

        const playerIndex = token.playerIndex;

        let startingProgress = token.progress;

        /*
           A token leaving base enters its own starting square.
           Check that square for an opponent blockade.
        */

        if (startingProgress === -1) {

            const startIndex =
                getPlayerConfig(playerIndex).startIndex;

            return !isBlockedForPlayer(startIndex, playerIndex);
        }

        /*
           Check every outer-track square crossed by the move.
           This prevents jumping over an enemy blockade.
        */

        for (let step = 1; step <= diceValue; step++) {

            const nextProgress = startingProgress + step;

            if (nextProgress > 51) {
                break;
            }

            const trackIndex = (
                getPlayerConfig(playerIndex).startIndex +
                nextProgress
            ) % 52;

            if (isBlockedForPlayer(trackIndex, playerIndex)) {
                return false;
            }
        }

        return true;
    }

    /* =====================================================
       19. LEGAL MOVES
    ===================================================== */

    function getMovableTokens(playerIndex, diceValue) {

        return tokens[playerIndex].filter(token => {

            if (token.finished) {
                return false;
            }

            if (token.progress === -1) {

                return diceValue === 6 &&
                    canMoveThroughBlockades(token, diceValue);
            }

            if (token.progress + diceValue > 57) {
                return false;
            }

            return canMoveThroughBlockades(token, diceValue);
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

    function showMovableTokens(movable) {

        clearTokenHighlights();

        movable.forEach(token => {
            token.element.classList.add("movable");
        });
    }

    /* =====================================================
       20. TURN SNAPSHOT AND FULL ROLLBACK
    ===================================================== */

    function createTurnSnapshot() {

        return tokens.map(playerTokens => {

            return playerTokens.map(token => ({
                progress: token.progress,
                finished: token.finished
            }));
        });
    }

    function restoreTurnSnapshot() {

        if (!turnSnapshot) return;

        tokens.forEach((playerTokens, playerIndex) => {

            playerTokens.forEach((token, tokenIndex) => {

                const saved = turnSnapshot[playerIndex][tokenIndex];

                token.progress = saved.progress;
                token.finished = saved.finished;

                const destination = getTokenCell(token);

                if (destination) {
                    destination.appendChild(token.element);
                } else {
                    token.homeElement.appendChild(token.element);
                }

                updateTokenLabel(token);
            });
        });

        clearTokenHighlights();

        setStatus(
            "Three consecutive sixes! The entire turn has been cancelled and all moves have been reversed."
        );
    }

    /* =====================================================
       21. DICE CONTROLS
    ===================================================== */

    function setDiceDisabled(disabled) {

        rollButton.disabled = disabled;

        dice.style.pointerEvents = disabled ? "none" : "auto";

        updatePlayerDisplay();
    }

    function rollDice() {

        if (
            isRolling ||
            isMoving ||
            waitingForToken ||
            gameOver ||
            openingRound ||
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
            gameOver ||
            openingRound
        ) {
            return;
        }

        /*
           Capture the board state before the first roll
           of this player's turn.
        */
        if (!turnSnapshot) {
            turnSnapshot = createTurnSnapshot();
            consecutiveSixes = 0;
        }

        isRolling = true;

        setDiceDisabled(true);

        dice.classList.remove("rolling");

        void dice.offsetWidth;

        dice.classList.add("rolling");

        diceMessage.textContent = "Rolling the dice...";

        const result = Math.floor(Math.random() * 6) + 1;

        schedule(() => {

            currentRoll = result;

            dice.dataset.value = String(result);
            dice.textContent = String(result);

            dice.setAttribute(
                "aria-label",
                `Dice showing ${result}`
            );

            lastRoll.textContent = String(result);

            dice.classList.remove("rolling");

            isRolling = false;

            /* THREE CONSECUTIVE SIXES */
            if (result === 6) {

                consecutiveSixes++;

                if (consecutiveSixes === 3) {

                    restoreTurnSnapshot();

                    currentRoll = 0;

                    waitingForToken = false;
                    isMoving = false;

                    turnSnapshot = null;
                    consecutiveSixes = 0;

                    diceMessage.textContent =
                        "Three sixes! Your complete turn has been cancelled.";

                    schedule(nextPlayer, 1400);

                    return;
                }

            } else {

                consecutiveSixes = 0;
            }

            const movable = getMovableTokens(
                currentPlayer,
                result
            );

            if (movable.length === 0) {

                if (result === 6) {

                    diceMessage.textContent =
                        "Six! No legal move. You may roll again.";

                    schedule(enableDice, 900);

                } else {

                    diceMessage.textContent =
                        "No legal move. Turn passed.";

                    turnSnapshot = null;

                    schedule(nextPlayer, 900);
                }

                return;
            }

            waitingForToken = true;

            showMovableTokens(movable);

            const player = getCurrentPlayer();

            diceMessage.textContent =
                `${player.name} rolled ${result}. Select a highlighted token.`;

            if (player.isBot) {
                schedule(botChooseToken, 700);
            }

            updatePlayerDisplay();

        }, 650);
    }

    /* =====================================================
       22. COMPUTER PLAYER
    ===================================================== */

    function botRoll() {

        if (
            gameOver ||
            !isBot(currentPlayer) ||
            openingRound
        ) {
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

        /* Priority 1: finish a token. */
        let chosen = movable.find(token =>
            token.progress >= 0 &&
            token.progress + currentRoll === 57
        );

        /* Priority 2: capture an opponent. */
        if (!chosen) {

            chosen = movable.find(token => {

                if (token.progress < 0 || token.progress > 51) {
                    return false;
                }

                const landingIndex = (
                    getPlayerConfig(currentPlayer).startIndex +
                    token.progress +
                    currentRoll
                ) % 52;

                if (safePositions.includes(landingIndex)) {
                    return false;
                }

                const enemies = tokens.flat().filter(other => {

                    return isOpponent(
                        currentPlayer,
                        other.playerIndex
                    ) &&
                        !other.finished &&
                        other.progress >= 0 &&
                        other.progress <= 51 &&
                        getMainTrackIndex(other) === landingIndex;
                });

                return enemies.length === 1;
            });
        }

        /* Priority 3: release a token from base. */
        if (!chosen) {
            chosen = movable.find(token => token.progress === -1);
        }

        /* Priority 4: advance the furthest token. */
        if (!chosen) {

            chosen = movable.reduce((best, token) => {

                return token.progress > best.progress
                    ? token
                    : best;
            });
        }

        selectToken(chosen);
    }

    /* =====================================================
       23. CAPTURE RULES
    ===================================================== */

    function captureOpponentTokens(movingToken) {

        const landingIndex = getMainTrackIndex(movingToken);

        if (landingIndex === null) return 0;

        if (safePositions.includes(landingIndex)) {
            return 0;
        }

        const enemies = tokens.flat().filter(other => {

            if (
                other.finished ||
                other.progress < 0 ||
                other.progress > 51
            ) {
                return false;
            }

            if (!isOpponent(
                movingToken.playerIndex,
                other.playerIndex
            )) {
                return false;
            }

            return getMainTrackIndex(other) === landingIndex;
        });

        /*
           Capture only when exactly one opponent token
           occupies the landing square.
        */

        if (enemies.length !== 1) {
            return 0;
        }

        const captured = enemies[0];

        captured.progress = -1;
        captured.finished = false;

        captured.homeElement.appendChild(captured.element);

        updateTokenLabel(captured);

        return 1;
    }

    /* =====================================================
       24. TOKEN SELECTION
    ===================================================== */

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

    /* =====================================================
       25. TOKEN MOVEMENT
    ===================================================== */

    function moveToken(token) {

        const diceValue = currentRoll;

        /* Release from base on a six. */
        if (token.progress === -1) {

            token.progress = 0;

            const destination = getTokenCell(token);

            if (!destination) {
                console.error("Starting cell could not be found.");
                finishTokenMove(token);
                return;
            }

            destination.appendChild(token.element);

            updateTokenLabel(token);

            schedule(() => finishTokenMove(token), 180);

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

            const destination = getTokenCell(token);

            if (!destination) {

                console.error("Token destination could not be found.");

                finishTokenMove(token);

                return;
            }

            destination.appendChild(token.element);

            updateTokenLabel(token);

            schedule(moveOneStep, 180);
        }

        moveOneStep();
    }

    /* =====================================================
       26. WIN CONDITIONS
    ===================================================== */

    function getWinningTeam(playerIndex) {

        const team = getPlayerTeam(playerIndex);

        if (!team) {

            return tokens[playerIndex].every(
                token => token.finished
            )
                ? "individual"
                : null;
        }

        const config = getMatchConfiguration(selectedMatch);

        const teammates = team === "A"
            ? config.teamA
            : config.teamB;

        const teamWon = teammates.every(index => {

            return tokens[index].every(
                token => token.finished
            );
        });

        return teamWon ? team : null;
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
        let message = `${player.name} has won HIDAMES Ludo!`;
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

        if ($("winnerTitle")) {
            $("winnerTitle").textContent = title;
        }

        if ($("winnerMessage")) {
            $("winnerMessage").textContent = message;
        }

        if ($("winnerName")) {
            $("winnerName").textContent = winnerName;
        }

        showScreen("winner");
    }

    /* =====================================================
       27. FINISH MOVEMENT
    ===================================================== */

    function finishTokenMove(token) {

        isMoving = false;

        token.element.classList.remove("selected-token");

        const capturedCount = captureOpponentTokens(token);

        const finishedNow = token.progress === 57 &&
            !token.finished;

        if (finishedNow) {

            token.finished = true;

            updateTokenLabel(token);
        }

        const player = getCurrentPlayer();

        let bonusTurn = false;

        if (capturedCount > 0) {

            bonusTurn = true;

            diceMessage.textContent =
                `${player.name} captured an opponent token! Bonus roll earned.`;
        }

        if (finishedNow) {

            bonusTurn = true;

            diceMessage.textContent =
                `${player.name} finished a token! Bonus roll earned.`;
        }

        if (capturedCount > 0 && finishedNow) {

            diceMessage.textContent =
                `${player.name} captured an opponent and finished a token!`;
        }

        const winningTeam = getWinningTeam(currentPlayer);

        if (winningTeam) {

            showWinner(currentPlayer, winningTeam);

            return;
        }

        updatePlayerDisplay();

        /*
           A six, capture or finishing a token earns an
           additional roll. A third six was already handled
           before token selection.
        */

        if (currentRoll === 6 || bonusTurn) {

            diceMessage.textContent += " Extra roll!";

            schedule(enableDice, 850);

        } else {

            turnSnapshot = null;
            consecutiveSixes = 0;

            schedule(nextPlayer, 850);
        }
    }

    /* =====================================================
       28. TURN MANAGEMENT
    ===================================================== */

    function enableDice() {

        if (gameOver) return;

        waitingForToken = false;
        isRolling = false;
        isMoving = false;

        clearTokenHighlights();

        updatePlayerTurn();

        const player = getCurrentPlayer();

        if (!player) return;

        setDiceDisabled(player.isBot);

        diceMessage.textContent = player.isBot
            ? `${player.name} is thinking...`
            : `${player.name}, roll the dice!`;

        if (player.isBot) {
            schedule(botRoll, 900);
        }
    }

    function nextPlayer() {

        if (gameOver || activePlayers.length === 0) {
            return;
        }

        waitingForToken = false;

        turnSnapshot = null;
        consecutiveSixes = 0;
        currentRoll = 0;

        clearTokenHighlights();

        const position = activePlayers.findIndex(
            player => player.index === currentPlayer
        );

        const nextPosition =
            (position + 1) % activePlayers.length;

        currentPlayer = activePlayers[nextPosition].index;

        enableDice();
    }

    /* =====================================================
       29. OPENING DICE ROUND
    ===================================================== */

    /*
       Each player rolls once.
       The highest roll starts.
       If players tie for the highest roll, only those
       players reroll until there is one winner.
    */

    function openingDiceRound() {

        openingRound = true;

        setDiceDisabled(true);

        const openingPlayers = activePlayers.map(player => player.index);

        if (openingRollStatus) {
            openingRollStatus.textContent =
                "Opening round: each player is rolling once...";
        }

        const results = {};

        function rollOpeningPlayer(index, callback) {

            const value = Math.floor(Math.random() * 6) + 1;

            results[index] = value;

            const player = activePlayers.find(
                item => item.index === index
            );

            if (openingRollStatus) {

                openingRollStatus.textContent =
                    `${player.name} rolled ${value}.`;
            }

            dice.dataset.value = String(value);
            dice.textContent = String(value);

            lastRoll.textContent = String(value);

            schedule(callback, 650);
        }

        function rollRound(contenders, initialRound) {

            let position = 0;

            function nextOpeningRoll() {

                if (position >= contenders.length) {

                    const highest = Math.max(
                        ...contenders.map(index => results[index])
                    );

                    const winners = contenders.filter(
                        index => results[index] === highest
                    );

                    if (winners.length === 1) {

                        currentPlayer = winners[0];

                        openingRound = false;

                        if (openingRollStatus) {

                            const winner = activePlayers.find(
                                player => player.index === currentPlayer
                            );

                            openingRollStatus.textContent =
                                `${winner.name} rolled the highest and starts!`;
                        }

                        diceMessage.textContent =
                            "Opening round complete. Good luck!";

                        enableDice();

                        return;
                    }

                    if (openingRollStatus) {
                        openingRollStatus.textContent =
                            `Tie at ${highest}! Tied players must roll again.`;
                    }

                    contenders = winners;

                    position = 0;

                    schedule(nextOpeningRoll, 900);

                    return;
                }

                const index = contenders[position++];

                rollOpeningPlayer(index, nextOpeningRoll);
            }

            nextOpeningRoll();
        }

        rollRound(openingPlayers, true);
    }

    /* =====================================================
       30. START GAME
    ===================================================== */

    function startGame() {

        if (!selectedMode || !selectedMatch) {
            setupMessage.textContent =
                "Choose a game mode and match type first.";
            return;
        }

        if (selectedMode === "online") {

            setupMessage.textContent = onlineMessage;

            return;
        }

        if (!validateColors()) {
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

        players.forEach(player => {
            player.name = getPlayerName(player.index);
        });

        renderTeamAssignment(config);

        currentPlayer = activePlayers[0].index;

        currentRoll = 0;

        isRolling = false;
        isMoving = false;
        waitingForToken = false;
        gameOver = false;
        openingRound = false;

        consecutiveSixes = 0;
        turnSnapshot = null;

        createBoard();

        dice.classList.remove("rolling");
        dice.dataset.value = "1";
        dice.textContent = "1";

        dice.setAttribute("aria-label", "Dice showing 1");

        lastRoll.textContent = "—";

        showScreen("game");

        updatePlayerDisplay();

        setStatus("The opening dice round is starting.");

        openingDiceRound();
    }

    startGameBtn.addEventListener("click", startGame);

    /* =====================================================
       31. RESTART GAME
    ===================================================== */

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
        openingRound = false;

        consecutiveSixes = 0;
        turnSnapshot = null;

        createBoard();

        dice.classList.remove("rolling");
        dice.dataset.value = "1";
        dice.textContent = "1";

        lastRoll.textContent = "—";

        showScreen("game");

        openingDiceRound();
    }

    if ($("playAgainBtn")) {
        $("playAgainBtn").addEventListener("click", restartGame);
    }

    /* =====================================================
       32. BACK TO MENU
    ===================================================== */

    function backToMenu() {

        clearPendingTimers();

        gameOver = true;

        isRolling = false;
        isMoving = false;
        waitingForToken = false;
        openingRound = false;

        activePlayers = [];

        selectedMode = "";
        selectedMatch = "";

        turnSnapshot = null;
        consecutiveSixes = 0;

        clearTokenHighlights();

        document.querySelectorAll(
            ".mode-card, .match-option"
        ).forEach(button => {
            button.classList.remove("active", "selected");
        });

        matchSection.hidden = true;

        if (onlineSetup) onlineSetup.hidden = true;

        nameSection.hidden = true;

        if (teamSection) teamSection.hidden = true;

        startGameBtn.disabled = true;

        setupMessage.textContent =
            "Select a game mode to continue.";

        showScreen("setup");
    }

    if ($("backToMenuBtn")) {
        $("backToMenuBtn").addEventListener("click", backToMenu);
    }

    if ($("winnerMenuBtn")) {
        $("winnerMenuBtn").addEventListener("click", backToMenu);
    }

    /* =====================================================
       33. TOKEN CLICK AND KEYBOARD EVENTS
    ===================================================== */

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

    /* =====================================================
       34. DICE EVENTS
    ===================================================== */

    rollButton.addEventListener("click", rollDice);

    dice.addEventListener("click", rollDice);

    document.querySelectorAll("[data-player-roll]").forEach(button => {

        button.addEventListener("click", () => {

            const index = Number(button.dataset.playerRoll);

            if (index !== currentPlayer) return;

            rollDice();
        });
    });

    /* =====================================================
       35. INITIALIZATION
    ===================================================== */

    assignTokenHomes();

    createBoard();

    showScreen("setup");

    matchSection.hidden = true;

    if (onlineSetup) onlineSetup.hidden = true;

    nameSection.hidden = true;

    if (teamSection) teamSection.hidden = true;

    startGameBtn.disabled = true;

    if (colorMessage) {
        colorMessage.textContent =
            "Choose a different colour for each player.";
    }

    if (openingRollStatus) {
        openingRollStatus.textContent = "";
    }

    console.log("HIDAMES Ludo rulebook engine initialized.");

});
