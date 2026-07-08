/**
 * Hidden easter egg: Konami code (↑ ↑ ↓ ↓ ← → ← → B A), or 6 rapid clicks on the
 * site logo within 10s, unlocks a slide-in 2048 game.
 * Nothing on the page hints at this — it only rewards visitors who already know the cheat code.
 */
(function () {
  const KONAMI_SEQUENCE = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a'
  ];
  const GRID_SIZE = 4;
  const DB_NAME = 'DMToolboxEasterEgg';
  const DB_VERSION = 1;
  const STORE_NAME = 'state';
  const STATE_ID = 'game2048';
  const SWIPE_THRESHOLD = 24;
  const LOGO_CLICK_COUNT = 6;
  const LOGO_CLICK_WINDOW_MS = 10000;
  const ANIMATION_MS = 100;
  const UNDO_LIMIT = 10;
  const VECTORS = {
    up: { row: -1, col: 0 },
    down: { row: 1, col: 0 },
    left: { row: 0, col: -1 },
    right: { row: 0, col: 1 }
  };

  let konamiIndex = 0;
  let panelOpen = false;
  const tiles = new Map(); // id -> { id, row, col, value }
  let nextId = 1;
  const tileElements = new Map(); // id -> DOM element
  let score = 0;
  let best = 0;
  let won = false;
  let keepPlayingAfterWin = false;
  let dbPromise = null;
  let logoClickTimestamps = [];
  let undoStack = []; // most recent snapshot last

  injectStyles();
  const els = buildPanel();
  document.addEventListener('keydown', onGlobalKeydown, true);
  setupLogoTrigger();

  // A quiet nod for anyone poking around devtools — the only hint that exists anywhere.
  console.log('%cYou seem like the curious type. Some old cheat codes still work...', 'color:#1d9e6d; font-style:italic;');

  function onGlobalKeydown(e) {
    if (panelOpen) {
      handleGameKeydown(e);
      return;
    }
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === KONAMI_SEQUENCE[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === KONAMI_SEQUENCE.length) {
        konamiIndex = 0;
        openPanel();
      }
    } else {
      konamiIndex = key === KONAMI_SEQUENCE[0] ? 1 : 0;
    }
  }

  function setupLogoTrigger() {
    const logo = document.getElementById('siteLogo');
    if (!logo) return;
    logo.addEventListener('click', (e) => {
      if (panelOpen) return;
      e.preventDefault();
      const now = Date.now();
      logoClickTimestamps.push(now);
      logoClickTimestamps = logoClickTimestamps.filter((t) => now - t <= LOGO_CLICK_WINDOW_MS);
      if (logoClickTimestamps.length >= LOGO_CLICK_COUNT) {
        logoClickTimestamps = [];
        openPanel();
      }
    });
  }

  function handleGameKeydown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closePanel();
      return;
    }
    const dirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    const dir = dirs[e.key];
    if (!dir) return;
    e.preventDefault();
    e.stopPropagation();
    move(dir);
  }

  async function openPanel() {
    panelOpen = true;
    els.overlay.classList.add('open');
    els.panel.classList.add('open');

    const saved = await loadState();
    if (saved && saved.hasActiveGame && Array.isArray(saved.tilesData)) {
      tiles.clear();
      for (const t of saved.tilesData) tiles.set(t.id, { ...t });
      nextId = typeof saved.nextId === 'number' ? saved.nextId : tiles.size + 1;
      score = saved.score || 0;
      won = !!saved.won;
      keepPlayingAfterWin = !!saved.keepPlayingAfterWin;
      if (typeof saved.best === 'number') best = saved.best;
      undoStack = Array.isArray(saved.undoStack) ? saved.undoStack : [];
      updateUndoButton();
      els.messageEl.hidden = true;
      renderFull(false);
      if (won && !keepPlayingAfterWin) {
        showMessage('You reached 2048! \u{1F389}', true);
      } else if (!hasMovesLeft()) {
        showMessage('No more moves. Game over.', false);
      }
    } else {
      startNewGame();
    }
  }

  function closePanel() {
    panelOpen = false;
    els.overlay.classList.remove('open');
    els.panel.classList.remove('open');
    persistCurrentState();
  }

  function getDB() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return dbPromise;
  }

  async function loadState() {
    try {
      const database = await getDB();
      return await new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(STATE_ID);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('2048 easter egg: could not load saved state', err);
      return null;
    }
  }

  async function saveState(state) {
    try {
      const database = await getDB();
      await new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put({ id: STATE_ID, ...state });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('2048 easter egg: could not save state', err);
    }
  }

  function persistCurrentState() {
    if (tiles.size === 0) return;
    void saveState({
      tilesData: [...tiles.values()],
      nextId,
      score,
      best,
      won,
      keepPlayingAfterWin,
      undoStack,
      hasActiveGame: true
    });
  }

  function buildPanel() {
    const overlay = document.createElement('div');
    overlay.className = 'eegg-overlay';
    overlay.addEventListener('click', closePanel);

    const panel = document.createElement('div');
    panel.className = 'eegg-panel';
    panel.addEventListener('click', (e) => e.stopPropagation());
    panel.innerHTML = `
      <div class="eegg-header">
        <div>
          <div class="eegg-title">You found it.</div>
          <div class="eegg-subtitle">2048</div>
        </div>
        <button type="button" class="eegg-close" aria-label="Close game">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      <div class="eegg-scores">
        <div class="eegg-score-box">
          <div class="eegg-score-label">Score</div>
          <div class="eegg-score-value" data-role="score">0</div>
        </div>
        <div class="eegg-score-box">
          <div class="eegg-score-label">Best</div>
          <div class="eegg-score-value" data-role="best">0</div>
        </div>
        <div class="eegg-actions">
          <button type="button" class="eegg-undo" data-role="undo" title="Undo last move" aria-label="Undo last move" disabled>
            <i class="bi bi-arrow-counterclockwise"></i>
          </button>
          <button type="button" class="eegg-newgame" data-role="newgame">New Game</button>
        </div>
      </div>
      <div class="eegg-board-wrap">
        <div class="eegg-board" data-role="board"></div>
        <div class="eegg-tiles" data-role="tiles"></div>
        <div class="eegg-message" data-role="message" hidden>
          <div class="eegg-message-text" data-role="message-text"></div>
          <button type="button" class="eegg-newgame" data-role="message-newgame">Try Again</button>
        </div>
      </div>
      <div class="eegg-hint">Swipe or use arrow keys to move &middot; Esc to close</div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    const boardBg = panel.querySelector('[data-role="board"]');
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const cell = document.createElement('div');
      cell.className = 'eegg-cell';
      boardBg.appendChild(cell);
    }

    panel.querySelector('.eegg-close').addEventListener('click', closePanel);
    panel.querySelector('[data-role="newgame"]').addEventListener('click', startNewGame);
    panel.querySelector('[data-role="undo"]').addEventListener('click', undo);

    const boardWrap = panel.querySelector('.eegg-board-wrap');
    let touchStartX = 0;
    let touchStartY = 0;
    boardWrap.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    }, { passive: true });
    boardWrap.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) < SWIPE_THRESHOLD) return;
      if (absDx > absDy) {
        move(dx > 0 ? 'right' : 'left');
      } else {
        move(dy > 0 ? 'down' : 'up');
      }
    }, { passive: true });

    return {
      overlay,
      panel,
      tilesEl: panel.querySelector('[data-role="tiles"]'),
      scoreEl: panel.querySelector('[data-role="score"]'),
      bestEl: panel.querySelector('[data-role="best"]'),
      undoBtn: panel.querySelector('[data-role="undo"]'),
      messageEl: panel.querySelector('[data-role="message"]'),
      messageTextEl: panel.querySelector('[data-role="message-text"]')
    };
  }

  function startNewGame() {
    tiles.clear();
    nextId = 1;
    score = 0;
    won = false;
    keepPlayingAfterWin = false;
    undoStack = [];
    updateUndoButton();
    els.messageEl.hidden = true;
    addRandomTile();
    addRandomTile();
    renderFull(true);
    persistCurrentState();
  }

  function snapshotState() {
    return {
      tilesData: [...tiles.values()].map((t) => ({ ...t })),
      score,
      won,
      keepPlayingAfterWin
    };
  }

  function updateUndoButton() {
    els.undoBtn.disabled = undoStack.length === 0;
  }

  function undo() {
    if (undoStack.length === 0) return;
    const prev = undoStack.pop();
    tiles.clear();
    for (const t of prev.tilesData) tiles.set(t.id, { ...t });
    score = prev.score;
    won = prev.won;
    keepPlayingAfterWin = prev.keepPlayingAfterWin;
    updateUndoButton();
    els.messageEl.hidden = true;
    renderFull(false);
    if (won && !keepPlayingAfterWin) {
      showMessage('You reached 2048! 🎉', true);
    } else if (!hasMovesLeft()) {
      showMessage('No more moves. Game over.', false);
    }
    persistCurrentState();
  }

  function addRandomTile() {
    const occupied = new Set([...tiles.values()].map((t) => `${t.row},${t.col}`));
    const empty = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!occupied.has(`${r},${c}`)) empty.push([r, c]);
      }
    }
    if (empty.length === 0) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    const id = nextId++;
    tiles.set(id, { id, row: r, col: c, value });
  }

  function inBounds(pos) {
    return pos.row >= 0 && pos.row < GRID_SIZE && pos.col >= 0 && pos.col < GRID_SIZE;
  }

  function buildTraversal(vector) {
    const rows = [0, 1, 2, 3];
    const cols = [0, 1, 2, 3];
    if (vector.row === 1) rows.reverse();
    if (vector.col === 1) cols.reverse();
    return { rows, cols };
  }

  function buildCellGrid() {
    const cells = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    for (const t of tiles.values()) cells[t.row][t.col] = t.id;
    return cells;
  }

  function move(dir) {
    const preMoveSnapshot = snapshotState();
    const vector = VECTORS[dir];
    const { rows, cols } = buildTraversal(vector);
    const cells = buildCellGrid();
    let moved = false;
    const mergedWinners = new Set();
    const removedMoves = [];

    for (const row of rows) {
      for (const col of cols) {
        const id = cells[row][col];
        if (id == null) continue;
        const tile = tiles.get(id);
        let pos = { row, col };
        let next = { row: pos.row + vector.row, col: pos.col + vector.col };
        while (inBounds(next) && cells[next.row][next.col] == null) {
          cells[pos.row][pos.col] = null;
          cells[next.row][next.col] = id;
          pos = next;
          next = { row: pos.row + vector.row, col: pos.col + vector.col };
        }
        if (inBounds(next) && cells[next.row][next.col] != null) {
          const otherId = cells[next.row][next.col];
          const other = tiles.get(otherId);
          if (other && other.value === tile.value && !mergedWinners.has(otherId)) {
            cells[pos.row][pos.col] = null;
            other.value *= 2;
            score += other.value;
            mergedWinners.add(otherId);
            tiles.delete(id);
            removedMoves.push({ id, row: next.row, col: next.col });
            moved = true;
            continue;
          }
        }
        if (pos.row !== row || pos.col !== col) moved = true;
        tile.row = pos.row;
        tile.col = pos.col;
      }
    }

    if (!moved) return;

    undoStack.push(preMoveSnapshot);
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    updateUndoButton();

    addRandomTile();
    renderMove({ removedMoves, mergedWinners });

    if (!won && [...tiles.values()].some((t) => t.value >= 2048)) {
      won = true;
      showMessage('You reached 2048! 🎉', true);
    } else if (!hasMovesLeft()) {
      showMessage('No more moves. Game over.', false);
    }
    persistCurrentState();
  }

  function hasMovesLeft() {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
    for (const t of tiles.values()) grid[t.row][t.col] = t.value;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === 0) return true;
        if (c < GRID_SIZE - 1 && grid[r][c] === grid[r][c + 1]) return true;
        if (r < GRID_SIZE - 1 && grid[r][c] === grid[r + 1][c]) return true;
      }
    }
    return false;
  }

  function showMessage(text, isWin) {
    if (isWin && keepPlayingAfterWin) return;
    els.messageTextEl.textContent = text;
    els.messageEl.hidden = false;
    els.messageEl.classList.toggle('eegg-message-win', isWin);
    const btn = els.messageEl.querySelector('[data-role="message-newgame"]');
    if (isWin) {
      btn.textContent = 'Keep Playing';
      btn.onclick = () => {
        keepPlayingAfterWin = true;
        els.messageEl.hidden = true;
        persistCurrentState();
      };
    } else {
      btn.textContent = 'Try Again';
      btn.onclick = startNewGame;
    }
  }

  function updateScoreDisplay() {
    if (score > best) best = score;
    els.scoreEl.textContent = String(score);
    els.bestEl.textContent = String(best);
  }

  function setTilePosition(el, row, col) {
    el.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
  }

  function setTileValue(el, value) {
    const inner = el.firstElementChild;
    inner.textContent = String(value);
    inner.className = `eegg-tile-inner eegg-tile-${value <= 2048 ? value : 'super'}`;
  }

  function playPopIn(el) {
    const inner = el.firstElementChild;
    inner.classList.remove('eegg-pop-in');
    void inner.offsetWidth;
    inner.classList.add('eegg-pop-in');
  }

  function playPopMerge(el) {
    const inner = el.firstElementChild;
    inner.classList.remove('eegg-pop-merge');
    void inner.offsetWidth;
    inner.classList.add('eegg-pop-merge');
  }

  function createTileElement(id) {
    const tile = tiles.get(id);
    const el = document.createElement('div');
    el.className = 'eegg-tile-slot';
    // Position instantly on creation so the tile doesn't fly in from a stale transform.
    el.style.transition = 'none';
    const inner = document.createElement('div');
    inner.className = 'eegg-tile-inner';
    el.appendChild(inner);
    els.tilesEl.appendChild(el);
    setTilePosition(el, tile.row, tile.col);
    void el.offsetWidth;
    el.style.transition = '';
    tileElements.set(id, el);
    return el;
  }

  function renderFull(animateIn) {
    els.tilesEl.innerHTML = '';
    tileElements.clear();
    for (const tile of tiles.values()) {
      const el = createTileElement(tile.id);
      setTileValue(el, tile.value);
      if (animateIn) playPopIn(el);
    }
    updateScoreDisplay();
  }

  function renderMove({ removedMoves, mergedWinners }) {
    for (const tile of tiles.values()) {
      let el = tileElements.get(tile.id);
      const isNewEl = !el;
      if (!el) el = createTileElement(tile.id);
      setTilePosition(el, tile.row, tile.col);
      setTileValue(el, tile.value);
      if (isNewEl) {
        playPopIn(el);
      } else if (mergedWinners.has(tile.id)) {
        playPopMerge(el);
      }
    }

    for (const rm of removedMoves) {
      const el = tileElements.get(rm.id);
      if (!el) continue;
      setTilePosition(el, rm.row, rm.col);
      tileElements.delete(rm.id);
      setTimeout(() => el.remove(), ANIMATION_MS);
    }

    updateScoreDisplay();
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .eegg-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
        z-index: 100000;
      }
      .eegg-overlay.open {
        opacity: 1;
        pointer-events: auto;
      }
      .eegg-panel {
        position: fixed;
        top: 0;
        right: 0;
        height: 100vh;
        height: 100dvh;
        width: 380px;
        max-width: 92vw;
        background: #16191d;
        color: #f1f3f5;
        box-shadow: -12px 0 32px rgba(0, 0, 0, 0.6);
        transform: translateX(100%);
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 100001;
        display: flex;
        flex-direction: column;
        padding: 1.25rem;
        padding-top: max(1.25rem, env(safe-area-inset-top));
        padding-right: max(1.25rem, env(safe-area-inset-right));
        padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
        font-family: inherit;
        overflow-y: auto;
        box-sizing: border-box;
      }
      .eegg-panel.open {
        transform: translateX(0);
      }
      .eegg-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 1rem;
      }
      .eegg-title {
        font-size: 0.85rem;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .eegg-subtitle {
        font-size: 1.75rem;
        font-weight: 700;
        color: #1d9e6d;
      }
      .eegg-close {
        background: transparent;
        border: none;
        color: #adb5bd;
        font-size: 1.1rem;
        cursor: pointer;
        padding: 0.25rem 0.5rem;
        border-radius: 0.375rem;
      }
      .eegg-close:hover {
        color: #f1f3f5;
        background: rgba(255, 255, 255, 0.08);
      }
      .eegg-scores {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      .eegg-score-box {
        background: rgba(255, 255, 255, 0.06);
        border-radius: 0.5rem;
        padding: 0.4rem 0.75rem;
        text-align: center;
        min-width: 4.5rem;
      }
      .eegg-score-label {
        font-size: 0.7rem;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .eegg-score-value {
        font-size: 1.1rem;
        font-weight: 700;
      }
      .eegg-actions {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .eegg-newgame {
        background: rgba(29, 158, 109, 0.15);
        border: 1px solid rgba(29, 158, 109, 0.4);
        color: #1d9e6d;
        border-radius: 0.5rem;
        padding: 0.4rem 0.85rem;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
      }
      .eegg-newgame:hover {
        background: rgba(29, 158, 109, 0.28);
      }
      .eegg-undo {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #adb5bd;
        border-radius: 0.5rem;
        padding: 0.4rem 0.6rem;
        font-size: 0.95rem;
        line-height: 1;
        cursor: pointer;
      }
      .eegg-undo:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.12);
        color: #f1f3f5;
      }
      .eegg-undo:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
      .eegg-board-wrap {
        position: relative;
        width: 100%;
        aspect-ratio: 1 / 1;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
      }
      .eegg-board {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(4, 1fr);
        gap: 0.5rem;
        background: #0e1013;
        border-radius: 0.75rem;
        padding: 0.5rem;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }
      .eegg-cell {
        background: rgba(29, 158, 109, 0.06);
        border-radius: 0.375rem;
      }
      .eegg-tiles {
        position: absolute;
        inset: 0;
        padding: 0.5rem;
        box-sizing: border-box;
      }
      .eegg-tile-slot {
        position: absolute;
        top: 0;
        left: 0;
        width: 25%;
        height: 25%;
        padding: 0.25rem;
        box-sizing: border-box;
        transition: transform ${ANIMATION_MS}ms ease-out;
        will-change: transform;
      }
      .eegg-tile-inner {
        width: 100%;
        height: 100%;
        border-radius: 0.375rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 1.4rem;
        color: #f1f3f5;
      }
      .eegg-tile-2 { background: #1e3f34; }
      .eegg-tile-4 { background: #1c4f3f; }
      .eegg-tile-8 { background: #185f49; }
      .eegg-tile-16 { background: #147053; }
      .eegg-tile-32 { background: #10815d; }
      .eegg-tile-64 { background: #0c9267; }
      .eegg-tile-128 { background: #1d9e6d; font-size: 1.25rem; }
      .eegg-tile-256 { background: #17b478; font-size: 1.25rem; }
      .eegg-tile-512 { background: #10ca87; color: #06231a; font-size: 1.25rem; }
      .eegg-tile-1024 { background: #2be09b; color: #06231a; font-size: 1.1rem; }
      .eegg-tile-2048 { background: #7dffc4; color: #05261b; font-size: 1.1rem; box-shadow: 0 0 16px rgba(29, 158, 109, 0.8); }
      .eegg-tile-super { background: #baffe0; color: #04140d; font-size: 1rem; box-shadow: 0 0 18px rgba(29, 158, 109, 0.95); }
      @keyframes eegg-pop-in {
        0% { transform: scale(0); opacity: 0.6; }
        60% { transform: scale(1.12); opacity: 1; }
        100% { transform: scale(1); }
      }
      @keyframes eegg-pop-merge {
        0% { transform: scale(1); }
        50% { transform: scale(1.18); }
        100% { transform: scale(1); }
      }
      .eegg-pop-in {
        animation: eegg-pop-in 140ms ease-out;
      }
      .eegg-pop-merge {
        animation: eegg-pop-merge 120ms ease-out;
      }
      .eegg-message {
        position: absolute;
        inset: 0;
        background: rgba(14, 16, 19, 0.88);
        border-radius: 0.75rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        text-align: center;
        padding: 1.5rem;
      }
      .eegg-message-text {
        font-size: 1.1rem;
        font-weight: 600;
      }
      .eegg-message-win .eegg-message-text {
        color: #1d9e6d;
      }
      .eegg-hint {
        margin-top: 0.85rem;
        text-align: center;
        font-size: 0.8rem;
        color: #6c757d;
      }
      @media (max-width: 480px) {
        .eegg-panel { width: 100vw; max-width: 100vw; padding: 1rem; padding-right: max(1rem, env(safe-area-inset-right)); }
        .eegg-subtitle { font-size: 1.5rem; }
        .eegg-tile-inner { font-size: 1.15rem; }
        .eegg-score-box { min-width: 3.75rem; padding: 0.35rem 0.6rem; }
        .eegg-newgame { padding: 0.4rem 0.7rem; font-size: 0.8rem; }
        .eegg-undo { padding: 0.4rem 0.5rem; font-size: 0.85rem; }
        .eegg-actions { gap: 0.35rem; }
        .eegg-scores { gap: 0.35rem; }
      }
      @media (max-height: 620px) {
        .eegg-header { margin-bottom: 0.6rem; }
        .eegg-scores { margin-bottom: 0.6rem; }
        .eegg-hint { margin-top: 0.5rem; }
      }
    `;
    document.head.appendChild(style);
  }
})();
