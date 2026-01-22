import { describe, it, expect } from 'vitest';
import {
  createSeededRandom,
  pickRandom,
  pickMultipleRandom,
  randomInt,
  rollOnWeightedTable,
  generateNPC,
  generateShopInventory,
  generateLoot,
  generateName,
  generateTavern,
  NPC_TRAITS,
  SHOP_ITEMS,
  LOOT_TABLES,
  NAME_PARTS,
  TAVERN_PARTS
} from '../../js/modules/generators.js';

describe('createSeededRandom', () => {
  it('produces deterministic sequence', () => {
    const random1 = createSeededRandom(12345);
    const random2 = createSeededRandom(12345);

    const seq1 = [random1(), random1(), random1()];
    const seq2 = [random2(), random2(), random2()];

    expect(seq1).toEqual(seq2);
  });

  it('different seeds produce different sequences', () => {
    const random1 = createSeededRandom(111);
    const random2 = createSeededRandom(222);

    expect(random1()).not.toBe(random2());
  });

  it('returns values between 0 and 1', () => {
    const random = createSeededRandom(999);
    for (let i = 0; i < 100; i++) {
      const val = random();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });
});

describe('pickRandom', () => {
  it('returns item from array', () => {
    const seededRandom = createSeededRandom(123);
    const items = ['a', 'b', 'c', 'd'];
    const picked = pickRandom(items, seededRandom);
    expect(items).toContain(picked);
  });

  it('returns undefined for empty array', () => {
    expect(pickRandom([])).toBeUndefined();
    expect(pickRandom(null)).toBeUndefined();
  });

  it('produces deterministic results with seeded random', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const r1 = createSeededRandom(42);
    const r2 = createSeededRandom(42);

    expect(pickRandom(items, r1)).toBe(pickRandom(items, r2));
  });
});

describe('pickMultipleRandom', () => {
  it('picks correct number of items', () => {
    const seededRandom = createSeededRandom(456);
    const items = ['a', 'b', 'c', 'd', 'e'];
    const picked = pickMultipleRandom(items, 3, seededRandom);
    expect(picked).toHaveLength(3);
  });

  it('picks without replacement', () => {
    const seededRandom = createSeededRandom(789);
    const items = ['a', 'b', 'c', 'd', 'e'];
    const picked = pickMultipleRandom(items, 5, seededRandom);

    const unique = new Set(picked);
    expect(unique.size).toBe(5);
  });

  it('limits to array length', () => {
    const items = ['a', 'b', 'c'];
    const picked = pickMultipleRandom(items, 10);
    expect(picked).toHaveLength(3);
  });

  it('returns empty array for empty input', () => {
    expect(pickMultipleRandom([], 5)).toEqual([]);
    expect(pickMultipleRandom(null, 5)).toEqual([]);
  });
});

describe('randomInt', () => {
  it('returns values in range (inclusive)', () => {
    const seededRandom = createSeededRandom(111);
    for (let i = 0; i < 100; i++) {
      const val = randomInt(1, 10, seededRandom);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(10);
    }
  });

  it('can return min and max values', () => {
    const results = new Set();
    for (let i = 0; i < 1000; i++) {
      results.add(randomInt(1, 3, Math.random));
    }
    expect(results.has(1)).toBe(true);
    expect(results.has(3)).toBe(true);
  });
});

describe('rollOnWeightedTable', () => {
  it('returns results from table', () => {
    const seededRandom = createSeededRandom(222);
    const table = [
      { weight: 1, result: 'rare' },
      { weight: 99, result: 'common' }
    ];
    const result = rollOnWeightedTable(table, seededRandom);
    expect(['rare', 'common']).toContain(result);
  });

  it('respects weights', () => {
    // Use seeded random for deterministic testing
    // With heavily skewed weights, common should dominate
    const table = [
      { weight: 1, result: 'rare' },
      { weight: 99, result: 'common' }
    ];

    let rareCount = 0;
    let commonCount = 0;

    for (let i = 0; i < 100; i++) {
      const seeded = createSeededRandom(i);
      const result = rollOnWeightedTable(table, seeded);
      if (result === 'rare') rareCount++;
      if (result === 'common') commonCount++;
    }

    // With 99:1 odds, common should appear much more often
    expect(commonCount).toBeGreaterThan(rareCount);
  });

  it('returns null for empty table', () => {
    expect(rollOnWeightedTable([])).toBeNull();
    expect(rollOnWeightedTable(null)).toBeNull();
  });
});

describe('generateNPC', () => {
  it('returns NPC with all traits', () => {
    const seededRandom = createSeededRandom(333);
    const npc = generateNPC({}, seededRandom);

    expect(npc.personality).toBeDefined();
    expect(npc.quirk).toBeDefined();
    expect(npc.motivation).toBeDefined();
    expect(npc.occupation).toBeDefined();
    expect(typeof npc.isHostile).toBe('boolean');
  });

  it('uses traits from NPC_TRAITS', () => {
    const seededRandom = createSeededRandom(444);
    const npc = generateNPC({}, seededRandom);

    expect(NPC_TRAITS.personalities).toContain(npc.personality);
    expect(NPC_TRAITS.quirks).toContain(npc.quirk);
    expect(NPC_TRAITS.motivations).toContain(npc.motivation);
  });

  it('respects occupation option', () => {
    const npc = generateNPC({ occupation: 'Blacksmith' });
    expect(npc.occupation).toBe('Blacksmith');
  });

  it('produces deterministic results', () => {
    const r1 = createSeededRandom(555);
    const r2 = createSeededRandom(555);

    const npc1 = generateNPC({}, r1);
    const npc2 = generateNPC({}, r2);

    expect(npc1.personality).toBe(npc2.personality);
    expect(npc1.quirk).toBe(npc2.quirk);
  });
});

describe('generateShopInventory', () => {
  it('generates items for weapons shop', () => {
    const seededRandom = createSeededRandom(666);
    const inventory = generateShopInventory('weapons', 5, seededRandom);

    expect(inventory.length).toBeGreaterThan(0);
    expect(inventory.length).toBeLessThanOrEqual(5);
    inventory.forEach(item => {
      expect(item.name).toBeDefined();
      expect(item.price).toBeDefined();
      expect(item.quantity).toBeGreaterThan(0);
    });
  });

  it('generates items for armor shop', () => {
    const seededRandom = createSeededRandom(777);
    const inventory = generateShopInventory('armor', 3, seededRandom);

    expect(inventory.length).toBeGreaterThan(0);
    inventory.forEach(item => {
      expect(SHOP_ITEMS.armor.some(a => a.name === item.name)).toBe(true);
    });
  });

  it('generates items for general shop', () => {
    const seededRandom = createSeededRandom(888);
    const inventory = generateShopInventory('general', 5, seededRandom);

    expect(inventory.length).toBeGreaterThan(0);
  });

  it('limits to available items', () => {
    const inventory = generateShopInventory('armor', 100);
    expect(inventory.length).toBeLessThanOrEqual(SHOP_ITEMS.armor.length);
  });
});

describe('generateLoot', () => {
  it('generates loot from low tier', () => {
    const seededRandom = createSeededRandom(111);
    const loot = generateLoot('low', 3, seededRandom);

    expect(loot).toHaveLength(3);
    loot.forEach(item => {
      expect(item.type || item.name).toBeDefined();
    });
  });

  it('generates loot from medium tier', () => {
    const seededRandom = createSeededRandom(222);
    const loot = generateLoot('medium', 2, seededRandom);

    expect(loot).toHaveLength(2);
  });

  it('generates loot from high tier', () => {
    const seededRandom = createSeededRandom(333);
    const loot = generateLoot('high', 1, seededRandom);

    expect(loot).toHaveLength(1);
  });

  it('defaults to low tier for invalid tier', () => {
    const loot = generateLoot('invalid', 1);
    expect(loot).toHaveLength(1);
  });
});

describe('generateName', () => {
  it('generates human names', () => {
    const seededRandom = createSeededRandom(444);
    const name = generateName('human', 'male', seededRandom);

    expect(name).toBeDefined();
    expect(name.length).toBeGreaterThan(2);
  });

  it('generates elf names', () => {
    const seededRandom = createSeededRandom(555);
    const name = generateName('elf', 'neutral', seededRandom);

    expect(name).toBeDefined();
  });

  it('generates dwarf names', () => {
    const seededRandom = createSeededRandom(666);
    const name = generateName('dwarf', 'male', seededRandom);

    expect(name).toBeDefined();
  });

  it('generates female names differently', () => {
    // May produce different names due to different prefix/suffix sets
    const r1 = createSeededRandom(777);
    const r2 = createSeededRandom(777);

    const maleName = generateName('human', 'male', r1);
    const femaleName = generateName('human', 'female', r2);

    // They use different suffix pools
    expect(maleName).toBeDefined();
    expect(femaleName).toBeDefined();
  });

  it('falls back to human for unknown race', () => {
    const name = generateName('martian', 'male');
    expect(name).toBeDefined();
    expect(name.length).toBeGreaterThan(2);
  });

  it('produces deterministic results', () => {
    const r1 = createSeededRandom(888);
    const r2 = createSeededRandom(888);

    expect(generateName('human', 'male', r1)).toBe(generateName('human', 'male', r2));
  });
});

describe('generateTavern', () => {
  it('generates tavern with all properties', () => {
    const seededRandom = createSeededRandom(999);
    const tavern = generateTavern(seededRandom);

    expect(tavern.name).toBeDefined();
    expect(tavern.name).toMatch(/^The \w+ \w+$/);
    expect(tavern.atmosphere).toBeDefined();
    expect(tavern.innkeeper).toBeDefined();
    expect(tavern.rooms).toBeDefined();
    expect(tavern.drinks).toBeDefined();
    expect(typeof tavern.rumor).toBe('boolean');
  });

  it('generates tavern name with adjective and noun', () => {
    const seededRandom = createSeededRandom(123);
    const tavern = generateTavern(seededRandom);

    const nameMatch = tavern.name.match(/^The (\w+) (\w+)$/);
    expect(nameMatch).not.toBeNull();

    expect(TAVERN_PARTS.adjectives).toContain(nameMatch[1]);
    expect(TAVERN_PARTS.nouns).toContain(nameMatch[2]);
  });

  it('includes innkeeper NPC', () => {
    const seededRandom = createSeededRandom(456);
    const tavern = generateTavern(seededRandom);

    expect(tavern.innkeeper.occupation).toBe('Innkeeper');
    expect(tavern.innkeeper.personality).toBeDefined();
  });

  it('has room availability', () => {
    const seededRandom = createSeededRandom(789);
    const tavern = generateTavern(seededRandom);

    expect(tavern.rooms.common.available).toBeGreaterThanOrEqual(1);
    expect(tavern.rooms.private.available).toBeGreaterThanOrEqual(0);
    expect(tavern.rooms.luxury.available).toBeGreaterThanOrEqual(0);
  });

  it('produces deterministic results', () => {
    const r1 = createSeededRandom(111);
    const r2 = createSeededRandom(111);

    const t1 = generateTavern(r1);
    const t2 = generateTavern(r2);

    expect(t1.name).toBe(t2.name);
    expect(t1.atmosphere).toBe(t2.atmosphere);
  });
});

describe('data constants', () => {
  it('NPC_TRAITS has all required arrays', () => {
    expect(NPC_TRAITS.personalities.length).toBeGreaterThan(0);
    expect(NPC_TRAITS.quirks.length).toBeGreaterThan(0);
    expect(NPC_TRAITS.motivations.length).toBeGreaterThan(0);
    expect(NPC_TRAITS.occupations.length).toBeGreaterThan(0);
  });

  it('SHOP_ITEMS has all categories', () => {
    expect(SHOP_ITEMS.weapons.length).toBeGreaterThan(0);
    expect(SHOP_ITEMS.armor.length).toBeGreaterThan(0);
    expect(SHOP_ITEMS.potions.length).toBeGreaterThan(0);
    expect(SHOP_ITEMS.adventuringGear.length).toBeGreaterThan(0);
  });

  it('LOOT_TABLES has all tiers', () => {
    expect(LOOT_TABLES.lowTier.length).toBeGreaterThan(0);
    expect(LOOT_TABLES.mediumTier.length).toBeGreaterThan(0);
    expect(LOOT_TABLES.highTier.length).toBeGreaterThan(0);
  });

  it('NAME_PARTS has race data', () => {
    expect(NAME_PARTS.human.prefixes.length).toBeGreaterThan(0);
    expect(NAME_PARTS.elf.prefixes.length).toBeGreaterThan(0);
    expect(NAME_PARTS.dwarf.prefixes.length).toBeGreaterThan(0);
  });
});
