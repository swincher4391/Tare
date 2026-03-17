import type { PlanConfig, WeighIn } from '../db';
import { computeRollingAverage } from './averages';
import { toISODate } from './averages';

export interface CheckpointVerdict {
  checkpoint: 1 | 2;
  baseAverage: number;
  currentAverage: number;
  delta: number;
  verdict: string;
  recommendation: string;
  phaseChange?: { newPhase: 2 | 3 };
}

/**
 * Get the checkpoint date for checkpoint 1 (end of week 4).
 */
export function getCheckpoint1Date(startDate: string): string {
  const d = new Date(startDate + 'T00:00:00');
  d.setDate(d.getDate() + 28); // 4 weeks
  return toISODate(d);
}

/**
 * Get the checkpoint date for checkpoint 2 (end of week 8).
 */
export function getCheckpoint2Date(phase2StartDate: string): string {
  const d = new Date(phase2StartDate + 'T00:00:00');
  d.setDate(d.getDate() + 28); // 4 weeks after phase 2 start
  return toISODate(d);
}

/**
 * Check if today is within ±3 days of a checkpoint date.
 */
export function isNearCheckpoint(today: string, checkpointDate: string): boolean {
  const t = new Date(today + 'T00:00:00');
  const c = new Date(checkpointDate + 'T00:00:00');
  const diff = Math.abs(t.getTime() - c.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= 3;
}

/**
 * Compute Checkpoint 1 verdict (End of Week 4).
 */
export function computeCheckpoint1(
  config: PlanConfig,
  weighIns: WeighIn[]
): CheckpointVerdict | null {
  // Week 1 average: rolling average as of day 7
  const week1End = new Date(config.startDate + 'T00:00:00');
  week1End.setDate(week1End.getDate() + 7);
  const week1Average = computeRollingAverage(weighIns, toISODate(week1End));

  // Week 4 average: current rolling average
  const week4End = getCheckpoint1Date(config.startDate);
  const week4Average = computeRollingAverage(weighIns, week4End);

  if (week1Average === null || week4Average === null) return null;

  const delta = week1Average - week4Average;

  let verdict: string;
  let recommendation: string;
  let phaseChange: { newPhase: 2 | 3 } | undefined;

  if (delta >= 1.5) {
    verdict = 'SUCCESS';
    recommendation = 'Continue Phase 1 targets';
  } else if (delta >= 0.5) {
    verdict = 'MARGINAL';
    recommendation = 'Maintain targets, increase steps to 9,000/day';
  } else {
    verdict = 'NO CHANGE';
    recommendation =
      'Move to Phase 2: reduce to 1,250 kcal, steps to 9-10k';
    phaseChange = { newPhase: 2 };
  }

  return {
    checkpoint: 1,
    baseAverage: week1Average,
    currentAverage: week4Average,
    delta,
    verdict,
    recommendation,
    phaseChange,
  };
}

/**
 * Compute Checkpoint 2 verdict (End of Week 8, only if Phase 2 active).
 */
export function computeCheckpoint2(
  config: PlanConfig,
  weighIns: WeighIn[]
): CheckpointVerdict | null {
  if (config.currentPhase < 2 || !config.phase2StartDate || !config.phase2StartWeight) {
    return null;
  }

  const week8End = getCheckpoint2Date(config.phase2StartDate);
  const week8Average = computeRollingAverage(weighIns, week8End);

  if (week8Average === null) return null;

  const delta = config.phase2StartWeight - week8Average;

  let verdict: string;
  let recommendation: string;
  let phaseChange: { newPhase: 2 | 3 } | undefined;

  if (delta >= 2.0) {
    verdict = 'SUCCESS';
    recommendation = 'Continue Phase 2';
  } else {
    verdict = 'NO CHANGE';
    recommendation = 'Phase 3: Medical investigation recommended';
    phaseChange = { newPhase: 3 };
  }

  return {
    checkpoint: 2,
    baseAverage: config.phase2StartWeight,
    currentAverage: week8Average,
    delta,
    verdict,
    recommendation,
    phaseChange,
  };
}

/**
 * Get days until a checkpoint.
 */
export function daysUntil(today: string, targetDate: string): number {
  const t = new Date(today + 'T00:00:00');
  const d = new Date(targetDate + 'T00:00:00');
  return Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get the current week number in the plan.
 */
export function getCurrentWeek(startDate: string, today: string): number {
  const s = new Date(startDate + 'T00:00:00');
  const t = new Date(today + 'T00:00:00');
  const days = Math.round((t.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(days / 7) + 1;
}
