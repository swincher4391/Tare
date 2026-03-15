import { useState, useMemo } from 'react';
import { useCoachingState } from '../hooks/useCoachingState';
import { useWithingsSync } from '../hooks/useWithingsSync';
import { generateCoachingCards } from '../utils/coachEngine';
import { CoachingCard } from '../components/CoachingCard';
import { MiseNutritionInput } from '../components/MiseNutritionInput';
import { useNavigate } from 'react-router-dom';

interface NutritionEntry {
  label: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export function Coach() {
  const { connected } = useWithingsSync();
  const coachingState = useCoachingState(connected ?? false);
  const navigate = useNavigate();

  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Compute running totals
  const totals = useMemo(() => {
    if (entries.length === 0) return null;
    return {
      calories: entries.reduce((s, e) => s + e.calories, 0),
      protein: entries.reduce((s, e) => s + e.protein, 0),
      fat: entries.reduce((s, e) => s + e.fat, 0),
      carbs: entries.reduce((s, e) => s + e.carbs, 0),
      mealsPlanned: entries.length,
    };
  }, [entries]);

  const cards = useMemo(() => {
    if (!coachingState) return [];
    return generateCoachingCards({ ...coachingState, miseNutrition: totals });
  }, [coachingState, totals]);

  const visibleCards = cards.filter((c) => !dismissed.has(c.id));

  function handleAddEntry(data: { calories: number; protein: number; fat: number; carbs: number; mealsPlanned: number }, label?: string) {
    setEntries((prev) => [...prev, {
      label: label || `Item ${prev.length + 1}`,
      calories: data.calories,
      protein: data.protein,
      fat: data.fat,
      carbs: data.carbs,
    }]);
  }

  function handleRemoveEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
  }

  const targets = coachingState?.targets ?? { calories: 1400, protein: { min: 110, max: 120 }, steps: 8000, liftDays: 3 };

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1>Coach</h1>
      </div>

      <div className="coach-date">{todayStr}</div>

      {/* Mise nutrition input */}
      <div className="card">
        <MiseNutritionInput
          onSubmit={(data, label) => handleAddEntry(data, label)}
          onClear={() => setEntries([])}
          hasData={entries.length > 0}
        />
      </div>

      {/* Logged nutrition entries */}
      {entries.length > 0 && (
        <div className="card">
          <div className="card-label">Today's Intake</div>
          <div className="nutrition-entries">
            {entries.map((entry, i) => (
              <div key={i} className="nutrition-entry">
                <div className="nutrition-entry-header">
                  <span className="nutrition-entry-label">{entry.label}</span>
                  <button
                    className="coaching-card-dismiss"
                    onClick={() => handleRemoveEntry(i)}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
                <div className="nutrition-entry-macros">
                  {entry.calories} cal · {entry.protein}g P · {entry.fat}g F · {entry.carbs}g C
                </div>
              </div>
            ))}
          </div>

          {/* Running total vs targets */}
          {totals && (
            <div className="nutrition-totals">
              <div className="nutrition-total-row">
                <span className="nutrition-total-label">Total</span>
                <span className="nutrition-total-value">{totals.calories} / {targets.calories} cal</span>
              </div>
              <div className="nutrition-total-row">
                <span className="nutrition-total-label">Protein</span>
                <span className="nutrition-total-value">{totals.protein}g / {targets.protein.min}–{targets.protein.max}g</span>
              </div>
              <div className="nutrition-progress">
                <div
                  className="nutrition-progress-bar"
                  style={{ width: `${Math.min(100, (totals.calories / targets.calories) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Coaching cards */}
      {visibleCards.length > 0 ? (
        <div className="coaching-cards">
          {visibleCards.map((card) => (
            <CoachingCard
              key={card.id}
              card={card}
              onDismiss={card.dismissable ? () => handleDismiss(card.id) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="coaching-empty">
          All clear. Stay the course.
        </div>
      )}
    </div>
  );
}
