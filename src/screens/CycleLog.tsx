import { useState } from 'react';
import { useWeighIns } from '../hooks/useWeighIns';
import { useCycleMarkers } from '../hooks/useCycleMarkers';
import { computeCycleLengths } from '../utils/cycleWindows';
import { useNavigate } from 'react-router-dom';
import { toISODate } from '../utils/averages';

export function CycleLog() {
  const { weighIns } = useWeighIns();
  const {
    cycleMarkers,
    addCycleMarker,
    deleteCycleMarker,
    updateCycleMarker,
  } = useCycleMarkers(weighIns);
  const navigate = useNavigate();

  const [newStart, setNewStart] = useState(toISODate(new Date()));
  const [newEnd, setNewEnd] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  const sorted = [...cycleMarkers].sort((a, b) =>
    b.periodStart.localeCompare(a.periodStart)
  );
  const cycleLengths = computeCycleLengths(cycleMarkers);

  async function handleAdd() {
    if (!newStart) return;
    await addCycleMarker(newStart, newEnd || undefined);
    setNewStart(toISODate(new Date()));
    setNewEnd('');
  }

  async function handleDelete(id: number) {
    if (window.confirm('Delete this cycle marker?')) {
      await deleteCycleMarker(id);
    }
  }

  function startEdit(id: number, periodStart: string, periodEnd?: string) {
    setEditingId(id);
    setEditStart(periodStart);
    setEditEnd(periodEnd ?? '');
  }

  async function saveEdit(id: number) {
    if (!editStart) return;
    await updateCycleMarker(id, {
      periodStart: editStart,
      periodEnd: editEnd || undefined,
    });
    setEditingId(null);
  }

  const lengthMap = new Map<string, number>();
  cycleLengths.forEach((cl) => {
    lengthMap.set(cl.to, cl.days);
  });

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1>Cycle Log</h1>
      </div>

      {/* Add new */}
      <div className="card">
        <div className="card-label">Log Period</div>
        <div className="cycle-date-fields">
          <div className="settings-field">
            <label>Start</label>
            <input
              type="date"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="date-input"
            />
          </div>
          <div className="settings-field">
            <label>End <span className="text-muted-inline">(optional)</span></label>
            <input
              type="date"
              value={newEnd}
              min={newStart}
              onChange={(e) => setNewEnd(e.target.value)}
              className="date-input"
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleAdd}>
          Add
        </button>
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <p className="text-muted">No cycle markers logged yet.</p>
      ) : (
        <div className="history-list">
          {sorted.map((marker) => (
            <div key={marker.id} className="history-item">
              {editingId === marker.id ? (
                <div className="history-edit">
                  <div className="cycle-date-fields">
                    <div className="settings-field">
                      <label>Start</label>
                      <input
                        type="date"
                        value={editStart}
                        onChange={(e) => setEditStart(e.target.value)}
                        className="date-input"
                      />
                    </div>
                    <div className="settings-field">
                      <label>End</label>
                      <input
                        type="date"
                        value={editEnd}
                        min={editStart}
                        onChange={(e) => setEditEnd(e.target.value)}
                        className="date-input"
                      />
                    </div>
                  </div>
                  <div className="history-edit-actions">
                    <button
                      className="btn btn-small"
                      onClick={() => saveEdit(marker.id!)}
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
                      {formatDate(marker.periodStart)}
                      {marker.periodEnd && (
                        <> — {formatDate(marker.periodEnd)}</>
                      )}
                    </span>
                    {marker.periodEnd && (
                      <span className="cycle-length">
                        {daysBetween(marker.periodStart, marker.periodEnd) + 1} days
                      </span>
                    )}
                  </div>
                  {lengthMap.has(marker.periodStart) && (
                    <div className="cycle-length">
                      {lengthMap.get(marker.periodStart)} days since previous
                    </div>
                  )}
                  <div className="history-actions">
                    <button
                      className="btn btn-small btn-ghost"
                      onClick={() =>
                        startEdit(marker.id!, marker.periodStart, marker.periodEnd)
                      }
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-small btn-ghost btn-danger"
                      onClick={() => handleDelete(marker.id!)}
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
    month: 'short',
    day: 'numeric',
  });
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}
