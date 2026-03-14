interface PostPeriodHeroProps {
  average: number | null;
  delta: number | null;
  inCycleWindow: boolean;
  nextComparisonDate?: string | null;
}

export function PostPeriodHero({
  average,
  delta,
  inCycleWindow,
  nextComparisonDate,
}: PostPeriodHeroProps) {
  if (average === null) {
    return (
      <div className="hero-metric">
        <div className="hero-label">Post-Period Average</div>
        <div className="hero-value hero-value--empty">—</div>
        <div className="hero-sublabel">
          Log a full cycle to see your true trend
        </div>
      </div>
    );
  }

  const formatted = average.toFixed(1);
  const deltaFormatted =
    delta !== null
      ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)} lbs`
      : null;

  return (
    <div className="hero-metric">
      <div className="hero-label">Post-Period Average</div>
      <div className="hero-value">{formatted} lbs</div>
      {deltaFormatted && (
        <div
          className={`hero-delta ${delta! > 0 ? 'hero-delta--up' : delta! < 0 ? 'hero-delta--down' : ''}`}
        >
          {deltaFormatted} from last cycle
        </div>
      )}
      {inCycleWindow && nextComparisonDate && (
        <div className="hero-sublabel">
          Next comparison available{' '}
          {new Date(nextComparisonDate + 'T00:00:00').toLocaleDateString(
            'en-US',
            { month: 'short', day: 'numeric' }
          )}
        </div>
      )}
    </div>
  );
}
