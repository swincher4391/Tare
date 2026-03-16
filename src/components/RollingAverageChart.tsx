import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import type { WeighIn, CycleMarker } from '../db';
import { computeRollingAverage, toISODate } from '../utils/averages';
import { isInCycleWindow } from '../utils/cycleWindows';

interface ChartProps {
  weighIns: WeighIn[];
  cycleMarkers: CycleMarker[];
  checkpointDate?: string | null;
  days?: number;
}

export function RollingAverageChart({
  weighIns,
  cycleMarkers,
  checkpointDate,
  days = 30,
}: ChartProps) {
  // Generate last N days
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(toISODate(d));
  }

  // Build chart data
  const weighInMap = new Map(weighIns.map((w) => [w.date, w]));
  const data = dates.map((date) => {
    const entry = weighInMap.get(date);
    const avg = computeRollingAverage(weighIns, date);
    return {
      date,
      label: new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      weight: entry && !entry.inCycleWindow ? entry.weight : undefined,
      average: avg ?? undefined,
      fatPercent: entry?.fatPercent ?? undefined,
      inCycle: isInCycleWindow(date, cycleMarkers),
    };
  });

  // Find cycle window ranges for shading
  const cycleRanges: { start: string; end: string }[] = [];
  let rangeStart: string | null = null;
  for (const d of data) {
    if (d.inCycle && !rangeStart) {
      rangeStart = d.label;
    } else if (!d.inCycle && rangeStart) {
      cycleRanges.push({ start: rangeStart, end: data[data.indexOf(d) - 1].label });
      rangeStart = null;
    }
  }
  if (rangeStart) {
    cycleRanges.push({ start: rangeStart, end: data[data.length - 1].label });
  }

  // Compute Y domains
  const allWeights = data
    .flatMap((d) => [d.weight, d.average])
    .filter((v): v is number => v !== undefined);
  const minW = allWeights.length > 0 ? Math.floor(Math.min(...allWeights) - 1) : 150;
  const maxW = allWeights.length > 0 ? Math.ceil(Math.max(...allWeights) + 1) : 200;

  const allFat = data
    .map((d) => d.fatPercent)
    .filter((v): v is number => v !== undefined);
  const hasFatData = allFat.length >= 2;
  const minFat = hasFatData ? Math.floor(Math.min(...allFat) - 1) : 0;
  const maxFat = hasFatData ? Math.ceil(Math.max(...allFat) + 1) : 50;

  const checkpointLabel = checkpointDate
    ? new Date(checkpointDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  if (allWeights.length === 0) {
    return (
      <div className="chart-empty">
        <p>No data yet. Log your first weigh-in to see the chart.</p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: hasFatData ? 10 : 10, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="weight"
            domain={[minW, maxW]}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            tickFormatter={(v) => `${v}`}
          />
          {hasFatData && (
            <YAxis
              yAxisId="fat"
              orientation="right"
              domain={[minFat, maxFat]}
              tick={{ fontSize: 10, fill: '#10b981' }}
              tickFormatter={(v) => `${v}%`}
            />
          )}
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '13px',
            }}
            formatter={(value, name) => {
              const v = Number(value);
              if (name === 'Fat %') return [`${v.toFixed(1)}%`];
              return [`${v.toFixed(1)} lbs`];
            }}
          />
          {cycleRanges.map((range, i) => (
            <ReferenceArea
              key={i}
              x1={range.start}
              x2={range.end}
              yAxisId="weight"
              fill="var(--color-cycle-window)"
              fillOpacity={0.15}
            />
          ))}
          {checkpointLabel && (
            <ReferenceLine
              x={checkpointLabel}
              yAxisId="weight"
              stroke="var(--color-accent)"
              strokeDasharray="4 4"
              label={{
                value: 'CP',
                position: 'top',
                fill: 'var(--color-accent)',
                fontSize: 11,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="weight"
            yAxisId="weight"
            stroke="var(--color-text-muted)"
            strokeWidth={1}
            dot={{ r: 3, fill: 'var(--color-text-muted)' }}
            connectNulls={false}
            name="Daily"
          />
          <Line
            type="monotone"
            dataKey="average"
            yAxisId="weight"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            dot={false}
            connectNulls
            name="7-day avg"
          />
          {hasFatData && (
            <Line
              type="monotone"
              dataKey="fatPercent"
              yAxisId="fat"
              stroke="#10b981"
              strokeWidth={1.5}
              dot={{ r: 2, fill: '#10b981' }}
              connectNulls
              name="Fat %"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
