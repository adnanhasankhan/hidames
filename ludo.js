
/* ==========================================
   HIDAMES LUDO - COMPLETE GAME ENGINE
========================================== */

document.addEventListener("DOMContentLoaded", function () {

    console.log("HIDAMES Ludo is ready!");

    /* ==========================================
       HTML ELEMENTS
    ========================================== */

    const track = document.getElementById("trackCells");
    const board = document.getElementById("ludoBoard");
    const dice = document.getElementById("dice");
    const rollButton = document.getElementById("rollBtn");

    const turnName = document.getElementById("turnName");
    const turnSubtitle = document.getElementById("turnSubtitle");
    const diceMessage = document.getElementById("diceMessage");
    const lastRoll = document.getElementById("lastRoll");

    if (
        !track || !board || !dice || !rollButton ||
        !turnName || !turnSubtitle || !diceMessage || !lastRoll
    ) {
        console.error("Ludo HTML elements are missing. Check ludo.html.");
        return;
    }

    /* ==========================================
       PLAYER CONFIGURATION
    ========================================== */

    const players = [
        {
            name: "Player 1",
            color: "Red",
            laneClass: "lane-red",
            startClass: "start-red",
            startIndex: 0,
            lane: [
                [8, 2], [8, 3], [8, 4],
                [8, 5], [8, 6], [8, 7]
            ]
        },
        {
            name: "Player 2",
            color: "Green",
            laneClass: "lane-green",
            startClass: "start-green",
            startIndex: 13,
            lane: [
                [2, 8], [3, 8], [4, 8],
                [5, 8], [6, 8], [7, 8]
            ]
        },
        {
            name: "Player 3",
            color: "Yellow",
            laneClass: "lane-yellow",
            startClass: "start-yellow",
            startIndex: 39,
            lane: [
                [14, 8], [13, 8], [12, 8],
                [11, 8], [10, 8], [9, 8]
            ]
        },
        {
            name: "Player 4",
            color: "Blue",
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

    /* ==========================================
       MAIN TRACK POSITIONS
    ========================================== */

    const mainPath = [

        // Red to Green
        [7, 2], [7, 3], [7, 4], [7, 5], [7, 6],
        [6, 7], [5, 7], [4, 7], [3, 7], [2, 7],
        [1, 7], [1, 8], [1, 9],

        // Green to Blue
        [2, 9], [3, 9], [4, 9], [5, 9], [6, 9],
        [7, 10], [7, 11], [7, 12], [7, 13], [7, 14],
        [7, 15], [8, 15], [9, 15],

        // Blue to Yellow
        [9, 14], [9, 13], [9, 12], [9, 11], [9, 10],
        [10, 9], [11, 9], [12, 9], [13, 9], [14, 9],
        [15, 9], [15, 8], [15, 7],

        // Yellow to Red
        [14, 7], [13, 7], [12, 7], [11, 7], [10, 7],
        [9, 6], [9, 5], [9, 4], [9, 3], [9, 2],
        [9, 1], [8, 1], [7, 1]
    ];

    if (mainPath.length !== 52) {
        console.error("The Ludo track must contain exactly 52 cells.");
        return;
    }

    const safePositions = [0, 8, 13, 21, 26, 34, 39, 47];

    /* ==========================================
       TOKEN CONFIGURATION

       -1     = Inside home
       0-51   = Main track
       52-57  = Home lane
       57     = Finished
    ========================================== */

    const tokens = players.map((player, playerIndex) => {

        return Array.from({ length: 4 }, (_, tokenIndex) => {

            const id = `token-${playerIndex}-${tokenIndex}`;
            const element = document.getElementById(id);

            if (!element) {
                console.error(`Missing token: ${id}`);
            } else {
                element.setAttribute("role", "button");
                element.setAttribute("tabindex", "0");
            }

            return {
                id,
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
        console.error("One or more Ludo tokens are missing from the HTML.");
        return;
    }

    /* ==========================================
       GAME VARIABLES
    ========================================== */

    let currentPlayer = 0;
    let currentRoll = 0;

    let isRolling = false;
    let isMoving = false;
    let waitingForToken = false;
    let gameOver = false;

    const pathCells = [];
    const cellMap = new Map();

    let pendingTimers = [];

    /* ==========================================
       TIMER MANAGEMENT
    ========================================== */

    function schedule(callback, delay) {

        const timer = setTimeout(() => {

            pendingTimers = pendingTimers.filter(
                item => item !== timer
            );

            callback();

        }, delay);

        pendingTimers.push(timer);

        return timer;
    }

    function clearPendingTimers() {

        pendingTimers.forEach(timer => {
            clearTimeout(timer);
        });

        pendingTimers = [];
    }

    /* ==========================================
       CREATE TRACK CELL
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

    /* ==========================================
       CREATE BOARD
    ========================================== */

    function createBoard() {

        track.innerHTML = "";

        pathCells.length = 0;
        cellMap.clear();

        // Create 52 main track cells.
        mainPath.forEach(([row, col], index) => {

            const cell = createCell(
                row,
                col,
                "main-track",
                index
            );

            if (safePositions.includes(index)) {
                cell.classList.add("safe-cell");
            }

            pathCells.push(cell);
        });

        // Create four coloured home lanes.
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

        // Highlight starting squares.
        players.forEach(player => {

            const startCell = pathCells[player.startIndex];

            if (startCell) {
                startCell.classList.add(player.startClass);
            }
        });

        // Return all tokens to their homes.
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
       TOKEN ACCESSIBILITY LABEL
    ========================================== */

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

    /* ==========================================
       TOKEN POSITION HELPERS
    ========================================== */

    function getMainTrackIndex(token) {

        if (token.progress < 0 || token.progress > 51) {
            return null;
        }

        const player = players[token.playerIndex];

        return (player.startIndex + token.progress) % 52;
    }

    function getTokenCell(token) {

        if (token.progress < 0) {
            return null;
        }

        // Main track: progress 0-51.
        if (token.progress <= 51) {

            const globalIndex = getMainTrackIndex(token);

            return pathCells[globalIndex] || null;
        }

        // Home lane: progress 52-57.
        if (token.progress <= 57) {

            const player = players[token.playerIndex];

            const laneIndex = token.progress - 52;

            const [row, col] = player.lane[laneIndex];

            return cellMap.get(`${row}-${col}`) || null;
        }

        return null;
    }

    /* ==========================================
       PLAYER TURN DISPLAY
    ========================================== */

    function updatePlayerTurn() {

        players.forEach((player, index) => {

            const card = document.getElementById(`player-${index}`);

            if (!card) return;

            card.classList.remove("active-player");

            const oldIndicator = card.querySelector(".turn-indicator");

            if (oldIndicator) {
                oldIndicator.remove();
            }

            if (index === currentPlayer) {

                card.classList.add("active-player");

                const indicator = document.createElement("span");

                indicator.className = "turn-indicator";
                indicator.textContent = "YOUR TURN";

                card.appendChild(indicator);
            }
        });

        if (gameOver) return;

        const player = players[currentPlayer];

        turnName.textContent = player.name;

        turnSubtitle.textContent =
            `${player.color} player's move`;
    }

    /* ==========================================
       GET MOVABLE TOKENS
    ========================================== */

    function getMovableTokens(playerIndex, diceValue) {

        return tokens[playerIndex].filter(token => {

            if (!token.element || token.finished) {
                return false;
            }

            // A six is required to leave home.
            if (token.progress === -1) {
                return diceValue === 6;
            }

            // Exact roll required to finish.
            return token.progress + diceValue <= 57;
        });
    }

    /* ==========================================
       TOKEN HIGHLIGHTS
    ========================================== */

    function clearTokenHighlights() {

        tokens.flat().forEach(token => {

            if (!token.element) return;

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
       ENABLE DICE
    ========================================== */

    function enableDice() {

        if (gameOver) return;

        waitingForToken = false;
        isRolling = false;
        isMoving = false;

        rollButton.disabled = false;
        dice.disabled = false;

        clearTokenHighlights();

        updatePlayerTurn();

        diceMessage.textContent =
            `${players[currentPlayer].name}, roll the dice!`;
    }

    /* ==========================================
       ROLL DICE
    ========================================== */

    function rollDice() {

        if (
            isRolling ||
            isMoving ||
            waitingForToken ||
            gameOver
        ) {
            return;
        }

        isRolling = true;

        rollButton.disabled = true;
        dice.disabled = true;

        dice.classList.remove("rolling");

        // Restart CSS animation.
        void dice.offsetWidth;

        dice.classList.add("rolling");

        diceMessage.textContent = "Rolling the dice...";

        const result = Math.floor(Math.random() * 6) + 1;

        schedule(() => {

            currentRoll = result;

            dice.dataset.value = String(result);

            dice.setAttribute(
                "aria-label",
                `Dice showing ${result}`
            );

            lastRoll.textContent = String(result);

            dice.classList.remove("rolling");

            isRolling = false;

            const movableTokens = getMovableTokens(
                currentPlayer,
                result
            );

            // No legal token can move.
            if (movableTokens.length === 0) {

                diceMessage.textContent =
                    result === 6
                        ? "Six! No legal move. Roll again!"
                        : "No token can move. Next player's turn.";

                schedule(() => {

                    if (gameOver) return;

                    if (result === 6) {
                        enableDice();
                    } else {
                        nextPlayer();
                    }

                }, 1100);

                return;
            }

            waitingForToken = true;

            showMovableTokens(movableTokens);

            diceMessage.textContent =
                result === 6
                    ? "You rolled a SIX! Select a highlighted token!"
                    : `You rolled ${result}! Select a highlighted token.`;

        }, 650);
    }

    /* ==========================================
       CAPTURE OPPONENT TOKENS
    ========================================== */

    function captureOpponentTokens(movingToken) {

        const landingIndex = getMainTrackIndex(movingToken);

        // No capture in home or home lane.
        if (landingIndex === null) {
            return 0;
        }

        // Safe squares protect tokens.
        if (safePositions.includes(landingIndex)) {
            return 0;
        }

        const opponentsOnCell = tokens
            .flat()
            .filter(otherToken => {

                if (
                    !otherToken.element ||
                    otherToken.finished ||
                    otherToken.playerIndex === movingToken.playerIndex
                ) {
                    return false;
                }

                return (
                    getMainTrackIndex(otherToken) === landingIndex
                );
            });

        // Two or more opponents protect the square.
        if (opponentsOnCell.length !== 1) {
            return 0;
        }

        const capturedToken = opponentsOnCell[0];

        capturedToken.progress = -1;
        capturedToken.finished = false;

        capturedToken.homeElement.appendChild(
            capturedToken.element
        );

        capturedToken.element.classList.remove(
            "movable",
            "selected-token"
        );

        updateTokenLabel(capturedToken);

        console.log(
            `${players[movingToken.playerIndex].color} captured ` +
            `${players[capturedToken.playerIndex].color}'s token!`
        );

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

        const movableTokens = getMovableTokens(
            currentPlayer,
            currentRoll
        );

        if (!movableTokens.includes(token)) {
            return;
        }

        waitingForToken = false;
        isMoving = true;

        clearTokenHighlights();

        token.element.classList.add("selected-token");

        rollButton.disabled = true;
        dice.disabled = true;

        moveToken(token);
    }

    /* ==========================================
       MOVE TOKEN
    ========================================== */

    function moveToken(token) {

        const diceValue = currentRoll;

        // Bring token out of home on a six.
        if (token.progress === -1) {

            token.progress = 0;

            const startCell = getTokenCell(token);

            if (!startCell) {
                console.error("Token starting cell not found.");
                finishTokenMove(token);
                return;
            }

            startCell.appendChild(token.element);

            updateTokenLabel(token);

            diceMessage.textContent =
                `${players[currentPlayer].name} brought a token out!`;

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
                console.error("Token destination cell not found.");
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
       FINISH TOKEN MOVEMENT
    ========================================== */

    function finishTokenMove(token) {

        isMoving = false;

        token.element.classList.remove("selected-token");

        const capturedCount = captureOpponentTokens(token);

        // Token reaches the final home-lane cell.
        if (token.progress === 57) {

            token.finished = true;

            updateTokenLabel(token);

            diceMessage.textContent =
                `${players[currentPlayer].name} finished a token!`;

        } else {

            diceMessage.textContent =
                `${players[currentPlayer].name} moved ${currentRoll} steps.`;
        }

        if (capturedCount > 0) {
            diceMessage.textContent += " Opponent token captured!";
        }

        // Check whether all four tokens have finished.
        const playerWon = tokens[currentPlayer].every(
            item => item.finished
        );

        if (playerWon) {

            gameOver = true;

            diceMessage.textContent =
                `🏆 ${players[currentPlayer].name} wins HIDAMES Ludo!`;

            turnName.textContent = "WINNER!";

            turnSubtitle.textContent =
                `${players[currentPlayer].color} player won!`;

            rollButton.disabled = true;
            dice.disabled = true;

            clearTokenHighlights();

            return;
        }

        // A six gives another turn.
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

        if (gameOver) return;

        waitingForToken = false;

        clearTokenHighlights();

        const currentTurnPosition = turnOrder.indexOf(currentPlayer);

        const nextTurnPosition =
            (currentTurnPosition + 1) % turnOrder.length;

        currentPlayer = turnOrder[nextTurnPosition];

        enableDice();
    }

    /* ==========================================
       RESET GAME
    ========================================== */

    function resetGame() {

        clearPendingTimers();

        currentPlayer = 0;
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

        rollButton.disabled = false;
        dice.disabled = false;

        updatePlayerTurn();

        enableDice();

        console.log("HIDAMES Ludo restarted.");
    }

    /* ==========================================
       OPTIONAL RESET BUTTON
    ========================================== */

    const resetButton = document.getElementById("resetBtn");

    if (resetButton) {
        resetButton.addEventListener("click", resetGame);
    }

    /* ==========================================
       TOKEN CLICK AND KEYBOARD EVENTS
    ========================================== */

    tokens.flat().forEach(token => {

        if (!token.element) return;

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

    rollButton.addEventListener("click", rollDice);

    dice.addEventListener("click", rollDice);

    /* ==========================================
       START GAME
    ========================================== */

    createBoard();

    dice.dataset.value = "1";

    dice.setAttribute(
        "aria-label",
        "Dice showing 1"
    );

    lastRoll.textContent = "—";

    updatePlayerTurn();

    enableDice();

});
