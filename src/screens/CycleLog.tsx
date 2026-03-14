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

  const [newDate, setNewDate] = useState(toISODate(new Date()));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState('');

  const sorted = [...cycleMarkers].sort((a, b) =>
    b.periodStart.localeCompare(a.periodStart)
  );
  const cycleLengths = computeCycleLengths(cycleMarkers);

  async function handleAdd() {
    if (!newDate) return;
    await addCycleMarker(newDate);
    setNewDate(toISODate(new Date()));
  }

  async function handleDelete(id: number) {
    if (window.confirm('Delete this cycle marker?')) {
      await deleteCycleMarker(id);
    }
  }

  function startEdit(id: number, periodStart: string) {
    setEditingId(id);
    setEditDate(periodStart);
  }

  async function saveEdit(id: number) {
    if (!editDate) return;
    await updateCycleMarker(id, editDate);
    setEditingId(null);
  }

  // Build a map of cycle lengths for display
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
        <div className="card-label">Log Period Start</div>
        <div className="cycle-add-form">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="date-input"
          />
          <button className="btn btn-primary" onClick={handleAdd}>
            Add
          </button>
        </div>
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
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="date-input"
                  />
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
                    </span>
                    {lengthMap.has(marker.periodStart) && (
                      <span className="cycle-length">
                        {lengthMap.get(marker.periodStart)} days since previous
                      </span>
                    )}
                  </div>
                  <div className="history-actions">
                    <button
                      className="btn btn-small btn-ghost"
                      onClick={() =>
                        startEdit(marker.id!, marker.periodStart)
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
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
