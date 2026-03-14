import { useLiveQuery } from 'dexie-react-hooks';
import { db, type WeighIn } from '../db';
import { computeRollingAverage } from '../utils/averages';
import { toISODate } from '../utils/averages';

export function useWeighIns() {
  const weighIns = useLiveQuery(() =>
    db.weighIns.orderBy('date').toArray()
  ) ?? [];

  const today = toISODate(new Date());

  const todayEntry = weighIns.find((w) => w.date === today) ?? null;

  const rollingAverage = computeRollingAverage(weighIns, today);

  // Yesterday's rolling average for trend comparison
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayAvg = computeRollingAverage(weighIns, toISODate(yesterday));

  const trend: 'up' | 'down' | 'flat' | null =
    rollingAverage !== null && yesterdayAvg !== null
      ? rollingAverage > yesterdayAvg + 0.1
        ? 'up'
        : rollingAverage < yesterdayAvg - 0.1
          ? 'down'
          : 'flat'
      : null;

  async function addWeighIn(
    weight: number,
    note?: string,
    inCycleWindow?: boolean,
    date?: string
  ) {
    const entryDate = date ?? today;
    // Check if entry exists for this date
    const existing = await db.weighIns.where('date').equals(entryDate).first();
    if (existing) {
      await db.weighIns.update(existing.id!, { weight, note, inCycleWindow });
    } else {
      await db.weighIns.add({ date: entryDate, weight, note, inCycleWindow });
    }
  }

  async function updateWeighIn(id: number, data: Partial<WeighIn>) {
    await db.weighIns.update(id, data);
  }

  async function deleteWeighIn(id: number) {
    await db.weighIns.delete(id);
  }

  return {
    weighIns,
    todayEntry,
    rollingAverage,
    yesterdayAvg,
    trend,
    addWeighIn,
    updateWeighIn,
    deleteWeighIn,
  };
}
