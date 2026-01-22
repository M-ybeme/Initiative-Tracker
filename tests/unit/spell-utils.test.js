import { describe, it, expect } from 'vitest';
import {
  FULL_CASTER_SLOTS,
  PACT_MAGIC_SLOTS,
  useSpellSlot,
  restoreSpellSlot,
  restoreAllSpellSlots,
  filterSpellsByClass,
  filterSpellsByLevel,
  filterSpellsBySchool,
  canCastAsRitual,
  isConcentrationSpell,
  getMaxSpellLevel
} from '../../js/modules/spell-utils.js';

describe('useSpellSlot', () => {
  it('decrements slot at correct level', () => {
    const currentSlots = [4, 3, 2, 0, 0, 0, 0, 0, 0];
    const result = useSpellSlot(currentSlots, 1);

    expect(result.success).toBe(true);
    expect(result.slots[0]).toBe(3);
    expect(result.slots[1]).toBe(3); // Other slots unchanged
  });

  it('does not modify original array', () => {
    const currentSlots = [4, 3, 2, 0, 0, 0, 0, 0, 0];
    useSpellSlot(currentSlots, 1);
    expect(currentSlots[0]).toBe(4);
  });

  it('fails when no slots remaining', () => {
    const currentSlots = [0, 3, 2, 0, 0, 0, 0, 0, 0];
    const result = useSpellSlot(currentSlots, 1);

    expect(result.success).toBe(false);
    expect(result.slots).toEqual(currentSlots);
    expect(result.message).toContain('No');
  });

  it('fails for invalid spell level', () => {
    const currentSlots = [4, 3, 2, 0, 0, 0, 0, 0, 0];

    expect(useSpellSlot(currentSlots, 0).success).toBe(false);
    expect(useSpellSlot(currentSlots, 10).success).toBe(false);
    expect(useSpellSlot(currentSlots, -1).success).toBe(false);
  });

  it('works for all valid levels', () => {
    const currentSlots = [4, 3, 3, 3, 2, 1, 1, 1, 1];

    for (let level = 1; level <= 9; level++) {
      const result = useSpellSlot(currentSlots, level);
      expect(result.success).toBe(true);
      expect(result.slots[level - 1]).toBe(currentSlots[level - 1] - 1);
    }
  });
});

describe('restoreSpellSlot', () => {
  it('increments slot at correct level', () => {
    const currentSlots = [2, 1, 0, 0, 0, 0, 0, 0, 0];
    const maxSlots = [4, 3, 2, 0, 0, 0, 0, 0, 0];
    const result = restoreSpellSlot(currentSlots, maxSlots, 1);

    expect(result.success).toBe(true);
    expect(result.slots[0]).toBe(3);
  });

  it('fails when already at maximum', () => {
    const currentSlots = [4, 3, 2, 0, 0, 0, 0, 0, 0];
    const maxSlots = [4, 3, 2, 0, 0, 0, 0, 0, 0];
    const result = restoreSpellSlot(currentSlots, maxSlots, 1);

    expect(result.success).toBe(false);
    expect(result.message).toContain('maximum');
  });

  it('fails for invalid spell level', () => {
    const currentSlots = [2, 1, 0, 0, 0, 0, 0, 0, 0];
    const maxSlots = [4, 3, 2, 0, 0, 0, 0, 0, 0];

    expect(restoreSpellSlot(currentSlots, maxSlots, 0).success).toBe(false);
    expect(restoreSpellSlot(currentSlots, maxSlots, 10).success).toBe(false);
  });
});

describe('restoreAllSpellSlots', () => {
  it('returns a copy of max slots', () => {
    const maxSlots = [4, 3, 3, 1, 0, 0, 0, 0, 0];
    const result = restoreAllSpellSlots(maxSlots);

    expect(result).toEqual(maxSlots);
    expect(result).not.toBe(maxSlots); // Different reference
  });
});

describe('filterSpellsByClass', () => {
  const spells = [
    { name: 'Fireball', classes: ['Wizard', 'Sorcerer'] },
    { name: 'Cure Wounds', classes: ['Cleric', 'Bard', 'Paladin', 'Ranger', 'Druid'] },
    { name: 'Eldritch Blast', classes: ['Warlock'] },
    { name: 'Shield', classes: ['Wizard', 'Sorcerer'] }
  ];

  it('returns spells for matching class', () => {
    const wizardSpells = filterSpellsByClass(spells, 'Wizard');
    expect(wizardSpells).toHaveLength(2);
    expect(wizardSpells.map(s => s.name)).toContain('Fireball');
    expect(wizardSpells.map(s => s.name)).toContain('Shield');
  });

  it('returns empty array when no matches', () => {
    const fighterSpells = filterSpellsByClass(spells, 'Fighter');
    expect(fighterSpells).toEqual([]);
  });

  it('is case sensitive', () => {
    const result = filterSpellsByClass(spells, 'wizard');
    expect(result).toEqual([]);
  });
});

describe('filterSpellsByLevel', () => {
  const spells = [
    { name: 'Fire Bolt', level: 0 },
    { name: 'Magic Missile', level: 1 },
    { name: 'Fireball', level: 3 },
    { name: 'Shield', level: 1 }
  ];

  it('returns cantrips for level 0', () => {
    const cantrips = filterSpellsByLevel(spells, 0);
    expect(cantrips).toHaveLength(1);
    expect(cantrips[0].name).toBe('Fire Bolt');
  });

  it('returns spells of specified level', () => {
    const level1 = filterSpellsByLevel(spells, 1);
    expect(level1).toHaveLength(2);
    expect(level1.map(s => s.name)).toContain('Magic Missile');
    expect(level1.map(s => s.name)).toContain('Shield');
  });

  it('returns empty array for levels with no spells', () => {
    const level9 = filterSpellsByLevel(spells, 9);
    expect(level9).toEqual([]);
  });
});

describe('filterSpellsBySchool', () => {
  const spells = [
    { name: 'Fireball', school: 'Evocation' },
    { name: 'Charm Person', school: 'Enchantment' },
    { name: 'Lightning Bolt', school: 'Evocation' }
  ];

  it('returns spells of matching school', () => {
    const evocation = filterSpellsBySchool(spells, 'Evocation');
    expect(evocation).toHaveLength(2);
  });

  it('is case insensitive', () => {
    const evocation = filterSpellsBySchool(spells, 'evocation');
    expect(evocation).toHaveLength(2);
  });
});

describe('canCastAsRitual', () => {
  it('returns false for non-ritual spells', () => {
    const spell = { name: 'Fireball', ritual: false };
    expect(canCastAsRitual(spell, 'Wizard')).toBe(false);
  });

  it('returns true for ritual spell with ritual caster', () => {
    const spell = { name: 'Detect Magic', ritual: true };
    expect(canCastAsRitual(spell, 'Wizard')).toBe(true);
    expect(canCastAsRitual(spell, 'Cleric')).toBe(true);
    expect(canCastAsRitual(spell, 'Druid')).toBe(true);
    expect(canCastAsRitual(spell, 'Bard')).toBe(true);
  });

  it('returns false for non-ritual casters', () => {
    const spell = { name: 'Detect Magic', ritual: true };
    expect(canCastAsRitual(spell, 'Sorcerer')).toBe(false);
    expect(canCastAsRitual(spell, 'Warlock')).toBe(false);
  });
});

describe('isConcentrationSpell', () => {
  it('returns true for spells with concentration: true', () => {
    const spell = { name: 'Bless', concentration: true };
    expect(isConcentrationSpell(spell)).toBe(true);
  });

  it('returns true for spells with concentration in duration', () => {
    const spell = { name: 'Bless', duration: 'Concentration, up to 1 minute' };
    expect(isConcentrationSpell(spell)).toBe(true);
  });

  it('returns false for non-concentration spells', () => {
    const spell = { name: 'Fireball', concentration: false, duration: 'Instantaneous' };
    expect(isConcentrationSpell(spell)).toBe(false);
  });

  it('is case insensitive for duration check', () => {
    const spell = { name: 'Test', duration: 'CONCENTRATION, 1 hour' };
    expect(isConcentrationSpell(spell)).toBe(true);
  });
});

describe('getMaxSpellLevel', () => {
  describe('full casters', () => {
    it('returns 1 at level 1', () => {
      expect(getMaxSpellLevel('Wizard', 1)).toBe(1);
      expect(getMaxSpellLevel('Cleric', 1)).toBe(1);
    });

    it('returns 5 at level 9', () => {
      expect(getMaxSpellLevel('Wizard', 9)).toBe(5);
    });

    it('returns 9 at level 17+', () => {
      expect(getMaxSpellLevel('Wizard', 17)).toBe(9);
      expect(getMaxSpellLevel('Wizard', 20)).toBe(9);
    });
  });

  describe('half casters', () => {
    it('returns 0 at level 1', () => {
      expect(getMaxSpellLevel('Paladin', 1)).toBe(0);
      expect(getMaxSpellLevel('Ranger', 1)).toBe(0);
    });

    it('returns 1 at level 2', () => {
      expect(getMaxSpellLevel('Paladin', 2)).toBe(1);
    });

    it('returns 5 at level 17+', () => {
      expect(getMaxSpellLevel('Paladin', 17)).toBe(5);
      expect(getMaxSpellLevel('Ranger', 20)).toBe(5);
    });
  });

  describe('Warlock', () => {
    it('returns 1 at level 1', () => {
      expect(getMaxSpellLevel('Warlock', 1)).toBe(1);
    });

    it('returns 5 at level 9+ (Pact Magic cap)', () => {
      expect(getMaxSpellLevel('Warlock', 9)).toBe(5);
      expect(getMaxSpellLevel('Warlock', 20)).toBe(5);
    });
  });

  describe('non-casters', () => {
    it('returns 0 for martial classes', () => {
      expect(getMaxSpellLevel('Barbarian', 20)).toBe(0);
      expect(getMaxSpellLevel('Fighter', 20)).toBe(0);
      expect(getMaxSpellLevel('Monk', 20)).toBe(0);
      expect(getMaxSpellLevel('Rogue', 20)).toBe(0);
    });
  });

  describe('Artificer', () => {
    it('returns 1 at level 1', () => {
      expect(getMaxSpellLevel('Artificer', 1)).toBe(1);
    });

    it('returns 5 at level 17+', () => {
      expect(getMaxSpellLevel('Artificer', 17)).toBe(5);
    });
  });
});

describe('FULL_CASTER_SLOTS', () => {
  it('has correct slots for level 1', () => {
    expect(FULL_CASTER_SLOTS[1]).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('has correct slots for level 20', () => {
    expect(FULL_CASTER_SLOTS[20]).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
  });

  it('has entries for levels 1-20', () => {
    for (let level = 1; level <= 20; level++) {
      expect(FULL_CASTER_SLOTS[level]).toBeDefined();
      expect(FULL_CASTER_SLOTS[level]).toHaveLength(9);
    }
  });
});

describe('PACT_MAGIC_SLOTS', () => {
  it('has 1 slot at level 1', () => {
    expect(PACT_MAGIC_SLOTS[1]).toEqual({ slots: 1, level: 1 });
  });

  it('has 2 slots at level 2', () => {
    expect(PACT_MAGIC_SLOTS[2]).toEqual({ slots: 2, level: 1 });
  });

  it('has 4 slots at level 17+', () => {
    expect(PACT_MAGIC_SLOTS[17].slots).toBe(4);
    expect(PACT_MAGIC_SLOTS[20].slots).toBe(4);
  });

  it('maxes at 5th level slots at level 9', () => {
    expect(PACT_MAGIC_SLOTS[9].level).toBe(5);
    expect(PACT_MAGIC_SLOTS[20].level).toBe(5);
  });
});
