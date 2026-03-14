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
