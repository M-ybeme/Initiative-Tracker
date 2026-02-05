# Phase 3.9 Test Plans — SRD 5.2 Filtering

## 3.9.3a — Manual QA Test Plan

### Prerequisites
- Fresh browser session (clear localStorage/IndexedDB or use incognito)
- No content packs loaded
- Console open (F12) to monitor for errors

---

### Test 1: Character Creation Wizard — Race Selection

**Steps:**
1. Navigate to `characters.html`
2. Click "Create New Character" or trigger the creation wizard
3. Proceed to the Race selection step

**Expected Results:**
| Should See (SRD 5.2) | Should NOT See (Non-SRD) |
|----------------------|--------------------------|
| Dragonborn | Aarakocra |
| Dwarf | Aasimar |
| Elf | Bugbear |
| Gnome | Firbolg |
| Goliath | Genasi (any) |
| Halfling | Goblin |
| Human | Half-Elf |
| Orc | Half-Orc |
| Tiefling | Hobgoblin |
| | Kenku, Kobold, etc. |

**Pass Criteria:** Only 9 SRD species visible; non-SRD races hidden or show "Requires content pack" notice

---

### Test 2: Character Creation Wizard — Class Selection

**Steps:**
1. Continue wizard to Class selection step

**Expected Results:**
| Should See (SRD 5.2) | Should NOT See |
|----------------------|----------------|
| Barbarian | Artificer |
| Bard | |
| Cleric | |
| Druid | |
| Fighter | |
| Monk | |
| Paladin | |
| Ranger | |
| Rogue | |
| Sorcerer | |
| Warlock | |
| Wizard | |

**Pass Criteria:** All 12 core classes visible; Artificer hidden

---

### Test 3: Character Creation Wizard — Background Selection

**Steps:**
1. Continue wizard to Background selection step

**Expected Results:**
| Should See (SRD 5.2) | Should NOT See |
|----------------------|----------------|
| Acolyte | Charlatan |
| Criminal | Entertainer |
| Sage | Folk Hero |
| Soldier | Guild Artisan |
| | Hermit |
| | Noble |
| | Outlander |
| | Sailor |
| | Urchin |

**Pass Criteria:** Only 4 SRD backgrounds visible

---

### Test 4: Character Creation Wizard — Subclass Selection

**Steps:**
1. Create a character that reaches subclass selection (e.g., Cleric at level 1)
2. Observe subclass options

**Expected Results:**
- Subclass dropdown should either:
  - Show NO options (empty, with notice about content packs), OR
  - Be hidden entirely with explanatory text
- NO domain spells should be pre-populated

**Pass Criteria:** Zero subclasses selectable in SRD-only mode

---

### Test 5: Character Page — Spell Search

**Steps:**
1. Create or load a spellcasting character (e.g., Wizard)
2. Open spell search/add spell interface
3. Search for: `Fireball`
4. Search for: `Hex`
5. Search for: `Conjure Animals`
6. Search for: `Ice Knife`

**Expected Results:**
| Search Term | Should Find? | Reason |
|-------------|--------------|--------|
| Fireball | ✅ Yes | SRD spell |
| Hex | ❌ No | Non-SRD (PHB only) |
| Conjure Animals | ✅ Yes | SRD 5.2 spell (was blocked) |
| Ice Knife | ✅ Yes | SRD 5.2 spell (was blocked) |
| Eldritch Blast | ✅ Yes | SRD cantrip |
| Booming Blade | ❌ No | SCAG/Tasha's only |

**Pass Criteria:** Only SRD spells appear in search results

---

### Test 6: Character Page — Spell Search After Page Load

**Steps:**
1. Hard refresh the character page (Ctrl+Shift+R)
2. Immediately open spell search
3. Search for `Hex` (non-SRD spell)

**Expected Results:**
- `Hex` should NOT appear
- This tests the timing fix in `getAllSpells()`

**Pass Criteria:** Non-SRD spells filtered even on fresh page load

---

### Test 7: Initiative Page — Spell Reference Modal

**Steps:**
1. Navigate to `initiative.html`
2. Open the Spells reference panel/modal
3. Browse spell list or search for spells
4. Search for: `Fireball` (SRD)
5. Search for: `Hex` (non-SRD)
6. Search for: `Catapult` (was blocked, now SRD)

**Expected Results:**
| Search Term | Should Find? |
|-------------|--------------|
| Fireball | ✅ Yes |
| Hex | ❌ No |
| Catapult | ✅ Yes |
| Shield | ✅ Yes |
| Shadow Blade | ❌ No |

**Pass Criteria:** Initiative spell list shows only SRD spells

---

### Test 8: Level-Up System — Spell Learning

**Steps:**
1. Create a level 1 Wizard
2. Trigger level-up to level 2
3. Observe available spells to learn

**Expected Results:**
- Only SRD wizard spells available
- No Xanathar's/Tasha's spells (e.g., no "Shadow Blade", no "Tasha's Caustic Brew")
- Conjure spells available if class-appropriate

**Pass Criteria:** Spell learning shows only SRD spells

---

### Test 9: Feat Selection

**Steps:**
1. Create a character at level 4 (or level up to 4)
2. Choose ASI/Feat option
3. Review available feats

**Expected Results:**
| Should See (SRD 5.2) | Should NOT See |
|----------------------|----------------|
| Alert | Ability Score Improvement (as feat) |
| Crossbow Expert | Athlete |
| Great Weapon Master | Charger |
| Lucky | Sentinel |
| Magic Initiate | Sharpshooter |
| Polearm Master | Shield Master |
| Skilled | Skulker |
| Tough | Spell Sniper |
| | Tavern Brawler |
| | War Caster |

**Pass Criteria:** Only SRD 5.2 feats visible

---

### Test 10: Console Error Check

**Steps:**
1. Open browser console (F12 → Console tab)
2. Navigate through characters.html
3. Navigate through initiative.html
4. Perform spell searches on both pages

**Expected Results:**
- No errors related to:
  - "Cannot read property of undefined" (spell lookups)
  - "Spell not found"
  - `getAllSpells` or `SPELLS_DATA`
  - `SRDContentFilter`

**Pass Criteria:** Zero console errors related to spell/SRD filtering

---

### Test 11: Content Pack Re-enables Blocked Content

**Steps:**
1. Open Diagnostics panel (Ctrl+Alt+D)
2. Open Content Pack Manager
3. Import the SRD regression pack from `internal-roadmaps/test-packs/srd-regression-pack.json`
4. Enable the pack
5. Return to character creation wizard
6. Check if QA races (from pack overrides) are now visible

**Expected Results:**
- After pack import + enable, additional races should appear
- `dmtoolbox:packs-applied` event should fire
- Spell cache should invalidate (search shows updated results)

**Pass Criteria:** Content packs successfully extend the allowlist

---

## 3.9.3b — Automated Unit Test Plan

### Test File: `tests/unit/srd-content-filter.test.js`

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the allowlist/blocklist before importing
const mockAllowlist = {
  spell: ['Fireball', 'Magic Missile', 'Conjure Animals', 'Ice Knife'],
  feat: ['Alert', 'Lucky', 'Tough', 'Great Weapon Master'],
  race: ['Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Goliath', 'Halfling', 'Human', 'Orc', 'Tiefling'],
  class: ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'],
  background: ['Acolyte', 'Criminal', 'Sage', 'Soldier'],
  subclass: [] // Empty - no subclasses in SRD 5.2
};

const mockBlocklist = {
  spell: ['Hex', 'Shadow Blade', 'Booming Blade'],
  feat: ['War Caster', 'Sentinel', 'Sharpshooter'],
  race: ['Aarakocra', 'Aasimar', 'Firbolg', 'Half-Elf', 'Half-Orc'],
  class: ['Artificer'],
  background: ['Charlatan', 'Entertainer', 'Folk Hero'],
  subclass: ['Cleric:Life Domain', 'Fighter:Champion', 'Wizard:School of Evocation']
};

describe('SRDContentFilter', () => {
  let filter;

  beforeEach(() => {
    // Reset and setup mock window globals
    global.window = {
      SRD_CONTENT_ALLOWLIST: mockAllowlist,
      SRD_CONTENT_BLOCKLIST: mockBlocklist
    };

    // Import fresh instance of filter
    // Note: Actual implementation may vary - adjust import path
    filter = createSRDContentFilter(mockAllowlist, mockBlocklist);
  });

  describe('isAllowed()', () => {
    // Spell tests
    it('allows SRD spells', () => {
      expect(filter.isAllowed('spell', 'Fireball')).toBe(true);
      expect(filter.isAllowed('spell', 'Magic Missile')).toBe(true);
    });

    it('allows previously-blocked SRD 5.2 spells', () => {
      expect(filter.isAllowed('spell', 'Conjure Animals')).toBe(true);
      expect(filter.isAllowed('spell', 'Ice Knife')).toBe(true);
    });

    it('blocks non-SRD spells', () => {
      expect(filter.isAllowed('spell', 'Hex')).toBe(false);
      expect(filter.isAllowed('spell', 'Shadow Blade')).toBe(false);
      expect(filter.isAllowed('spell', 'Booming Blade')).toBe(false);
    });

    // Race tests
    it('allows all 9 SRD 5.2 species', () => {
      ['Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Goliath', 'Halfling', 'Human', 'Orc', 'Tiefling']
        .forEach(race => {
          expect(filter.isAllowed('race', race)).toBe(true);
        });
    });

    it('blocks non-SRD races', () => {
      expect(filter.isAllowed('race', 'Aarakocra')).toBe(false);
      expect(filter.isAllowed('race', 'Aasimar')).toBe(false);
      expect(filter.isAllowed('race', 'Half-Elf')).toBe(false);
      expect(filter.isAllowed('race', 'Half-Orc')).toBe(false);
    });

    // Class tests
    it('allows all 12 core classes', () => {
      const classes = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
                       'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];
      classes.forEach(cls => {
        expect(filter.isAllowed('class', cls)).toBe(true);
      });
    });

    it('blocks Artificer class', () => {
      expect(filter.isAllowed('class', 'Artificer')).toBe(false);
    });

    // Background tests
    it('allows only 4 SRD backgrounds', () => {
      expect(filter.isAllowed('background', 'Acolyte')).toBe(true);
      expect(filter.isAllowed('background', 'Criminal')).toBe(true);
      expect(filter.isAllowed('background', 'Sage')).toBe(true);
      expect(filter.isAllowed('background', 'Soldier')).toBe(true);
    });

    it('blocks non-SRD backgrounds', () => {
      expect(filter.isAllowed('background', 'Charlatan')).toBe(false);
      expect(filter.isAllowed('background', 'Entertainer')).toBe(false);
      expect(filter.isAllowed('background', 'Folk Hero')).toBe(false);
    });

    // Subclass tests (SRD 5.2 has NONE)
    it('blocks ALL subclasses in SRD 5.2 mode', () => {
      expect(filter.isAllowed('subclass', 'Cleric:Life Domain')).toBe(false);
      expect(filter.isAllowed('subclass', 'Fighter:Champion')).toBe(false);
      expect(filter.isAllowed('subclass', 'Wizard:School of Evocation')).toBe(false);
    });

    // Feat tests
    it('allows SRD 5.2 feats', () => {
      expect(filter.isAllowed('feat', 'Alert')).toBe(true);
      expect(filter.isAllowed('feat', 'Lucky')).toBe(true);
      expect(filter.isAllowed('feat', 'Great Weapon Master')).toBe(true);
    });

    it('blocks non-SRD feats', () => {
      expect(filter.isAllowed('feat', 'War Caster')).toBe(false);
      expect(filter.isAllowed('feat', 'Sentinel')).toBe(false);
    });

    // Edge cases
    it('returns true for unknown types (default allow)', () => {
      expect(filter.isAllowed('unknownType', 'anything')).toBe(true);
    });

    it('handles case sensitivity correctly', () => {
      // Depends on implementation - document expected behavior
      expect(filter.isAllowed('spell', 'fireball')).toBe(false); // case-sensitive
      expect(filter.isAllowed('spell', 'Fireball')).toBe(true);
    });

    it('handles null/undefined gracefully', () => {
      expect(filter.isAllowed('spell', null)).toBe(false);
      expect(filter.isAllowed('spell', undefined)).toBe(false);
      expect(filter.isAllowed(null, 'Fireball')).toBe(true); // unknown type = allow
    });
  });

  describe('filterArray()', () => {
    it('filters spell array to only SRD entries', () => {
      const spells = [
        { title: 'Fireball' },
        { title: 'Hex' },
        { title: 'Magic Missile' },
        { title: 'Shadow Blade' }
      ];

      const filtered = filter.filterArray('spell', spells, s => s.title);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(s => s.title)).toEqual(['Fireball', 'Magic Missile']);
    });

    it('preserves order of allowed items', () => {
      const races = [
        { name: 'Human' },
        { name: 'Aarakocra' },
        { name: 'Elf' },
        { name: 'Firbolg' },
        { name: 'Dwarf' }
      ];

      const filtered = filter.filterArray('race', races, r => r.name);

      expect(filtered.map(r => r.name)).toEqual(['Human', 'Elf', 'Dwarf']);
    });
  });
});
```

### Test File: `tests/unit/character-spell-loading.test.js`

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Character.js Spell Loading', () => {
  let getAllSpells;

  beforeEach(() => {
    // Reset cache
    vi.resetModules();

    // Mock filtered SPELLS_DATA (simulating post-pruneSpells state)
    global.window = {
      SPELLS_DATA: [
        { title: 'Fireball', level: 3, school: 'Evocation' },
        { title: 'Magic Missile', level: 1, school: 'Evocation' },
        { title: 'Conjure Animals', level: 3, school: 'Conjuration' }
      ]
    };

    // Import the function (adjust path as needed)
    // getAllSpells = require('../../js/character.js').getAllSpells;
  });

  it('returns spells from filtered SPELLS_DATA', () => {
    const spells = getAllSpells();

    expect(spells).toHaveLength(3);
    expect(spells.map(s => s.name)).toContain('Fireball');
    expect(spells.map(s => s.name)).not.toContain('Hex');
  });

  it('caches results after first call', () => {
    const first = getAllSpells();
    const second = getAllSpells();

    expect(first).toBe(second); // Same reference = cached
  });

  it('invalidates cache on packs-applied event', () => {
    const first = getAllSpells();

    // Simulate pack adding a spell
    window.SPELLS_DATA.push({ title: 'New Spell', level: 1 });

    // Fire the event
    window.dispatchEvent(new Event('dmtoolbox:packs-applied'));

    const second = getAllSpells();

    expect(second).not.toBe(first); // Different reference = cache invalidated
    expect(second).toHaveLength(4);
  });

  it('normalizes string spell entries', () => {
    window.SPELLS_DATA = ['Fireball', 'Magic Missile'];

    const spells = getAllSpells();

    expect(spells[0]).toHaveProperty('name', 'Fireball');
    expect(spells[0]).toHaveProperty('title', 'Fireball');
    expect(spells[0]).toHaveProperty('level', 0);
  });

  it('handles empty SPELLS_DATA gracefully', () => {
    window.SPELLS_DATA = [];

    const spells = getAllSpells();

    expect(spells).toEqual([]);
  });

  it('filters out null/undefined entries', () => {
    window.SPELLS_DATA = [
      { title: 'Fireball' },
      null,
      undefined,
      { title: 'Shield' }
    ];

    const spells = getAllSpells();

    expect(spells).toHaveLength(2);
  });
});
```

### Test File: `tests/integration/srd-spell-filtering.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('SRD Spell Filtering Integration', () => {
  let dom;
  let window;

  beforeAll(async () => {
    // Load actual allowlist
    const allowlistPath = path.resolve(__dirname, '../../js/generated/srd-allowlist.js');
    const allowlistCode = fs.readFileSync(allowlistPath, 'utf8');

    // Create DOM with scripts
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      runScripts: 'dangerously'
    });
    window = dom.window;

    // Execute allowlist script
    const script = window.document.createElement('script');
    script.textContent = allowlistCode;
    window.document.head.appendChild(script);
  });

  afterAll(() => {
    dom.window.close();
  });

  it('loads allowlist with correct SRD 5.2 spells', () => {
    const allowlist = window.SRD_CONTENT_ALLOWLIST;

    expect(allowlist.spell).toContain('Fireball');
    expect(allowlist.spell).toContain('Conjure Animals');
    expect(allowlist.spell).toContain('Ice Knife');
    expect(allowlist.spell).toContain('Catapult');
  });

  it('blocklist contains non-SRD spells', () => {
    const blocklist = window.SRD_CONTENT_BLOCKLIST;

    expect(blocklist.spell).toContain('Hex');
    expect(blocklist.spell).toContain('Shadow Blade');
    expect(blocklist.spell).toContain('Booming Blade');
  });

  it('no subclasses in allowlist', () => {
    const allowlist = window.SRD_CONTENT_ALLOWLIST;

    expect(allowlist.subclass).toBeUndefined();
    // OR if it exists but is empty:
    // expect(allowlist.subclass || []).toHaveLength(0);
  });

  it('all subclasses in blocklist', () => {
    const blocklist = window.SRD_CONTENT_BLOCKLIST;

    expect(blocklist.subclass).toBeDefined();
    expect(blocklist.subclass.length).toBeGreaterThan(30);
    expect(blocklist.subclass).toContain('Cleric:Life Domain');
    expect(blocklist.subclass).toContain('Fighter:Champion');
  });

  it('has exactly 9 SRD races', () => {
    const allowlist = window.SRD_CONTENT_ALLOWLIST;

    expect(allowlist.race).toHaveLength(9);
    expect(allowlist.race).toContain('Dwarf');
    expect(allowlist.race).toContain('Gnome');
    expect(allowlist.race).toContain('Goliath');
    expect(allowlist.race).toContain('Orc');
  });

  it('has exactly 4 SRD backgrounds', () => {
    const allowlist = window.SRD_CONTENT_ALLOWLIST;

    expect(allowlist.background).toHaveLength(4);
    expect(allowlist.background).toEqual(
      expect.arrayContaining(['Acolyte', 'Criminal', 'Sage', 'Soldier'])
    );
  });

  it('has 12 SRD classes (no Artificer)', () => {
    const allowlist = window.SRD_CONTENT_ALLOWLIST;
    const blocklist = window.SRD_CONTENT_BLOCKLIST;

    expect(allowlist.class).toHaveLength(12);
    expect(allowlist.class).toContain('Monk');
    expect(allowlist.class).toContain('Paladin');
    expect(blocklist.class).toContain('Artificer');
  });
});
```

---

## Running the Tests

### Manual QA
```bash
# Start local server
npx serve . -p 3000

# Open in browser
# http://localhost:3000/characters.html
# http://localhost:3000/initiative.html
```

### Automated Tests
```bash
# Run all unit tests
npm run test:run

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run tests/unit/srd-content-filter.test.js

# Run in watch mode during development
npm run test
```

---

## Test Results Checklist

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| **Manual QA** | | |
| Test 1: Race Selection | ☐ | |
| Test 2: Class Selection | ☐ | |
| Test 3: Background Selection | ☐ | |
| Test 4: Subclass Selection | ☐ | |
| Test 5: Spell Search | ☐ | |
| Test 6: Spell Search After Refresh | ☐ | |
| Test 7: Initiative Spell Modal | ☐ | |
| Test 8: Level-Up Spell Learning | ☐ | |
| Test 9: Feat Selection | ☐ | |
| Test 10: Console Errors | ☐ | |
| Test 11: Content Pack Import | ☐ | |
| **Automated Tests** | | |
| srd-content-filter.test.js | ☐ | |
| character-spell-loading.test.js | ☐ | |
| srd-spell-filtering.test.js | ☐ | |
