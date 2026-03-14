import { useState, useMemo } from 'react';
import type { WeighIn, CycleMarker } from '../db';
import { toISODate } from '../utils/averages';

interface CycleCalendarProps {
  weighIns: WeighIn[];
  cycleMarkers: CycleMarker[];
}

type CyclePhase = 'period' | 'exclusion-pre' | 'exclusion-post' | 'post-period' | null;

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

    // Period days: day 0 through day 4 (5 days)
    const periodEnd = new Date(start);
    periodEnd.setDate(periodEnd.getDate() + 4);

    // Pre-period exclusion: day -5 through day -1
    const preStart = new Date(start);
    preStart.setDate(preStart.getDate() - 5);
    const preEnd = new Date(start);
    preEnd.setDate(preEnd.getDate() - 1);

    // Post-period exclusion: day 1 through day 3 (already covered by period overlap)
    // Post-period comparison window: day 4 through day 10
    const postStart = new Date(start);
    postStart.setDate(postStart.getDate() + 4);
    const postEnd = new Date(start);
    postEnd.setDate(postEnd.getDate() + 10);

    const ds = dateStr;

    if (ds >= toISODate(preStart) && ds < marker.periodStart) {
      return 'exclusion-pre';
    }
    if (ds >= marker.periodStart && ds <= toISODate(periodEnd)) {
      return 'period';
    }
    // Day 4-10: post-period comparison window
    if (ds > toISODate(periodEnd) && ds <= toISODate(postEnd)) {
      return 'post-period';
    }
  }
  return null;
}

const PHASE_LABELS: Record<string, string> = {
  'period': 'Period',
  'exclusion-pre': 'Pre-period',
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
      // Keep lowest weight for the day
      if (existing === undefined || w.weight < existing) {
        map.set(w.date, w.weight);
      }
    }
    return map;
  }, [weighIns]);

  const days = getMonthDays(year, month);
  const firstDayOfWeek = days[0].getDay();
  // Pad start to align grid
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
      {/* Month navigation */}
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevMonth} aria-label="Previous month">&larr;</button>
        <button className="cal-month-label" onClick={goToday}>
          {MONTH_NAMES[month]} {year}
        </button>
        <button className="cal-nav-btn" onClick={nextMonth} aria-label="Next month">&rarr;</button>
      </div>

      {/* Weekday headers */}
      <div className="cal-grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="cal-header">{d}</div>
        ))}

        {/* Empty cells before first day */}
        {padBefore.map((_, i) => (
          <div key={`pad-${i}`} className="cal-cell cal-cell--empty" />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dateStr = toISODate(day);
          const phase = getCyclePhase(dateStr, cycleMarkers);
          const weight = weightMap.get(dateStr);
          const isToday = dateStr === todayStr;

          return (
            <div
              key={dateStr}
              className={[
                'cal-cell',
                phase ? `cal-cell--${phase}` : '',
                isToday ? 'cal-cell--today' : '',
              ].join(' ')}
              title={phase ? PHASE_LABELS[phase] ?? '' : undefined}
            >
              <span className="cal-day">{day.getDate()}</span>
              {weight !== undefined && (
                <span className="cal-weight">{weight.toFixed(1)}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="cal-legend">
        <div className="cal-legend-item">
          <span className="cal-legend-dot cal-legend-dot--period" />
          <span>Period</span>
        </div>
        <div className="cal-legend-item">
          <span className="cal-legend-dot cal-legend-dot--exclusion-pre" />
          <span>Pre-period</span>
        </div>
        <div className="cal-legend-item">
          <span className="cal-legend-dot cal-legend-dot--post-period" />
          <span>Post-period</span>
        </div>
      </div>
    </div>
  );
}
