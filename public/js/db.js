import { createInitialDatabase } from './seed.js';
import { applySyncOp, purgeDemoData } from './logic.js';
import { generateId } from './utils.js';

const IDB_NAME = 'controle_producao_somadeiras';
const IDB_VERSION = 1;
const STORE_STATE = 'app_state';
const STORE_OUTBOX = 'sync_outbox';
const LS_FALLBACK_KEY = 'cp_somadeiras_state_v1';
const LS_OUTBOX_KEY = 'cp_somadeiras_outbox_v1';
const LS_SESSION_KEY = 'cp_somadeiras_session_v1';

function openIdb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE);
      }
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        db.createObjectStore(STORE_OUTBOX, { keyPath: 'opId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(storeName, key) {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(storeName, value, key = undefined) {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = key !== undefined ? store.put(value, key) : store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll(storeName) {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(storeName, key) {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadLocalState() {
  let state = null;
  try {
    const data = await idbGet(STORE_STATE, 'main');
    if (data && Array.isArray(data.usuarios)) {
      state = data;
    }
  } catch {
    // fallback to localStorage
  }

  if (!state) {
    try {
      const raw = localStorage.getItem(LS_FALLBACK_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.usuarios)) {
          state = parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  if (!state) {
    state = createInitialDatabase();
  }

  // Purga dados de demonstração/fake automaticamente
  const { changed } = purgeDemoData(state);
  if (changed || !state.version || state.version < 2) {
    state.version = 2;
    await saveLocalState(state);
  }

  return state;
}

export async function saveLocalState(state) {
  if (state) {
    purgeDemoData(state);
  }
  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(state));
  } catch {
    // localStorage quota may be tight if many large photos; IndexedDB handles larger blobs
  }
  try {
    await idbPut(STORE_STATE, state, 'main');
  } catch {
    // ignore if unavailable
  }
}

export async function getOutboxOps() {
  try {
    return await idbGetAll(STORE_OUTBOX);
  } catch {
    try {
      return JSON.parse(localStorage.getItem(LS_OUTBOX_KEY) || '[]');
    } catch {
      return [];
    }
  }
}

export async function enqueueOutboxOp(op) {
  try {
    await idbPut(STORE_OUTBOX, op);
  } catch {
    const list = JSON.parse(localStorage.getItem(LS_OUTBOX_KEY) || '[]');
    if (!list.some((item) => item.opId === op.opId)) {
      list.push(op);
      localStorage.setItem(LS_OUTBOX_KEY, JSON.stringify(list));
    }
  }
}

export async function removeOutboxOps(opIds) {
  for (const id of opIds) {
    try {
      await idbDelete(STORE_OUTBOX, id);
    } catch {
      // fallback below
    }
  }
  try {
    const list = JSON.parse(localStorage.getItem(LS_OUTBOX_KEY) || '[]');
    const filtered = list.filter((item) => !opIds.includes(item.opId));
    localStorage.setItem(LS_OUTBOX_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

export function getSavedSessionUserId() {
  try {
    return sessionStorage.getItem(LS_SESSION_KEY) || localStorage.getItem(LS_SESSION_KEY) || null;
  } catch {
    return null;
  }
}

export function setSavedSessionUserId(userId, remember = false) {
  try {
    sessionStorage.removeItem(LS_SESSION_KEY);
    localStorage.removeItem(LS_SESSION_KEY);
    if (userId) {
      if (remember) {
        localStorage.setItem(LS_SESSION_KEY, userId);
      } else {
        sessionStorage.setItem(LS_SESSION_KEY, userId);
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Executa uma mutação localmente de imediato (offline-first) e enfileira para sincronização.
 */
export async function mutateAndQueue(currentState, type, payload, actor) {
  const op = {
    opId: generateId('op'),
    type,
    payload,
    actorId: actor?.id || 'usr_admin',
    actorName: actor?.nome || 'Sistema',
    createdAt: new Date().toISOString()
  };

  const result = applySyncOp(currentState, op);
  if (!result.ok) {
    return result;
  }

  await saveLocalState(currentState);
  await enqueueOutboxOp(op);
  return { ...result, op };
}
