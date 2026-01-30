// Game constants
const ROUND_NAMES = {
    1: "Descripción Libre",
    2: "Una Palabra",
    3: "Mímica"
};

const ROUND_RULES = {
    1: "Describe el concepto libremente, ¡pero sin decir la palabra ni derivados! En esta ronda NO se puede pasar.",
    2: "Solo puedes decir UNA única palabra como pista. ¡Elige bien!",
    3: "¡Silencio absoluto! Solo mímica y sonidos (¡sin hablar!)."
};

// Game State
let state = {
    currentView: 'view-welcome',
    teams: [
        { name: "Equipo 1", score: 0 },
        { name: "Equipo 2", score: 0 }
    ],
    config: {
        totalPlayers: 4,
        cardsPerPlayer: 3,
        source: 'library' // 'library' or 'manual'
    },
    cards: [], // { id, text, guessed }
    round: 1,
    deck: [], // Current cards in play for the round
    activeTeamIndex: 0,
    timer: 30,
    timerInterval: null,
    currentCard: null,
    turnScore: 0,
    tempDeck: [] // Deck for next round (stores guessed cards)
};

// DOM Elements
const views = document.querySelectorAll('.view');
const btnStart = document.getElementById('btn-start');
const btnConfirmSetup = document.getElementById('btn-confirm-setup');
const btnSourceLibrary = document.querySelector('[data-source="library"]');
const btnSourceManual = document.querySelector('[data-source="manual"]');
const sectionLibrary = document.getElementById('source-library');
const sectionManual = document.getElementById('source-manual');
const selectLibrary = document.getElementById('library-select');
const btnStartRound = document.getElementById('btn-start-round');
const btnStartTurn = document.getElementById('btn-start-turn');
const btnCorrect = document.getElementById('btn-correct');
const btnPass = document.getElementById('btn-pass');
const btnNextTurn = document.getElementById('btn-next-turn');
const btnRestart = document.getElementById('btn-restart');
const timerBar = document.getElementById('timer-bar');
const timerText = document.getElementById('timer-text');
const cardText = document.getElementById('current-card-text');
const cardRoundBadge = document.getElementById('card-round-badge');

// Live Scoreboard Elements
const liveTeam1Name = document.getElementById('live-team1-name');
const liveTeam1Score = document.getElementById('live-team1-score');
const liveTeam2Name = document.getElementById('live-team2-name');
const liveTeam2Score = document.getElementById('live-team2-score');

// Init
function init() {
    populateLibraries();
    setupEventListeners();
    switchView('view-welcome');
}

function populateLibraries() {
    selectLibrary.innerHTML = '';
    for (const [key, lib] of Object.entries(LIBRARIES)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = lib.name + ` (${lib.cards.length} cartas)`;
        selectLibrary.appendChild(option);
    }
}

function setupEventListeners() {
    // Navigation
    btnStart.addEventListener('click', () => switchView('view-setup'));

    // Setup Toggles
    btnSourceLibrary.addEventListener('click', () => toggleSource('library'));
    btnSourceManual.addEventListener('click', () => toggleSource('manual'));

    // Confirmation
    btnConfirmSetup.addEventListener('click', handleSetupConfirmation);

    // Game Flow
    btnStartRound.addEventListener('click', () => {
        // Prepare view turn start before switching
        prepareStartTurnView();
        switchView('view-turn-start');
    });
    btnStartTurn.addEventListener('click', startTurn);
    btnCorrect.addEventListener('click', handleCorrect);
    btnPass.addEventListener('click', handlePass);
    btnNextTurn.addEventListener('click', prepareNextTurn);
    btnRestart.addEventListener('click', () => location.reload());
}

function switchView(viewId) {
    views.forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    state.currentView = viewId;
    updateUI(viewId);
}

function toggleSource(source) {
    state.config.source = source;
    if (source === 'library') {
        btnSourceLibrary.classList.add('selected');
        btnSourceManual.classList.remove('selected');
        sectionLibrary.classList.add('active');
        sectionManual.classList.remove('active');
    } else {
        btnSourceLibrary.classList.remove('selected');
        btnSourceManual.classList.add('selected');
        sectionLibrary.classList.remove('active');
        sectionManual.classList.add('active');
    }
}

function handleSetupConfirmation() {
    // Save Team Names
    state.teams[0].name = document.getElementById('team1-name').value || "Equipo 1";
    state.teams[1].name = document.getElementById('team2-name').value || "Equipo 2";

    if (state.config.source === 'library') {
        const libKey = selectLibrary.value;
        const libCards = LIBRARIES[libKey].cards;
        // Create card objects
        state.cards = libCards.map((text, i) => ({ id: i, text: text, guessed: false }));
        startGame();
    } else {
        startManualEntry();
    }
}

// Manual Entry Logic (Simplified for brevity as no changes needed, but included for completeness)
let manualEntryState = {
    totalCards: 0,
    currentCount: 0,
    currentPlayer: 1
};

function startManualEntry() {
    const players = parseInt(document.getElementById('player-count').value);
    const cardsPer = parseInt(document.getElementById('cards-per-player').value);
    manualEntryState.totalCards = players * cardsPer;
    manualEntryState.currentCount = 0;

    switchView('view-manual-entry');
    updateManualEntryUI();

    const btnNext = document.getElementById('btn-next-card');
    const newBtn = btnNext.cloneNode(true);
    btnNext.parentNode.replaceChild(newBtn, btnNext);

    newBtn.addEventListener('click', () => {
        const input = document.getElementById('card-input');
        const text = input.value.trim();
        if (!text) return;

        state.cards.push({ id: state.cards.length, text: text, guessed: false });
        input.value = '';
        input.focus();

        manualEntryState.currentCount++;
        if (manualEntryState.currentCount >= manualEntryState.totalCards) {
            startGame();
        } else {
            updateManualEntryUI();
        }
    });

    document.getElementById('card-input').focus();
}

function updateManualEntryUI() {
    const players = parseInt(document.getElementById('player-count').value);
    const cardsPer = parseInt(document.getElementById('cards-per-player').value);

    const currentPlayer = Math.floor(manualEntryState.currentCount / cardsPer) + 1;
    const currentCardInPlayer = (manualEntryState.currentCount % cardsPer) + 1;

    document.getElementById('card-entry-progress').textContent =
        `Jugador ${currentPlayer}: Carta ${currentCardInPlayer}/${cardsPer}`;
}

function startGame() {
    state.round = 1;
    state.teams.forEach(t => t.score = 0);
    // Shuffle initial deck
    state.deck = shuffle([...state.cards]);
    // Randomize starting team
    state.activeTeamIndex = Math.floor(Math.random() * 2);
    prepareRound();
}

function prepareRound() {
    document.getElementById('round-title').textContent = `Ronda ${state.round}`;
    document.getElementById('round-subtitle').textContent = ROUND_NAMES[state.round];
    document.getElementById('round-rules').textContent = ROUND_RULES[state.round];

    const passRule = state.round === 1 ? "NO PERMITIDO" : "PERMITIDO";
    document.getElementById('round-pass-rule').textContent = passRule;

    switchView('view-round-intro');
}

function prepareStartTurnView() {
    // Populate the new Turn Start UI
    const t1Card = document.getElementById('ts-team1-card');
    const t2Card = document.getElementById('ts-team2-card');

    // Reset classes
    t1Card.classList.remove('active-turn');
    t2Card.classList.remove('active-turn');

    // Update data
    t1Card.querySelector('.ts-name').textContent = state.teams[0].name;
    t1Card.querySelector('.ts-score').textContent = state.teams[0].score;
    // t1Card.querySelector('.ts-status').textContent = state.activeTeamIndex === 0 ? "¡Su Turno!" : "Esperando";

    t2Card.querySelector('.ts-name').textContent = state.teams[1].name;
    t2Card.querySelector('.ts-score').textContent = state.teams[1].score;
    // t2Card.querySelector('.ts-status').textContent = state.activeTeamIndex === 1 ? "¡Su Turno!" : "Esperando";

    // Highlight active
    if (state.activeTeamIndex === 0) {
        t1Card.classList.add('active-turn');
        t1Card.querySelector('.ts-status').textContent = "¡TU TURNO!";
        t2Card.querySelector('.ts-status').textContent = "";

        document.getElementById('active-team-name-display').textContent = state.teams[0].name;
        document.getElementById('active-team-name-display').style.color = 'var(--primary)';
    } else {
        t2Card.classList.add('active-turn');
        t2Card.querySelector('.ts-status').textContent = "¡TU TURNO!";
        t1Card.querySelector('.ts-status').textContent = "";

        document.getElementById('active-team-name-display').textContent = state.teams[1].name;
        document.getElementById('active-team-name-display').style.color = 'var(--warning)';
    }
}

function startTurn() {
    state.timer = 30;
    state.turnScore = 0;
    updateTimerUI();
    updateLiveScoreboard();

    btnPass.disabled = (state.round === 1);
    cardRoundBadge.textContent = `Ronda ${state.round}`;

    switchView('view-game-play');
    drawCard();

    clearInterval(state.timerInterval); // Safety clear
    state.timerInterval = setInterval(() => {
        state.timer--;
        updateTimerUI();
        if (state.timer <= 0) {
            endTurn();
        }
    }, 1000);
}

function updateLiveScoreboard() {
    liveTeam1Name.textContent = state.teams[0].name;
    liveTeam2Name.textContent = state.teams[1].name;
    liveTeam1Score.textContent = state.teams[0].score;
    liveTeam2Score.textContent = state.teams[1].score;

    if (state.activeTeamIndex === 0) {
        liveTeam1Name.style.color = 'var(--primary)';
        liveTeam1Score.style.transform = "scale(1.2)";
        liveTeam2Name.style.color = 'var(--text-muted)';
        liveTeam2Score.style.transform = "scale(1)";
    } else {
        liveTeam1Name.style.color = 'var(--text-muted)';
        liveTeam1Score.style.transform = "scale(1)";
        liveTeam2Name.style.color = 'var(--warning)';
        liveTeam2Score.style.transform = "scale(1.2)";
    }
}

function updateTimerUI() {
    timerText.textContent = state.timer;
    const pct = (state.timer / 30) * 100;
    timerBar.style.width = `${pct}%`;
    if (state.timer <= 5) {
        timerBar.style.backgroundColor = 'var(--danger)';
        timerText.style.color = 'var(--danger)';
    } else {
        timerBar.style.backgroundColor = 'var(--primary)';
        timerText.style.color = 'var(--primary)';
    }
}

function drawCard() {
    if (state.deck.length === 0) {
        endRound();
        return;
    }
    state.currentCard = state.deck[0];
    cardText.textContent = state.currentCard.text;

    // Animation
    cardText.classList.remove('fadeIn');
    void cardText.offsetWidth; // trigger reflow
    cardText.classList.add('fadeIn');
}

function handleCorrect() {
    state.teams[state.activeTeamIndex].score++;
    state.turnScore++;
    updateLiveScoreboard();

    const guessedCard = state.deck.shift();
    state.tempDeck.push(guessedCard);

    playSound('correct');
    drawCard();
}

function handlePass() {
    if (state.round === 1) return;

    const passedCard = state.deck.shift();
    state.deck.push(passedCard);

    playSound('pass');
    drawCard();
}

function endTurn() {
    clearInterval(state.timerInterval);
    document.getElementById('turn-score-display').textContent = state.turnScore;
    switchView('view-turn-end');
}

function prepareNextTurn() {
    state.activeTeamIndex = state.activeTeamIndex === 0 ? 1 : 0;
    prepareStartTurnView();
    switchView('view-turn-start');
}

function endRound() {
    clearInterval(state.timerInterval);

    if (state.round < 3) {
        state.round++;
        // Switch starting team for new round
        // Logic: The "Turn" typically switches at the end of a round.
        // If Team A finished the deck, it becomes Team B's turn to START the next round.
        // My regular turn logic does NOT switch automatically to the next team when round ends inside drawCard() loop.
        // We are inside drawCard -> endRound. Active Team is still the one who finished.

        // So yes, we must switch activeTeamIndex.
        state.activeTeamIndex = state.activeTeamIndex === 0 ? 1 : 0;

        // Prepare deck for next round
        state.deck = shuffle([...state.tempDeck]);
        state.tempDeck = [];

        prepareRound();
    } else {
        gameOver();
    }
}

function gameOver() {
    document.getElementById('end-team1-name').textContent = state.teams[0].name;
    document.getElementById('end-team1-score').textContent = state.teams[0].score;
    document.getElementById('end-team2-name').textContent = state.teams[1].name;
    document.getElementById('end-team2-score').textContent = state.teams[1].score;

    let winner = "";
    if (state.teams[0].score > state.teams[1].score) winner = state.teams[0].name;
    else if (state.teams[1].score > state.teams[0].score) winner = state.teams[1].name;
    else winner = "¡Empate!";

    document.getElementById('winner-name').textContent = winner;

    switchView('view-game-over');
}

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

function updateUI(viewId) {
    // Optional additional hooks
}

function playSound(type) {
    // Placeholder
}

init();
