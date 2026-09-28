// Dedicated High-Capacity IndexedDB Storage Layer for ERP KTCT
// Solves browser localStorage 5MB quota limitations permanently.
// Capable of safely storing tens of thousands of records (Tagihan, Pembayaran, Absensi, Siswa, etc.)

const IDB_NAME = 'ERP_KTCT_STORAGE_V1';
const IDB_STORE = 'erp_records';
const IDB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase | null> | null = null;

export function isIdbSupported(): boolean {
  return typeof window !== 'undefined' && !!window.indexedDB;
}

export function openIdb(): Promise<IDBDatabase | null> {
  if (!isIdbSupported()) {
    return Promise.resolve(null);
  }
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);

      req.onupgradeneeded = () => {
        try {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        } catch (e) {
          console.warn('[IndexedDB] Upgrade warning:', e);
        }
      };

      req.onsuccess = () => {
        dbInstance = req.result;
        dbInstance.onversionchange = () => {
          try {
            dbInstance?.close();
            dbInstance = null;
            dbPromise = null;
          } catch {}
        };
        resolve(dbInstance);
      };

      req.onerror = () => {
        console.warn('[IndexedDB] Open error:', req.error);
        resolve(null);
      };

      req.onblocked = () => {
        console.warn('[IndexedDB] Open blocked');
        resolve(null);
      };
    } catch (err) {
      console.warn('[IndexedDB] Initialization exception:', err);
      resolve(null);
    }
  });

  return dbPromise;
}

export async function idbGet<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openIdb();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(key);

        req.onsuccess = () => {
          resolve(req.result !== undefined ? req.result : null);
        };
        req.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: any): Promise<boolean> {
  try {
    const db = await openIdb();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        const req = store.put(value, key);

        req.onsuccess = () => {
          resolve(true);
        };
        req.onerror = () => {
          console.warn(`[IndexedDB] Failed to save key "${key}":`, req.error);
          resolve(false);
        };
      } catch (err) {
        console.warn(`[IndexedDB] Transaction exception for key "${key}":`, err);
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

export async function idbDelete(key: string): Promise<boolean> {
  try {
    const db = await openIdb();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        const req = store.delete(key);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

export async function idbGetAll(): Promise<Record<string, any>> {
  try {
    const db = await openIdb();
    if (!db) return {};

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const results: Record<string, any> = {};

        if (store.openCursor) {
          const req = store.openCursor();
          req.onsuccess = (e: any) => {
            const cursor = e.target.result;
            if (cursor) {
              results[String(cursor.key)] = cursor.value;
              cursor.continue();
            } else {
              resolve(results);
            }
          };
          req.onerror = () => resolve(results);
        } else {
          resolve({});
        }
      } catch {
        resolve({});
      }
    });
  } catch {
    return {};
  }
}

export async function idbClear(): Promise<boolean> {
  try {
    const db = await openIdb();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        const req = store.clear();

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}
