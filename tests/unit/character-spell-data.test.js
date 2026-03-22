import { describe, it, expect } from 'vitest';
import {
  SPELL_SLOT_TABLES,
  getSpellSlotsForClassLevel,
  getPactMagicSlots,
  normalizeSpellEntry,
  searchSpells,
} from '../../js/modules/character-spell-data.js';

describe('SPELL_SLOT_TABLES', () => {
  it('contains all expected caster classes', () => {
    for (const cls of ['Wizard','Sorcerer','Bard','Cleric','Druid','Paladin','Ranger','Artificer']) {
      expect(SPELL_SLOT_TABLES).toHaveProperty(cls);
    }
  });

  it('Warlock is not in the table (uses Pact Magic)', () => {
    expect(SPELL_SLOT_TABLES).not.toHaveProperty('Warlock');
  });

  it('each entry has 20 levels', () => {
    for (const cls of Object.keys(SPELL_SLOT_TABLES)) {
      expect(Object.keys(SPELL_SLOT_TABLES[cls])).toHaveLength(20);
    }
  });

  it('each slot array has exactly 9 entries', () => {
    for (const cls of Object.keys(SPELL_SLOT_TABLES)) {
      for (const arr of Object.values(SPELL_SLOT_TABLES[cls])) {
        expect(arr).toHaveLength(9);
      }
    }
  });
});
describe('getSpellSlotsForClassLevel', () => {
  it('returns correct slots for Wizard level 5', () => {
    expect(getSpellSlotsForClassLevel('Wizard', 5)).toEqual([4,3,2,0,0,0,0,0,0]);
  });

  it('returns correct slots for Paladin level 5 (half-caster)', () => {
    expect(getSpellSlotsForClassLevel('Paladin', 5)).toEqual([4,2,0,0,0,0,0,0,0]);
  });

  it('Paladin level 1 has no slots', () => {
    expect(getSpellSlotsForClassLevel('Paladin', 1)).toEqual([0,0,0,0,0,0,0,0,0]);
  });

  it('returns null for Warlock', () => {
    expect(getSpellSlotsForClassLevel('Warlock', 5)).toBeNull();
  });

  it('returns null for unknown class', () => {
    expect(getSpellSlotsForClassLevel('Fighter', 5)).toBeNull();
    expect(getSpellSlotsForClassLevel('Barbarian', 5)).toBeNull();
  });

  it('returns null for null/empty class', () => {
    expect(getSpellSlotsForClassLevel(null, 5)).toBeNull();
    expect(getSpellSlotsForClassLevel('', 5)).toBeNull();
  });

  it('Wizard level 20 has 6th-9th level slots', () => {
    const slots = getSpellSlotsForClassLevel('Wizard', 20);
    expect(slots[5]).toBe(2); // 6th level
    expect(slots[8]).toBe(1); // 9th level
  });

  it('returns null for out-of-range level', () => {
    expect(getSpellSlotsForClassLevel('Wizard', 21)).toBeNull();
    expect(getSpellSlotsForClassLevel('Wizard', 0)).toBeNull();
  });
});
describe('getPactMagicSlots', () => {
  it('level 1 returns 1 slot at spell level 1', () => {
    expect(getPactMagicSlots(1)).toEqual({ slots: 1, level: 1 });
  });

  it('level 2 returns 2 slots at spell level 1', () => {
    expect(getPactMagicSlots(2)).toEqual({ slots: 2, level: 1 });
  });

  it('level 5 returns 2 slots at spell level 3', () => {
    expect(getPactMagicSlots(5)).toEqual({ slots: 2, level: 3 });
  });

  it('level 11 returns 3 slots at spell level 5', () => {
    expect(getPactMagicSlots(11)).toEqual({ slots: 3, level: 5 });
  });

  it('level 17 returns 4 slots at spell level 5', () => {
    expect(getPactMagicSlots(17)).toEqual({ slots: 4, level: 5 });
  });

  it('level 20 returns 4 slots at spell level 5', () => {
    expect(getPactMagicSlots(20)).toEqual({ slots: 4, level: 5 });
  });

  it('returns null for out-of-range level', () => {
    expect(getPactMagicSlots(0)).toBeNull();
    expect(getPactMagicSlots(21)).toBeNull();
    expect(getPactMagicSlots(undefined)).toBeNull();
  });
});
describe('normalizeSpellEntry', () => {
  it('returns null for null/undefined/falsy', () => {
    expect(normalizeSpellEntry(null)).toBeNull();
    expect(normalizeSpellEntry(undefined)).toBeNull();
    expect(normalizeSpellEntry('')).toBeNull();
  });

  it('returns null for object with no name or title', () => {
    expect(normalizeSpellEntry({ level: 1 })).toBeNull();
  });

  it('string with no library match => custom fallback object', () => {
    const result = normalizeSpellEntry('Frostbolt');
    expect(result).toMatchObject({
      name: 'Frostbolt', title: 'Frostbolt', level: 0, source: 'custom', prepared: false,
    });
  });

  it('string that matches library => uses library data', () => {
    const libSpell = { name: 'Fireball', title: 'Fireball', level: 3, school: 'Evocation',
      concentration: false, classes: ['Wizard'], tags: ['damage'], body: 'desc' };
    const result = normalizeSpellEntry('fireball', name => name.toLowerCase() === 'fireball' ? libSpell : null);
    expect(result).toMatchObject({ name: 'Fireball', level: 3, school: 'Evocation', source: 'builtin' });
  });

  it('object input is normalized with canonical fields', () => {
    const result = normalizeSpellEntry({ name: 'Sleep', level: 1, school: 'Enchantment' });
    expect(result).toHaveProperty('name', 'Sleep');
    expect(result).toHaveProperty('casting_time');
    expect(result).toHaveProperty('concentration');
    expect(result).toHaveProperty('classes');
    expect(result).toHaveProperty('tags');
  });

  it('object: library is authoritative for system fields', () => {
    const libSpell = { name: 'Sleep', level: 1, school: 'Enchantment', concentration: false,
      classes: ['Wizard','Bard'], tags: ['control'], body: 'targets fall asleep' };
    const result = normalizeSpellEntry({ name: 'Sleep' }, name => name.toLowerCase() === 'sleep' ? libSpell : null);
    expect(result.classes).toEqual(['Wizard','Bard']);
    expect(result.tags).toEqual(['control']);
  });

  it('object: prepared flag from spellLike is preserved', () => {
    const result = normalizeSpellEntry({ name: 'Cure Wounds', level: 1, prepared: true });
    expect(result.prepared).toBe(true);
    const result2 = normalizeSpellEntry({ name: 'Cure Wounds', level: 1, prepared: false });
    expect(result2.prepared).toBe(false);
  });

  it('object: alwaysPrepared flag is preserved', () => {
    const result = normalizeSpellEntry({ name: 'Sanctuary', level: 1, alwaysPrepared: true });
    expect(result.alwaysPrepared).toBe(true);
  });

  it('object: alwaysPrepared not added when false/missing', () => {
    const result = normalizeSpellEntry({ name: 'Sanctuary', level: 1 });
    expect(result).not.toHaveProperty('alwaysPrepared');
  });

  it('object: concentration flag pulled from library', () => {
    const libSpell = { name: 'Bless', level: 1, concentration: true, school: 'Enchantment',
      classes: [], tags: [] };
    const result = normalizeSpellEntry({ name: 'Bless' }, n => n.toLowerCase() === 'bless' ? libSpell : null);
    expect(result.concentration).toBe(true);
  });

  it('preserves optional dice fields from library', () => {
    const libSpell = { name: 'Fireball', level: 3, school: 'Evocation', concentration: false,
      classes: [], tags: [], damage_dice: '8d6', higher_level_dice: '+1d6' };
    const result = normalizeSpellEntry('fireball', n => n.toLowerCase() === 'fireball' ? libSpell : null);
    expect(result.damage_dice).toBe('8d6');
    expect(result.higher_level_dice).toBe('+1d6');
  });

  it('handles castingTime alias field on object', () => {
    const result = normalizeSpellEntry({ name: 'Sleep', level: 1, castingTime: '1 action' });
    expect(result.casting_time).toBe('1 action');
  });
});
describe('searchSpells', () => {
  const spells = [
    { name: 'Fireball', title: 'Fireball', school: 'Evocation', body: 'A bright streak flashes.', tags: ['damage','fire'], classes: ['Wizard','Sorcerer'] },
    { name: 'Cure Wounds', title: 'Cure Wounds', school: 'Abjuration', body: 'A creature you touch regains hit points.', tags: ['healing'], classes: ['Cleric','Druid'] },
    { name: 'Bless', title: 'Bless', school: 'Enchantment', body: 'Three creatures gain a d4 bonus.', tags: ['buff','concentration'], classes: ['Cleric','Paladin'] },
    { name: 'Hex', title: 'Hex', school: 'Enchantment', body: 'Curse a creature.', tags: ['debuff','concentration'], classes: ['Warlock'] },
  ];

  it('returns empty array for empty/whitespace term', () => {
    expect(searchSpells('', spells)).toEqual([]);
    expect(searchSpells('   ', spells)).toEqual([]);
    expect(searchSpells(null, spells)).toEqual([]);
  });

  it('matches by name (case-insensitive)', () => {
    const r = searchSpells('fireball', spells);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('Fireball');
  });

  it('matches by partial name', () => {
    const r = searchSpells('fire', spells);
    expect(r.some(s => s.name === 'Fireball')).toBe(true);
  });

  it('matches by school', () => {
    const r = searchSpells('enchantment', spells);
    expect(r).toHaveLength(2);
    expect(r.map(s => s.name)).toContain('Bless');
    expect(r.map(s => s.name)).toContain('Hex');
  });

  it('matches by tag', () => {
    const r = searchSpells('healing', spells);
    expect(r.some(s => s.name === 'Cure Wounds')).toBe(true);
  });

  it('matches by class', () => {
    const r = searchSpells('warlock', spells);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('Hex');
  });

  it('matches by body text', () => {
    const r = searchSpells('hit points', spells);
    expect(r.some(s => s.name === 'Cure Wounds')).toBe(true);
  });

  it('returns empty array when no match', () => {
    expect(searchSpells('xyzzy', spells)).toEqual([]);
  });

  it('handles empty spell list', () => {
    expect(searchSpells('fire', [])).toEqual([]);
    expect(searchSpells('fire', null)).toEqual([]);
  });

  it('returns at most 25 results', () => {
    const big = Array.from({ length: 30 }, (_, i) => ({
      name: 'Fire' + i, title: 'Fire' + i, school: 'Evocation',
      body: '', tags: [], classes: []
    }));
    expect(searchSpells('fire', big)).toHaveLength(25);
  });
});
