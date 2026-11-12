import { getOutboxOps, removeOutboxOps, saveLocalState } from './db.js';
import { applySyncOp } from './logic.js';

export const SYNC_STATUS = {
  SYNCED: 'SYNCED',
  SYNCING: 'SYNCING',
  OFFLINE: 'OFFLINE'
};

export function createSyncManager({ getState, setState, onStatusChange }) {
  let status = navigator.onLine ? SYNC_STATUS.SYNCED : SYNC_STATUS.OFFLINE;
  let pendingCount = 0;
  let syncingNow = false;
  let serverAvailable = true;

  function notify(nextStatus, count) {
    status = nextStatus;
    pendingCount = count;
    if (onStatusChange) {
      onStatusChange({ status, pendingCount, serverAvailable });
    }
  }

  async function refreshPendingCount() {
    const ops = await getOutboxOps();
    pendingCount = ops.length;
    if (!navigator.onLine) {
      notify(SYNC_STATUS.OFFLINE, pendingCount);
    } else if (syncingNow) {
      notify(SYNC_STATUS.SYNCING, pendingCount);
    } else if (pendingCount > 0 && !serverAvailable) {
      notify(SYNC_STATUS.OFFLINE, pendingCount);
    } else {
      notify(SYNC_STATUS.SYNCED, pendingCount);
    }
    return pendingCount;
  }

  async function syncNow() {
    if (syncingNow) return;
    const ops = await getOutboxOps();
    pendingCount = ops.length;

    if (!navigator.onLine) {
      notify(SYNC_STATUS.OFFLINE, pendingCount);
      return;
    }

    syncingNow = true;
    if (pendingCount > 0) {
      notify(SYNC_STATUS.SYNCING, pendingCount);
    }

    try {
      if (ops.length > 0) {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ops })
        });
        if (!res.ok) throw new Error('Falha no sync');
        const data = await res.json();
        serverAvailable = true;

        const doneIds = ops.map((o) => o.opId);
        await removeOutboxOps(doneIds);

        if (data.state) {
          // Ensure any ops added while fetch was in flight are preserved
          const remaining = await getOutboxOps();
          for (const rem of remaining) {
            applySyncOp(data.state, rem);
          }
          await saveLocalState(data.state);
          setState(data.state);
        }
        syncingNow = false;
        const left = await getOutboxOps();
        notify(SYNC_STATUS.SYNCED, left.length);
      } else {
        // Pull latest state from server if reachable
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (!res.ok) throw new Error('API indisponível');
        const data = await res.json();
        serverAvailable = true;
        if (data.state) {
          const current = getState();
          // Only overwrite if server has newer updatedAt or different counts
          if (!current || data.state.updatedAt !== current.updatedAt) {
            await saveLocalState(data.state);
            setState(data.state);
          }
        }
        syncingNow = false;
        notify(SYNC_STATUS.SYNCED, 0);
      }
    } catch {
      serverAvailable = false;
      syncingNow = false;
      const left = await getOutboxOps();
      // If browser is online but static hosting has no /api, show offline badge only when queue has pending ops or network is truly down
      notify(navigator.onLine && left.length === 0 ? SYNC_STATUS.SYNCED : SYNC_STATUS.OFFLINE, left.length);
    }
  }

  function start() {
    window.addEventListener('online', () => {
      syncNow();
    });
    window.addEventListener('offline', () => {
      refreshPendingCount();
    });

    // Periodic background sync every 20s when online
    setInterval(() => {
      if (navigator.onLine) {
        syncNow();
      }
    }, 20000);

    refreshPendingCount().then(() => {
      if (navigator.onLine) {
        syncNow();
      }
    });
  }

  return {
    start,
    syncNow,
    refreshPendingCount,
    getStatus: () => ({ status, pendingCount, serverAvailable })
  };
}
