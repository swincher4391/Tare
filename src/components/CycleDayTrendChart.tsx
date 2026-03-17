import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';

interface CycleDayPoint {
  cycleStart: string;
  date: string;
  weight: number;
  interpolated: boolean;
}

interface CycleDayTrendChartProps {
  cycleDay: number;
  points: CycleDayPoint[];
  todayWeight?: number | null;
}

export function CycleDayTrendChart({ cycleDay, points, todayWeight }: CycleDayTrendChartProps) {
  // Filter to last 12 months
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const cutoff = `${oneYearAgo.getFullYear()}-${String(oneYearAgo.getMonth() + 1).padStart(2, '0')}-${String(oneYearAgo.getDate()).padStart(2, '0')}`;

  const filtered = points.filter((p) => p.cycleStart >= cutoff);

  // Add today's weight as the current cycle's data point if available
  const data = filtered.map((p) => ({
    label: new Date(p.cycleStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    weight: p.weight,
    interpolated: p.interpolated,
  }));

  if (todayWeight != null && data.length > 0) {
    // Check if last point is already from the current cycle
    const lastCycleStart = filtered[filtered.length - 1]?.cycleStart;
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = lastCycleStart?.substring(0, 7);
    if (lastMonth !== thisMonth) {
      data.push({
        label: 'Now',
        weight: todayWeight,
        interpolated: false,
      });
    }
  }

  if (data.length < 2) return null;

  const weights = data.map((d) => d.weight);
  const minW = Math.floor(Math.min(...weights) - 1);
  const maxW = Math.ceil(Math.max(...weights) + 1);

  const first = data[0].weight;
  const last = data[data.length - 1].weight;
  const delta = last - first;

  return (
    <div className="cycle-day-trend">
      <div className="cycle-day-trend-label">Day {cycleDay} across cycles</div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            interval={0}
          />
          <YAxis
            domain={[minW, maxW]}
            tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value) => [`${Number(value).toFixed(1)} lbs`]}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'var(--color-accent)' }}
            connectNulls
          />
          {/* Mark interpolated points with a different style */}
          {data.map((d, i) =>
            d.interpolated ? (
              <ReferenceDot
                key={i}
                x={d.label}
                y={d.weight}
                r={4}
                fill="var(--color-surface)"
                stroke="var(--color-accent)"
                strokeWidth={2}
              />
            ) : null
          )}
        </LineChart>
      </ResponsiveContainer>
      <div className="cycle-day-trend-delta">
        {delta > 0 ? '+' : ''}{delta.toFixed(1)} lbs over {data.length} cycles
      </div>
    </div>
  );
}
