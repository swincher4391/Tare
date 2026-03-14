import { useState, useEffect } from 'react';
import { usePlanConfig } from '../hooks/usePlanConfig';
import { useWithingsSync } from '../hooks/useWithingsSync';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../db';
import { toISODate } from '../utils/averages';

export function Settings() {
  const { config, initConfig, updateConfig, setPhaseManually, resetConfig } =
    usePlanConfig();
  const { connected, lastSyncTime } = useWithingsSync();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const withingsStatus = searchParams.get('withings');
  const withingsError = searchParams.get('withings_error');

  const [startDate, setStartDate] = useState('');
  const [startWeight, setStartWeight] = useState('');
  const [phase, setPhase] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    if (config) {
      setStartDate(config.startDate);
      setStartWeight(config.startWeight.toString());
      setPhase(config.currentPhase);
    }
  }, [config]);

  async function handleSaveConfig() {
    const w = parseFloat(startWeight);
    if (!startDate || isNaN(w)) return;

    if (config) {
      await updateConfig({ startDate, startWeight: w });
    } else {
      await initConfig(startDate, w);
    }
  }

  async function handlePhaseChange(newPhase: 1 | 2 | 3) {
    setPhase(newPhase);
    await setPhaseManually(newPhase);
  }

  async function handleExport() {
    const data = {
      weighIns: await db.weighIns.toArray(),
      cycleMarkers: await db.cycleMarkers.toArray(),
      planConfig: await db.planConfig.toArray(),
      exportDate: toISODate(new Date()),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tare-export-${toISODate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.weighIns) {
          await db.weighIns.clear();
          await db.weighIns.bulkAdd(
            data.weighIns.map((w: Record<string, unknown>) => {
              const { id: _, ...rest } = w;
              return rest;
            })
          );
        }
        if (data.cycleMarkers) {
          await db.cycleMarkers.clear();
          await db.cycleMarkers.bulkAdd(
            data.cycleMarkers.map((c: Record<string, unknown>) => {
              const { id: _, ...rest } = c;
              return rest;
            })
          );
        }
        if (data.planConfig && data.planConfig.length > 0) {
          await db.planConfig.clear();
          await db.planConfig.bulkAdd(data.planConfig);
        }
        alert('Data imported successfully.');
      } catch {
        alert('Failed to import data. Check the file format.');
      }
    };
    input.click();
  }

  async function handleReset() {
    if (
      !window.confirm(
        'This will permanently delete ALL data. Are you sure?'
      )
    )
      return;
    if (!window.confirm('Really? This cannot be undone.')) return;

    await db.weighIns.clear();
    await db.cycleMarkers.clear();
    await resetConfig();
    navigate('/');
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1>Settings</h1>
      </div>

      {/* Plan Config */}
      <div className="card">
        <div className="card-label">Plan Configuration</div>
        <div className="settings-field">
          <label>Plan Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="date-input"
          />
        </div>
        <div className="settings-field">
          <label>Starting Weight (lbs)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={startWeight}
            onChange={(e) => setStartWeight(e.target.value)}
            className="weight-input weight-input--small"
          />
        </div>
        <button className="btn btn-primary" onClick={handleSaveConfig}>
          {config ? 'Update' : 'Initialize Plan'}
        </button>
      </div>

      {/* Phase Override */}
      {config && (
        <div className="card">
          <div className="card-label">Manual Phase Override</div>
          <div className="phase-buttons">
            {([1, 2, 3] as const).map((p) => (
              <button
                key={p}
                className={`btn btn-small ${phase === p ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handlePhaseChange(p)}
              >
                Phase {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Withings Scale */}
      <div className="card">
        <div className="card-label">Withings Scale</div>
        {withingsStatus === 'connected' && (
          <p className="success-message">Scale connected successfully.</p>
        )}
        {withingsError && (
          <p className="error-message">Connection failed: {withingsError}</p>
        )}
        {connected ? (
          <>
            <p className="sync-status">
              Connected
              {lastSyncTime && <> &middot; Last sync: {lastSyncTime}</>}
            </p>
            <button
              className="btn btn-ghost btn-danger"
              onClick={async () => {
                await fetch('/api/withings-disconnect', {
                  method: 'POST',
                  credentials: 'include',
                });
                window.location.reload();
              }}
            >
              Disconnect Scale
            </button>
          </>
        ) : connected === false ? (
          <a href="/api/withings-authorize" className="btn btn-primary">
            Connect Scale
          </a>
        ) : (
          <p className="text-muted">Checking connection...</p>
        )}
      </div>

      {/* Data */}
      <div className="card">
        <div className="card-label">Data</div>
        <div className="settings-actions">
          <button className="btn btn-ghost" onClick={handleExport}>
            Export JSON
          </button>
          <button className="btn btn-ghost" onClick={handleImport}>
            Import JSON
          </button>
          <button className="btn btn-ghost btn-danger" onClick={handleReset}>
            Reset All Data
          </button>
        </div>
      </div>
    </div>
  );
}
