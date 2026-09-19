import { describe, it, expect, beforeAll } from 'vitest';
import { addPolymorphNotes } from '../../js/character/polymorph-notes.js';

// The exact-text expectations below were captured from the original implementation, so they pin its output
// byte for byte. The generator is private to the module: with empty existing notes, addPolymorphNotes returns
// the bare generated block, so that is how the block text is exercised.
const generatePolymorphNotes = (spellName, charLevel, beastForms) => addPolymorphNotes('', spellName, charLevel, beastForms);

// A small hand-made beast list: an empty CR bucket, a beast with traits, beasts without traits, and one with
// missing fields, so every formatting branch is exercised without depending on the real SRD data.
const FIXTURE = {
  'CR0': [{ name: 'Bare', ac: 10, hp: 1, speed: '10 ft.', attacks: 'None' }],
  'CR1/8': [],
  'CR1/4': [{ name: 'Traity', ac: 11, hp: 5, speed: '30 ft.', attacks: 'Bite: +2, 1d4', traits: 'Pack Tactics' }],
  'CR1': [
    { name: 'NoAttacks', ac: 12, hp: 9, speed: '40 ft.', attacks: '' },
    { name: 'Missing', ac: undefined, hp: undefined, speed: undefined, attacks: undefined }
  ]
};

const GOLDEN = {
  polySparse1: "=== POLYMORPH (4th Level) ===\nRange: 60 ft | Duration: Concentration, up to 1 hour | Save: WIS (unwilling)\n\n2024 PHB Rules:\n- CR Limit: Target's CR (or character level, if the target has no CR)\n- Target assumes the Beast's full stat block (HP, AC, attacks, speed)\n- Target retains alignment, personality, and memories; cannot cast spells\n- If the Beast form drops to 0 HP, target reverts with original HP intact\n- No fly or swim speed restrictions (unlike Wild Shape)\n\n--- Available Beast Forms (CR ≤ 1) ---\n(No fly or swim restrictions for Polymorph)\n\n-- CR 0 --\nBare | AC 10 | HP 1 | Speed: 10 ft.\n  Attacks: None\n\n-- CR 1/4 --\nTraity | AC 11 | HP 5 | Speed: 30 ft.\n  Attacks: Bite: +2, 1d4\n  Traits: Pack Tactics\n\n-- CR 1 --\nNoAttacks | AC 12 | HP 9 | Speed: 40 ft.\n  Attacks: \nMissing | AC undefined | HP undefined | Speed: undefined\n  Attacks: undefined\n",
  trueSparse3: "=== TRUE POLYMORPH (9th Level) ===\nRange: 30 ft | Duration: Concentration, up to 1 hour (can become permanent) | Save: WIS (unwilling)\n\n2024 PHB Rules:\n- CR Limit: Target's CR (or character level, if no CR)\n- Can transform into ANY creature type — not just Beasts!\n- Can transform a creature into an object, or an object into a creature\n- PERMANENT: Maintain concentration for the full 1 hour to make it permanent\n- Permanent transformation persists through unconsciousness and rests\n- Dispel Magic (DC 10 + caster's original spell level) can end a permanent transformation\n- If creature drops to 0 HP in new form, reverts (unless transformation is permanent)\n\n--- Available Beast Forms (CR ≤ 3) ---\n\n-- CR 0 --\nBare | AC 10 | HP 1 | Speed: 10 ft.\n  Attacks: None\n\n-- CR 1/4 --\nTraity | AC 11 | HP 5 | Speed: 30 ft.\n  Attacks: Bite: +2, 1d4\n  Traits: Pack Tactics\n\n-- CR 1 --\nNoAttacks | AC 12 | HP 9 | Speed: 40 ft.\n  Attacks: \nMissing | AC undefined | HP undefined | Speed: undefined\n  Attacks: undefined\n\nNote: Higher CR beasts (CR 3+) exist in the Monster Manual.\nAny Beast with CR ≤ the target's CR or level is valid.",
  polyRulesOnly: "=== POLYMORPH (4th Level) ===\nRange: 60 ft | Duration: Concentration, up to 1 hour | Save: WIS (unwilling)\n\n2024 PHB Rules:\n- CR Limit: Target's CR (or character level, if the target has no CR)\n- Target assumes the Beast's full stat block (HP, AC, attacks, speed)\n- Target retains alignment, personality, and memories; cannot cast spells\n- If the Beast form drops to 0 HP, target reverts with original HP intact\n- No fly or swim speed restrictions (unlike Wild Shape)",
  trueRulesOnly: "=== TRUE POLYMORPH (9th Level) ===\nRange: 30 ft | Duration: Concentration, up to 1 hour (can become permanent) | Save: WIS (unwilling)\n\n2024 PHB Rules:\n- CR Limit: Target's CR (or character level, if no CR)\n- Can transform into ANY creature type — not just Beasts!\n- Can transform a creature into an object, or an object into a creature\n- PERMANENT: Maintain concentration for the full 1 hour to make it permanent\n- Permanent transformation persists through unconsciousness and rests\n- Dispel Magic (DC 10 + caster's original spell level) can end a permanent transformation\n- If creature drops to 0 HP in new form, reverts (unless transformation is permanent)",
  polyNoBeasts: "=== POLYMORPH (4th Level) ===\nRange: 60 ft | Duration: Concentration, up to 1 hour | Save: WIS (unwilling)\n\n2024 PHB Rules:\n- CR Limit: Target's CR (or character level, if the target has no CR)\n- Target assumes the Beast's full stat block (HP, AC, attacks, speed)\n- Target retains alignment, personality, and memories; cannot cast spells\n- If the Beast form drops to 0 HP, target reverts with original HP intact\n- No fly or swim speed restrictions (unlike Wild Shape)\n\n--- Available Beast Forms (CR ≤ 1) ---\n(No fly or swim restrictions for Polymorph)\n\nNo beast forms in our database at your current level.",
  bogusKeys: "=== TRUE POLYMORPH (9th Level) ===\nRange: 30 ft | Duration: Concentration, up to 1 hour (can become permanent) | Save: WIS (unwilling)\n\n2024 PHB Rules:\n- CR Limit: Target's CR (or character level, if no CR)\n- Can transform into ANY creature type — not just Beasts!\n- Can transform a creature into an object, or an object into a creature\n- PERMANENT: Maintain concentration for the full 1 hour to make it permanent\n- Permanent transformation persists through unconsciousness and rests\n- Dispel Magic (DC 10 + caster's original spell level) can end a permanent transformation\n- If creature drops to 0 HP in new form, reverts (unless transformation is permanent)\n\n--- Available Beast Forms (CR ≤ 20) ---\n\nNo beast forms in our database at your current level."
};

describe('generatePolymorphNotes: which spells get notes', () => {
  it.each(['Wild Shape', 'Polymorph Other', 'Fireball', '', undefined, null, 0])('returns null for %j', (name) => {
    expect(generatePolymorphNotes(name, 5, FIXTURE)).toBeNull();
  });

  it('ignores case and surrounding whitespace in the spell name', () => {
    const expected = generatePolymorphNotes('Polymorph', 3, FIXTURE);
    expect(generatePolymorphNotes('  POLYMORPH ', 3, FIXTURE)).toBe(expected);
    const trueExpected = generatePolymorphNotes('True Polymorph', 3, FIXTURE);
    expect(generatePolymorphNotes(' true polymorph', 3, FIXTURE)).toBe(trueExpected);
  });
});

describe('generatePolymorphNotes: exact text', () => {
  it('Polymorph at level 1 lists the beasts up to CR 1, skipping the empty CR 1/8 bucket', () => {
    expect(generatePolymorphNotes('Polymorph', 1, FIXTURE)).toBe(GOLDEN.polySparse1);
  });

  it('True Polymorph at level 3 adds the Monster Manual note', () => {
    expect(generatePolymorphNotes('True Polymorph', 3, FIXTURE)).toBe(GOLDEN.trueSparse3);
  });

  it('without beast data the rules block stands alone (Polymorph)', () => {
    expect(generatePolymorphNotes('Polymorph', 1, undefined)).toBe(GOLDEN.polyRulesOnly);
  });

  it('without beast data the rules block stands alone (True Polymorph)', () => {
    expect(generatePolymorphNotes('True Polymorph', 1, undefined)).toBe(GOLDEN.trueRulesOnly);
  });

  it('null or empty beast data omit the list, and an empty object lists no forms at all', () => {
    expect(generatePolymorphNotes('Polymorph', 1, null)).toBe(GOLDEN.polyRulesOnly);
    expect(generatePolymorphNotes('Polymorph', 1, {})).toContain('No beast forms in our database at your current level.');
  });

  it('says so when every CR bucket up to the level is empty', () => {
    expect(generatePolymorphNotes('Polymorph', 1, { 'CR0': [], 'CR1/2': [] })).toBe(GOLDEN.polyNoBeasts);
  });

  it('ignores CR keys it does not know', () => {
    expect(generatePolymorphNotes('True Polymorph', 20, { 'CR9': [{ name: 'X', ac: 1, hp: 1, speed: 's', attacks: 'a' }] })).toBe(GOLDEN.bogusKeys);
  });
});

describe('generatePolymorphNotes: rules and formatting branches', () => {
  it('Polymorph carries its own heading, range and the no-fly/swim line; True Polymorph does not', () => {
    const poly = generatePolymorphNotes('Polymorph', 1, FIXTURE);
    const truePoly = generatePolymorphNotes('True Polymorph', 1, FIXTURE);
    expect(poly.startsWith('=== POLYMORPH (4th Level) ===\nRange: 60 ft')).toBe(true);
    expect(truePoly.startsWith('=== TRUE POLYMORPH (9th Level) ===\nRange: 30 ft')).toBe(true);
    expect(poly).toContain('(No fly or swim restrictions for Polymorph)');
    expect(truePoly).not.toContain('(No fly or swim restrictions for Polymorph)');
    expect(truePoly).toContain('Can transform into ANY creature type');
  });

  it('prints a trait line only for beasts that have traits', () => {
    const text = generatePolymorphNotes('Polymorph', 1, FIXTURE);
    expect(text).toContain('Traity | AC 11 | HP 5 | Speed: 30 ft.\n  Attacks: Bite: +2, 1d4\n  Traits: Pack Tactics');
    expect(text).toContain('Bare | AC 10 | HP 1 | Speed: 10 ft.\n  Attacks: None\n\n');
    expect(text).not.toContain('Traits: undefined');
  });

  it('a beast with missing fields prints them as the text "undefined" (the existing behavior)', () => {
    expect(generatePolymorphNotes('Polymorph', 1, FIXTURE)).toContain('Missing | AC undefined | HP undefined | Speed: undefined\n  Attacks: undefined');
  });

  it('the Monster Manual note appears only from level 3', () => {
    const note = 'Note: Higher CR beasts (CR 3+) exist in the Monster Manual.';
    expect(generatePolymorphNotes('Polymorph', 2, FIXTURE)).not.toContain(note);
    expect(generatePolymorphNotes('Polymorph', 3, FIXTURE)).toContain(note);
    expect(generatePolymorphNotes('Polymorph', 3, FIXTURE)).toContain("Any Beast with CR \u2264 the target's CR or level is valid.");
  });

  it('CR buckets follow their fixed order and stop above the level', () => {
    const all = { 'CR2': [{ name: 'Two', ac: 1, hp: 1, speed: 's', attacks: 'a' }], 'CR1/2': [{ name: 'Half', ac: 1, hp: 1, speed: 's', attacks: 'a' }], 'CR0': [{ name: 'Zero', ac: 1, hp: 1, speed: 's', attacks: 'a' }] };
    const at1 = generatePolymorphNotes('Polymorph', 1, all);
    expect(at1.indexOf('-- CR 0 --')).toBeLessThan(at1.indexOf('-- CR 1/2 --'));
    expect(at1).not.toContain('-- CR 2 --');
    expect(generatePolymorphNotes('Polymorph', 2, all)).toContain('-- CR 2 --');
  });
});

describe('generatePolymorphNotes: level handling', () => {
  const at = (level) => generatePolymorphNotes('Polymorph', level, FIXTURE);

  it.each([[0], [-3], ['abc'], [NaN], [undefined], [null], [Infinity]])('treats %j as level 1', (level) => {
    expect(at(level)).toBe(at(1));
  });
  it('accepts a level given as text or with decimals', () => {
    expect(at('5')).toBe(at(5));
    expect(at(' 4 ')).toBe(at(4));
    expect(at(2.7)).toBe(at(2));
    expect(at('2.9')).toBe(at(2));
  });
  it('shows the level in the beast list heading', () => {
    expect(at(4)).toContain('--- Available Beast Forms (CR \u2264 4) ---');
  });
});

describe('addPolymorphNotes', () => {
  it('returns null for spells that are not Polymorph or True Polymorph', () => {
    expect(addPolymorphNotes('notes', 'Fireball', 5, FIXTURE)).toBeNull();
    expect(addPolymorphNotes('', undefined, 5, FIXTURE)).toBeNull();
  });

  it('appends the block after a blank line when there are notes already', () => {
    expect(addPolymorphNotes('my notes', 'Polymorph', 1, FIXTURE)).toBe('my notes\n\n' + GOLDEN.polySparse1);
  });

  it('returns null when that spell\'s block is already there', () => {
    expect(addPolymorphNotes('=== POLYMORPH (4th Level) ===\nold', 'Polymorph', 1, FIXTURE)).toBeNull();
    expect(addPolymorphNotes('x === TRUE POLYMORPH y', 'True Polymorph', 1, FIXTURE)).toBeNull();
  });

  it('treats the two spells independently', () => {
    const withTrue = '=== TRUE POLYMORPH (9th Level) ===\nold';
    const added = addPolymorphNotes(withTrue, 'Polymorph', 1, FIXTURE);
    expect(added).toBe(withTrue + '\n\n' + GOLDEN.polySparse1);
    const withPoly = '=== POLYMORPH (4th Level) ===\nold';
    expect(addPolymorphNotes(withPoly, 'True Polymorph', 3, FIXTURE)).toBe(withPoly + '\n\n' + GOLDEN.trueSparse3);
  });

  it('is idempotent: adding to its own result changes nothing', () => {
    const once = addPolymorphNotes('', 'Polymorph', 1, FIXTURE);
    expect(addPolymorphNotes(once, 'Polymorph', 1, FIXTURE)).toBeNull();
  });
});

// The real SRD beast data, loaded the way the page loads it (a classic script that sets window.LevelUpData).
describe('generatePolymorphNotes with the real beast data', () => {
  let beasts;
  beforeAll(async () => {
    await import('../../data/srd/level-up-data.js');
    beasts = window.LevelUpData.BEAST_FORMS;
  });

  it('lists every CR 0 beast at level 1 in the documented one-line format', () => {
    const text = generatePolymorphNotes('Polymorph', 1, beasts);
    expect(beasts.CR0.length).toBeGreaterThan(0);
    for (const b of beasts.CR0) expect(text).toContain(b.name + ' | AC ' + b.ac + ' | HP ' + b.hp + ' | Speed: ' + b.speed + '\n  Attacks: ' + b.attacks);
    expect(text).toContain('-- CR 0 --');
    expect(text).toContain('-- CR 1 --');
    expect(text).not.toContain('-- CR 2 --');
  });

  it('reveals CR 2 beasts at level 2 and keeps the headings in ascending CR order', () => {
    const text = generatePolymorphNotes('True Polymorph', 2, beasts);
    const order = ['-- CR 0 --', '-- CR 1/8 --', '-- CR 1/4 --', '-- CR 1/2 --', '-- CR 1 --', '-- CR 2 --'].filter(h => text.includes(h));
    expect(order.length).toBeGreaterThanOrEqual(5);
    const positions = order.map(h => text.indexOf(h));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(text).toContain('-- CR 2 --');
  });

  it('never lists anything above CR 2, however high the level', () => {
    const text = generatePolymorphNotes('Polymorph', 20, beasts);
    expect(text).not.toMatch(/-- CR [3-9] --/);
    expect(text).toContain('Note: Higher CR beasts (CR 3+) exist in the Monster Manual.');
  });
});
