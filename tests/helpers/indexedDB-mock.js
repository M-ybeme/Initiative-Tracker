// IndexedDB mock for testing
export function createIndexedDBMock() {
  const databases = new Map();

  return {
    open: (name, version) => {
      return new Promise((resolve) => {
        if (!databases.has(name)) {
          databases.set(name, { stores: new Map() });
        }
        resolve({
          db: databases.get(name),
          createObjectStore: (storeName) => {
            databases.get(name).stores.set(storeName, new Map());
          },
          transaction: (storeNames, mode) => ({
            objectStore: (storeName) => ({
              get: (key) => Promise.resolve(databases.get(name)?.stores.get(storeName)?.get(key)),
              put: (value, key) => {
                databases.get(name)?.stores.get(storeName)?.set(key, value);
                return Promise.resolve();
              },
              delete: (key) => {
                databases.get(name)?.stores.get(storeName)?.delete(key);
                return Promise.resolve();
              },
            }),
          }),
        });
      });
    },
    deleteDatabase: (name) => {
      databases.delete(name);
      return Promise.resolve();
    },
  };
}
