import { useState, useMemo } from 'react';
import { useCoachingState } from '../hooks/useCoachingState';
import { useWithingsSync } from '../hooks/useWithingsSync';
import { generateCoachingCards } from '../utils/coachEngine';
import { CoachingCard } from '../components/CoachingCard';
import { MiseNutritionInput } from '../components/MiseNutritionInput';
import { useNavigate } from 'react-router-dom';

interface MiseNutrition {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  mealsPlanned: number;
}

export function Coach() {
  const { connected } = useWithingsSync();
  const coachingState = useCoachingState(connected ?? false);
  const navigate = useNavigate();

  const [miseNutrition, setMiseNutrition] = useState<MiseNutrition | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const cards = useMemo(() => {
    if (!coachingState) return [];
    const stateWithMise = { ...coachingState, miseNutrition };
    return generateCoachingCards(stateWithMise);
  }, [coachingState, miseNutrition]);

  const visibleCards = cards.filter((c) => !dismissed.has(c.id));

  function handleDismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
  }

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
          onSubmit={setMiseNutrition}
          onClear={() => setMiseNutrition(null)}
          hasData={miseNutrition !== null}
        />
      </div>

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
