import Dexie, { type Table } from 'dexie';

export interface WeighIn {
  id?: number;
  date: string;            // ISO date string (YYYY-MM-DD), one entry per day
  weight: number;          // pounds
  source: 'withings' | 'manual';
  withingsGrpId?: number;  // Withings measurement group ID for dedup
  note?: string;           // optional free text ("felt bloated", "post-travel", etc.)
  inCycleWindow?: boolean; // true if logged during cycle window via "log anyway"
}

export interface CycleMarker {
  id?: number;
  periodStart: string;     // ISO date string — first day of period
}

export interface PlanConfig {
  id: 1;                   // singleton record
  startDate: string;       // ISO date — when Phase 1 began
  startWeight: number;     // first 7-day average (computed after first week)
  currentPhase: 1 | 2 | 3;
  phase2StartDate?: string;
  phase2StartWeight?: number;
  targets: {
    calories: number;
    protein: { min: number; max: number };
    steps: number;
    liftDays: number;
  };
}

export interface SyncState {
  id: 1;                    // singleton
  lastSyncTimestamp: number; // epoch seconds
  connectedAt?: string;     // ISO date when OAuth was completed
}

class TrackerDB extends Dexie {
  weighIns!: Table<WeighIn>;
  cycleMarkers!: Table<CycleMarker>;
  planConfig!: Table<PlanConfig>;
  syncState!: Table<SyncState>;

  constructor() {
    super('tare');
    this.version(1).stores({
      weighIns: '++id, date',
      cycleMarkers: '++id, periodStart',
      planConfig: 'id',
    });
    this.version(2).stores({
      weighIns: '++id, date, withingsGrpId',
      cycleMarkers: '++id, periodStart',
      planConfig: 'id',
      syncState: 'id',
    }).upgrade((tx) => {
      // Set source='manual' on all existing entries
      return tx.table('weighIns').toCollection().modify((entry) => {
        if (!entry.source) {
          entry.source = 'manual';
        }
      });
    });
  }
}

export const db = new TrackerDB();

// Default Phase 1 targets
export const PHASE1_TARGETS = {
  calories: 1400,
  protein: { min: 110, max: 120 },
  steps: 8000,
  liftDays: 3,
};

export const PHASE2_TARGETS = {
  calories: 1250,
  protein: { min: 100, max: 110 },
  steps: 10000,
  liftDays: 3,
};
