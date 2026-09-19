/**
 * Integration tests: Initiative Tracker resolves combatants by stable id, not by position.
 *
 * These drive the REAL js/initiative.js (a classic, DOM-bound script) inside happy-dom, using the
 * real initiative.html body as the fixture. Bootstrap and Sortable are stubbed; nothing else is.
 *
 * The scenarios are ones that only work if a handler identifies its target by `.id`: each holds an
 * interaction (a stale rendered row, a queued prompt, an open modal, a drag) across a change in
 * array order, and asserts that only the intended combatant changes.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const bodyHtml = (() => {
  const html = readFileSync(resolve(process.cwd(), 'initiative.html'), 'utf8');
  return html
    .slice(html.indexOf('<body'), html.lastIndexOf('</body>'))
    .replace(/^<body[^>]*>/, '')
    .replace(/<script[\s\S]*?<\/script>/g, '');
})();

const stubInstance = () => ({ show() {}, hide() {}, dispose() {}, option() {} });
let sortableOptions;
let toastCalls;

function installGlobals() {
  toastCalls = [];
  sortableOptions = null;
  const factory = () => ({
    getOrCreateInstance: () => stubInstance(),
    getInstance: () => stubInstance()
  });
  globalThis.bootstrap = {
    Modal: factory(),
    Offcanvas: factory(),
    Tooltip: factory(),
    Toast: {
      getOrCreateInstance: () => ({
        show: () => toastCalls.push('show'),
        hide: () => toastCalls.push('hide')
      })
    }
  };
  globalThis.Sortable = class {
    constructor(_el, options) {
      sortableOptions = options;
    }
    option() {}
  };
  globalThis.RULES_DATA = [{ cat: 'Test', items: [] }];
  globalThis.SPELLS_DATA = [];
  window.alert = () => {};
  window.confirm = () => true;
}

function makeChar(id, name, initiative, extra = {}) {
  return {
    id, name, type: 'Enemy', initiative,
    currentHP: 20, maxHP: 20, tempHP: 0, ac: 12, notes: '',
    concentration: false, deathSaves: { s: 0, f: 0, stable: false },
    status: [], concDamagePending: 0,
    ...extra
  };
}

async function loadTracker(characters, currentTurn = 0) {
  localStorage.clear();
  localStorage.setItem('initiativeHelpSeen', '1');
  localStorage.setItem(
    'initiativeTrackerData',
    JSON.stringify({ characters, currentTurn, combatRound: 1 })
  );
  document.body.innerHTML = bodyHtml;
  installGlobals();
  vi.resetModules();
  await import('../../js/initiative.js');
}

const row = id => document.querySelector(`#initiative-order tr[data-character-id="${id}"]`);
const rowOrder = () =>
  [...document.querySelectorAll('#initiative-order tr')].map(tr => tr.dataset.characterId);
const saved = () => JSON.parse(localStorage.getItem('initiativeTrackerData'));
const savedById = id => saved().characters.find(c => c.id === id);
const savedOrder = () => saved().characters.map(c => c.id);

function click(el) {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}
// What another tab saving does to this tab: the shared key changes and a `storage` event fires,
// which makes the tracker reload state and replace every combatant object with a fresh one.
function replaceStateFromAnotherTab(characters, currentTurn = 0) {
  localStorage.setItem(
    'initiativeTrackerData',
    JSON.stringify({ characters, currentTurn, combatRound: 1 })
  );
  const ev = new window.Event('storage');
  Object.defineProperty(ev, 'key', { value: 'initiativeTrackerData' });
  window.dispatchEvent(ev);
}
function setInitiative(id, value) {
  const input = row(id).querySelector('.init-input');
  input.value = String(value);
  input.dispatchEvent(new window.Event('blur'));
}

describe('Initiative Tracker: combatants are addressed by stable id', () => {
  let A, B, C;
  beforeEach(() => {
    A = makeChar('id-A', 'Alpha', 5);
    B = makeChar('id-B', 'Bravo', 20);
    C = makeChar('id-C', 'Charlie', 10);
  });

  it('every rendered control carries the character id, not a position', async () => {
    await loadTracker([A, B, C]);
    expect(document.querySelector('[data-index]')).toBeNull();
    expect(rowOrder()).toEqual(['id-A', 'id-B', 'id-C']);
    for (const id of ['id-A', 'id-B', 'id-C']) {
      const controls = row(id).querySelectorAll('button[data-character-id], input[data-character-id]');
      expect(controls.length).toBeGreaterThan(5);
      controls.forEach(el => expect(el.dataset.characterId).toBe(id));
    }
  });

  it('an action on one combatant changes only that combatant after the order changes', async () => {
    await loadTracker([A, B, C]);
    // Re-sort: insertion order [A, B, C] becomes [C, B, A].
    setInitiative('id-C', 25);
    expect(rowOrder()).toEqual(['id-C', 'id-B', 'id-A']);

    click(row('id-A').querySelector('.hit-btn[data-delta="-5"]'));

    expect(savedById('id-A').currentHP).toBe(15);
    expect(savedById('id-B').currentHP).toBe(20);
    expect(savedById('id-C').currentHP).toBe(20);
  });

  it('a handler bound before a reorder still hits its own combatant, not whoever now sits at that position', async () => {
    await loadTracker([A, B, C]);
    // Hold on to Bravo's rendered "-5" button (was position 1), then reorder so that position
    // belongs to somebody else. Positional handlers would damage the wrong combatant here.
    const staleBravoBtn = row('id-B').querySelector('.hit-btn[data-delta="-5"]');
    setInitiative('id-C', 25); // order becomes [C, B, A]; move Bravo out of position 1
    click(row('id-C').querySelector('.delete-btn'));
    expect(savedOrder()).toEqual(['id-B', 'id-A']);

    click(staleBravoBtn);

    expect(savedById('id-B').currentHP).toBe(15);
    expect(savedById('id-A').currentHP).toBe(20);
  });

  it('a stale handler for a deleted combatant does nothing and does not fall back to a position', async () => {
    await loadTracker([A, B, C]);
    const staleBravoBtn = row('id-B').querySelector('.hit-btn[data-delta="-5"]');
    click(row('id-B').querySelector('.delete-btn'));
    expect(savedOrder()).toEqual(['id-A', 'id-C']);

    expect(() => click(staleBravoBtn)).not.toThrow();

    expect(savedById('id-A').currentHP).toBe(20);
    expect(savedById('id-C').currentHP).toBe(20);
  });

  it('a queued concentration prompt still targets the right combatant after the order changes', async () => {
    const conc = makeChar('id-B', 'Bravo', 6, { concentration: true, concDamagePending: 12 });
    const bystander = makeChar('id-C', 'Charlie', 10, { concentration: true });
    await loadTracker([A, conc, bystander]);

    // End of turn queues a check for Bravo (position 1). Before the DM answers, Bravo's initiative
    // is raised, so he sorts to the top and position 1 now belongs to Charlie.
    click(document.getElementById('next-turn'));
    expect(toastCalls).toContain('show');
    expect(document.getElementById('concToastName').textContent).toBe('Bravo');

    setInitiative('id-B', 30);
    expect(rowOrder()).toEqual(['id-B', 'id-C', 'id-A']);
    click(document.getElementById('concFailBtn'));

    expect(savedById('id-B').concentration).toBe(false);
    expect(savedById('id-C').concentration).toBe(true); // the old positional target
  });

  it('notes saved from an open modal go to the combatant it was opened for', async () => {
    await loadTracker([A, B, C]);
    click(row('id-A').querySelector('.notes-btn')); // Alpha is position 0
    document.getElementById('notes-text').value = 'poisoned the wine';

    setInitiative('id-B', 40); // order changes while the modal is open: Bravo takes position 0
    expect(rowOrder()).toEqual(['id-B', 'id-C', 'id-A']);
    click(document.getElementById('notes-save-btn'));

    expect(savedById('id-A').notes).toBe('poisoned the wine');
    expect(savedById('id-B').notes).toBe('');
    expect(savedById('id-C').notes).toBe('');
  });

  describe('drag-reorder (Sortable onEnd)', () => {
    let D;
    beforeEach(() => {
      D = makeChar('id-D', 'Delta', 1);
    });

    // Does to the DOM what Sortable does, then fires onEnd with the indexes Sortable would report.
    function drag(id, beforeId) {
      const tbody = document.getElementById('initiative-order');
      const item = row(id);
      const oldIndex = [...tbody.children].indexOf(item);
      tbody.insertBefore(item, beforeId ? row(beforeId) : null);
      const newIndex = [...tbody.children].indexOf(item);
      sortableOptions.onEnd({ item, oldIndex, newIndex });
    }
    const activeId = () => saved().characters[saved().currentTurn].id;

    // These describe behavior that must hold under any implementation (final order matches what
    // the DM dropped; the turn stays with the same creature).
    it('moving a combatant down into the middle keeps the turn on the same creature', async () => {
      await loadTracker([A, B, C, D], 1); // Bravo is active, between the old and new slots
      drag('id-A', 'id-D'); // A: position 0 -> between C and D
      expect(savedOrder()).toEqual(['id-B', 'id-C', 'id-A', 'id-D']);
      expect(activeId()).toBe('id-B');
    });

    it('moving a combatant up into the middle keeps the turn on the same creature', async () => {
      await loadTracker([A, B, C, D], 2); // Charlie is active, between the new and old slots
      drag('id-D', 'id-B'); // D: position 3 -> between A and B
      expect(savedOrder()).toEqual(['id-A', 'id-D', 'id-B', 'id-C']);
      expect(activeId()).toBe('id-C');
    });

    it('moving the active combatant itself keeps the turn on it', async () => {
      await loadTracker([A, B, C, D], 1);
      drag('id-B', null); // to the end
      expect(savedOrder()).toEqual(['id-A', 'id-C', 'id-D', 'id-B']);
      expect(activeId()).toBe('id-B');
    });

    // These separate the stable-id logic from the old oldIndex/newIndex logic: the array and the
    // DOM are NOT in step when onEnd runs.
    it('a drag whose row was replaced mid-gesture (another tab reloaded the state) moves the dragged combatant, not whoever is at its old index', async () => {
      await loadTracker([A, B, C]);
      const draggedRow = row('id-A'); // Sortable keeps holding this element...
      // ...while another tab saves a different order and this tab reloads, replacing every row.
      replaceStateFromAnotherTab([C, A, B]);
      expect(rowOrder()).toEqual(['id-C', 'id-A', 'id-B']);
      expect(draggedRow.isConnected).toBe(false);

      // Sortable still reports the indexes from when the drag started (A was at 0, dropped at the end).
      sortableOptions.onEnd({ item: draggedRow, oldIndex: 0, newIndex: 2 });

      expect(savedOrder()).toEqual(['id-C', 'id-B', 'id-A']);
    });

    it('a drag for an unknown combatant id changes nothing and does not throw', async () => {
      await loadTracker([A, B, C], 2);
      const ghost = document.createElement('tr');
      ghost.dataset.characterId = 'id-not-here';

      expect(() => sortableOptions.onEnd({ item: ghost, oldIndex: 0, newIndex: 2 })).not.toThrow();

      expect(savedOrder()).toEqual(['id-A', 'id-B', 'id-C']);
      expect(saved().currentTurn).toBe(2);
      expect(rowOrder()).toEqual(['id-A', 'id-B', 'id-C']); // table was rebuilt in sync
    });
  });

  describe('status modal', () => {
    const prone = { name: 'Prone', icon: '🛌' };
    const openStatus = id => click(row(id).querySelector('.status-btn'));
    const pick = eff => click(document.querySelector(`#status-dropdown-list a[data-eff="${eff}"]`));

    it('adding a status after the state was replaced under the open modal changes the current combatant', async () => {
      await loadTracker([A, B, C]);
      openStatus('id-B');
      replaceStateFromAnotherTab([A, { ...B, notes: 'edited in other tab' }, C]);

      pick('Poisoned');
      click(document.getElementById('add-status-btn'));

      const b = savedById('id-B');
      expect(b.status.map(s => s.name)).toEqual(['Poisoned']);
      expect(b.notes).toBe('edited in other tab'); // the live combatant, not a stale copy
    });

    it('removing a status after the state was replaced under the open modal changes the current combatant', async () => {
      const withProne = extra => makeChar('id-B', 'Bravo', 20, { status: [prone], ...extra });
      await loadTracker([A, withProne(), C]);
      openStatus('id-B');
      replaceStateFromAnotherTab([A, withProne({ notes: 'edited in other tab' }), C]);

      click(document.querySelector('#status-badges .remove-status[data-eff="Prone"]'));

      expect(savedById('id-B').status).toEqual([]);
      expect(savedById('id-B').notes).toBe('edited in other tab');
    });

    it('a status change for a combatant that no longer exists is ignored, not written to a stale object', async () => {
      await loadTracker([A, B, C]);
      openStatus('id-B');
      replaceStateFromAnotherTab([A, C]); // Bravo was deleted in the other tab
      pick('Poisoned');
      const logBefore = saved().combatLog.length;

      expect(() => click(document.getElementById('add-status-btn'))).not.toThrow();

      expect(savedOrder()).toEqual(['id-A', 'id-C']);
      expect(savedById('id-A').status).toEqual([]);
      expect(savedById('id-C').status).toEqual([]);
      expect(saved().combatLog).toHaveLength(logBefore); // nothing logged for a change that didn't happen
    });
  });

  it('duplicating a combatant ahead of the active one keeps the turn on the active combatant', async () => {
    await loadTracker([A, B, C], 2); // Charlie is active
    click(row('id-A').querySelector('.duplicate-btn'));

    expect(saved().characters).toHaveLength(4);
    expect(saved().characters[saved().currentTurn].id).toBe('id-C');
  });

  it('duplicate ids in saved data are made unique so each combatant is addressable', async () => {
    const twin = makeChar('id-A', 'Twin', 1);
    await loadTracker([A, twin, C]);
    const ids = rowOrder();
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toBe('id-A');

    click(row(ids[1]).querySelector('.hit-btn[data-delta="-5"]'));

    expect(saved().characters.filter(c => c.currentHP === 15)).toHaveLength(1);
    expect(saved().characters.find(c => c.currentHP === 15).name).toBe('Twin');
  });

  it('legacy combatants without an id are given one on load and stay addressable', async () => {
    const { id: _a, ...legacyA } = A;
    const { id: _b, ...legacyB } = B;
    await loadTracker([legacyA, legacyB]);
    const ids = rowOrder();
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(2);

    click(row(ids[1]).querySelector('.hit-btn[data-delta="-1"]'));

    expect(saved().characters.map(c => c.currentHP)).toEqual([20, 19]);
  });
});
