import { useLiveQuery } from 'dexie-react-hooks';
import { db, PHASE1_TARGETS, PHASE2_TARGETS, type PlanConfig } from '../db';
import { toISODate } from '../utils/averages';
import { getCurrentWeek, getCheckpoint1Date, daysUntil } from '../utils/checkpoints';

export function usePlanConfig() {
  const config = useLiveQuery(() => db.planConfig.get(1)) ?? null;

  const today = toISODate(new Date());

  const currentWeek = config ? getCurrentWeek(config.startDate, today) : null;

  const totalWeeksInPhase = 4;

  const checkpoint1Date = config ? getCheckpoint1Date(config.startDate) : null;

  const daysToCheckpoint = checkpoint1Date
    ? daysUntil(today, checkpoint1Date)
    : null;

  async function initConfig(startDate: string, startWeight: number, targets?: typeof PHASE1_TARGETS) {
    await db.planConfig.put({
      id: 1,
      startDate,
      startWeight,
      currentPhase: 1,
      targets: targets ?? PHASE1_TARGETS,
    });
  }

  async function updateConfig(updates: Partial<PlanConfig>) {
    const existing = await db.planConfig.get(1);
    if (existing) {
      await db.planConfig.update(1, updates);
    }
  }

  async function transitionToPhase2(startWeight: number) {
    await db.planConfig.update(1, {
      currentPhase: 2,
      phase2StartDate: today,
      phase2StartWeight: startWeight,
      targets: PHASE2_TARGETS,
    });
  }

  async function transitionToPhase3() {
    await db.planConfig.update(1, {
      currentPhase: 3,
    });
  }

  async function setPhaseManually(phase: 1 | 2 | 3) {
    // Preserve current targets — user may have customized them
    await db.planConfig.update(1, {
      currentPhase: phase,
    });
  }

  async function resetConfig() {
    await db.planConfig.delete(1);
  }

  return {
    config,
    currentWeek,
    totalWeeksInPhase,
    daysToCheckpoint,
    checkpoint1Date,
    initConfig,
    updateConfig,
    transitionToPhase2,
    transitionToPhase3,
    setPhaseManually,
    resetConfig,
  };
}
