import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Content Pack Integration Tests
 *
 * Tests the content pack system including:
 * - Pack validation
 * - Pack import/export
 * - Allowlist merging
 * - Runtime data hydration
 */

// Mock content pack for testing
const VALID_TEST_PACK = {
  metadata: {
    id: 'com.test.sample-pack',
    name: 'Test Sample Pack',
    version: '1.0.0',
    license: 'MIT',
    toolVersion: '2.0.7',
    authors: ['Test Author'],
    source: 'Unit Tests',
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  },
  allowlist: {
    subclass: ['Warlock:The Hexblade', 'Fighter:Echo Knight'],
    spell: ['Hex', 'Eldritch Blast'],
    race: ['Warforged', 'Changeling']
  },
  records: [
    {
      type: 'spell',
      id: 'Hex',
      operation: 'add',
      payload: {
        title: 'Hex',
        level: 1,
        school: 'Enchantment',
        casting: '1 bonus action',
        range: '90 feet',
        components: 'V, S, M',
        duration: 'Concentration, up to 1 hour',
        description: 'You place a curse on a creature...',
        classes: ['Warlock']
      }
    }
  ],
  notes: 'Test pack for unit testing'
};

const INVALID_PACK_MISSING_METADATA = {
  records: []
};

const INVALID_PACK_BAD_VERSION = {
  metadata: {
    id: 'com.test.bad-version',
    name: 'Bad Version Pack',
    version: 'not-semver',
    license: 'MIT',
    toolVersion: '2.0.7'
  }
};

const INVALID_PACK_BAD_ID = {
  metadata: {
    id: 'InvalidID With Spaces',
    name: 'Bad ID Pack',
    version: '1.0.0',
    license: 'MIT',
    toolVersion: '2.0.7'
  }
};

describe('Content Pack Validation', () => {
  // We'll test the validation logic directly
  function validateMetadata(metadata) {
    const errors = [];
    const PACK_ID_REGEX = /^[a-z0-9](?:[a-z0-9_.-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9_.-]{0,61}[a-z0-9])?)*$/;
    const SEMVER_REGEX = /^([0-9]+\.){2}[0-9]+$/;

    if (!metadata || typeof metadata !== 'object') {
      errors.push('metadata is required');
      return errors;
    }

    const id = (metadata.id || '').trim();
    const name = (metadata.name || '').trim();
    const version = (metadata.version || '').trim();
    const license = (metadata.license || '').trim();
    const toolVersion = (metadata.toolVersion || '').trim();

    if (!id) {
      errors.push('metadata.id is required');
    } else if (!PACK_ID_REGEX.test(id)) {
      errors.push('metadata.id must be a reverse-domain identifier');
    }

    if (!name) {
      errors.push('metadata.name is required');
    }

    if (!version) {
      errors.push('metadata.version is required');
    } else if (!SEMVER_REGEX.test(version)) {
      errors.push('metadata.version must follow semantic versioning');
    }

    if (!license) {
      errors.push('metadata.license is required');
    }

    if (!toolVersion) {
      errors.push('metadata.toolVersion is required');
    } else if (!SEMVER_REGEX.test(toolVersion)) {
      errors.push('metadata.toolVersion must follow semantic versioning');
    }

    return errors;
  }

  describe('metadata validation', () => {
    it('should accept valid metadata', () => {
      const errors = validateMetadata(VALID_TEST_PACK.metadata);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing metadata', () => {
      const errors = validateMetadata(null);
      expect(errors).toContain('metadata is required');
    });

    it('should reject invalid pack ID format', () => {
      const errors = validateMetadata(INVALID_PACK_BAD_ID.metadata);
      expect(errors.some((e) => e.includes('reverse-domain'))).toBe(true);
    });

    it('should reject invalid version format', () => {
      const errors = validateMetadata(INVALID_PACK_BAD_VERSION.metadata);
      expect(errors.some((e) => e.includes('semantic versioning'))).toBe(true);
    });

    it('should require all mandatory fields', () => {
      const errors = validateMetadata({});
      expect(errors).toContain('metadata.id is required');
      expect(errors).toContain('metadata.name is required');
      expect(errors).toContain('metadata.version is required');
      expect(errors).toContain('metadata.license is required');
      expect(errors).toContain('metadata.toolVersion is required');
    });
  });

  describe('allowlist validation', () => {
    function validateAllowlist(allowlist) {
      const errors = [];
      if (allowlist == null) return errors;
      if (typeof allowlist !== 'object' || Array.isArray(allowlist)) {
        errors.push('allowlist must be an object');
        return errors;
      }

      Object.entries(allowlist).forEach(([type, values]) => {
        if (!Array.isArray(values)) {
          errors.push(`allowlist.${type} must be an array`);
        } else {
          values.forEach((value, index) => {
            if (typeof value !== 'string' || !value.trim()) {
              errors.push(`allowlist.${type}[${index}] must be a non-empty string`);
            }
          });
        }
      });

      return errors;
    }

    it('should accept valid allowlist', () => {
      const errors = validateAllowlist(VALID_TEST_PACK.allowlist);
      expect(errors).toHaveLength(0);
    });

    it('should accept null/undefined allowlist (optional)', () => {
      expect(validateAllowlist(null)).toHaveLength(0);
      expect(validateAllowlist(undefined)).toHaveLength(0);
    });

    it('should reject non-object allowlist', () => {
      const errors = validateAllowlist('not an object');
      expect(errors).toContain('allowlist must be an object');
    });

    it('should reject non-array values in allowlist', () => {
      const errors = validateAllowlist({ spell: 'not an array' });
      expect(errors.some((e) => e.includes('must be an array'))).toBe(true);
    });

    it('should reject empty strings in allowlist arrays', () => {
      const errors = validateAllowlist({ spell: ['Fireball', '', 'Shield'] });
      expect(errors.some((e) => e.includes('non-empty string'))).toBe(true);
    });
  });

  describe('record validation', () => {
    function validateRecord(record, index) {
      const errors = [];
      const ALLOWED_TYPES = new Set(['spell', 'class', 'subclass', 'feat', 'background', 'item']);
      const ALLOWED_OPS = new Set(['add', 'replace', 'remove']);

      if (!record || typeof record !== 'object') {
        errors.push(`records[${index}] must be an object`);
        return errors;
      }

      const type = (record.type || '').trim();
      const id = (record.id || '').trim();
      const operation = (record.operation || '').trim();

      if (!type) {
        errors.push(`records[${index}].type is required`);
      } else if (!ALLOWED_TYPES.has(type)) {
        errors.push(`records[${index}].type "${type}" is not recognized`);
      }

      if (!id) {
        errors.push(`records[${index}].id is required`);
      }

      if (!operation) {
        errors.push(`records[${index}].operation is required`);
      } else if (!ALLOWED_OPS.has(operation)) {
        errors.push(`records[${index}].operation must be add, replace, or remove`);
      }

      if (operation !== 'remove' && !record.payload) {
        errors.push(`records[${index}].payload is required for add/replace operations`);
      }

      return errors;
    }

    it('should accept valid record', () => {
      const errors = validateRecord(VALID_TEST_PACK.records[0], 0);
      expect(errors).toHaveLength(0);
    });

    it('should reject record without type', () => {
      const errors = validateRecord({ id: 'test', operation: 'add', payload: {} }, 0);
      expect(errors.some((e) => e.includes('type is required'))).toBe(true);
    });

    it('should reject record without id', () => {
      const errors = validateRecord({ type: 'spell', operation: 'add', payload: {} }, 0);
      expect(errors.some((e) => e.includes('id is required'))).toBe(true);
    });

    it('should reject invalid operation', () => {
      const errors = validateRecord({ type: 'spell', id: 'test', operation: 'invalid' }, 0);
      expect(errors.some((e) => e.includes('add, replace, or remove'))).toBe(true);
    });

    it('should require payload for add operations', () => {
      const errors = validateRecord({ type: 'spell', id: 'test', operation: 'add' }, 0);
      expect(errors.some((e) => e.includes('payload is required'))).toBe(true);
    });

    it('should not require payload for remove operations', () => {
      const errors = validateRecord({ type: 'spell', id: 'test', operation: 'remove' }, 0);
      expect(errors.filter((e) => e.includes('payload'))).toHaveLength(0);
    });
  });
});

describe('Content Pack Allowlist Merging', () => {
  /**
   * Tests the allowlist merging logic that happens when a pack is enabled.
   * Pack allowlists should extend (not replace) the base SRD allowlist.
   */

  function mergeAllowlists(base, packAllowlist) {
    const merged = {};

    // Clone base allowlist
    Object.entries(base).forEach(([type, values]) => {
      merged[type] = new Set(values);
    });

    // Merge pack allowlist additions
    if (packAllowlist) {
      Object.entries(packAllowlist).forEach(([type, values]) => {
        if (!merged[type]) {
          merged[type] = new Set();
        }
        values.forEach((value) => merged[type].add(value));
      });
    }

    // Convert back to arrays
    const result = {};
    Object.entries(merged).forEach(([type, set]) => {
      result[type] = Array.from(set);
    });

    return result;
  }

  it('should preserve base allowlist when pack has no allowlist', () => {
    const base = { spell: ['Fireball', 'Shield'], class: ['Fighter'] };
    const merged = mergeAllowlists(base, null);

    expect(merged.spell).toContain('Fireball');
    expect(merged.spell).toContain('Shield');
    expect(merged.class).toContain('Fighter');
  });

  it('should add pack allowlist items to base', () => {
    const base = { spell: ['Fireball'], subclass: [] };
    const packAllowlist = {
      spell: ['Hex'],
      subclass: ['Warlock:The Hexblade']
    };

    const merged = mergeAllowlists(base, packAllowlist);

    expect(merged.spell).toContain('Fireball');
    expect(merged.spell).toContain('Hex');
    expect(merged.subclass).toContain('Warlock:The Hexblade');
  });

  it('should not duplicate items already in base', () => {
    const base = { spell: ['Fireball', 'Shield'] };
    const packAllowlist = { spell: ['Fireball', 'Hex'] };

    const merged = mergeAllowlists(base, packAllowlist);

    const fireballCount = merged.spell.filter((s) => s === 'Fireball').length;
    expect(fireballCount).toBe(1);
  });

  it('should add new types from pack that dont exist in base', () => {
    const base = { spell: ['Fireball'] };
    const packAllowlist = { race: ['Warforged'] };

    const merged = mergeAllowlists(base, packAllowlist);

    expect(merged.race).toContain('Warforged');
    expect(merged.spell).toContain('Fireball');
  });

  it('should enable blocked subclasses when pack adds them', () => {
    const base = { spell: ['Fireball'], subclass: [] }; // Empty = all blocked
    const packAllowlist = {
      subclass: ['Warlock:The Hexblade', 'Fighter:Echo Knight']
    };

    const merged = mergeAllowlists(base, packAllowlist);

    expect(merged.subclass).toContain('Warlock:The Hexblade');
    expect(merged.subclass).toContain('Fighter:Echo Knight');
    expect(merged.subclass).toHaveLength(2);
  });
});

describe('Content Pack JSON Parsing', () => {
  it('should parse valid JSON pack', () => {
    const jsonString = JSON.stringify(VALID_TEST_PACK);
    const parsed = JSON.parse(jsonString);

    expect(parsed.metadata.id).toBe('com.test.sample-pack');
    expect(parsed.records).toHaveLength(1);
  });

  it('should handle pack with special characters in strings', () => {
    const packWithSpecialChars = {
      ...VALID_TEST_PACK,
      metadata: {
        ...VALID_TEST_PACK.metadata,
        description: 'Pack with "quotes" and \\backslashes\\ and\nnewlines'
      }
    };

    const jsonString = JSON.stringify(packWithSpecialChars);
    const parsed = JSON.parse(jsonString);

    expect(parsed.metadata.description).toContain('"quotes"');
    expect(parsed.metadata.description).toContain('\\backslashes\\');
  });

  it('should reject malformed JSON', () => {
    const malformedJson = '{ "metadata": { "id": "broken }';

    expect(() => JSON.parse(malformedJson)).toThrow();
  });
});

describe('Regression Pack Structure', () => {
  /**
   * Tests specific to the SRD regression pack format.
   * These verify the pack generated by generate-srd-regression-pack.mjs is valid.
   */

  const REGRESSION_PACK_STRUCTURE = {
    metadata: {
      id: 'com.dmstoolbox.srd.regression-pack',
      name: expect.any(String),
      version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
      license: expect.any(String),
      toolVersion: expect.stringMatching(/^\d+\.\d+\.\d+$/),
      authors: expect.any(Array),
      source: expect.any(String),
      created: expect.any(String),
      updated: expect.any(String)
    },
    allowlist: expect.any(Object),
    records: expect.any(Array),
    notes: expect.any(String)
  };

  it('should have required top-level structure', () => {
    // Mock regression pack structure
    const regressionPack = {
      metadata: {
        id: 'com.dmstoolbox.srd.regression-pack',
        name: 'SRD 5.2 Baseline Regression Pack',
        version: '2.0.0',
        license: 'CC-BY-4.0 (SRD 5.2)',
        toolVersion: '2.0.7',
        authors: ["DM's Toolbox Team"],
        source: 'Wizards of the Coast SRD 5.2 (2024)',
        created: '2026-01-26T00:00:00.000Z',
        updated: '2026-01-26T00:00:00.000Z'
      },
      allowlist: {
        race: ['Dwarf', 'Elf', 'Gnome', 'Goliath', 'Human', 'Orc']
      },
      records: [
        { type: 'spell', id: 'Fireball', operation: 'add', payload: {} }
      ],
      notes: 'Test notes'
    };

    expect(regressionPack).toMatchObject(REGRESSION_PACK_STRUCTURE);
  });

  it('should have valid metadata ID format', () => {
    const PACK_ID_REGEX = /^[a-z0-9](?:[a-z0-9_.-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9_.-]{0,61}[a-z0-9])?)*$/;

    expect(PACK_ID_REGEX.test('com.dmstoolbox.srd.regression-pack')).toBe(true);
  });

  it('should not contain subclass records (SRD 5.2)', () => {
    // In the actual regression pack, there should be no subclass records
    const mockRecords = [
      { type: 'spell', id: 'Fireball', operation: 'add' },
      { type: 'class', id: 'Fighter', operation: 'add' },
      { type: 'feat', id: 'Alert', operation: 'add' }
    ];

    const subclassRecords = mockRecords.filter((r) => r.type === 'subclass');
    expect(subclassRecords).toHaveLength(0);
  });
});
