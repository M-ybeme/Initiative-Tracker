import { describe, it, expect, beforeEach } from 'vitest';
import {
  serializeCharacter,
  deserializeCharacter,
  serializeCharacterList,
  deserializeCharacterList,
  generateCharacterId,
  validateCharacterForStorage,
  createLocalStorageAdapter,
  migrateCharacterData,
  checkCharacterCorruption
} from '../../js/modules/storage.js';

describe('serializeCharacter', () => {
  it('converts character to JSON string', () => {
    const character = { id: '1', name: 'Test' };
    const result = serializeCharacter(character);
    expect(result).toBe('{"id":"1","name":"Test"}');
  });

  it('returns null for null input', () => {
    expect(serializeCharacter(null)).toBeNull();
    expect(serializeCharacter(undefined)).toBeNull();
  });
});

describe('deserializeCharacter', () => {
  it('parses JSON string to character object', () => {
    const json = '{"id":"1","name":"Test"}';
    const result = deserializeCharacter(json);
    expect(result).toEqual({ id: '1', name: 'Test' });
  });

  it('returns null for invalid JSON', () => {
    expect(deserializeCharacter('not json')).toBeNull();
    expect(deserializeCharacter('{invalid}')).toBeNull();
  });

  it('returns null for non-object JSON', () => {
    expect(deserializeCharacter('"string"')).toBeNull();
    expect(deserializeCharacter('123')).toBeNull();
  });

  it('returns null for empty/null input', () => {
    expect(deserializeCharacter('')).toBeNull();
    expect(deserializeCharacter(null)).toBeNull();
    expect(deserializeCharacter(undefined)).toBeNull();
  });
});

describe('serializeCharacterList', () => {
  it('converts array to JSON string', () => {
    const characters = [{ id: '1' }, { id: '2' }];
    const result = serializeCharacterList(characters);
    expect(result).toBe('[{"id":"1"},{"id":"2"}]');
  });

  it('returns empty array JSON for non-array input', () => {
    expect(serializeCharacterList(null)).toBe('[]');
    expect(serializeCharacterList('string')).toBe('[]');
  });
});

describe('deserializeCharacterList', () => {
  it('parses JSON string to array', () => {
    const json = '[{"id":"1"},{"id":"2"}]';
    const result = deserializeCharacterList(json);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
  });

  it('returns empty array for invalid JSON', () => {
    expect(deserializeCharacterList('not json')).toEqual([]);
  });

  it('returns empty array for non-array JSON', () => {
    expect(deserializeCharacterList('{"id":"1"}')).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(deserializeCharacterList('')).toEqual([]);
    expect(deserializeCharacterList(null)).toEqual([]);
  });
});

describe('generateCharacterId', () => {
  it('generates unique IDs', () => {
    const id1 = generateCharacterId();
    const id2 = generateCharacterId();
    expect(id1).not.toBe(id2);
  });

  it('starts with char_ prefix', () => {
    const id = generateCharacterId();
    expect(id.startsWith('char_')).toBe(true);
  });

  it('uses provided random function', () => {
    const mockRandom = () => 0.5;
    const id1 = generateCharacterId(mockRandom);
    const id2 = generateCharacterId(mockRandom);
    // Same random = same random part, but timestamp differs
    expect(id1).toContain('char_');
  });
});

describe('validateCharacterForStorage', () => {
  it('returns valid for complete character', () => {
    const character = { id: '1', name: 'Test Hero' };
    const result = validateCharacterForStorage(character);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('requires id', () => {
    const character = { name: 'Test' };
    const result = validateCharacterForStorage(character);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Character must have an id');
  });

  it('requires name', () => {
    const character = { id: '1' };
    const result = validateCharacterForStorage(character);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Character must have a name');
  });

  it('rejects empty name', () => {
    const character = { id: '1', name: '   ' };
    const result = validateCharacterForStorage(character);
    expect(result.valid).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(validateCharacterForStorage(null).valid).toBe(false);
    expect(validateCharacterForStorage('string').valid).toBe(false);
  });
});

describe('createLocalStorageAdapter', () => {
  let mockStorage;

  beforeEach(() => {
    const store = {};
    mockStorage = {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => { store[key] = value; },
      removeItem: (key) => { delete store[key]; }
    };
  });

  it('saves and loads characters', () => {
    const adapter = createLocalStorageAdapter(mockStorage, 'characters');
    const characters = [{ id: '1', name: 'Hero' }];

    adapter.save(characters);
    const loaded = adapter.load();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Hero');
  });

  it('saves individual character', () => {
    const adapter = createLocalStorageAdapter(mockStorage, 'characters');

    adapter.saveOne({ id: '1', name: 'Hero1' });
    adapter.saveOne({ id: '2', name: 'Hero2' });

    const loaded = adapter.load();
    expect(loaded).toHaveLength(2);
  });

  it('updates existing character', () => {
    const adapter = createLocalStorageAdapter(mockStorage, 'characters');

    adapter.saveOne({ id: '1', name: 'Hero', level: 1 });
    adapter.saveOne({ id: '1', name: 'Hero', level: 5 });

    const loaded = adapter.load();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].level).toBe(5);
  });

  it('deletes character', () => {
    const adapter = createLocalStorageAdapter(mockStorage, 'characters');

    adapter.saveOne({ id: '1', name: 'Hero1' });
    adapter.saveOne({ id: '2', name: 'Hero2' });
    adapter.deleteOne('1');

    const loaded = adapter.load();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('2');
  });

  it('gets individual character', () => {
    const adapter = createLocalStorageAdapter(mockStorage, 'characters');

    adapter.saveOne({ id: '1', name: 'Hero1' });
    adapter.saveOne({ id: '2', name: 'Hero2' });

    const hero = adapter.getOne('1');
    expect(hero.name).toBe('Hero1');
  });

  it('returns null for non-existent character', () => {
    const adapter = createLocalStorageAdapter(mockStorage, 'characters');
    expect(adapter.getOne('nonexistent')).toBeNull();
  });

  it('clears all characters', () => {
    const adapter = createLocalStorageAdapter(mockStorage, 'characters');

    adapter.saveOne({ id: '1', name: 'Hero' });
    adapter.clear();

    expect(adapter.load()).toHaveLength(0);
  });
});

describe('migrateCharacterData', () => {
  it('generates ID if missing', () => {
    const old = { name: 'Hero' };
    const migrated = migrateCharacterData(old);
    expect(migrated.id).toBeDefined();
    expect(migrated.id.startsWith('char_')).toBe(true);
  });

  it('preserves existing ID', () => {
    const old = { id: 'existing_id', name: 'Hero' };
    const migrated = migrateCharacterData(old);
    expect(migrated.id).toBe('existing_id');
  });

  it('migrates old stat format', () => {
    const old = { name: 'Hero', str: 16, dex: 14 };
    const migrated = migrateCharacterData(old);
    expect(migrated.stats.str).toBe(16);
    expect(migrated.stats.dex).toBe(14);
  });

  it('converts string level to number', () => {
    const old = { name: 'Hero', level: '5' };
    const migrated = migrateCharacterData(old);
    expect(migrated.level).toBe(5);
  });

  it('adds lastUpdated timestamp', () => {
    const old = { name: 'Hero' };
    const migrated = migrateCharacterData(old);
    expect(migrated.lastUpdated).toBeDefined();
  });

  it('returns null for null input', () => {
    expect(migrateCharacterData(null)).toBeNull();
  });
});

describe('checkCharacterCorruption', () => {
  it('returns not corrupted for valid character', () => {
    const character = { id: '1', name: 'Hero', level: 5 };
    const result = checkCharacterCorruption(character);
    expect(result.corrupted).toBe(false);
    expect(result.issues).toHaveLength(0);
  });

  it('detects non-object', () => {
    const result = checkCharacterCorruption(null);
    expect(result.corrupted).toBe(true);
    expect(result.issues).toContain('Not a valid object');
  });

  it('detects undefined name', () => {
    const character = { id: '1' };
    const result = checkCharacterCorruption(character);
    expect(result.corrupted).toBe(true);
    expect(result.issues).toContain('Name is undefined');
  });

  it('warns about large portrait data', () => {
    const character = {
      id: '1',
      name: 'Hero',
      portrait: 'x'.repeat(6 * 1024 * 1024) // 6MB
    };
    const result = checkCharacterCorruption(character);
    expect(result.corrupted).toBe(true);
    expect(result.issues.some(i => i.includes('Portrait data is very large'))).toBe(true);
  });
});
