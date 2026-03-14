import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { isInCycleWindow, getCycleResumeDate } from '../utils/cycleWindows';
import { computePostPeriodAverage, toISODate } from '../utils/averages';
import type { WeighIn } from '../db';

export function useCycleMarkers(weighIns: WeighIn[]) {
  const cycleMarkers = useLiveQuery(() =>
    db.cycleMarkers.orderBy('periodStart').toArray()
  ) ?? [];

  const today = toISODate(new Date());
  const inCycleWindow = isInCycleWindow(today, cycleMarkers);
  const resumeDate = getCycleResumeDate(today, cycleMarkers);

  // Compute post-period averages for all completed cycles
  const postPeriodAverages = cycleMarkers
    .map((marker) => {
      const avg = computePostPeriodAverage(weighIns, marker.periodStart);
      return { periodStart: marker.periodStart, average: avg };
    })
    .filter((p) => p.average !== null) as {
    periodStart: string;
    average: number;
  }[];

  // Most recent post-period average
  const latestPostPeriod =
    postPeriodAverages.length > 0
      ? postPeriodAverages[postPeriodAverages.length - 1]
      : null;

  // Previous post-period average for delta
  const previousPostPeriod =
    postPeriodAverages.length > 1
      ? postPeriodAverages[postPeriodAverages.length - 2]
      : null;

  const postPeriodDelta =
    latestPostPeriod && previousPostPeriod
      ? latestPostPeriod.average - previousPostPeriod.average
      : null;

  async function addCycleMarker(periodStart: string) {
    // Prevent duplicate entries for the same date
    const existing = await db.cycleMarkers
      .where('periodStart')
      .equals(periodStart)
      .first();
    if (!existing) {
      await db.cycleMarkers.add({ periodStart });
    }
  }

  async function deleteCycleMarker(id: number) {
    await db.cycleMarkers.delete(id);
  }

  async function updateCycleMarker(id: number, periodStart: string) {
    await db.cycleMarkers.update(id, { periodStart });
  }

  return {
    cycleMarkers,
    inCycleWindow,
    resumeDate,
    postPeriodAverages,
    latestPostPeriod,
    previousPostPeriod,
    postPeriodDelta,
    addCycleMarker,
    deleteCycleMarker,
    updateCycleMarker,
  };
}
