/**
 * Integration tests: data that reaches the Initiative Tracker from outside its own editors (the autosave
 * another tab writes, an imported session file, a manual save, another page's hand-off) is normalized
 * with the same whole-number rule as the editors, and rendered as text, never markup. Also covers the
 * remaining typed-number boundaries (precision amount, Add form, legendary actions, status duration).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { loadTracker, makeChar, alertCalls } from '../helpers/initiative-harness.js';

const saved = () => JSON.parse(localStorage.getItem('initiativeTrackerData'));
const savedById = id => saved().characters.find(c => c.id === id);
// What another tab saving does: the key changes and a `storage` event fires.
function fromAnotherTab(data) {
  localStorage.setItem('initiativeTrackerData', JSON.stringify(data));
  const ev = new window.Event('storage');
  Object.defineProperty(ev, 'key', { value: 'initiativeTrackerData' });
  window.dispatchEvent(ev);
}
// The tracker's in-memory model is only observable through what it renders and saves; a local action
// (Next Turn) makes it save.
function saveModel() {
  document.getElementById('reset-turns').click();
  return saved();
}
const rowIds = () => [...document.querySelectorAll('#initiative-order tr')].map(r => r.dataset.characterId);

// Text follows the editors' strict rule; a value that is already a finite number is truncated, never
// zeroed (a stored 45.5 is 45, not 0).
describe('stored and imported numbers follow the whole-number rule', () => {
  it.each([
    ['an integer', 12, 12],
    ['integer text', '12', 12],
    ['integer text with a leading zero', '012', 12],
    ['a negative integer', -3, -3],
    ['a fraction (a number)', 12.5, 12],
    ['a negative fraction (a number)', -2.7, -2],
    ['a small negative fraction (a number)', -0.5, 0],
    ['the largest safe integer', Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    ['an integer too large to store exactly', 2 ** 53 + 2, 0],
    ['a huge number', 1e300, 0],
    ['fraction text', '12.5', 0],
    ['exponent text', '1e3', 0],
    ['exponent text for a whole number', '4.5e1', 0],
    ['hex text', '0x10', 0],
    ['trailing junk', '3abc', 0],
    ['Infinity text', 'Infinity', 0],
    ['NaN text', 'NaN', 0],
    ['integer text too large to store exactly', '9007199254740993', 0],
    ['a boolean', true, 0],
    ['an array', [7], 0],
    ['null', null, 0]
  ])('initiative given as %s is stored as %j', async (_label, value, expected) => {
    await loadTracker([makeChar('a', 'Alpha', 1)]);
    fromAnotherTab({ characters: [makeChar('a', 'Alpha', value)], currentTurn: 0, combatRound: 1 });
    expect(saveModel().characters[0].initiative).toBe(expected);
  });

  // JSON has no NaN or Infinity; the only way a non-finite number arrives is JSON text such as 1e999.
  it.each([['1e999'], ['-1e999']])('a stored %s (parsed as an infinite number) falls back instead of being kept', async lit => {
    await loadTracker([makeChar('a', 'Alpha', 1)]);
    const raw = `{"characters":[{"id":"a","name":"Alpha","initiative":${lit},"currentHP":${lit},"maxHP":20}],"currentTurn":0,"combatRound":1}`;
    localStorage.setItem('initiativeTrackerData', raw);
    const ev = new window.Event('storage');
    Object.defineProperty(ev, 'key', { value: 'initiativeTrackerData' });
    window.dispatchEvent(ev);
    const c = saveModel().characters[0];
    expect([c.initiative, c.currentHP, c.maxHP]).toEqual([0, 0, 20]);
  });

  it('a session holding fractional HP keeps it (truncated), and saving does not zero it', async () => {
    await loadTracker([makeChar('a', 'Alpha', 1)]);
    fromAnotherTab({ characters: [makeChar('a', 'Alpha', 5, { currentHP: 45.5, maxHP: 45.5 })], currentTurn: 0, combatRound: 1 });
    expect(document.querySelector('#initiative-order .health-input').value).toBe('45');
    const c = saveModel().characters[0];
    expect([c.currentHP, c.maxHP]).toEqual([45, 45]);
  });

  it('HP, temp HP, death saves, legendary actions, pending damage and durations are checked the same way', async () => {
    await loadTracker([makeChar('a', 'Alpha', 1)]);
    fromAnotherTab({
      characters: [makeChar('a', 'Alpha', 5, {
        currentHP: '1e3', maxHP: '15', tempHP: -4, concDamagePending: 'lots',
        deathSaves: { s: 'x', f: 9, stable: 0 },
        legendaryActions: { max: '3', remaining: 2.5 },
        status: [{ name: 'Poisoned', remaining: 1.5 }, { name: 'Prone', remaining: 2 }, null, 'Blinded']
      })],
      currentTurn: 0, combatRound: 1
    });
    const c = saveModel().characters[0];
    expect(c.currentHP).toBe(0); // "1e3" is not 1000
    expect(c.maxHP).toBe(15);
    expect(c.tempHP).toBe(0);
    expect(c.concDamagePending).toBe(0);
    expect(c.deathSaves).toEqual({ s: 0, f: 3, stable: false });
    expect(c.legendaryActions).toEqual({ max: 3, remaining: 2 }); // a numeric 2.5 truncates
    expect(c.status.map(s => [s.name, s.remaining])).toEqual([['Poisoned', 1], ['Prone', 2], ['Blinded', undefined]]);
    const row = document.querySelector('#initiative-order tr');
    expect(row.textContent).not.toContain('NaN');
  });

  it('a turn pointer or round that is not a whole number in range is reset instead of breaking Next Turn', async () => {
    await loadTracker([makeChar('a', 'Alpha', 1)]);
    fromAnotherTab({ characters: [makeChar('a', 'Alpha', 9), makeChar('b', 'Bravo', 5)], currentTurn: '1.5', combatRound: 'abc' });
    expect(document.querySelectorAll('#initiative-order tr.active-turn')).toHaveLength(1);
    expect(document.getElementById('combat-round').textContent).toBe('1');
    expect(() => document.getElementById('next-turn').click()).not.toThrow();
    expect(saved().currentTurn).toBe(1);

    fromAnotherTab({ characters: [makeChar('a', 'Alpha', 9), makeChar('b', 'Bravo', 5)], currentTurn: 1.5, combatRound: 2.9 });
    expect(document.querySelector('#initiative-order tr.active-turn').dataset.characterId).toBe('b'); // 1.5 -> 1
    expect(document.getElementById('combat-round').textContent).toBe('2');

    fromAnotherTab({ characters: [makeChar('a', 'Alpha', 9), makeChar('b', 'Bravo', 5)], currentTurn: 7, combatRound: '4' });
    expect(document.querySelector('#initiative-order tr.active-turn').dataset.characterId).toBe('a');
    expect(document.getElementById('combat-round').textContent).toBe('4');
  });

  it('entries that are not objects are dropped instead of failing the whole load', async () => {
    await loadTracker([makeChar('a', 'Alpha', 1)]);
    fromAnotherTab({
      characters: [null, 'x', makeChar('b', 'Bravo', 5), 7, makeChar('c', 5, 3)],
      currentTurn: 0, combatRound: 1, diceHistory: [null, { text: 'ok', timestamp: 't' }], combatLog: [null, 3]
    });
    expect(rowIds()).toEqual(['b', 'c']);
    expect(document.querySelector('#initiative-order tr[data-character-id="c"] .name-input').value).toBe('5');
    expect(document.getElementById('dice-history-log').children).toHaveLength(1);
    // a name that was a number is now text, so name-based features work on it
    document.querySelector('#initiative-order tr[data-character-id="c"] .duplicate-btn').click();
    expect(saved().characters.map(c => c.name)).toEqual(['Bravo', '5', '5 2']);
  });

  it('another page\'s hand-off goes through the same rule ("1e3" is not turned into 1000 first)', async () => {
    const handOff = {
      mode: 'append',
      characters: [{ name: 'Ogre', initiative: '1e3', currentHP: '59', maxHP: 59.5, tempHP: 'x' }]
    };
    await loadTracker([makeChar('a', 'Alpha', 1)], 0, { 'dmtools.pendingImport': JSON.stringify(handOff) });
    const ogre = saved().characters.find(c => c.name === 'Ogre');
    // "1e3" text is refused (Number("1e3") used to make it 1000); the number 59.5 truncates to 59
    expect(ogre).toMatchObject({ initiative: 0, currentHP: 59, maxHP: 59, tempHP: 0 });
    expect(saved().characters).toHaveLength(2);
    expect(localStorage.getItem('dmtools.pendingImport')).toBeNull();
  });

  it('a character sheet hand-off with a fractional Max HP arrives as 45/45, not 0/0 (the boot save keeps it)', async () => {
    // the shape js/character/character-send-to.js stages: Number() of an unvalidated number field
    const handOff = { __dmtoolsVersion: 1, mode: 'append', currentTurn: 0, combatRound: 1, diceHistory: [], characters: [{
      name: 'Sheet PC', type: 'PC', initiative: 0, currentHP: 45.5, maxHP: 45.5, tempHP: 0, ac: 15, notes: '',
      concentration: false, deathSaves: { s: 0, f: 0, stable: false }, status: [], concDamagePending: 0
    }] };
    await loadTracker([], 0, { 'dmtools.pendingImport': JSON.stringify(handOff) });
    const pc = saved().characters.find(c => c.name === 'Sheet PC');
    expect([pc.currentHP, pc.maxHP]).toEqual([45, 45]);
  });

  it('a Battle Map hand-off with its bonus sent as text adds it to the roll instead of appending it', async () => {
    // (the form is auto-submitted a moment later; the rolled value put in the form is what matters here)
    const handOff = { name: 'Goblin', maxHp: 7, ac: 15, initiative: '3', useActualInitiative: false };
    vi.spyOn(Math, 'random').mockReturnValue(0.7); // the d20 rolls 15
    try {
      await loadTracker([], 0, { 'dmtools.pendingInitiativeImport': JSON.stringify(handOff) });
    } finally {
      vi.restoreAllMocks();
    }
    expect(document.getElementById('initiative-roll').value).toBe('18'); // 15 + 3; it used to be "153"
  });
});

describe('combat log', () => {
  afterEach(() => { delete window.__pwned; });
  const evil = '<img src=x onerror="window.__pwned=1">';
  const logRows = () => [...document.querySelectorAll('#combat-log-accordion tbody tr')];

  it('a combatant name with markup is shown as text in its log entry', async () => {
    await loadTracker([makeChar('x', evil, 10)]);
    document.querySelector('#initiative-order .hit-btn[data-delta="-5"]').click();
    const [row] = logRows();
    expect(row.querySelector('img')).toBeNull();
    expect(row.children[2].textContent).toBe(evil);
    expect(row.children[1].textContent).toBe(evil); // the acting combatant
  });

  it('every stored field is text; a round that is not a number keeps its entries', async () => {
    await loadTracker([makeChar('a', 'Alpha', 1)]);
    const entry = (round, i) => ({
      id: 'e' + i, timestamp: new Date(2026, 0, 1, 10, i).toISOString(), round,
      turnName: evil, actorName: evil, targetName: evil, summary: evil, details: evil,
      statusPayload: evil, concentration: evil, sources: [evil, 'quick-adjust'], hpBefore: evil, hpAfter: '<b>1</b>'
    });
    fromAnotherTab({
      characters: [makeChar('a', 'Alpha', 1)], currentTurn: 0, combatRound: 1,
      combatLog: [entry(1, 1), entry('" onmouseover="window.__pwned=1', 2), entry('01', 3), entry(2, 4)]
    });
    const acc = document.getElementById('combat-log-accordion');
    expect(logRows()).toHaveLength(4); // "01" and the hostile round used to crash the lookup (no rows at all)
    expect(acc.querySelector('img, script, b')).toBeNull();
    [acc, ...acc.querySelectorAll('*')].forEach(el =>
      el.getAttributeNames().forEach(a => expect(a.startsWith('on'), `${a} on <${el.tagName}>`).toBe(false)));
    acc.querySelectorAll('[id]').forEach(el => expect(el.id).toMatch(/^combat-log-round-\d+(-header)?$/));
    expect(logRows()[0].children[3].textContent).toBe(evil);
    const badges = [...logRows()[0].children[7].querySelectorAll('.badge')];
    expect(badges.map(b => b.children.length)).toEqual([0, 0]); // (unknown sources are title-cased, as text)
    expect(badges[1].textContent).toBe('Quick Adjust');
    const headers = [...acc.querySelectorAll('.accordion-button')].map(b => b.textContent.replace(/\s+/g, ' ').trim());
    expect(headers[0]).toMatch(/^Round 2 /); // numbered rounds first, newest first
    expect(headers[1]).toMatch(/^Round 1 /);
    expect(window.__pwned).toBeUndefined();
  });

  it('the concentration prompt shows its numbers as text', async () => {
    await loadTracker([makeChar('a', 'Alpha', 1, { concentration: true })]);
    document.querySelector('#initiative-order .hit-btn[data-delta="-5"]').click();
    document.getElementById('next-turn').click();
    const msg = document.getElementById('concToastMsg');
    expect(msg.textContent).toContain('Took 5 damage this turn. DC = 10');
    expect([...msg.querySelectorAll('strong')].map(s => s.textContent)).toEqual(['5', '10']);
  });
});

describe('typed numbers at the remaining boundaries', () => {
  const precision = (value, sel = '.precision-damage') => {
    document.querySelector('#initiative-order .precision-amount').value = value;
    document.querySelector(`#initiative-order ${sel}`).click();
  };

  it.each(['-5', '0', '12.5', '1e3', ''])('a precision amount of %j is refused (a negative is not flipped to positive)', async v => {
    await loadTracker([makeChar('a', 'Alpha', 1)]);
    precision(v);
    precision(v, '.precision-heal');
    expect(alertCalls.filter(m => m.includes('positive amount'))).toHaveLength(2);
    expect(saved().characters[0].currentHP).toBe(20);
  });

  it.each([
    ['a negative HP', { hp: '-5' }],
    ['a negative AC', { ac: '-1' }],
    ['a fractional HP', { hp: '12.5' }]
  ])('the Add form refuses %s', async (_l, f) => {
    await loadTracker([]);
    document.getElementById('character-name').value = 'Zed';
    document.getElementById('initiative-roll').value = '-2';
    document.getElementById('character-health').value = f.hp ?? '10';
    document.getElementById('character-ac').value = f.ac ?? '12';
    document.getElementById('initiative-form').dispatchEvent(new window.Event('submit', { cancelable: true }));
    expect(alertCalls.join()).toContain('whole numbers');
    expect(saved().characters).toHaveLength(0);
  });

  it('the Add form still takes a negative initiative and blank numbers as 0', async () => {
    await loadTracker([]);
    document.getElementById('character-name').value = 'Zed';
    document.getElementById('initiative-roll').value = '-2';
    document.getElementById('character-health').value = '';
    document.getElementById('character-ac').value = '015';
    document.getElementById('initiative-form').dispatchEvent(new window.Event('submit', { cancelable: true }));
    expect(alertCalls).toEqual([]);
    expect(saved().characters.map(c => [c.name, c.initiative, c.maxHP, c.ac])).toEqual([['Zed', -2, 0, 15]]);
  });

  it.each([
    ['blank takes the default', '', 3],
    ['a whole number', '2', 2],
    ['leading zeros', '04', 4]
  ])('legendary actions: %s', async (_l, typed, max) => {
    await loadTracker([makeChar('a', 'Alpha', 1)]);
    window.prompt = () => typed;
    document.querySelector('#initiative-order .la-enable-btn').click();
    expect(saved().characters[0].legendaryActions).toEqual({ max, remaining: max });
  });

  it.each(['0', '-2', '1e3', '2.5', 'abc'])('legendary actions: %j is refused, not turned into a number', async typed => {
    await loadTracker([makeChar('a', 'Alpha', 1)]);
    window.prompt = () => typed;
    document.querySelector('#initiative-order .la-enable-btn').click();
    expect(alertCalls.join()).toContain('Legendary Actions must be');
    expect(saved().characters[0].legendaryActions).toEqual({ max: 0, remaining: 0 });
  });

  it.each([['-2'], ['1e3'], ['2.5']])('a status duration of %j is refused, not dropped silently', async typed => {
    await loadTracker([makeChar('a', 'Alpha', 1)]);
    document.querySelector('#initiative-order .status-btn').click();
    document.querySelector('#status-dropdown-list a[data-eff="Prone"]').click();
    document.getElementById('status-duration').value = typed;
    document.getElementById('add-status-btn').click();
    expect(alertCalls.join()).toContain('Duration must be');
    expect(saved().characters[0].status).toEqual([]);

    document.getElementById('status-duration').value = ''; // blank: no duration, added
    document.getElementById('add-status-btn').click();
    expect(saved().characters[0].status).toEqual([{ name: 'Prone', icon: '🛌' }]);
  });
});
