interface PhaseIndicatorProps {
  phase: 1 | 2 | 3;
  currentWeek: number | null;
  totalWeeks: number;
  daysToCheckpoint: number | null;
}

export function PhaseIndicator({
  phase,
  currentWeek,
  totalWeeks,
  daysToCheckpoint,
}: PhaseIndicatorProps) {
  const weekDisplay = currentWeek
    ? `Week ${Math.min(currentWeek, totalWeeks)} of ${totalWeeks}`
    : '';

  const checkpointDisplay =
    daysToCheckpoint !== null
      ? daysToCheckpoint > 0
        ? `Checkpoint in ${daysToCheckpoint} days`
        : daysToCheckpoint === 0
          ? 'Checkpoint today'
          : `Checkpoint was ${Math.abs(daysToCheckpoint)} days ago`
      : '';

  return (
    <div className="phase-indicator">
      <span className="phase-label">Phase {phase}</span>
      {weekDisplay && <span className="phase-week">{weekDisplay}</span>}
      {checkpointDisplay && (
        <span className="phase-checkpoint">{checkpointDisplay}</span>
      )}
    </div>
  );
}
