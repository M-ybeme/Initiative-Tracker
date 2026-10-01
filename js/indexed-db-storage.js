/**
 * IndexedDB Storage Manager
 * Handles efficient storage of character data with large portraits
 * Provides backward compatibility with localStorage
 */

// eslint-disable-next-line no-unused-vars
const IndexedDBStorage = window.IndexedDBStorage = (function() {
  'use strict';

  const DB_NAME = 'DMToolboxDB';
  const DB_VERSION = 1;
  const CHARACTERS_STORE = 'characters';
  const BATTLEMAPS_STORE = 'battlemaps'; // For future use

  let db = null;

  /**
   * Initialize the IndexedDB database
   */
  function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        db = request.result;
        console.log('✓ IndexedDB initialized successfully');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        // Create characters store if it doesn't exist
        if (!database.objectStoreNames.contains(CHARACTERS_STORE)) {
          const charactersStore = database.createObjectStore(CHARACTERS_STORE, { keyPath: 'id' });
          charactersStore.createIndex('name', 'name', { unique: false });
          charactersStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
          console.log('✓ Created characters object store');
        }

        // Create battlemaps store for future use
        if (!database.objectStoreNames.contains(BATTLEMAPS_STORE)) {
          const battlemapsStore = database.createObjectStore(BATTLEMAPS_STORE, { keyPath: 'id' });
          battlemapsStore.createIndex('name', 'name', { unique: false });
          console.log('✓ Created battlemaps object store');
        }
      };
    });
  }

  /**
   * Save all characters to IndexedDB
   */
  function saveCharacters(characters) {
    return new Promise(async (resolve, reject) => {
      if (!db) {
        try {
          await initDB();
        } catch (error) {
          reject(error);
          return;
        }
      }

      const transaction = db.transaction([CHARACTERS_STORE], 'readwrite');
      const store = transaction.objectStore(CHARACTERS_STORE);

      // Clear existing characters
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        // Add all characters
        let addedCount = 0;
        let hasError = false;

        if (characters.length === 0) {
          resolve([]);
          return;
        }

        characters.forEach((character, _index) => {
          const addRequest = store.add(character);

          addRequest.onsuccess = () => {
            addedCount++;
            if (addedCount === characters.length && !hasError) {
              console.log(`✓ Saved ${addedCount} character(s) to IndexedDB`);
              resolve(characters);
            }
          };

          addRequest.onerror = () => {
            console.error(`❌ Failed to save character ${character.name}:`, addRequest.error);
            hasError = true;
            reject(addRequest.error);
          };
        });
      };

      clearRequest.onerror = () => {
        console.error('❌ Failed to clear characters store:', clearRequest.error);
        reject(clearRequest.error);
      };

      transaction.onerror = () => {
        console.error('❌ Transaction error:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Load all characters from IndexedDB
   */
  function loadCharacters() {
    return new Promise(async (resolve, reject) => {
      if (!db) {
        try {
          await initDB();
        } catch (error) {
          reject(error);
          return;
        }
      }

      const transaction = db.transaction([CHARACTERS_STORE], 'readonly');
      const store = transaction.objectStore(CHARACTERS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const characters = request.result || [];
        console.log(`✓ Loaded ${characters.length} character(s) from IndexedDB`);
        resolve(characters);
      };

      request.onerror = () => {
        console.error('❌ Failed to load characters from IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Migrate data from localStorage to IndexedDB
   * This maintains backward compatibility
   */
  async function migrateFromLocalStorage(localStorageKey) {
    console.log('🔄 Checking for localStorage data to migrate...');

    try {
      const raw = localStorage.getItem(localStorageKey);
      if (!raw) {
        console.log('ℹ No localStorage data found to migrate');
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        console.log('ℹ No valid characters in localStorage to migrate');
        return [];
      }

      console.log(`🔄 Migrating ${parsed.length} character(s) from localStorage to IndexedDB...`);

      // Save to IndexedDB
      await saveCharacters(parsed);

      console.log('✓ Migration successful! Characters are now in IndexedDB');
      console.log('ℹ Keeping localStorage backup for now (you can clear it manually later)');

      // Optional: Mark localStorage as migrated (don't delete yet for safety)
      localStorage.setItem(localStorageKey + '_migrated', 'true');

      return parsed;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Check if IndexedDB is supported
   */
  function isSupported() {
    return 'indexedDB' in window;
  }

  /**
   * Get storage info
   */
  async function getStorageInfo() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        usageMB: (estimate.usage / (1024 * 1024)).toFixed(2),
        quotaMB: (estimate.quota / (1024 * 1024)).toFixed(2),
        percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(1)
      };
    } catch (error) {
      console.error('Failed to get storage estimate:', error);
      return null;
    }
  }

  /**
   * Save a battle map session to IndexedDB. `id` is the record: 'current-session' (the explicitly
   * saved map) or 'current-draft' (the Battle Map's autosaved, still unsaved working copy).
   */
  async function saveBattleMap(battleMapData, id = 'current-session') {
    return new Promise(async (resolve, reject) => {
      if (!db) {
        try {
          await initDB();
        } catch (error) {
          reject(error);
          return;
        }
      }

      const transaction = db.transaction([BATTLEMAPS_STORE], 'readwrite');
      const store = transaction.objectStore(BATTLEMAPS_STORE);

      const mapSession = {
        id,
        data: battleMapData,
        lastUpdated: new Date().toISOString()
      };

      const putRequest = store.put(mapSession);

      putRequest.onsuccess = () => {
        console.log('✓ Battle map saved to IndexedDB');
        resolve(mapSession);
      };

      putRequest.onerror = () => {
        console.error('❌ Failed to save battle map:', putRequest.error);
        reject(putRequest.error);
      };

      transaction.onerror = () => {
        console.error('❌ Transaction error:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Load a battle map session from IndexedDB ('current-session' unless another record is named)
   */
  async function loadBattleMap(id = 'current-session') {
    return new Promise(async (resolve, reject) => {
      if (!db) {
        try {
          await initDB();
        } catch (error) {
          reject(error);
          return;
        }
      }

      const transaction = db.transaction([BATTLEMAPS_STORE], 'readonly');
      const store = transaction.objectStore(BATTLEMAPS_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        const session = request.result;
        if (session) {
          console.log('✓ Loaded battle map from IndexedDB');
          resolve(session.data);
        } else {
          console.log('ℹ No battle map found in IndexedDB');
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('❌ Failed to load battle map from IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a battle map record from IndexedDB (resolves when it is gone, or was never there)
   */
  async function deleteBattleMap(id) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BATTLEMAPS_STORE], 'readwrite');
      transaction.objectStore(BATTLEMAPS_STORE).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  // Public API
  return {
    init: initDB,
    saveCharacters,
    loadCharacters,
    saveBattleMap,
    loadBattleMap,
    deleteBattleMap,
    migrateFromLocalStorage,
    isSupported,
    getStorageInfo
  };
})();
