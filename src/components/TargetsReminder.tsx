interface TargetsReminderProps {
  calories: number;
  protein: { min: number; max: number };
  steps: number;
  liftDays: number;
}

export function TargetsReminder({
  calories,
  protein,
  steps,
  liftDays,
}: TargetsReminderProps) {
  const stepsDisplay =
    steps >= 1000 ? `${(steps / 1000).toFixed(0)}k` : `${steps}`;

  return (
    <div className="targets-reminder">
      <span>{calories.toLocaleString()} cal</span>
      <span className="targets-sep">·</span>
      <span>
        {protein.min}-{protein.max}g protein
      </span>
      <span className="targets-sep">·</span>
      <span>{stepsDisplay} steps</span>
      <span className="targets-sep">·</span>
      <span>{liftDays}x lifting</span>
    </div>
  );
}
