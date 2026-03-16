import { useState, useMemo } from 'react';
import type { WeighIn, CycleMarker } from '../db';
import { toISODate } from '../utils/averages';
import { getEffectivePeriodEnd } from '../utils/cycleWindows';

interface CycleCalendarProps {
  weighIns: WeighIn[];
  cycleMarkers: CycleMarker[];
}

type CyclePhase = 'period' | 'exclusion-pre' | 'post-period' | null;

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function getCyclePhase(dateStr: string, cycleMarkers: CycleMarker[]): CyclePhase {
  for (const marker of cycleMarkers) {
    const start = new Date(marker.periodStart + 'T00:00:00');
    const periodEnd = getEffectivePeriodEnd(marker);

    // Pre-period exclusion: day -5 through day -1
    const preStart = new Date(start);
    preStart.setDate(preStart.getDate() - 5);

    // Post-period comparison window: periodEnd+1 through periodEnd+7
    const postStart = new Date(periodEnd + 'T00:00:00');
    postStart.setDate(postStart.getDate() + 1);
    const postEnd = new Date(periodEnd + 'T00:00:00');
    postEnd.setDate(postEnd.getDate() + 7);

    if (dateStr >= toISODate(preStart) && dateStr < marker.periodStart) {
      return 'exclusion-pre';
    }
    if (dateStr >= marker.periodStart && dateStr <= periodEnd) {
      return 'period';
    }
    if (dateStr >= toISODate(postStart) && dateStr <= toISODate(postEnd)) {
      return 'post-period';
    }
  }
  return null;
}

const PHASE_LABELS: Record<string, string> = {
  'period': 'Period',
  'exclusion-pre': 'Retention window',
  'post-period': 'Post-period window',
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function CycleCalendar({ weighIns, cycleMarkers }: CycleCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const todayStr = toISODate(today);

  // Build weight lookup: date → weight
  const weightMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of weighIns) {
      const existing = map.get(w.date);
      if (existing === undefined || w.weight < existing) {
        map.set(w.date, w.weight);
      }
    }
    return map;
  }, [weighIns]);

  // Build water % lookup: date → waterPercent
  const waterMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of weighIns) {
      if (w.waterPercent != null) {
        map.set(w.date, w.waterPercent);
      }
    }
    return map;
  }, [weighIns]);

  // Compute water % range for tint intensity
  const waterValues = Array.from(waterMap.values());
  const waterMin = waterValues.length > 0 ? Math.min(...waterValues) : 0;
  const waterMax = waterValues.length > 0 ? Math.max(...waterValues) : 100;
  const waterRange = waterMax - waterMin || 1;

  const days = getMonthDays(year, month);
  const firstDayOfWeek = days[0].getDay();
  const padBefore = Array.from({ length: firstDayOfWeek }, () => null);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  return (
    <div className="cycle-calendar">
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevMonth} aria-label="Previous month">&larr;</button>
        <button className="cal-month-label" onClick={goToday}>
          {MONTH_NAMES[month]} {year}
        </button>
        <button className="cal-nav-btn" onClick={nextMonth} aria-label="Next month">&rarr;</button>
      </div>

      <div className="cal-grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="cal-header">{d}</div>
        ))}

        {padBefore.map((_, i) => (
          <div key={`pad-${i}`} className="cal-cell cal-cell--empty" />
        ))}

        {days.map((day) => {
          const dateStr = toISODate(day);
          const phase = getCyclePhase(dateStr, cycleMarkers);
          const weight = weightMap.get(dateStr);
          const water = waterMap.get(dateStr);
          const isToday = dateStr === todayStr;

          // Water tint: blue background when water data exists
          const waterStyle = water !== undefined
            ? { backgroundColor: phase ? undefined : `rgba(59, 130, 246, ${0.12 + ((water - waterMin) / waterRange) * 0.18})` }
            : undefined;

          return (
            <div
              key={dateStr}
              className={[
                'cal-cell',
                phase ? `cal-cell--${phase}` : '',
                isToday ? 'cal-cell--today' : '',
              ].join(' ')}
              style={waterStyle}
              title={phase ? PHASE_LABELS[phase] : water !== undefined ? `Water: ${water.toFixed(1)}%` : undefined}
            >
              <span className="cal-day">{day.getDate()}</span>
              {weight !== undefined && (
                <span className="cal-weight">{weight.toFixed(1)}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="cal-legend">
        <div className="cal-legend-item">
          <span className="cal-legend-dot cal-legend-dot--period" />
          <span>Period</span>
        </div>
        <div className="cal-legend-item">
          <span className="cal-legend-dot cal-legend-dot--exclusion-pre" />
          <span>Retention</span>
        </div>
        <div className="cal-legend-item">
          <span className="cal-legend-dot cal-legend-dot--post-period" />
          <span>Post-period</span>
        </div>
        {waterValues.length > 0 && (
          <div className="cal-legend-item">
            <span className="cal-legend-dot cal-legend-dot--water" />
            <span>Water %</span>
          </div>
        )}
      </div>
    </div>
  );
}
