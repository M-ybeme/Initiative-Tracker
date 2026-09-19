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
// Focus into an inline editor, change its value, and leave it, as a browser reports it
// (focusin / focusout bubble; the tracker listens for them on the list containers).
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

    describe('inline editors (focus / keyboard)', () => {
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

      it('Escape puts the original value back without committing', async () => {
        await loadTracker([A, B, C]);
        const name = row('id-B').querySelector('.name-input');
        focusIn(name);
        name.value = 'Nope';
        key(name, 'Escape');
        expect(name.value).toBe('Bravo');
        expect(savedById('id-B').name).toBe('Bravo');

        const init = row('id-B').querySelector('.init-input');
        focusIn(init);
        init.value = '99';
        key(init, 'Escape');
        expect(init.value).toBe('20');
        expect(savedById('id-B').initiative).toBe(20);
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

      it('an editor whose combatant id is unknown commits nothing', async () => {
        await loadTracker([A, B, C]);
        const hp = row('id-B').querySelector('.health-input');
        hp.dataset.characterId = 'id-not-here';

        editField(hp, 3);

        expect(saved().characters.map(c => c.currentHP)).toEqual([20, 20, 20]);
      });
    });
  });
});
