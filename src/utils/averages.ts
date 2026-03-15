import type { WeighIn } from '../db';

/**
 * Compute 7-day rolling average from the most recent valid weigh-ins
 * up to and including the given date.
 * "Valid" means inCycleWindow !== true.
 * Returns null if fewer than 4 valid entries exist.
 */
export function computeRollingAverage(
  weighIns: WeighIn[],
  asOfDate: string,
  count = 7,
  minEntries = 4
): number | null {
  const valid = weighIns
    .filter((w) => !w.inCycleWindow && w.date <= asOfDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, count);

  if (valid.length < minEntries) return null;

  const sum = valid.reduce((acc, w) => acc + w.weight, 0);
  return sum / valid.length;
}

/**
 * Compute rolling averages for each date in a range (for charting).
 */
export function computeRollingAverageSeries(
  weighIns: WeighIn[],
  dates: string[]
): { date: string; average: number | null }[] {
  return dates.map((date) => ({
    date,
    average: computeRollingAverage(weighIns, date),
  }));
}

/**
 * Compute the post-period average:
 * 7-day average from the 7 days starting at periodStart + 4 (cycle day 4).
 */
export function computePostPeriodAverage(
  weighIns: WeighIn[],
  periodStart: string
): number | null {
  const start = new Date(periodStart + 'T00:00:00');
  const day4 = new Date(start);
  day4.setDate(day4.getDate() + 4);
  const day10 = new Date(start);
  day10.setDate(day10.getDate() + 10);

  const day4Str = toISODate(day4);
  const day10Str = toISODate(day10);

  const valid = weighIns.filter(
    (w) => !w.inCycleWindow && w.date >= day4Str && w.date <= day10Str
  );

  if (valid.length < 4) return null;

  const sum = valid.reduce((acc, w) => acc + w.weight, 0);
  return sum / valid.length;
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
