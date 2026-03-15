import type { WeighIn } from '../db';

const MIN_READINGS = 4; // require 4+ readings before surfacing trends
const MIN_DAYS_SPAN = 7; // at least 7 days between first and last reading

export interface BodyCompTrend {
  latestFatPercent: number;
  fatDelta: number;
  latestMuscleMassLbs: number;
  muscleDelta: number;
  latestWaterPercent: number;
  daysSpan: number;
  readings: number;
}

/**
 * Compute body composition trends from weigh-ins that have fat % data.
 * Requires at least MIN_READINGS readings spanning MIN_DAYS_SPAN days.
 */
export function computeBodyCompTrend(weighIns: WeighIn[]): BodyCompTrend | null {
  // Filter to entries with fat % data, sorted by date
  const withFat = weighIns
    .filter((w) => w.fatPercent !== undefined && w.fatPercent > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (withFat.length < MIN_READINGS) return null;

  const first = withFat[0];
  const latest = withFat[withFat.length - 1];

  const firstDate = new Date(first.date + 'T00:00:00');
  const latestDate = new Date(latest.date + 'T00:00:00');
  const daysSpan = Math.round((latestDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSpan < MIN_DAYS_SPAN) return null;

  return {
    latestFatPercent: latest.fatPercent!,
    fatDelta: Math.round((latest.fatPercent! - first.fatPercent!) * 10) / 10,
    latestMuscleMassLbs: latest.muscleMassLbs ?? 0,
    muscleDelta: (latest.muscleMassLbs ?? 0) - (first.muscleMassLbs ?? 0),
    latestWaterPercent: latest.waterPercent ?? 0,
    daysSpan,
    readings: withFat.length,
  };
}
