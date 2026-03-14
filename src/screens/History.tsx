import { useState } from 'react';
import { useWeighIns } from '../hooks/useWeighIns';
import { useNavigate } from 'react-router-dom';

export function History() {
  const { weighIns, updateWeighIn, deleteWeighIn } = useWeighIns();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editNote, setEditNote] = useState('');

  const sorted = [...weighIns].sort((a, b) => b.date.localeCompare(a.date));

  function startEdit(id: number, weight: number, note?: string) {
    setEditingId(id);
    setEditWeight(weight.toString());
    setEditNote(note ?? '');
  }

  async function saveEdit(id: number) {
    const w = parseFloat(editWeight);
    if (isNaN(w) || w <= 0) return;
    await updateWeighIn(id, { weight: w, note: editNote || undefined });
    setEditingId(null);
  }

  async function handleDelete(id: number) {
    if (window.confirm('Delete this entry?')) {
      await deleteWeighIn(id);
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1>History</h1>
      </div>

      {sorted.length === 0 ? (
        <p className="text-muted">No entries yet.</p>
      ) : (
        <div className="history-list">
          {sorted.map((entry) => (
            <div
              key={entry.id}
              className={`history-item ${entry.inCycleWindow ? 'history-item--cycle' : ''}`}
            >
              {editingId === entry.id ? (
                <div className="history-edit">
                  <div className="history-edit-date">
                    {formatDate(entry.date)}
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="weight-input weight-input--small"
                  />
                  <input
                    type="text"
                    placeholder="Note"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="note-input"
                  />
                  <div className="history-edit-actions">
                    <button
                      className="btn btn-small"
                      onClick={() => saveEdit(entry.id!)}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-small btn-ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="history-item-main">
                    <span className="history-date">
                      {formatDate(entry.date)}
                    </span>
                    <span className="history-weight">
                      {entry.weight.toFixed(1)} lbs
                    </span>
                  </div>
                  {entry.note && (
                    <div className="history-note">{entry.note}</div>
                  )}
                  {entry.inCycleWindow && (
                    <div className="history-cycle-badge">cycle window</div>
                  )}
                  <div className="history-actions">
                    <button
                      className="btn btn-small btn-ghost"
                      onClick={() =>
                        startEdit(entry.id!, entry.weight, entry.note)
                      }
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-small btn-ghost btn-danger"
                      onClick={() => handleDelete(entry.id!)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
