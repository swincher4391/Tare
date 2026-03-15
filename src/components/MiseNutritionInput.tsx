import { useState, useRef } from 'react';
import { parseMiseClipboard } from '../utils/parseMiseClipboard';

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

function isMiseShareUrl(text: string): boolean {
  return text.trim().includes('mise.swinch.dev/api/r');
}

export function MiseNutritionInput({ onSubmit, onClear, hasData }: MiseNutritionInputProps) {
  const [showManual, setShowManual] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [parseError, setParseError] = useState<string | false>(false);
  const [fetching, setFetching] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Manual fields
  const [cal, setCal] = useState('');
  const [pro, setPro] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [meals, setMeals] = useState('');

  async function handlePasteText(text: string) {
    setParseError(false);

    // Try mise: format first
    const parsed = parseMiseClipboard(text);
    if (parsed) {
      setPasteValue('');
      if (detailsRef.current) detailsRef.current.open = false;
      onSubmit(parsed);
      return;
    }

    // Try Mise share URL
    if (isMiseShareUrl(text)) {
      setPasteValue(text);
      setFetching(true);
      try {
        const res = await fetch(`/api/mise-nutrition?url=${encodeURIComponent(text.trim())}`);
        if (!res.ok) {
          const data = await res.json();
          setParseError(data.error || 'Failed to fetch nutrition');
          return;
        }
        const data = await res.json();
        setPasteValue('');
        if (detailsRef.current) detailsRef.current.open = false;
        onSubmit({
          calories: Math.round(data.calories),
          protein: Math.round(data.protein),
          fat: Math.round(data.fat),
          carbs: Math.round(data.carbs),
          mealsPlanned: 1,
        });
      } catch {
        setParseError('Failed to fetch nutrition from link');
      } finally {
        setFetching(false);
      }
      return;
    }

    // Neither format
    setPasteValue(text);
    if (text.length > 3) setParseError('Couldn\'t parse — try a mise: string, share link, or enter manually');
  }

  function handleManualSubmit() {
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
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details className="mise-input-toggle" ref={detailsRef}>
      <summary className="mise-input-summary">
        {hasData ? 'Nutrition from Mise (entered)' : 'Add today\'s nutrition from Mise'}
      </summary>
      <div className="mise-input-fields">
        {!showManual ? (
          <>
            <input
              type="text"
              className="note-input"
              placeholder="Paste mise: string or share link"
              value={pasteValue}
              onChange={(e) => {
                setPasteValue(e.target.value);
                setParseError(false);
              }}
              onPaste={(e) => {
                e.preventDefault();
                handlePasteText(e.clipboardData.getData('text'));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pasteValue) {
                  handlePasteText(pasteValue);
                }
              }}
            />
            {fetching && <p className="text-muted" style={{ fontSize: '0.85rem' }}>Fetching nutrition...</p>}
            {parseError && <p className="error-message">{parseError}</p>}
            <button
              className="mise-manual-toggle"
              onClick={() => setShowManual(true)}
            >
              or enter manually
            </button>
          </>
        ) : (
          <>
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
              <button className="btn btn-primary btn-small" onClick={handleManualSubmit}>Apply</button>
              <button className="btn btn-ghost btn-small" onClick={() => setShowManual(false)}>Back to paste</button>
            </div>
          </>
        )}
        {hasData && (
          <div className="mise-input-actions" style={{ marginTop: '8px' }}>
            <button className="btn btn-ghost btn-small" onClick={onClear}>Clear nutrition</button>
          </div>
        )}
      </div>
    </details>
  );
}
