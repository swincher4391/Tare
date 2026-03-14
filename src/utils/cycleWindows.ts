import type { CycleMarker } from '../db';
import { toISODate } from './averages';

/**
 * Check if a given date falls within any cycle exclusion window.
 * Exclusion window: periodStart - 5 days through periodStart + 3 days.
 */
export function isInCycleWindow(
  date: string,
  cycleMarkers: CycleMarker[]
): boolean {
  return cycleMarkers.some((marker) => {
    const start = new Date(marker.periodStart + 'T00:00:00');
    const excludeStart = new Date(start);
    excludeStart.setDate(excludeStart.getDate() - 5);
    const excludeEnd = new Date(start);
    excludeEnd.setDate(excludeEnd.getDate() + 3);

    return date >= toISODate(excludeStart) && date <= toISODate(excludeEnd);
  });
}

/**
 * Get the resume date (cycle day 4 = periodStart + 4) for the active cycle window.
 */
export function getCycleResumeDate(
  date: string,
  cycleMarkers: CycleMarker[]
): string | null {
  for (const marker of cycleMarkers) {
    const start = new Date(marker.periodStart + 'T00:00:00');
    const excludeStart = new Date(start);
    excludeStart.setDate(excludeStart.getDate() - 5);
    const excludeEnd = new Date(start);
    excludeEnd.setDate(excludeEnd.getDate() + 3);

    if (date >= toISODate(excludeStart) && date <= toISODate(excludeEnd)) {
      const resume = new Date(start);
      resume.setDate(resume.getDate() + 4);
      return toISODate(resume);
    }
  }
  return null;
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
