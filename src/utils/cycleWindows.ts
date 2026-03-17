import type { CycleMarker } from '../db';
import { toISODate } from './averages';

/** Default period length (days) when no end date is provided */
const DEFAULT_PERIOD_DAYS = 5;

/**
 * Get the effective last day of the period.
 * Uses periodEnd if set, otherwise periodStart + 4 (5 days total).
 */
function getEffectivePeriodEnd(marker: CycleMarker): string {
  if (marker.periodEnd) return marker.periodEnd;
  const d = new Date(marker.periodStart + 'T00:00:00');
  d.setDate(d.getDate() + DEFAULT_PERIOD_DAYS - 1);
  return toISODate(d);
}

/**
 * Check if a given date falls within any cycle exclusion window.
 * Exclusion window: periodStart - 5 days through periodEnd (or periodStart + 3 if no end).
 */
export function isInCycleWindow(
  date: string,
  cycleMarkers: CycleMarker[]
): boolean {
  return cycleMarkers.some((marker) => {
    const start = new Date(marker.periodStart + 'T00:00:00');
    const excludeStart = new Date(start);
    excludeStart.setDate(excludeStart.getDate() - 5);

    const periodEnd = getEffectivePeriodEnd(marker);

    return date >= toISODate(excludeStart) && date <= periodEnd;
  });
}

/**
 * Get the resume date — day after period ends.
 */
export function getCycleResumeDate(
  date: string,
  cycleMarkers: CycleMarker[]
): string | null {
  for (const marker of cycleMarkers) {
    const start = new Date(marker.periodStart + 'T00:00:00');
    const excludeStart = new Date(start);
    excludeStart.setDate(excludeStart.getDate() - 5);

    const periodEnd = getEffectivePeriodEnd(marker);

    if (date >= toISODate(excludeStart) && date <= periodEnd) {
      const resume = new Date(periodEnd + 'T00:00:00');
      resume.setDate(resume.getDate() + 1);
      return toISODate(resume);
    }
  }
  return null;
}

/**
 * Check if a date is during the period itself (not the pre-period exclusion).
 */
export function isInPeriod(
  date: string,
  cycleMarkers: CycleMarker[]
): boolean {
  return cycleMarkers.some((marker) => {
    const periodEnd = getEffectivePeriodEnd(marker);
    return date >= marker.periodStart && date <= periodEnd;
  });
}

/**
 * Get the period end date for a given marker.
 */
export { getEffectivePeriodEnd };

/**
 * Get the current cycle day (1-based, day 1 = period start).
 * Returns null if no cycle markers exist or today is before the first marker.
 */
export function getCurrentCycleDay(
  today: string,
  cycleMarkers: CycleMarker[]
): number | null {
  const sorted = [...cycleMarkers]
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart));

  // Find the most recent period start that's on or before today
  let latest: CycleMarker | null = null;
  for (const marker of sorted) {
    if (marker.periodStart <= today) {
      latest = marker;
    }
  }
  if (!latest) return null;

  const start = new Date(latest.periodStart + 'T00:00:00');
  const t = new Date(today + 'T00:00:00');
  const days = Math.round((t.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return days + 1; // 1-based
}

/**
 * Find the weight on the same cycle day from the previous cycle.
 * Returns the weight and date, or null if not available.
 */
export function getPreviousCycleDayWeight(
  today: string,
  cycleMarkers: CycleMarker[],
  weighIns: { date: string; weight: number }[]
): { weight: number; date: string } | null {
  const sorted = [...cycleMarkers]
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart));

  // Find current and previous period starts
  let currentIdx = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].periodStart <= today) {
      currentIdx = i;
    }
  }
  if (currentIdx < 1) return null; // need at least 2 cycles

  const currentStart = new Date(sorted[currentIdx].periodStart + 'T00:00:00');
  const previousStart = new Date(sorted[currentIdx - 1].periodStart + 'T00:00:00');
  const t = new Date(today + 'T00:00:00');

  const cycleDay = Math.round((t.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));

  // Same cycle day in previous cycle
  const prevDate = new Date(previousStart);
  prevDate.setDate(prevDate.getDate() + cycleDay);
  const prevDateStr = toISODate(prevDate);

  const entry = weighIns.find((w) => w.date === prevDateStr);
  if (!entry) return null;

  return { weight: entry.weight, date: prevDateStr };
}

/**
 * Get weights for a specific cycle day across all cycles.
 * If exact day is missing, averages adjacent days (day-1 and day+1).
 * Returns array of { cycleStart, date, weight, interpolated } sorted chronologically.
 */
export function getWeightsForCycleDay(
  cycleDay: number,
  cycleMarkers: CycleMarker[],
  weighIns: { date: string; weight: number }[]
): { cycleStart: string; date: string; weight: number; interpolated: boolean }[] {
  const sorted = [...cycleMarkers]
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart));

  const weighInMap = new Map(weighIns.map((w) => [w.date, w.weight]));
  const results: { cycleStart: string; date: string; weight: number; interpolated: boolean }[] = [];

  for (const marker of sorted) {
    const start = new Date(marker.periodStart + 'T00:00:00');
    const targetDate = new Date(start);
    targetDate.setDate(targetDate.getDate() + (cycleDay - 1));
    const dateStr = toISODate(targetDate);

    const exact = weighInMap.get(dateStr);
    if (exact !== undefined) {
      results.push({ cycleStart: marker.periodStart, date: dateStr, weight: exact, interpolated: false });
      continue;
    }

    // Try averaging adjacent days
    const prev = new Date(targetDate);
    prev.setDate(prev.getDate() - 1);
    const next = new Date(targetDate);
    next.setDate(next.getDate() + 1);
    const prevWeight = weighInMap.get(toISODate(prev));
    const nextWeight = weighInMap.get(toISODate(next));

    if (prevWeight !== undefined && nextWeight !== undefined) {
      results.push({
        cycleStart: marker.periodStart,
        date: dateStr,
        weight: Math.round(((prevWeight + nextWeight) / 2) * 10) / 10,
        interpolated: true,
      });
    } else if (prevWeight !== undefined) {
      results.push({ cycleStart: marker.periodStart, date: dateStr, weight: prevWeight, interpolated: true });
    } else if (nextWeight !== undefined) {
      results.push({ cycleStart: marker.periodStart, date: dateStr, weight: nextWeight, interpolated: true });
    }
    // If no adjacent data either, skip this cycle
  }

  return results;
}

/**
 * Compute cycle lengths (days between consecutive period starts).
 */
export function computeCycleLengths(
  cycleMarkers: CycleMarker[]
): { from: string; to: string; days: number }[] {
  const sorted = [...cycleMarkers].sort((a, b) =>
    a.periodStart.localeCompare(b.periodStart)
  );

  const lengths: { from: string; to: string; days: number }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].periodStart + 'T00:00:00');
    const curr = new Date(sorted[i].periodStart + 'T00:00:00');
    const days = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    );
    lengths.push({
      from: sorted[i - 1].periodStart,
      to: sorted[i].periodStart,
      days,
    });
  }
  return lengths;
}
