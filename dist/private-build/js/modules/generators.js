/**
 * Generators Module
 * Pure functions for random content generation
 * Uses dependency injection for randomness (testability)
 */

/**
 * Create a seeded random number generator
 * Linear Congruential Generator for deterministic sequences
 * @param {number} seed - Seed value
 * @returns {function} - Random function returning 0-1
 */
export function createSeededRandom(seed) {
  let state = seed;
  return function() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Pick a random item from an array
 * @param {Array} array - Array to pick from
 * @param {function} randomFn - Random function (0-1)
 * @returns {*} - Random item or undefined if empty
 */
export function pickRandom(array, randomFn = Math.random) {
  if (!Array.isArray(array) || array.length === 0) return undefined;
  const index = Math.floor(randomFn() * array.length);
  return array[index];
}

/**
 * Pick multiple random items from an array (without replacement)
 * @param {Array} array - Array to pick from
 * @param {number} count - Number of items to pick
 * @param {function} randomFn - Random function
 * @returns {Array} - Array of picked items
 */
export function pickMultipleRandom(array, count, randomFn = Math.random) {
  if (!Array.isArray(array) || array.length === 0) return [];
  const available = [...array];
  const picked = [];
  const numToPick = Math.min(count, available.length);

  for (let i = 0; i < numToPick; i++) {
    const index = Math.floor(randomFn() * available.length);
    picked.push(available.splice(index, 1)[0]);
  }

  return picked;
}

/**
 * Generate a random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {function} randomFn - Random function
 * @returns {number} - Random integer
 */
export function randomInt(min, max, randomFn = Math.random) {
  return Math.floor(randomFn() * (max - min + 1)) + min;
}

/**
 * Roll on a weighted table
 * @param {Array} table - Array of {weight, result} objects
 * @param {function} randomFn - Random function
 * @returns {*} - Result from table
 */
export function rollOnWeightedTable(table, randomFn = Math.random) {
  if (!Array.isArray(table) || table.length === 0) return null;

  const totalWeight = table.reduce((sum, item) => sum + (item.weight || 1), 0);
  let roll = randomFn() * totalWeight;

  for (const item of table) {
    roll -= item.weight || 1;
    if (roll <= 0) {
      return item.result;
    }
  }

  return table[table.length - 1].result;
}

// ============================================================
// NPC Generation
// ============================================================

export const NPC_TRAITS = {
  personalities: [
    'Brave', 'Cowardly', 'Greedy', 'Generous', 'Honest', 'Deceitful',
    'Calm', 'Hot-tempered', 'Cheerful', 'Melancholic', 'Curious', 'Suspicious',
    'Friendly', 'Hostile', 'Ambitious', 'Lazy', 'Loyal', 'Treacherous'
  ],
  quirks: [
    'Always hums', 'Stutters when nervous', 'Uses big words incorrectly',
    'Laughs at inappropriate times', 'Constantly fidgets', 'Speaks in third person',
    'Has a nervous tic', 'Always eating something', 'Overly formal',
    'Uses lots of hand gestures', 'Whispers secrets', 'Repeats themselves'
  ],
  motivations: [
    'Wealth', 'Power', 'Knowledge', 'Revenge', 'Love', 'Fame',
    'Freedom', 'Justice', 'Family', 'Adventure', 'Peace', 'Redemption'
  ],
  occupations: [
    'Merchant', 'Guard', 'Farmer', 'Blacksmith', 'Innkeeper', 'Scholar',
    'Priest', 'Sailor', 'Hunter', 'Miner', 'Noble', 'Beggar',
    'Thief', 'Soldier', 'Healer', 'Entertainer', 'Craftsman', 'Cook'
  ]
};

/**
 * Generate a random NPC
 * @param {Object} options - Generation options
 * @param {function} randomFn - Random function
 * @returns {Object} - Generated NPC data
 */
export function generateNPC(options = {}, randomFn = Math.random) {
  return {
    personality: pickRandom(NPC_TRAITS.personalities, randomFn),
    quirk: pickRandom(NPC_TRAITS.quirks, randomFn),
    motivation: pickRandom(NPC_TRAITS.motivations, randomFn),
    occupation: options.occupation || pickRandom(NPC_TRAITS.occupations, randomFn),
    isHostile: options.isHostile ?? randomFn() < 0.2 // 20% chance hostile
  };
}

// ============================================================
// Shop Inventory Generation
// ============================================================

export const SHOP_ITEMS = {
  weapons: [
    { name: 'Dagger', price: 2, weight: 1 },
    { name: 'Shortsword', price: 10, weight: 2 },
    { name: 'Longsword', price: 15, weight: 3 },
    { name: 'Greataxe', price: 30, weight: 7 },
    { name: 'Longbow', price: 50, weight: 2 },
    { name: 'Crossbow', price: 25, weight: 5 }
  ],
  armor: [
    { name: 'Leather Armor', price: 10, weight: 10, ac: 11 },
    { name: 'Chain Shirt', price: 50, weight: 20, ac: 13 },
    { name: 'Chain Mail', price: 75, weight: 55, ac: 16 },
    { name: 'Plate Armor', price: 1500, weight: 65, ac: 18 },
    { name: 'Shield', price: 10, weight: 6, ac: 2 }
  ],
  potions: [
    { name: 'Potion of Healing', price: 50, effect: '2d4+2 HP' },
    { name: 'Potion of Greater Healing', price: 150, effect: '4d4+4 HP' },
    { name: 'Antitoxin', price: 50, effect: 'Advantage vs poison' },
    { name: 'Potion of Climbing', price: 75, effect: 'Climb speed for 1 hour' }
  ],
  adventuringGear: [
    { name: 'Rope (50 ft)', price: 1, weight: 10 },
    { name: 'Torch', price: 0.01, weight: 1 },
    { name: 'Rations (1 day)', price: 0.5, weight: 2 },
    { name: 'Bedroll', price: 1, weight: 7 },
    { name: 'Backpack', price: 2, weight: 5 },
    { name: 'Lantern', price: 5, weight: 2 }
  ]
};

/**
 * Generate shop inventory
 * @param {string} shopType - Type of shop (weapons, armor, potions, general)
 * @param {number} itemCount - Number of items to stock
 * @param {function} randomFn - Random function
 * @returns {Array} - Array of items with quantities
 */
export function generateShopInventory(shopType, itemCount = 10, randomFn = Math.random) {
  let itemPool = [];

  switch (shopType) {
    case 'weapons':
      itemPool = SHOP_ITEMS.weapons;
      break;
    case 'armor':
      itemPool = SHOP_ITEMS.armor;
      break;
    case 'potions':
      itemPool = SHOP_ITEMS.potions;
      break;
    case 'general':
    default:
      itemPool = [
        ...SHOP_ITEMS.adventuringGear,
        ...SHOP_ITEMS.potions.slice(0, 2) // Basic healing potions
      ];
  }

  const inventory = [];
  const usedItems = new Set();

  for (let i = 0; i < Math.min(itemCount, itemPool.length); i++) {
    let item;
    let attempts = 0;

    do {
      item = pickRandom(itemPool, randomFn);
      attempts++;
    } while (usedItems.has(item.name) && attempts < 20);

    if (!usedItems.has(item.name)) {
      usedItems.add(item.name);
      inventory.push({
        ...item,
        quantity: randomInt(1, 5, randomFn),
        inStock: true
      });
    }
  }

  return inventory;
}

// ============================================================
// Loot Generation
// ============================================================

export const LOOT_TABLES = {
  lowTier: [
    { weight: 30, result: { type: 'coins', amount: '2d6', currency: 'cp' } },
    { weight: 25, result: { type: 'coins', amount: '1d6', currency: 'sp' } },
    { weight: 20, result: { type: 'coins', amount: '1d4', currency: 'gp' } },
    { weight: 15, result: { type: 'item', category: 'adventuringGear' } },
    { weight: 10, result: { type: 'item', category: 'potions' } }
  ],
  mediumTier: [
    { weight: 20, result: { type: 'coins', amount: '4d6', currency: 'gp' } },
    { weight: 20, result: { type: 'coins', amount: '2d6', currency: 'gp' } },
    { weight: 25, result: { type: 'item', category: 'weapons' } },
    { weight: 20, result: { type: 'item', category: 'armor' } },
    { weight: 15, result: { type: 'item', category: 'potions' } }
  ],
  highTier: [
    { weight: 30, result: { type: 'coins', amount: '6d6 x 10', currency: 'gp' } },
    { weight: 25, result: { type: 'coins', amount: '2d6 x 100', currency: 'gp' } },
    { weight: 20, result: { type: 'item', category: 'armor', quality: 'masterwork' } },
    { weight: 15, result: { type: 'item', category: 'weapons', quality: 'masterwork' } },
    { weight: 10, result: { type: 'gems', amount: '1d4', value: '50gp each' } }
  ]
};

/**
 * Generate loot from a tier
 * @param {string} tier - Loot tier (low, medium, high)
 * @param {number} rolls - Number of items to generate
 * @param {function} randomFn - Random function
 * @returns {Array} - Array of loot items
 */
export function generateLoot(tier = 'low', rolls = 1, randomFn = Math.random) {
  const tableKey = `${tier}Tier`;
  const table = LOOT_TABLES[tableKey] || LOOT_TABLES.lowTier;

  const loot = [];

  for (let i = 0; i < rolls; i++) {
    const result = rollOnWeightedTable(table, randomFn);

    if (result.type === 'item') {
      const category = result.category;
      const items = SHOP_ITEMS[category];
      if (items && items.length > 0) {
        const item = pickRandom(items, randomFn);
        loot.push({
          ...item,
          quality: result.quality || 'standard'
        });
      }
    } else {
      loot.push({ ...result });
    }
  }

  return loot;
}

// ============================================================
// Name Generation
// ============================================================

export const NAME_PARTS = {
  human: {
    prefixes: ['Al', 'Bran', 'Cor', 'Dar', 'Ed', 'Gar', 'Hal', 'Jar', 'Kel', 'Mal'],
    suffixes: ['ric', 'mund', 'win', 'dan', 'son', 'ard', 'bert', 'ward', 'ton', 'vin'],
    femPrefixes: ['Al', 'Bri', 'Cel', 'El', 'Gwen', 'Isa', 'Lil', 'Mir', 'Ros', 'Sar'],
    femSuffixes: ['ana', 'elle', 'ina', 'ara', 'wen', 'ith', 'ia', 'ora', 'yne', 'eth']
  },
  elf: {
    prefixes: ['Ael', 'Cel', 'Fae', 'Gal', 'Ith', 'Lith', 'Mel', 'Sil', 'Thal', 'Vel'],
    suffixes: ['orn', 'ion', 'ael', 'iel', 'oth', 'uin', 'wen', 'ril', 'las', 'dir']
  },
  dwarf: {
    prefixes: ['Bor', 'Dur', 'Gim', 'Kaz', 'Mor', 'Thor', 'Bael', 'Dor', 'Gron', 'Krag'],
    suffixes: ['in', 'din', 'li', 'ri', 'grim', 'gar', 'dur', 'rek', 'mir', 'brek']
  }
};

/**
 * Generate a random name
 * @param {string} race - Race for name style
 * @param {string} gender - 'male', 'female', or 'neutral'
 * @param {function} randomFn - Random function
 * @returns {string} - Generated name
 */
export function generateName(race = 'human', gender = 'neutral', randomFn = Math.random) {
  const raceData = NAME_PARTS[race.toLowerCase()] || NAME_PARTS.human;

  let prefixes = raceData.prefixes;
  let suffixes = raceData.suffixes;

  if (gender === 'female' && raceData.femPrefixes) {
    prefixes = raceData.femPrefixes;
    suffixes = raceData.femSuffixes || raceData.suffixes;
  }

  const prefix = pickRandom(prefixes, randomFn);
  const suffix = pickRandom(suffixes, randomFn);

  return prefix + suffix;
}

// ============================================================
// Tavern Generation
// ============================================================

export const TAVERN_PARTS = {
  adjectives: ['Golden', 'Silver', 'Rusty', 'Prancing', 'Sleeping', 'Dancing', 'Drunken', 'Lucky', 'Winding', 'Broken'],
  nouns: ['Dragon', 'Griffin', 'Pony', 'Giant', 'Sword', 'Shield', 'Crown', 'Stag', 'Raven', 'Bear'],
  atmospheres: ['Rowdy', 'Quiet', 'Mysterious', 'Welcoming', 'Shady', 'Luxurious', 'Run-down', 'Cozy']
};

/**
 * Generate a tavern
 * @param {function} randomFn - Random function
 * @returns {Object} - Tavern data
 */
export function generateTavern(randomFn = Math.random) {
  const adj = pickRandom(TAVERN_PARTS.adjectives, randomFn);
  const noun = pickRandom(TAVERN_PARTS.nouns, randomFn);

  return {
    name: `The ${adj} ${noun}`,
    atmosphere: pickRandom(TAVERN_PARTS.atmospheres, randomFn),
    innkeeper: generateNPC({ occupation: 'Innkeeper' }, randomFn),
    rooms: {
      common: { price: 0.5, available: randomInt(1, 6, randomFn) },
      private: { price: 2, available: randomInt(0, 4, randomFn) },
      luxury: { price: 8, available: randomInt(0, 2, randomFn) }
    },
    drinks: [
      { name: 'Ale', price: 0.04 },
      { name: 'Wine', price: 0.2 },
      { name: 'Mead', price: 0.1 }
    ],
    rumor: randomFn() > 0.5 // 50% chance of having a rumor
  };
}
