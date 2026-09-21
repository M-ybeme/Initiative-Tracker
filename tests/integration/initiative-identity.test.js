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
let modalCalls;
let alertCalls;

function installGlobals() {
  toastCalls = [];
  modalCalls = [];
  alertCalls = [];
  sortableOptions = null;
  const factory = () => ({
    getOrCreateInstance: () => stubInstance(),
    getInstance: () => stubInstance()
  });
  const recordingModal = () => ({
    show: () => modalCalls.push('show'),
    hide: () => modalCalls.push('hide')
  });
  globalThis.bootstrap = {
    Modal: {
      getOrCreateInstance: () => recordingModal(),
      getInstance: () => recordingModal()
    },
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
  window.alert = globalThis.alert = msg => alertCalls.push(msg);
  window.prompt = globalThis.prompt = () => '2'; // legendary-enable asks for the number of actions
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

// Each test re-imports the tracker script, and the script attaches listeners to `window` and
// `document` (storage sync, keyboard shortcuts, beforeunload). Record them so the previous
// instance can be detached; otherwise every earlier instance keeps reacting to later tests'
// storage events and writes to the shared DOM and localStorage.
let trackerListeners = [];
function detachPreviousTracker() {
  trackerListeners.forEach(([target, type, fn, opts]) => target.removeEventListener(type, fn, opts));
  trackerListeners = [];
}
async function importTracker() {
  const targets = [window, document];
  // happy-dom defines addEventListener as an own property on some of these, so put back exactly
  // what was there (its own descriptor, or nothing so the prototype's shows through again)
  const ownDescriptors = targets.map(t => Object.getOwnPropertyDescriptor(t, 'addEventListener'));
  const originals = targets.map(t => t.addEventListener);
  targets.forEach((t, i) => {
    Object.defineProperty(t, 'addEventListener', {
      configurable: true,
      writable: true,
      value: function (type, fn, opts) {
        trackerListeners.push([t, type, fn, opts]);
        return originals[i].call(this, type, fn, opts);
      }
    });
  });
  try {
    await import('../../js/initiative.js');
  } finally {
    targets.forEach((t, i) => {
      if (ownDescriptors[i]) Object.defineProperty(t, 'addEventListener', ownDescriptors[i]);
      else delete t.addEventListener;
    });
  }
}

async function loadTracker(characters, currentTurn = 0) {
  detachPreviousTracker();
  localStorage.clear();
  localStorage.setItem('initiativeHelpSeen', '1');
  localStorage.setItem(
    'initiativeTrackerData',
    JSON.stringify({ characters, currentTurn, combatRound: 1 })
  );
  document.body.innerHTML = bodyHtml;
  installGlobals();
  vi.resetModules();
  await import('../../js/modules/dice-engine.js'); // initiative.html loads the engine before initiative.js
  await importTracker();
  emulateRemovalFocusOut();
}

// Chromium fires focusout on a focused input while a re-render is removing it, with the target
// still attached (measured in Chromium 143); happy-dom fires nothing on removal. Reproduce the
// browser behavior on the two list containers so removal-triggered commits can be tested.
function findDescriptor(obj, prop) {
  for (let o = obj; o; o = Object.getPrototypeOf(o)) {
    const d = Object.getOwnPropertyDescriptor(o, prop);
    if (d) return d;
  }
  return null;
}
function emulateRemovalFocusOut() {
  for (const id of ['initiative-order', 'mobile-initiative-order']) {
    const root = document.getElementById(id);
    const desc = findDescriptor(root, 'innerHTML');
    Object.defineProperty(root, 'innerHTML', {
      configurable: true,
      get() { return desc.get.call(this); },
      set(value) {
        const active = document.activeElement;
        if (active && active !== document.body && this.contains(active)) {
          active.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true }));
        }
        desc.set.call(this, value);
      }
    });
  }
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
// Focus into an inline editor, change its value, and leave it, as a browser reports it
// (focusin / focusout bubble; the tracker listens for them on the list containers). These are
// synthetic events: they do not move document.activeElement. Use real focus()/blur() when that matters.
function focusIn(el) {
  el.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
}
function focusOut(el) {
  el.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true }));
}
function editField(el, value) {
  focusIn(el);
  el.value = String(value);
  focusOut(el);
}
function setInitiative(id, value) {
  editField(row(id).querySelector('.init-input'), value);
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

  it('a control left over from a superseded render is inert, and the live control for the same combatant acts on him alone', async () => {
    await loadTracker([A, B, C]);
    // Hold on to Bravo's rendered "-5" button (position 1), then re-render twice with a reorder so
    // that position belongs to somebody else and the held button is no longer in the page.
    const staleBravoBtn = row('id-B').querySelector('.hit-btn[data-delta="-5"]');
    setInitiative('id-C', 25); // order becomes [C, B, A]
    click(row('id-C').querySelector('.delete-btn'));
    expect(savedOrder()).toEqual(['id-B', 'id-A']);
    expect(staleBravoBtn.isConnected).toBe(false);

    click(staleBravoBtn); // nothing is bound to it any more
    expect(savedById('id-B').currentHP).toBe(20);
    expect(savedById('id-A').currentHP).toBe(20);

    click(row('id-B').querySelector('.hit-btn[data-delta="-5"]'));
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

  // The list controls are handled by listeners on the two stable containers, attached once at
  // boot. These tests go through the rendered UI and check behavior: one click is one action no
  // matter how many times the list has been re-rendered, and a control that cannot be tied to a
  // combatant does nothing.
  describe('delegated event handling', () => {
    const mobileCard = id => document.querySelector(`#mobile-initiative-order .card[data-character-id="${id}"]`);
    const hpOf = id => savedById(id).currentHP;
    const damageLogFor = id =>
      saved().combatLog.filter(e => e.targetId === id && e.type === 'damage');
    // Each of these re-renders the whole list (and would stack listeners if wiring lived in it).
    const rerender = (times = 5) => {
      for (let i = 0; i < times; i++) click(row('id-A').querySelector('.react-btn'));
    };

    // The next two tests are behavior checks (right combatant, right amount, logged once). They do
    // NOT detect stacked listeners: the action re-renders, which detaches the clicked button, so a
    // second listener would ignore the same event. The tests that use actions which do not
    // re-render (rejected precision amount, opening the status modal, opening the notes modal) are
    // the ones that catch stacking.
    it('a click after many re-renders applies exactly once, to the right combatant', async () => {
      await loadTracker([A, B, C]);
      rerender(6);

      click(row('id-B').querySelector('.hit-btn[data-delta="-5"]'));

      expect(hpOf('id-B')).toBe(15);
      expect(damageLogFor('id-B')).toHaveLength(1);
    });

    // Most actions re-render as their last step, which detaches the clicked button, so a second
    // listener seeing the same event would ignore it. These three do NOT re-render, so they are
    // the ones that expose a handler attached more than once.
    it('an action that does not re-render still runs exactly once after many re-renders: rejected precision amount', async () => {
      await loadTracker([A, B, C]);
      rerender(5);
      alertCalls.length = 0;

      click(row('id-B').querySelector('.precision-damage')); // empty amount -> one alert, no change

      expect(alertCalls).toHaveLength(1);
      expect(hpOf('id-B')).toBe(20);
    });

    it('opening the status modal after many re-renders opens it once', async () => {
      await loadTracker([A, B, C]);
      rerender(5);
      modalCalls.length = 0;

      click(row('id-B').querySelector('.status-btn'));

      expect(modalCalls.filter(c => c === 'show')).toHaveLength(1);
    });

    it('opening the notes modal after many re-renders opens it once', async () => {
      await loadTracker([A, B, C]);
      rerender(5);
      modalCalls.length = 0;

      click(row('id-B').querySelector('.notes-btn'));

      expect(modalCalls.filter(c => c === 'show')).toHaveLength(1);
    });

    it('three successive clicks on a control that re-renders each time apply three times, once each', async () => {
      await loadTracker([A, B, C]);
      for (let i = 0; i < 3; i++) {
        click(row('id-B').querySelector('.hit-btn[data-delta="-1"]')); // re-queried: the list re-rendered
      }
      expect(hpOf('id-B')).toBe(17);
      expect(damageLogFor('id-B')).toHaveLength(3);
      expect(hpOf('id-A')).toBe(20);
      expect(hpOf('id-C')).toBe(20);
    });

    it('a click on an icon or text inside a button acts through the button', async () => {
      await loadTracker([A, B, C]);
      const icon = row('id-A').querySelector('.duplicate-btn i');
      expect(icon).not.toBeNull();

      click(icon);
      expect(saved().characters).toHaveLength(4); // exactly one copy

      const precisionIcon = row('id-B').querySelector('.precision-damage i');
      row('id-B').querySelector('.precision-amount').value = '4';
      click(precisionIcon);
      expect(hpOf('id-B')).toBe(16);
      expect(damageLogFor('id-B')).toHaveLength(1);
    });

    it('precision controls act on their own combatant and clear the amount field', async () => {
      await loadTracker([A, B, C]);
      const amount = row('id-C').querySelector('.precision-amount');
      amount.value = '7';
      click(row('id-C').querySelector('.precision-heal'));
      // healing at full HP raises max HP to match (existing behavior); nobody else is touched
      expect(hpOf('id-C')).toBe(27);
      expect(hpOf('id-A')).toBe(20);
      expect(hpOf('id-B')).toBe(20);

      click(row('id-C').querySelector('.precision-damage')); // empty amount: alert, no change
      expect(hpOf('id-C')).toBe(27);
    });

    it('a mobile control acts once, on its own combatant, and does not also fire the desktop one', async () => {
      await loadTracker([A, B, C]);
      click(mobileCard('id-B').querySelector('.hit-btn[data-delta="-5"]'));

      expect(hpOf('id-B')).toBe(15);
      expect(damageLogFor('id-B')).toHaveLength(1);
      expect(hpOf('id-A')).toBe(20);
      expect(hpOf('id-C')).toBe(20);
    });

    it('mobile move up / move down reorder by id and keep the turn on the same creature', async () => {
      await loadTracker([A, B, C], 1); // Bravo is active
      click(mobileCard('id-A').querySelector('.move-down'));
      expect(savedOrder()).toEqual(['id-B', 'id-A', 'id-C']);
      expect(saved().characters[saved().currentTurn].id).toBe('id-B');

      click(mobileCard('id-C').querySelector('.move-up'));
      expect(savedOrder()).toEqual(['id-B', 'id-C', 'id-A']);
      expect(saved().characters[saved().currentTurn].id).toBe('id-B');
    });

    it('a control whose combatant id is unknown or missing does nothing, and never targets anyone else', async () => {
      await loadTracker([A, B, C]);
      const unknown = row('id-B').querySelector('.hit-btn[data-delta="-5"]');
      unknown.dataset.characterId = 'id-not-here';
      const missing = row('id-C').querySelector('.hit-btn[data-delta="-5"]');
      missing.removeAttribute('data-character-id');
      const del = row('id-A').querySelector('.delete-btn');
      del.dataset.characterId = 'id-not-here';

      expect(() => { click(unknown); click(missing); click(del); }).not.toThrow();

      expect(saved().characters.map(c => c.currentHP)).toEqual([20, 20, 20]);
      expect(savedOrder()).toEqual(['id-A', 'id-B', 'id-C']);
      expect(saved().combatLog).toHaveLength(0);
    });

    it('a disabled control stays inert', async () => {
      const spent = makeChar('id-B', 'Bravo', 20, { legendaryActions: { max: 3, remaining: 0 } });
      await loadTracker([A, spent, C]);
      const btn = row('id-B').querySelector('.la-use-btn');
      expect(btn.disabled).toBe(true);

      click(btn);

      expect(savedById('id-B').legendaryActions.remaining).toBe(0);
      expect(saved().combatLog).toHaveLength(0);
    });

    it('legendary use spends exactly one action per click', async () => {
      const boss = makeChar('id-B', 'Bravo', 20, { legendaryActions: { max: 3, remaining: 3 } });
      await loadTracker([A, boss, C]);
      rerender(4);

      click(row('id-B').querySelector('.la-use-btn'));

      expect(savedById('id-B').legendaryActions.remaining).toBe(2);
    });

    // Markup <-> router contract. The click router looks each control's `data-action` up in a map
    // and silently ignores anything it doesn't know, so a typo on either side would otherwise just
    // make a button do nothing. Every action the templates emit is clicked through the real
    // delegated path and must produce its observable effect; a control the templates emit that is
    // missing from this table (or a table row the templates no longer emit) fails loudly.
    describe('markup and action routing contract', () => {
      const ROOTS = { desktop: '#initiative-order', mobile: '#mobile-initiative-order' };
      const BOTH = ['desktop', 'mobile'];

      // Alpha: normal, no legendary actions.  Bravo: downed (not dead), death saves in progress.
      // Charlie: has legendary actions.  Together they make every conditional control render.
      const routingFixture = () => [
        makeChar('id-A', 'Alpha', 30, { notes: 'note-Alpha', status: [{ name: 'Prone', icon: '🛌' }] }),
        makeChar('id-B', 'Bravo', 20, { currentHP: 0, deathSaves: { s: 1, f: 1, stable: false } }),
        makeChar('id-C', 'Charlie', 10, { legendaryActions: { max: 3, remaining: 2 } })
      ];
      const fillAmount = value => el => {
        el.closest('.precision-control').querySelector('.precision-amount').value = value;
      };
      const hps = () => saved().characters.map(c => c.currentHP);

      // action / who / control (companion-attribute selector) / views / before(el) / check()
      const ROUTED_ACTIONS = [
        { action: 'hit', who: 'id-A', control: '[data-delta="-5"]', views: BOTH,
          check: () => expect(hps()).toEqual([15, 0, 20]) },
        { action: 'precision-damage', who: 'id-A', views: BOTH, before: fillAmount('4'),
          check: () => expect(hps()).toEqual([16, 0, 20]) },
        { action: 'precision-heal', who: 'id-A', views: BOTH, before: fillAmount('3'),
          check: () => expect(hps()).toEqual([23, 0, 20]) }, // healing above max raises max HP
        { action: 'temp-hp', who: 'id-A', control: '[data-delta="1"]', views: ['desktop'],
          check: () => expect(savedById('id-A').tempHP).toBe(1) },
        { action: 'death-save', who: 'id-B', control: '[data-kind="f"]', views: ['desktop'],
          check: () => expect(savedById('id-B').deathSaves).toEqual({ s: 1, f: 2, stable: false }) },
        { action: 'death-save', who: 'id-B', control: '[data-kind="s"]', views: ['desktop'],
          check: () => expect(savedById('id-B').deathSaves).toEqual({ s: 2, f: 1, stable: false }) },
        { action: 'death-save-reset', who: 'id-B', views: ['desktop'],
          check: () => expect(savedById('id-B').deathSaves).toEqual({ s: 0, f: 0, stable: false }) },
        { action: 'notes', who: 'id-A', views: BOTH, check: () => {
          expect(modalCalls).toContain('show');
          expect(document.getElementById('notesModalLabel').textContent).toBe('Notes — Alpha');
          expect(document.getElementById('notes-text').value).toBe('note-Alpha');
        } },
        { action: 'status', who: 'id-A', views: BOTH, check: () => {
          expect(modalCalls).toContain('show');
          expect(document.getElementById('status-badges').textContent).toContain('Prone');
        } },
        { action: 'concentration', who: 'id-A', views: BOTH,
          check: () => expect(savedById('id-A').concentration).toBe(true) },
        { action: 'reaction', who: 'id-A', views: BOTH,
          check: () => expect(savedById('id-A').reactionUsed).toBe(true) },
        { action: 'legendary-use', who: 'id-C', views: BOTH,
          check: () => expect(savedById('id-C').legendaryActions).toEqual({ max: 3, remaining: 1 }) },
        { action: 'legendary-reset', who: 'id-C', views: BOTH,
          check: () => expect(savedById('id-C').legendaryActions).toEqual({ max: 3, remaining: 3 }) },
        { action: 'legendary-disable', who: 'id-C', views: BOTH,
          check: () => expect(savedById('id-C').legendaryActions).toEqual({ max: 0, remaining: 0 }) },
        { action: 'legendary-enable', who: 'id-A', views: BOTH, // prompt is stubbed to answer "2"
          check: () => expect(savedById('id-A').legendaryActions).toEqual({ max: 2, remaining: 2 }) },
        { action: 'duplicate', who: 'id-A', views: BOTH, check: () => {
          expect(saved().characters.map(c => c.name)).toEqual(['Alpha', 'Alpha 2', 'Bravo', 'Charlie']);
        } },
        { action: 'delete', who: 'id-A', views: BOTH,
          check: () => expect(savedOrder()).toEqual(['id-B', 'id-C']) },
        { action: 'move-up', who: 'id-C', views: ['mobile'],
          check: () => expect(savedOrder()).toEqual(['id-A', 'id-C', 'id-B']) },
        { action: 'move-down', who: 'id-A', views: ['mobile'],
          check: () => expect(savedOrder()).toEqual(['id-B', 'id-A', 'id-C']) }
      ];
      const cases = ROUTED_ACTIONS.flatMap(r =>
        r.views.map(view => ({ ...r, view, label: `${r.action}${r.control ?? ''} on ${r.who} (${view})` }))
      );

      it('every action the templates emit is covered by this table, and every companion attribute is well-formed', async () => {
        await loadTracker(routingFixture());
        const controls = [...document.querySelectorAll(
          `${ROOTS.desktop} [data-action], ${ROOTS.mobile} [data-action]`
        )];
        const emitted = [...new Set(controls.map(el => el.dataset.action))].sort();
        const covered = [...new Set(ROUTED_ACTIONS.map(r => r.action))].sort();
        expect(emitted).toEqual(covered);

        // every routed control names its combatant, and the attributes some actions read are valid
        controls.forEach(el => expect(el.dataset.characterId, el.outerHTML).toBeTruthy());
        controls
          .filter(el => el.dataset.action === 'death-save')
          .forEach(el => expect(['s', 'f']).toContain(el.dataset.kind));
        controls
          .filter(el => ['hit', 'temp-hp'].includes(el.dataset.action))
          .forEach(el => expect(Number.isFinite(+el.dataset.delta), el.outerHTML).toBe(true));
      });

      it.each(cases)('routes $label', async c => {
        await loadTracker(routingFixture());
        const el = document.querySelector(
          `${ROOTS[c.view]} [data-action="${c.action}"][data-character-id="${c.who}"]${c.control ?? ''}`
        );
        expect(el, `no ${c.view} control emitted for ${c.label}`).not.toBeNull();
        c.before?.(el);
        modalCalls.length = 0;

        click(el);

        c.check();
      });
    });

    it('the notes Save button (a non-combatant control) acts once however often the list re-rendered', async () => {
      await loadTracker([A, B, C]);
      rerender(5);
      click(row('id-B').querySelector('.notes-btn'));
      document.getElementById('notes-text').value = 'seen at the docks';
      modalCalls.length = 0;

      click(document.getElementById('notes-save-btn'));

      expect(savedById('id-B').notes).toBe('seen at the docks');
      expect(modalCalls.filter(c => c === 'hide')).toHaveLength(1);
    });

    // Synthetic focusin/focusout events (see the helpers above): they exercise the handlers but do
    // not move document.activeElement. The real-focus group below covers focus-dependent behavior.
    describe('inline editors (synthetic focus events)', () => {
      const key = (el, k) =>
        el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

      it('typing a new name and pressing Enter renames once; one undo restores it', async () => {
        await loadTracker([A, B, C]);
        rerender(3);
        const input = row('id-B').querySelector('.name-input');
        focusIn(input);
        input.value = 'Brutus';
        key(input, 'Enter');
        expect(savedById('id-B').name).toBe('Brutus');
        expect(savedById('id-A').name).toBe('Alpha');

        click(document.getElementById('undo-btn'));
        expect(savedById('id-B').name).toBe('Bravo');
      });

      it('leaving the HP field commits that combatant\'s HP once and logs it once', async () => {
        await loadTracker([A, B, C]);
        rerender(3);
        const hp = row('id-C').querySelector('.health-input');
        editField(hp, 7);

        expect(hpOf('id-C')).toBe(7);
        expect(hpOf('id-A')).toBe(20);
        expect(hpOf('id-B')).toBe(20);
        expect(damageLogFor('id-C')).toHaveLength(1);
      });

      it.each([
        ['hp', '.health-input', 3],
        ['name', '.name-input', 'Zed'],
        ['initiative', '.init-input', 77]
      ])('a %s editor whose combatant id is unknown commits nothing', async (_field, sel, value) => {
        await loadTracker([A, B, C]);
        const input = row('id-B').querySelector(sel);
        input.dataset.characterId = 'id-not-here';

        editField(input, value);

        expect(saved().characters.map(c => [c.name, c.currentHP, c.initiative])).toEqual([
          ['Alpha', 20, 5], ['Bravo', 20, 20], ['Charlie', 20, 10]
        ]);
      });
    });
  });

  // These use real focus (focus()/blur() fire focus+focusin / blur+focusout and set
  // document.activeElement) and the harness's Chromium-style focusout-on-removal, so they follow
  // what a browser does, unlike the synthetic focusIn/focusOut helpers above.
  describe('inline editors: stale commits, Escape and Enter (real focus)', () => {
    const ROOTS = { desktop: '#initiative-order tr', mobile: '#mobile-initiative-order .card' };
    const find = (view, sel, id = 'id-B') =>
      document.querySelector(`${ROOTS[view]}[data-character-id="${id}"] ${sel}`);
    const key = (el, k) =>
      el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    const hpOf = id => savedById(id).currentHP;
    // A re-render must leave the list exactly as it found it: no duplicated or missing rows in
    // either view, distinct ids, and every combatant still saved. (Nested renders during a
    // removal-time focusout could in principle stack rows; Chromium currently wipes them, and this
    // pins that so a future browser or runtime change fails a test instead of production.)
    const expectListIntact = count => {
      const ids = sel => [...document.querySelectorAll(sel)].map(el => el.dataset.characterId);
      expect(ids(ROOTS.desktop)).toHaveLength(count);
      expect(ids(ROOTS.mobile)).toHaveLength(count);
      expect(new Set(ids(ROOTS.desktop)).size).toBe(count);
      expect(new Set(ids(ROOTS.mobile)).size).toBe(count);
      expect(saved().characters).toHaveLength(count);
    };

    // field: what the editor is / view: where it renders / typed: a deliberate edit
    // external: another tab's change to Bravo / read: the model value the editor controls
    const EDITORS = [
      { field: 'name', view: 'desktop', sel: '.name-input', typed: 'Brutus',
        external: { name: 'Bruno' }, read: () => savedById('id-B').name, committed: 'Brutus', newer: 'Bruno' },
      { field: 'name', view: 'mobile', sel: '.name-input', typed: 'Brutus',
        external: { name: 'Bruno' }, read: () => savedById('id-B').name, committed: 'Brutus', newer: 'Bruno' },
      { field: 'hp', view: 'desktop', sel: '.health-input', typed: '7',
        external: { currentHP: 15 }, read: () => hpOf('id-B'), committed: 7, newer: 15 },
      { field: 'hp', view: 'mobile', sel: '.health-input', typed: '7',
        external: { currentHP: 15 }, read: () => hpOf('id-B'), committed: 7, newer: 15 },
      { field: 'initiative', view: 'desktop', sel: '.init-input', typed: '99',
        external: { initiative: 30 }, read: () => savedById('id-B').initiative, committed: 99, newer: 30 }
    ];

    describe.each(EDITORS)('$field editor ($view)', e => {
      it('an untouched editor never overwrites newer state when the list is re-rendered under it', async () => {
        await loadTracker([A, B, C]);
        find(e.view, e.sel).focus(); // focused, not edited
        replaceStateFromAnotherTab([A, { ...B, ...e.external }, C]); // another tab changed Bravo

        expect(e.read()).toBe(e.newer);
        expect(find(e.view, e.sel).value).toBe(String(e.newer)); // the re-rendered field shows it too
        expect(saved().combatLog).toHaveLength(0); // no phantom history/log from a stale write
      });

      it('a deliberate edit commits when the field is left', async () => {
        await loadTracker([A, B, C]);
        const input = find(e.view, e.sel);
        input.focus();
        input.value = e.typed;
        input.blur();

        expect(e.read()).toBe(e.committed);
      });

      it('refocusing before the edit is committed keeps the original baseline, so the edit still commits', async () => {
        await loadTracker([A, B, C]);
        const input = find(e.view, e.sel);
        input.focus();
        const baseline = input.dataset.original; // what the field showed when it gained focus
        input.value = e.typed; // a deliberate, uncommitted edit

        focusIn(input); // focus comes back to the field with no commit in between

        expect(input.dataset.original).toBe(baseline); // still the pre-edit value, not the partial edit
        input.blur();
        expect(e.read()).toBe(e.committed);
      });

      it('a deliberate edit is not thrown away when the list is re-rendered under it', async () => {
        await loadTracker([A, B, C]);
        const input = find(e.view, e.sel);
        input.focus();
        input.value = e.typed;
        replaceStateFromAnotherTab([A, { ...B, ...e.external }, C]);

        expect(e.read()).toBe(e.committed);
        expect(saved().characters).toHaveLength(3);
      });

      // The render-integrity invariant, for both views. It used to fail for mobile cards: the commit
      // an uncommitted mobile edit makes during the re-render ran its own buildTable() inside the
      // outer render (via the removal-time focusout), and the outer render then appended its rows
      // on top: 6 desktop rows, 3 cards.
      it('the list stays intact and the edit lands exactly once after that re-render', async () => {
        await loadTracker([A, B, C]);
        const input = find(e.view, e.sel);
        expect(input, 'the editor exists').not.toBeNull();
        input.focus();
        expect(document.activeElement).toBe(input);
        input.value = e.typed;
        expect(document.querySelectorAll('#initiative-order tr')).toHaveLength(3); // healthy before

        replaceStateFromAnotherTab([A, { ...B, ...e.external }, C]);

        expectListIntact(3);
        expect(e.read()).toBe(e.committed); // last writer wins: the deliberate edit survives
        expect(saved().combatLog).toHaveLength(e.field === 'hp' ? 1 : 0); // one log entry, only for HP
        click(document.getElementById('undo-btn')); // one history entry: a single undo goes back to the other tab's value
        expect(e.read()).toBe(e.newer);
      });
    });

    // The invariant itself, independent of which browser event causes the nesting: render requests
    // that arrive while a render is running must coalesce into a correct final render, never append
    // a second copy of the list. Here the requests are forced from inside the render (each clear of
    // the mobile list "clicks" Next Turn), which is what a removal-time focusout commit does.
    describe('re-entrant render requests', () => {
      const nested = requests => {
        const mobile = document.getElementById('mobile-initiative-order');
        const desc = findDescriptor(mobile, 'innerHTML');
        let fired = 0;
        Object.defineProperty(mobile, 'innerHTML', {
          configurable: true,
          get() { return desc.get.call(this); },
          set(value) {
            if (value === '' && fired < requests) { fired++; click(document.getElementById('next-turn')); }
            desc.set.call(this, value);
          }
        });
        return () => fired;
      };
      const listMatchesModel = () => {
        const ids = sel => [...document.querySelectorAll(sel)].map(el => el.dataset.characterId);
        expect(ids('#initiative-order tr')).toEqual(['id-A', 'id-B', 'id-C']);
        expect(ids('#mobile-initiative-order .card')).toEqual(['id-A', 'id-B', 'id-C']);
        const turn = saved().currentTurn;
        expect(ids('#initiative-order tr.active-turn')).toEqual([saved().characters[turn].id]);
        expect(ids('#mobile-initiative-order .card.border-success')).toEqual([saved().characters[turn].id]);
      };

      it.each([1, 2])('%i nested render request(s) during a render end in exactly one correct list', async requests => {
        await loadTracker([A, B, C]);
        const fired = nested(requests);

        click(document.getElementById('next-turn'));

        expect(fired()).toBe(requests); // the nesting really happened
        listMatchesModel();
        expect(saved().characters).toHaveLength(3);
      });

      it('the final render reflects the model changed by the nested request', async () => {
        await loadTracker([A, B, C]);
        const before = saved().currentTurn;
        nested(1);

        click(document.getElementById('next-turn')); // outer advance, plus one nested advance

        expect(saved().currentTurn).toBe((before + 2) % 3);
        listMatchesModel();
      });

      // If a render throws, the guard must reset, or every later buildTable() returns early and the
      // list silently stops updating. The fault is the first statement of every render (the round
      // counter), so it always fires and always escapes the render.
      it('a render that throws does not leave later renders blocked', async () => {
        await loadTracker([A, B, C]);
        const round = document.getElementById('combat-round');
        const failures = [];
        const onError = ev => { failures.push(String(ev.error?.message ?? ev.message)); ev.preventDefault?.(); };
        window.addEventListener('error', onError);
        Object.defineProperty(round, 'textContent', { configurable: true, set() { throw new Error('render boom'); } });
        try {
          try { click(document.getElementById('next-turn')); } catch (err) { failures.push(String(err.message)); }
        } finally {
          delete round.textContent; // remove the fault: the prototype's setter shows through again
          window.removeEventListener('error', onError);
        }
        expect(failures.join('|')).toContain('render boom'); // the first render really failed, for this reason

        click(document.getElementById('next-turn')); // an independent, later render must run

        // Two Next Turns happened (the failed render's model change was not rolled back), and the
        // rendered list and the save both reflect the current model, not the state before the failure.
        expect(saved().currentTurn).toBe(2);
        listMatchesModel(); // rows, cards and the active-turn marker all match the model
      });
    });

    it('focusing and leaving the HP field without editing does not re-render, so the next click is not lost', async () => {
      await loadTracker([A, B, C]);
      const hp = find('desktop', '.health-input');
      const minusFive = find('desktop', '.hit-btn[data-delta="-5"]');
      hp.focus();
      hp.blur(); // what pressing the mouse on another control does first

      click(minusFive);

      expect(hpOf('id-B')).toBe(15);
    });

    // After a commit attempt that leaves the input in the page (rejected, normalized, or a no-op),
    // the baseline must be what the field now shows, so the next focus/blur is judged against it.
    describe('the baseline after a commit attempt is what the field shows', () => {
      it('a rejected empty name is put back and becomes the baseline', async () => {
        await loadTracker([A, B, C]);
        const input = find('desktop', '.name-input');
        input.focus();
        input.value = '';
        input.blur();

        expect(input.isConnected).toBe(true); // rejected: nothing re-rendered
        expect(input.value).toBe('Bravo');
        expect(input.dataset.original).toBe('Bravo');
        expect(savedById('id-B').name).toBe('Bravo');
      });

      it('an HP entry that normalizes to the current value shows that value and becomes the baseline', async () => {
        await loadTracker([A, B, C]);
        const input = find('desktop', '.health-input');
        input.focus();
        input.value = '020'; // parses to the 20 the model already has
        input.blur();

        expect(input.isConnected).toBe(true);
        expect(input.value).toBe('20');
        expect(input.dataset.original).toBe('20');
        expect(hpOf('id-B')).toBe(20);
        click(document.getElementById('undo-btn')); // no history entry was made
        expect(input.isConnected).toBe(true);
      });

      it.each([['020', '20'], [' 20 ', '20']])(
        'an initiative entry %j that normalizes to the current value shows the canonical %j and it becomes the baseline',
        async (typed, canonical) => {
          await loadTracker([A, B, C]);
          const input = find('desktop', '.init-input');
          input.focus();
          input.value = typed; // parses to the 20 the model already has: nothing to write
          input.blur();

          expect(input.isConnected).toBe(true); // no re-render, so the field itself must be corrected
          expect(input.value).toBe(canonical);
          expect(input.dataset.original).toBe(canonical);
          expect(savedById('id-B').initiative).toBe(20);
          click(document.getElementById('undo-btn')); // no history entry was made
          expect(input.isConnected).toBe(true);
        });

      // An empty number field is a rejected edit, not "0": it must put the model value back and
      // leave no trace (no write, no log, no history, no re-render, no reorder). '' is the only
      // value these inputs can hand the commit as "nothing usable": a type=number input reports
      // junk such as 'abc', '-' or whitespace as '' (happy-dom and browsers alike), so testing those
      // would rerun this same case. The parser's NaN branch for non-empty text is not reachable
      // through these editors.
      describe.each([
        { field: 'hp', sel: '.health-input', model: '20', read: () => savedById('id-B').currentHP },
        { field: 'initiative', sel: '.init-input', model: '20', read: () => savedById('id-B').initiative }
      ])('a rejected $field entry', f => {
        it('an empty field restores the model value and changes nothing', async () => {
          await loadTracker([A, B, C]);
          const input = find('desktop', f.sel);
          input.focus();
          input.value = '';
          input.blur();

          expect(input.isConnected).toBe(true); // rejected: nothing re-rendered
          expect(input.value).toBe(f.model);
          expect(input.dataset.original).toBe(f.model);
          expect(f.read()).toBe(20);
          expect(saved().combatLog).toHaveLength(0);
          expect(savedOrder()).toEqual(['id-A', 'id-B', 'id-C']);
          expect(savedById('id-B').deathSaves).toEqual({ s: 0, f: 0, stable: false });
          click(document.getElementById('undo-btn')); // nothing was pushed, so there is nothing to undo
          expect(input.isConnected).toBe(true);
        });

        it('a real 0 is still a valid entry (it is not confused with "empty")', async () => {
          await loadTracker([A, B, C]);
          const input = find('desktop', f.sel);
          input.focus();
          input.value = '0';
          input.blur();

          expect(f.read()).toBe(0);
        });
      });

      it('leaving and returning to a field after a rejected commit stays quiet', async () => {
        await loadTracker([A, B, C]);
        const input = find('desktop', '.name-input');
        input.focus();
        input.value = '';
        input.blur();

        input.focus();
        input.blur();

        expect(input.isConnected).toBe(true); // no rebuild, no history
        click(document.getElementById('undo-btn'));
        expect(input.isConnected).toBe(true);
      });
    });

    describe.each([
      { field: 'name', sel: '.name-input', typed: 'Nope', original: 'Bravo', read: () => savedById('id-B').name },
      { field: 'initiative', sel: '.init-input', typed: '99', original: '20', read: () => String(savedById('id-B').initiative) }
    ])('Escape in the $field editor', e => {
      it('cancels the edit, is not committed by the focusout that follows, and nothing re-renders', async () => {
        await loadTracker([A, B, C]);
        const rowEl = row('id-B');
        const input = rowEl.querySelector(e.sel);
        input.focus();
        expect(document.activeElement).toBe(input); // really focused, not just an event
        input.value = e.typed;
        expect(input.value).toBe(e.typed); // the user changed it

        key(input, 'Escape'); // restores the value and blurs, so a real focusout follows

        expect(document.activeElement).not.toBe(input); // it really lost focus: the focusout path ran
        expect(input.value).toBe(e.original);
        expect(input.dataset.original).toBe(e.original);
        expect(e.read()).toBe(e.original);
        expect(rowEl.isConnected).toBe(true); // no rebuild, so the cancelled value was not re-committed
        click(document.getElementById('undo-btn')); // nothing was pushed, so there is nothing to undo
        expect(rowEl.isConnected).toBe(true);
      });

      it('still restores the original after the field was refocused mid-edit', async () => {
        await loadTracker([A, B, C]);
        const input = row('id-B').querySelector(e.sel);
        input.focus();
        input.value = e.typed;
        focusIn(input); // focus comes back with no commit in between

        key(input, 'Escape');

        expect(input.value).toBe(e.original); // the baseline survived the refocus
        expect(e.read()).toBe(e.original);
      });
    });

    it('Enter commits a deliberate edit exactly once, and an untouched Enter commits nothing', async () => {
      await loadTracker([A, B, C]);
      const untouched = find('desktop', '.name-input');
      untouched.focus();
      key(untouched, 'Enter');
      click(document.getElementById('undo-btn'));
      expect(untouched.isConnected).toBe(true); // no history entry, nothing to undo

      const input = find('desktop', '.name-input');
      input.focus();
      input.value = 'Brutus';
      key(input, 'Enter'); // commit, re-render, and the removal-time focusout that follows
      expect(savedById('id-B').name).toBe('Brutus');

      click(document.getElementById('undo-btn'));
      expect(savedById('id-B').name).toBe('Bravo'); // one entry: a double commit would need two undos
    });
  });

  // Combatant data reaches the templates from saved sessions, imports, and other pages, so any
  // value can contain quotes or markup. These check the rendered DOM: the value shows up literally,
  // no extra element or attribute is created, and nothing hostile can route an action.
  //
  // Known harness gap: happy-dom decodes only &amp; and &quot; inside attribute values (text nodes
  // decode everything); real browsers decode every character reference there. So a value containing
  // < > or ' is escaped correctly but cannot be read back literally from an attribute in happy-dom.
  // Exact literals for those characters are asserted in tests/e2e/initiative-attribute-safety.spec.js
  // (real Chromium); here they are covered structurally (nothing injected, nothing routable).
  describe('hostile values in combatant data', () => {
    const ROOTS = { desktop: '#initiative-order tr', mobile: '#mobile-initiative-order .card' };
    const view = (v, id) =>
      [...document.querySelectorAll(ROOTS[v])].find(el => el.dataset.characterId === id);
    const key = (el, k) =>
      el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    const HOSTILE = [
      ['double quotes', 'He said "hi"'],
      ['single quotes', "It's 'quoted'"],
      ['angle brackets and ampersand', '<b>bold</b> & <i>it</i>'],
      ['entity look-alikes (must not be decoded)', 'Tom &amp; Jerry &lt;3 &quot;'],
      ['attribute breakout', '" data-action="delete" x="'],
      ['single-quote breakout', "' data-action='delete' onfocus='window.__pwned=1' x='"],
      ['tag breakout', '"><img src=x onerror="window.__pwned=1">'],
      ['script and textarea close', '</textarea><script>window.__pwned=1</script>']
    ];
    const cases = HOSTILE.flatMap(([label, name]) =>
      ['desktop', 'mobile'].map(v => ({ label, name, v }))
    );
    const attrNames = el => el.getAttributeNames().sort();

    afterEach(() => { delete window.__pwned; });

    it.each(cases)('a name with $label renders literally and inert ($v)', async ({ name, v }) => {
      const plain = makeChar('id-P', 'Plain', 15);
      const hostile = makeChar('id-X', name, 10);
      await loadTracker([plain, hostile, C]);

      const plainRow = view(v, 'id-P');
      const hostileRow = view(v, 'id-X');
      const input = hostileRow.querySelector('.name-input');

      // the value is exactly what was stored (where happy-dom can show it), and the input has
      // exactly the attributes a benign one has
      if (!/[<>']/.test(name)) expect(input.value).toBe(name);
      expect(attrNames(input)).toEqual(attrNames(plainRow.querySelector('.name-input')));

      // nothing was injected: same actionable controls as a benign row, all buttons, all this combatant's
      const actions = row => [...row.querySelectorAll('[data-action]')];
      expect(actions(hostileRow).map(el => el.dataset.action).sort())
        .toEqual(actions(plainRow).map(el => el.dataset.action).sort());
      actions(hostileRow).forEach(el => {
        expect(el.tagName).toBe('BUTTON');
        expect(el.dataset.characterId).toBe('id-X');
      });
      expect(hostileRow.querySelectorAll('input[data-action]')).toHaveLength(0);
      expect(hostileRow.querySelector('img, script, iframe')).toBeNull();
      [hostileRow, ...hostileRow.querySelectorAll('*')].forEach(el =>
        el.getAttributeNames().forEach(a => expect(a.startsWith('on'), `${a} on <${el.tagName}>`).toBe(false))
      );
      expect(window.__pwned).toBeUndefined();

      // touching the field cannot run an action
      const before = JSON.stringify(saved().characters);
      input.focus();
      click(input);
      key(input, 'Tab');
      input.blur();
      expect(JSON.stringify(saved().characters)).toBe(before);
      expect(savedOrder()).toEqual(['id-P', 'id-X', 'id-C']);
    });

    it.each(cases)('editing still works and the value survives re-renders without being re-escaped ($label, $v)', async ({ name, v }) => {
      await loadTracker([makeChar('id-X', name, 10), A]);
      const input = () => view(v, 'id-X').querySelector('.name-input');
      const typed = 'Renamed "ok" & &amp; done'; // (< > ' round-trips are asserted in the real-browser spec)

      input().focus();
      input().value = typed;
      input().blur();
      expect(savedById('id-X').name).toBe(typed);
      expect(input().value).toBe(typed);

      for (let i = 0; i < 3; i++) click(view(v, 'id-A').querySelector('.react-btn')); // re-render
      expect(input().value).toBe(typed); // still the literal text, not entity-mangled
      expect(savedById('id-X').name).toBe(typed);
    });

    it.each(['desktop', 'mobile'])('a type, AC, status name and status icon with markup are shown as text, not parsed (%s)', async v => {
      const evil = makeChar('id-X', 'Evil', 10, {
        type: '<img src=x onerror="window.__pwned=1">',
        ac: '<b id="injected">9</b>',
        status: [
          { name: '" onmouseover="window.__pwned=1" x="', icon: '<script>window.__pwned=1</script>' },
          { name: '"><img src=x onerror="window.__pwned=1">', icon: '<b>hot</b>' }
        ]
      });
      await loadTracker([evil, A]);

      const rowEl = view(v, 'id-X');
      expect(rowEl.querySelector('img, script, b')).toBeNull();
      expect(document.getElementById('injected')).toBeNull();
      expect(rowEl.textContent).toContain('<img src=x onerror="window.__pwned=1">'); // type, shown as text
      const [first, second] = rowEl.querySelectorAll('.status-chip');
      expect(first.getAttribute('title')).toBe('" onmouseover="window.__pwned=1" x="');
      expect(first.getAttributeNames().sort()).toEqual(['class', 'title']);
      expect(second.getAttributeNames().sort()).toEqual(['class', 'title']);
      expect(first.textContent).toBe('<script>window.__pwned=1</script>'); // icon, shown as text
      expect(second.textContent).toBe('<b>hot</b>');
      const tipRow = rowEl.querySelector('.status-icon-row');
      expect(tipRow.getAttribute('title')).toContain('" onmouseover="window.__pwned=1" x="');
      expect(tipRow.getAttributeNames()).not.toContain('onmouseover');
      expect(window.__pwned).toBeUndefined();
    });

    it('an id with quotes and markup renders as one attribute value and its controls still route', async () => {
      const id = 'x" data-action="delete" y="'; // (a < > id is asserted in the real-browser spec)
      await loadTracker([makeChar(id, 'Odd id', 10), A]);

      const rowEl = view('desktop', id);
      expect(rowEl).toBeDefined();
      rowEl.querySelectorAll('[data-character-id]').forEach(el => expect(el.dataset.characterId).toBe(id));
      expect(rowEl.querySelectorAll('input[data-action]')).toHaveLength(0);

      click(rowEl.querySelector('.hit-btn[data-delta="-5"]'));
      expect(saved().characters.find(c => c.id === id).currentHP).toBe(15);
      expect(savedOrder()).toHaveLength(2);
    });

    // Defense in depth: even if a hostile attribute did reach the DOM, the router ignores it.
    describe('the delegated router only acts on the controls it expects', () => {
      it('ignores data-action on an input, and on a non-button element', async () => {
        await loadTracker([A, B, C]);
        const rowEl = row('id-A');
        const asInput = document.createElement('input');
        asInput.dataset.action = 'delete';
        asInput.dataset.characterId = 'id-A';
        const asSpan = document.createElement('span');
        asSpan.dataset.action = 'delete';
        asSpan.dataset.characterId = 'id-A';
        rowEl.append(asInput, asSpan);

        click(asInput);
        click(asSpan);

        expect(savedOrder()).toEqual(['id-A', 'id-B', 'id-C']);
        click(rowEl.querySelector('.hit-btn[data-delta="-5"]')); // real buttons still work
        expect(savedById('id-A').currentHP).toBe(15);
      });

      it('still resolves a click on an icon inside a button', async () => {
        await loadTracker([A, B, C]);
        click(row('id-A').querySelector('.duplicate-btn i'));
        expect(saved().characters).toHaveLength(4);
      });

      it('ignores data-field on anything that is not an input', async () => {
        await loadTracker([A, B, C]);
        const fake = document.createElement('div');
        fake.tabIndex = 0;
        fake.dataset.field = 'hp'; // an hp "editor" that is not an input would read as 0 and zero the HP
        fake.dataset.characterId = 'id-A';
        row('id-A').append(fake);

        fake.focus();
        fake.blur();

        expect(savedById('id-A').currentHP).toBe(20);
        expect(saved().combatLog).toHaveLength(0);
      });
    });
  });
});
