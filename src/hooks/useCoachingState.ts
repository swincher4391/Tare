import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { CoachingState } from '../types/coaching';
import { computeRollingAverage, toISODate } from '../utils/averages';
import { isInCycleWindow, getCycleResumeDate } from '../utils/cycleWindows';
import { computePostPeriodAverage } from '../utils/averages';
import { computeBodyCompTrend } from '../utils/bodyComp';
import {
  getCheckpoint1Date,
  getCheckpoint2Date,
  daysUntil,
  getCurrentWeek,
  computeCheckpoint1,
  computeCheckpoint2,
} from '../utils/checkpoints';

const FLAT_THRESHOLD = 0.2; // lbs/day — below this is considered "flat"

export function useCoachingState(withingsConnected: boolean): CoachingState | null {
  const weighIns = useLiveQuery(() => db.weighIns.orderBy('date').toArray()) ?? [];
  const cycleMarkers = useLiveQuery(() => db.cycleMarkers.orderBy('periodStart').toArray()) ?? [];
  const config = useLiveQuery(() => db.planConfig.get(1)) ?? null;

  const today = toISODate(new Date());
  const todayEntry = weighIns.find((w) => w.date === today) ?? null;

  const rollingAverage = computeRollingAverage(weighIns, today);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const previousRollingAverage = computeRollingAverage(weighIns, toISODate(yesterday));

  // Trend direction
  let rollingAverageTrend: 'up' | 'down' | 'flat' = 'flat';
  if (rollingAverage !== null && previousRollingAverage !== null) {
    if (rollingAverage > previousRollingAverage + 0.1) rollingAverageTrend = 'up';
    else if (rollingAverage < previousRollingAverage - 0.1) rollingAverageTrend = 'down';
  }

  // Trend duration — walk backward through days
  let trendDurationDays = 0;
  if (rollingAverage !== null) {
    const d = new Date();
    let prevAvg = rollingAverage;
    for (let i = 1; i <= 30; i++) {
      d.setDate(d.getDate() - 1);
      const dayAvg = computeRollingAverage(weighIns, toISODate(d));
      if (dayAvg === null) break;

      const dailyDelta = prevAvg - dayAvg;
      let dayTrend: 'up' | 'down' | 'flat';
      if (Math.abs(dailyDelta) < FLAT_THRESHOLD) dayTrend = 'flat';
      else if (dailyDelta < 0) dayTrend = 'up'; // prevAvg < dayAvg means going up
      else dayTrend = 'down';

      // For flat detection: check if overall change is flat
      if (rollingAverageTrend === 'flat') {
        const totalDelta = Math.abs(rollingAverage - dayAvg);
        if (totalDelta < FLAT_THRESHOLD * i) {
          trendDurationDays = i;
        } else {
          break;
        }
      } else {
        if (dayTrend === rollingAverageTrend || dayTrend === 'flat') {
          trendDurationDays = i;
        } else {
          break;
        }
      }
      prevAvg = dayAvg;
    }
  }

  // Valid entries in window
  const validEntriesInWindow = weighIns
    .filter((w) => !w.inCycleWindow)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7).length;

  // Cycle window
  const inCycleWindow = isInCycleWindow(today, cycleMarkers);
  const cycleWindowResumeDate = getCycleResumeDate(today, cycleMarkers);

  // Post-period averages
  const postPeriodAverages = cycleMarkers
    .map((m) => ({
      periodStart: m.periodStart,
      average: computePostPeriodAverage(weighIns, m.periodStart),
    }))
    .filter((p): p is { periodStart: string; average: number } => p.average !== null);

  const latestPostPeriodAverage = postPeriodAverages.length > 0
    ? postPeriodAverages[postPeriodAverages.length - 1].average
    : null;
  const previousPostPeriodAverage = postPeriodAverages.length > 1
    ? postPeriodAverages[postPeriodAverages.length - 2].average
    : null;
  const postPeriodDelta = latestPostPeriodAverage !== null && previousPostPeriodAverage !== null
    ? latestPostPeriodAverage - previousPostPeriodAverage
    : null;

  // Plan-derived values
  const planInitialized = config !== null;
  const currentPhase = config?.currentPhase ?? 1;
  const planStartDate = config?.startDate ?? today;
  const phaseStartDate = (currentPhase >= 2 && config?.phase2StartDate) ? config.phase2StartDate : planStartDate;
  const targets = config?.targets ?? { calories: 1400, protein: { min: 110, max: 120 }, steps: 8000, liftDays: 3 };

  const dayNumber = planInitialized
    ? Math.round((new Date(today + 'T00:00:00').getTime() - new Date(planStartDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  const weekNumber = planInitialized ? getCurrentWeek(planStartDate, today) : 0;

  // Checkpoint
  let daysUntilCheckpoint: number | null = null;
  let projectedVerdict: 'SUCCESS' | 'MARGINAL' | 'NO_CHANGE' | null = null;
  let checkpointDelta: number | null = null;

  if (config) {
    if (currentPhase >= 2 && config.phase2StartDate) {
      const cp2Date = getCheckpoint2Date(config.phase2StartDate);
      daysUntilCheckpoint = daysUntil(today, cp2Date);
      const cp2 = computeCheckpoint2(config, weighIns);
      if (cp2) {
        projectedVerdict = cp2.verdict as 'SUCCESS' | 'MARGINAL' | 'NO_CHANGE';
        checkpointDelta = cp2.delta;
      }
    } else {
      const cp1Date = getCheckpoint1Date(config.startDate);
      daysUntilCheckpoint = daysUntil(today, cp1Date);
      const cp1 = computeCheckpoint1(config, weighIns);
      if (cp1) {
        projectedVerdict = cp1.verdict as 'SUCCESS' | 'MARGINAL' | 'NO_CHANGE';
        checkpointDelta = cp1.delta;
      }
    }
  }

  return {
    planInitialized,
    currentPhase,
    planStartDate,
    phaseStartDate,
    targets,
    todayWeight: todayEntry?.weight ?? null,
    todaySource: todayEntry?.source ?? null,
    rollingAverage,
    previousRollingAverage,
    rollingAverageTrend,
    trendDurationDays,
    validEntriesInWindow,
    inCycleWindow,
    cycleWindowResumeDate,
    latestPostPeriodAverage,
    previousPostPeriodAverage,
    postPeriodDelta,
    daysUntilCheckpoint,
    projectedVerdict,
    checkpointDelta,
    dayNumber,
    weekNumber,
    weeksInPhase: 4,
    withingsConnected,
    bodyCompTrend: computeBodyCompTrend(weighIns),
    miseNutrition: null, // set by Coach component via state
  };
}
