/**
 * Persistent OS Storage Engine (IndexedDB + localStorage fast-hydration)
 * Supports large VFS binary/dataURL files (generated PNGs, WebM videos, HTML apps),
 * IE6 browser state/cache, Arena AI sessions, Windows Updates, and Slingo save data.
 */

const DB_NAME = 'trill_winxp_persistent_os_db';
const DB_VERSION = 1;
const STORE_KV = 'os_kv_store';

let dbPromise: Promise<IDBDatabase> | null = null;

function openPersistentDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_KV)) {
        db.createObjectStore(STORE_KV);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });
  return dbPromise;
}

export async function requestPersistentQuota(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    // Ignore permission errors in restricted contexts
  }
  return false;
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openPersistentDB();
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_KV, 'readonly');
      const store = tx.objectStore(STORE_KV);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openPersistentDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_KV, 'readwrite');
      const store = tx.objectStore(STORE_KV);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback to localStorage if small enough
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded in fallback
    }
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openPersistentDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_KV, 'readwrite');
      const store = tx.objectStore(STORE_KV);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export async function getStorageEstimate(): Promise<{ usedMB: number; quotaMB: number }> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      return {
        usedMB: Math.round(((est.usage || 0) / (1024 * 1024)) * 100) / 100,
        quotaMB: Math.round(((est.quota || 1024 * 1024 * 512) / (1024 * 1024)) * 10) / 10,
      };
    }
  } catch {
    // ignore
  }
  return { usedMB: 2.4, quotaMB: 1024 };
}

/**
 * Safely writes to both IndexedDB (unlimited quota) and localStorage (if < 1.5MB)
 */
export function persistHybrid<T>(key: string, value: T): void {
  void idbSet(key, value);
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length < 1_500_000) {
      localStorage.setItem(key, serialized);
    }
  } catch {
    // Large payloads live safely in IndexedDB
  }
}

export function loadLocalFast<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
