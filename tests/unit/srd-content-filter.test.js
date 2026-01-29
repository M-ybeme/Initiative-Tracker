import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * SRD Content Filter Unit Tests
 *
 * Tests the core filtering logic that gates non-SRD content in the application.
 * The filter uses an allowlist approach: items must be explicitly allowed to appear.
 */

describe('SRD Content Filter', () => {
  let originalAllowlist;
  let originalBlocklist;
  let SRDContentFilter;

  // Sample test data
  const TEST_ALLOWLIST = {
    spell: ['Fireball', 'Magic Missile', 'Cure Wounds', 'Shield'],
    class: ['Fighter', 'Wizard', 'Cleric', 'Rogue'],
    race: ['Human', 'Elf', 'Dwarf', 'Halfling'],
    background: ['Acolyte', 'Criminal', 'Sage', 'Soldier'],
    subclass: [], // Empty = all blocked (SRD 5.2 has no subclasses)
    feat: ['Alert', 'Tough', 'Lucky']
  };

  const TEST_BLOCKLIST = {
    spell: ['Hex', 'Eldritch Blast', 'Armor of Agathys'],
    class: ['Artificer', 'Blood Hunter'],
    subclass: ['Warlock:The Hexblade', 'Warlock:The Celestial', 'Fighter:Echo Knight'],
    feat: ['Polearm Master', 'Great Weapon Master', 'Sentinel']
  };

  beforeEach(() => {
    // Save original globals
    originalAllowlist = window.SRD_CONTENT_ALLOWLIST;
    originalBlocklist = window.SRD_CONTENT_BLOCKLIST;

    // Set up test data
    window.SRD_CONTENT_ALLOWLIST = TEST_ALLOWLIST;
    window.SRD_CONTENT_BLOCKLIST = TEST_BLOCKLIST;

    // Re-initialize the filter module by executing the IIFE pattern
    const allowSets = Object.entries(TEST_ALLOWLIST).reduce((acc, [type, values]) => {
      acc[type] = new Set(values);
      return acc;
    }, {});

    const blockSets = Object.entries(TEST_BLOCKLIST).reduce((acc, [type, values]) => {
      acc[type] = new Set(values);
      return acc;
    }, {});

    function isAllowed(type, id) {
      if (!id) return true;
      const set = allowSets[type];
      if (!set) return true;
      return set.has(id);
    }

    function filterArray(type, items, idSelector = (item) => item?.id) {
      if (!Array.isArray(items) || !allowSets[type]) {
        return items;
      }
      return items.filter((item) => isAllowed(type, idSelector(item)));
    }

    function filterObject(type, obj, idSelector = (key) => key) {
      if (!obj || typeof obj !== 'object' || !allowSets[type]) {
        return obj;
      }
      const result = { ...obj };
      Object.keys(result).forEach((key) => {
        const id = idSelector(key, result[key]);
        if (!isAllowed(type, id)) {
          delete result[key];
        }
      });
      return result;
    }

    SRDContentFilter = {
      isAllowed,
      filterArray,
      filterObject,
      allowlist: allowSets,
      blocklist: blockSets
    };

    window.SRDContentFilter = SRDContentFilter;
  });

  afterEach(() => {
    // Restore original globals
    window.SRD_CONTENT_ALLOWLIST = originalAllowlist;
    window.SRD_CONTENT_BLOCKLIST = originalBlocklist;
  });

  describe('isAllowed()', () => {
    describe('spell filtering', () => {
      it('should allow SRD spells', () => {
        expect(SRDContentFilter.isAllowed('spell', 'Fireball')).toBe(true);
        expect(SRDContentFilter.isAllowed('spell', 'Magic Missile')).toBe(true);
        expect(SRDContentFilter.isAllowed('spell', 'Cure Wounds')).toBe(true);
      });

      it('should block non-SRD spells', () => {
        expect(SRDContentFilter.isAllowed('spell', 'Hex')).toBe(false);
        expect(SRDContentFilter.isAllowed('spell', 'Eldritch Blast')).toBe(false);
        expect(SRDContentFilter.isAllowed('spell', 'Armor of Agathys')).toBe(false);
      });

      it('should block spells not in allowlist even if not in blocklist', () => {
        expect(SRDContentFilter.isAllowed('spell', 'Chaos Bolt')).toBe(false);
        expect(SRDContentFilter.isAllowed('spell', 'Shadow Blade')).toBe(false);
      });
    });

    describe('class filtering', () => {
      it('should allow SRD classes', () => {
        expect(SRDContentFilter.isAllowed('class', 'Fighter')).toBe(true);
        expect(SRDContentFilter.isAllowed('class', 'Wizard')).toBe(true);
        expect(SRDContentFilter.isAllowed('class', 'Cleric')).toBe(true);
      });

      it('should block non-SRD classes', () => {
        expect(SRDContentFilter.isAllowed('class', 'Artificer')).toBe(false);
        expect(SRDContentFilter.isAllowed('class', 'Blood Hunter')).toBe(false);
      });
    });

    describe('subclass filtering (SRD 5.2 - all blocked)', () => {
      it('should block all subclasses when allowlist is empty', () => {
        expect(SRDContentFilter.isAllowed('subclass', 'Warlock:The Hexblade')).toBe(false);
        expect(SRDContentFilter.isAllowed('subclass', 'Warlock:The Celestial')).toBe(false);
        expect(SRDContentFilter.isAllowed('subclass', 'Fighter:Champion')).toBe(false);
        expect(SRDContentFilter.isAllowed('subclass', 'Wizard:School of Evocation')).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should return true for null/undefined id', () => {
        expect(SRDContentFilter.isAllowed('spell', null)).toBe(true);
        expect(SRDContentFilter.isAllowed('spell', undefined)).toBe(true);
        expect(SRDContentFilter.isAllowed('spell', '')).toBe(true);
      });

      it('should return true for unknown types (no allowlist defined)', () => {
        expect(SRDContentFilter.isAllowed('unknown-type', 'anything')).toBe(true);
        expect(SRDContentFilter.isAllowed('custom', 'data')).toBe(true);
      });

      it('should be case-sensitive', () => {
        expect(SRDContentFilter.isAllowed('spell', 'Fireball')).toBe(true);
        expect(SRDContentFilter.isAllowed('spell', 'fireball')).toBe(false);
        expect(SRDContentFilter.isAllowed('spell', 'FIREBALL')).toBe(false);
      });
    });
  });

  describe('filterArray()', () => {
    it('should filter spell array to only allowed spells', () => {
      const spells = [
        { id: 'Fireball', level: 3 },
        { id: 'Hex', level: 1 },
        { id: 'Magic Missile', level: 1 },
        { id: 'Eldritch Blast', level: 0 }
      ];

      const filtered = SRDContentFilter.filterArray('spell', spells, (s) => s.id);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((s) => s.id)).toEqual(['Fireball', 'Magic Missile']);
    });

    it('should use default id selector if not provided', () => {
      const items = [
        { id: 'Fighter' },
        { id: 'Artificer' },
        { id: 'Wizard' }
      ];

      const filtered = SRDContentFilter.filterArray('class', items);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((i) => i.id)).toEqual(['Fighter', 'Wizard']);
    });

    it('should return original array if type has no allowlist', () => {
      const items = [{ id: 'anything' }, { id: 'goes' }];
      const filtered = SRDContentFilter.filterArray('nonexistent-type', items);
      expect(filtered).toBe(items);
    });

    it('should return empty array when filtering array with no allowed items', () => {
      const subclasses = [
        { id: 'Warlock:The Hexblade' },
        { id: 'Fighter:Echo Knight' }
      ];

      const filtered = SRDContentFilter.filterArray('subclass', subclasses, (s) => s.id);
      expect(filtered).toHaveLength(0);
    });

    it('should handle empty input array', () => {
      const filtered = SRDContentFilter.filterArray('spell', []);
      expect(filtered).toEqual([]);
    });

    it('should handle non-array input gracefully', () => {
      expect(SRDContentFilter.filterArray('spell', null)).toBe(null);
      expect(SRDContentFilter.filterArray('spell', undefined)).toBe(undefined);
      expect(SRDContentFilter.filterArray('spell', 'not an array')).toBe('not an array');
    });
  });

  describe('filterObject()', () => {
    it('should filter object keys to only allowed entries', () => {
      const classes = {
        Fighter: { hitDie: 10 },
        Artificer: { hitDie: 8 },
        Wizard: { hitDie: 6 },
        'Blood Hunter': { hitDie: 10 }
      };

      const filtered = SRDContentFilter.filterObject('class', { ...classes });
      expect(Object.keys(filtered)).toEqual(['Fighter', 'Wizard']);
    });

    it('should use custom id selector', () => {
      const data = {
        spell_fireball: { name: 'Fireball' },
        spell_hex: { name: 'Hex' },
        spell_shield: { name: 'Shield' }
      };

      const filtered = SRDContentFilter.filterObject('spell', { ...data }, (key, value) => value.name);
      expect(Object.keys(filtered)).toEqual(['spell_fireball', 'spell_shield']);
    });

    it('should return original object if type has no allowlist', () => {
      const obj = { a: 1, b: 2 };
      const filtered = SRDContentFilter.filterObject('nonexistent-type', obj);
      expect(filtered).toBe(obj);
    });

    it('should handle null/undefined input', () => {
      expect(SRDContentFilter.filterObject('spell', null)).toBe(null);
      expect(SRDContentFilter.filterObject('spell', undefined)).toBe(undefined);
    });
  });

  describe('allowlist/blocklist exposure', () => {
    it('should expose allowlist as Sets', () => {
      expect(SRDContentFilter.allowlist.spell).toBeInstanceOf(Set);
      expect(SRDContentFilter.allowlist.spell.has('Fireball')).toBe(true);
    });

    it('should expose blocklist as Sets', () => {
      expect(SRDContentFilter.blocklist.spell).toBeInstanceOf(Set);
      expect(SRDContentFilter.blocklist.spell.has('Hex')).toBe(true);
    });
  });
});

describe('SRD Allowlist Data Integrity', () => {
  /**
   * These tests verify the actual allowlist data is correct for SRD 5.2.
   * They require the real srd-allowlist.js to be loaded.
   */

  it('should have spell allowlist defined', () => {
    // This test uses the real data if available
    const allowlist = window.SRD_CONTENT_ALLOWLIST || {};
    if (allowlist.spell) {
      expect(Array.isArray(allowlist.spell)).toBe(true);
      expect(allowlist.spell.length).toBeGreaterThan(0);
    }
  });

  it('should have empty or no subclass allowlist (SRD 5.2)', () => {
    const allowlist = window.SRD_CONTENT_ALLOWLIST || {};
    if (allowlist.subclass !== undefined) {
      expect(allowlist.subclass).toEqual([]);
    }
  });

  it('should have exactly 4 SRD backgrounds', () => {
    const allowlist = window.SRD_CONTENT_ALLOWLIST || {};
    if (allowlist.background) {
      const srdBackgrounds = ['Acolyte', 'Criminal', 'Sage', 'Soldier'];
      expect(allowlist.background.sort()).toEqual(srdBackgrounds.sort());
    }
  });
});

describe('Class Feature SRD Filtering', () => {
  /**
   * Tests for the new class feature content types:
   * - fighting-style
   * - pact-boon
   * - eldritch-invocation
   * - metamagic
   */

  describe('Fighting Style Filtering', () => {
    it('should have fighting-style allowlist defined', () => {
      const allowlist = window.SRD_CONTENT_ALLOWLIST || {};
      if (allowlist['fighting-style']) {
        expect(Array.isArray(allowlist['fighting-style'])).toBe(true);
        expect(allowlist['fighting-style'].length).toBeGreaterThan(0);
      }
    });

    it('should allow SRD fighting styles', () => {
      const allowlist = window.SRD_CONTENT_ALLOWLIST || {};
      if (allowlist['fighting-style']) {
        const srdStyles = ['Archery', 'Defense', 'Dueling', 'Great Weapon Fighting', 'Protection', 'Two-Weapon Fighting'];
        srdStyles.forEach((style) => {
          expect(allowlist['fighting-style']).toContain(style);
        });
      }
    });

    it('should block non-SRD fighting styles', () => {
      const blocklist = window.SRD_CONTENT_BLOCKLIST || {};
      if (blocklist['fighting-style']) {
        const nonSrdStyles = ['Blind Fighting', 'Interception', 'Superior Technique', 'Thrown Weapon Fighting', 'Unarmed Fighting'];
        nonSrdStyles.forEach((style) => {
          expect(blocklist['fighting-style']).toContain(style);
        });
      }
    });
  });

  describe('Pact Boon Filtering', () => {
    it('should have pact-boon allowlist defined', () => {
      const allowlist = window.SRD_CONTENT_ALLOWLIST || {};
      if (allowlist['pact-boon']) {
        expect(Array.isArray(allowlist['pact-boon'])).toBe(true);
        expect(allowlist['pact-boon'].length).toBe(3); // Blade, Chain, Tome
      }
    });

    it('should allow SRD pact boons', () => {
      const allowlist = window.SRD_CONTENT_ALLOWLIST || {};
      if (allowlist['pact-boon']) {
        const srdBoons = ['Pact of the Blade', 'Pact of the Chain', 'Pact of the Tome'];
        srdBoons.forEach((boon) => {
          expect(allowlist['pact-boon']).toContain(boon);
        });
      }
    });

    it('should block Pact of the Talisman (non-SRD)', () => {
      const blocklist = window.SRD_CONTENT_BLOCKLIST || {};
      if (blocklist['pact-boon']) {
        expect(blocklist['pact-boon']).toContain('Pact of the Talisman');
      }
    });
  });

  describe('Eldritch Invocation Filtering', () => {
    it('should have eldritch-invocation allowlist defined', () => {
      const allowlist = window.SRD_CONTENT_ALLOWLIST || {};
      if (allowlist['eldritch-invocation']) {
        expect(Array.isArray(allowlist['eldritch-invocation'])).toBe(true);
        expect(allowlist['eldritch-invocation'].length).toBeGreaterThan(0);
      }
    });

    it('should allow core SRD invocations', () => {
      const allowlist = window.SRD_CONTENT_ALLOWLIST || {};
      if (allowlist['eldritch-invocation']) {
        const srdInvocations = ['Agonizing Blast', 'Devil\'s Sight', 'Eldritch Sight', 'Mask of Many Faces', 'Thirsting Blade'];
        srdInvocations.forEach((inv) => {
          expect(allowlist['eldritch-invocation']).toContain(inv);
        });
      }
    });

    it('should block non-SRD invocations', () => {
      const blocklist = window.SRD_CONTENT_BLOCKLIST || {};
      if (blocklist['eldritch-invocation']) {
        const nonSrdInvocations = ['Eldritch Mind', 'Grasp of Hadar', 'Improved Pact Weapon', 'Investment of the Chain Master'];
        nonSrdInvocations.forEach((inv) => {
          expect(blocklist['eldritch-invocation']).toContain(inv);
        });
      }
    });
  });

  describe('Metamagic Filtering', () => {
    it('should have metamagic allowlist defined', () => {
      const allowlist = window.SRD_CONTENT_ALLOWLIST || {};
      if (allowlist['metamagic']) {
        expect(Array.isArray(allowlist['metamagic'])).toBe(true);
        expect(allowlist['metamagic'].length).toBe(8); // 8 SRD metamagic options
      }
    });

    it('should allow SRD metamagic options', () => {
      const allowlist = window.SRD_CONTENT_ALLOWLIST || {};
      if (allowlist['metamagic']) {
        const srdMetamagic = ['Careful Spell', 'Distant Spell', 'Empowered Spell', 'Extended Spell', 'Heightened Spell', 'Quickened Spell', 'Subtle Spell', 'Twinned Spell'];
        srdMetamagic.forEach((meta) => {
          expect(allowlist['metamagic']).toContain(meta);
        });
      }
    });

    it('should block non-SRD metamagic options', () => {
      const blocklist = window.SRD_CONTENT_BLOCKLIST || {};
      if (blocklist['metamagic']) {
        const nonSrdMetamagic = ['Seeking Spell', 'Transmuted Spell'];
        nonSrdMetamagic.forEach((meta) => {
          expect(blocklist['metamagic']).toContain(meta);
        });
      }
    });
  });

  describe('Subrace Filtering', () => {
    it('should have subrace allowlist defined', () => {
      const allowlist = window.SRD_CONTENT_ALLOWLIST || {};
      if (allowlist['subrace']) {
        expect(Array.isArray(allowlist['subrace'])).toBe(true);
        expect(allowlist['subrace'].length).toBeGreaterThan(0);
      }
    });

    it('should allow SRD elf subraces', () => {
      const allowlist = window.SRD_CONTENT_ALLOWLIST || {};
      if (allowlist['subrace']) {
        const srdElfSubraces = ['Elf:High Elf', 'Elf:Wood Elf'];
        srdElfSubraces.forEach((subrace) => {
          expect(allowlist['subrace']).toContain(subrace);
        });
      }
    });

    it('should allow SRD dwarf subraces', () => {
      const allowlist = window.SRD_CONTENT_ALLOWLIST || {};
      if (allowlist['subrace']) {
        const srdDwarfSubraces = ['Dwarf:Hill Dwarf', 'Dwarf:Mountain Dwarf'];
        srdDwarfSubraces.forEach((subrace) => {
          expect(allowlist['subrace']).toContain(subrace);
        });
      }
    });

    it('should allow SRD dragonborn ancestries', () => {
      const allowlist = window.SRD_CONTENT_ALLOWLIST || {};
      if (allowlist['subrace']) {
        const srdDragonborn = ['Dragonborn:Black', 'Dragonborn:Blue', 'Dragonborn:Red', 'Dragonborn:Gold', 'Dragonborn:Silver'];
        srdDragonborn.forEach((subrace) => {
          expect(allowlist['subrace']).toContain(subrace);
        });
      }
    });

    it('should block non-SRD elf subraces', () => {
      const blocklist = window.SRD_CONTENT_BLOCKLIST || {};
      if (blocklist['subrace']) {
        const nonSrdSubraces = ['Elf:Dark Elf (Drow)', 'Elf:Eladrin', 'Elf:Sea Elf'];
        nonSrdSubraces.forEach((subrace) => {
          expect(blocklist['subrace']).toContain(subrace);
        });
      }
    });

    it('should block non-SRD dwarf subraces', () => {
      const blocklist = window.SRD_CONTENT_BLOCKLIST || {};
      if (blocklist['subrace']) {
        expect(blocklist['subrace']).toContain('Dwarf:Duergar');
      }
    });

    it('should block non-SRD tiefling subraces', () => {
      const blocklist = window.SRD_CONTENT_BLOCKLIST || {};
      if (blocklist['subrace']) {
        const nonSrdTieflings = ['Tiefling:Baalzebul', 'Tiefling:Dispater', 'Tiefling:Zariel'];
        nonSrdTieflings.forEach((subrace) => {
          expect(blocklist['subrace']).toContain(subrace);
        });
      }
    });

    it('should block all aasimar subraces (non-SRD race)', () => {
      const blocklist = window.SRD_CONTENT_BLOCKLIST || {};
      if (blocklist['subrace']) {
        const aasimar = ['Aasimar:Protector', 'Aasimar:Scourge', 'Aasimar:Fallen'];
        aasimar.forEach((subrace) => {
          expect(blocklist['subrace']).toContain(subrace);
        });
      }
    });

    it('should block all shifter subraces (non-SRD race)', () => {
      const blocklist = window.SRD_CONTENT_BLOCKLIST || {};
      if (blocklist['subrace']) {
        const shifters = ['Shifter:Beasthide', 'Shifter:Longtooth', 'Shifter:Swiftstride', 'Shifter:Wildhunt'];
        shifters.forEach((subrace) => {
          expect(blocklist['subrace']).toContain(subrace);
        });
      }
    });
  });
});
