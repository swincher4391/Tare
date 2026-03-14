import { useState } from 'react';
import { WeighInForm } from './WeighInForm';

interface CycleWindowMessageProps {
  resumeDate: string;
  todayWeight: number | null;
  todayNote: string;
  onLogAnyway: (weight: number, note?: string) => void;
}

export function CycleWindowMessage({
  resumeDate,
  todayWeight,
  todayNote,
  onLogAnyway,
}: CycleWindowMessageProps) {
  const [showForm, setShowForm] = useState(false);

  const formatted = new Date(resumeDate + 'T00:00:00').toLocaleDateString(
    'en-US',
    { weekday: 'short', month: 'short', day: 'numeric' }
  );

  return (
    <div className="cycle-window-message">
      <p className="cycle-window-text">
        <strong>Retention window</strong>
      </p>
      <p className="cycle-window-detail">
        Weight typically shifts +2–4 lbs from water retention around menstruation. Excluded from your rolling average.
      </p>
      <p className="cycle-window-text">
        <span className="cycle-resume">Resumes {formatted}</span>
      </p>
      {!showForm ? (
        <button
          className="log-anyway-btn"
          onClick={() => setShowForm(true)}
        >
          Log anyway
        </button>
      ) : (
        <WeighInForm
          todayWeight={todayWeight}
          todayNote={todayNote}
          onSave={(w, n) => onLogAnyway(w, n)}
          inCycleWindow
        />
      )}
    </div>
  );
}
