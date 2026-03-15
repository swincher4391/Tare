import { useState } from 'react';

interface MiseNutritionInputProps {
  onSubmit: (data: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    mealsPlanned: number;
  }) => void;
  onClear: () => void;
  hasData: boolean;
}

export function MiseNutritionInput({ onSubmit, onClear, hasData }: MiseNutritionInputProps) {
  const [open, setOpen] = useState(false);
  const [cal, setCal] = useState('');
  const [pro, setPro] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [meals, setMeals] = useState('');

  function handleSubmit() {
    const c = parseInt(cal);
    const p = parseInt(pro);
    if (isNaN(c) || isNaN(p)) return;
    onSubmit({
      calories: c,
      protein: p,
      fat: parseInt(fat) || 0,
      carbs: parseInt(carbs) || 0,
      mealsPlanned: parseInt(meals) || 0,
    });
    setOpen(false);
  }

  return (
    <details className="mise-input-toggle" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="mise-input-summary">
        {hasData ? 'Nutrition from Mise (entered)' : 'Add today\'s nutrition from Mise'}
      </summary>
      <div className="mise-input-fields">
        <div className="mise-input-row">
          <div className="settings-field">
            <label>Calories</label>
            <input type="number" inputMode="numeric" value={cal} onChange={(e) => setCal(e.target.value)} placeholder="1400" className="weight-input weight-input--small" />
          </div>
          <div className="settings-field">
            <label>Protein (g)</label>
            <input type="number" inputMode="numeric" value={pro} onChange={(e) => setPro(e.target.value)} placeholder="115" className="weight-input weight-input--small" />
          </div>
        </div>
        <div className="mise-input-row">
          <div className="settings-field">
            <label>Fat (g)</label>
            <input type="number" inputMode="numeric" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="52" className="weight-input weight-input--small" />
          </div>
          <div className="settings-field">
            <label>Carbs (g)</label>
            <input type="number" inputMode="numeric" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="145" className="weight-input weight-input--small" />
          </div>
        </div>
        <div className="mise-input-row">
          <div className="settings-field">
            <label>Meals planned</label>
            <input type="number" inputMode="numeric" value={meals} onChange={(e) => setMeals(e.target.value)} placeholder="3" className="weight-input weight-input--small" />
          </div>
        </div>
        <div className="mise-input-actions">
          <button className="btn btn-primary btn-small" onClick={handleSubmit}>Apply</button>
          {hasData && <button className="btn btn-ghost btn-small" onClick={onClear}>Clear</button>}
        </div>
      </div>
    </details>
  );
}
