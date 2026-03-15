import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface SyncResult {
  syncing: boolean;
  connected: boolean | null; // null = still checking
  lastSyncTime: string | null;
  error: string | null;
  triggerSync: () => Promise<void>;
}

export function useWithingsSync(): SyncResult {
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncState = useLiveQuery(() => db.syncState.get(1));

  // Check connection status on mount
  useEffect(() => {
    fetch('/api/withings-status', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setConnected(data.connected ?? false))
      .catch(() => setConnected(false));
  }, []);

  const triggerSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setError(null);

    try {
      const lastUpdate = syncState?.lastSyncTimestamp ?? 0;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`/api/withings-sync?lastupdate=${lastUpdate}&timezone=${encodeURIComponent(tz)}`, {
        credentials: 'include',
      });

      if (res.status === 401) {
        setConnected(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Sync failed');
      }

      const data = await res.json();
      setConnected(true);

      // Write entries to IndexedDB, deduped by withingsGrpId
      for (const entry of data.entries) {
        const existing = await db.weighIns
          .where('withingsGrpId')
          .equals(entry.grpid)
          .first();

        if (existing) {
          // Update weight if changed
          await db.weighIns.update(existing.id!, {
            weight: entry.weight,
            source: 'withings' as const,
          });
        } else {
          // Check if a manual entry exists for this date — Withings takes priority
          const manualEntry = await db.weighIns
            .where('date')
            .equals(entry.date)
            .first();

          if (manualEntry && manualEntry.source === 'manual') {
            await db.weighIns.update(manualEntry.id!, {
              weight: entry.weight,
              source: 'withings' as const,
              withingsGrpId: entry.grpid,
            });
          } else if (!manualEntry) {
            await db.weighIns.add({
              date: entry.date,
              weight: entry.weight,
              source: 'withings',
              withingsGrpId: entry.grpid,
            });
          }
          // If a withings entry already exists for this date (different grpid), skip
        }
      }

      // Update sync state
      if (data.lastSyncTimestamp > 0) {
        await db.syncState.put({
          id: 1,
          lastSyncTimestamp: data.lastSyncTimestamp,
          connectedAt: syncState?.connectedAt ?? new Date().toISOString().split('T')[0],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [syncing, syncState]);

  // Auto-sync on mount when connected
  useEffect(() => {
    if (connected === true) {
      triggerSync();
    }
    // Only run when connection status is first determined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const lastSyncTime = syncState?.lastSyncTimestamp
    ? new Date(syncState.lastSyncTimestamp * 1000).toLocaleString()
    : null;

  return { syncing, connected, lastSyncTime, error, triggerSync };
}
