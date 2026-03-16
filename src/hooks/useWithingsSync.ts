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

        // Body comp fields to write alongside weight
        const bodyComp = {
          fatPercent: entry.fatPercent,
          fatMassLbs: entry.fatMassLbs,
          muscleMassLbs: entry.muscleMassLbs,
          waterPercent: entry.waterPercent,
          boneMassLbs: entry.boneMassLbs,
        };

        if (existing) {
          await db.weighIns.update(existing.id!, {
            weight: entry.weight,
            source: 'withings' as const,
            ...bodyComp,
          });
        } else {
          const manualEntry = await db.weighIns
            .where('date')
            .equals(entry.date)
            .first();

          if (manualEntry && manualEntry.source === 'manual') {
            await db.weighIns.update(manualEntry.id!, {
              weight: entry.weight,
              source: 'withings' as const,
              withingsGrpId: entry.grpid,
              ...bodyComp,
            });
          } else if (!manualEntry) {
            await db.weighIns.add({
              date: entry.date,
              weight: entry.weight,
              source: 'withings',
              withingsGrpId: entry.grpid,
              ...bodyComp,
            });
          } else if (manualEntry.source === 'withings' && entry.weight < manualEntry.weight) {
            await db.weighIns.update(manualEntry.id!, {
              weight: entry.weight,
              withingsGrpId: entry.grpid,
              ...bodyComp,
            });
          }
        }
      }

      // Update sync state (preserve existing flags)
      if (data.lastSyncTimestamp > 0) {
        const existing = await db.syncState.get(1);
        await db.syncState.put({
          ...existing,
          id: 1,
          lastSyncTimestamp: data.lastSyncTimestamp,
          connectedAt: existing?.connectedAt ?? syncState?.connectedAt ?? new Date().toISOString().split('T')[0],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [syncing, syncState]);

  // One-time resync to fix timezone issues (v2)
  useEffect(() => {
    if (connected !== true || syncing) return;
    if (syncState === undefined) return; // still loading
    if (syncState && syncState.tzFixApplied) return; // already done

    (async () => {
      // Delete all withings entries and reset sync timestamp
      const withingsEntries = await db.weighIns.where('source').equals('withings').toArray();
      if (withingsEntries.length > 0) {
        await db.weighIns.bulkDelete(withingsEntries.map((e) => e.id!));
      }
      const existingSync = await db.syncState.get(1);
      await db.syncState.put({
        ...existingSync,
        id: 1,
        lastSyncTimestamp: 0,
        connectedAt: syncState?.connectedAt,
        tzFixApplied: true,
      });
      triggerSync();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, syncState]);

  // One-time resync to pull body composition data
  useEffect(() => {
    if (connected !== true || syncing) return;
    if (syncState === undefined) return;
    if (syncState?.bodyCompSyncApplied) return; // already done

    (async () => {
      const withingsEntries = await db.weighIns.where('source').equals('withings').toArray();
      if (withingsEntries.length > 0) {
        await db.weighIns.bulkDelete(withingsEntries.map((e) => e.id!));
      }
      await db.syncState.put({
        id: 1,
        lastSyncTimestamp: 0,
        connectedAt: syncState?.connectedAt,
        tzFixApplied: true,
        bodyCompSyncApplied: true,
      });
      triggerSync();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, syncState]);

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
