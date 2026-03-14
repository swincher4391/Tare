import { useState, useRef, useEffect } from 'react';

interface WeighInFormProps {
  todayWeight: number | null;
  todayNote: string;
  onSave: (weight: number, note?: string, inCycleWindow?: boolean) => void;
  inCycleWindow?: boolean;
}

export function WeighInForm({
  todayWeight,
  todayNote,
  onSave,
  inCycleWindow,
}: WeighInFormProps) {
  const [weight, setWeight] = useState(todayWeight?.toString() ?? '');
  const [note, setNote] = useState(todayNote);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!todayWeight) {
      inputRef.current?.focus();
    }
  }, [todayWeight]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) return;
    onSave(w, note || undefined, inCycleWindow || undefined);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="weigh-in-form">
      <div className="form-row">
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          step="0.1"
          min="50"
          max="500"
          placeholder="Weight (lbs)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="weight-input"
          aria-label="Weight in pounds"
        />
        <button type="submit" className="save-btn">
          {saved ? '✓ Saved' : todayWeight ? 'Update' : 'Save'}
        </button>
      </div>
      <input
        type="text"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="note-input"
        aria-label="Optional note"
      />
      {inCycleWindow && (
        <p className="cycle-window-note">
          Logged during cycle window — excluded from averages
        </p>
      )}
    </form>
  );
}
