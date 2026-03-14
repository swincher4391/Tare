import { useWeighIns } from '../hooks/useWeighIns';
import { usePlanConfig } from '../hooks/usePlanConfig';
import { useCheckpoint } from '../hooks/useCheckpoint';
import { useNavigate } from 'react-router-dom';
import type { CheckpointVerdict } from '../utils/checkpoints';

export function CheckpointReview() {
  const { weighIns, rollingAverage } = useWeighIns();
  const { config, transitionToPhase2, transitionToPhase3 } = usePlanConfig();
  const { checkpoint1, checkpoint2 } = useCheckpoint(config, weighIns);
  const navigate = useNavigate();

  async function handleConfirmPhaseChange(verdict: CheckpointVerdict) {
    if (!verdict.phaseChange) return;
    if (verdict.phaseChange.newPhase === 2 && rollingAverage !== null) {
      await transitionToPhase2(rollingAverage);
    } else if (verdict.phaseChange.newPhase === 3) {
      await transitionToPhase3();
    }
    navigate('/');
  }

  function renderVerdict(verdict: CheckpointVerdict | null, label: string) {
    if (!verdict) {
      return (
        <div className="card">
          <div className="card-label">{label}</div>
          <p className="text-muted">
            Not enough data to compute this checkpoint yet.
          </p>
        </div>
      );
    }

    return (
      <div className="card checkpoint-card">
        <div className="card-label">{label}</div>

        <div className="checkpoint-comparison">
          <div className="checkpoint-avg">
            <span className="checkpoint-avg-label">Baseline</span>
            <span className="checkpoint-avg-value">
              {verdict.baseAverage.toFixed(1)} lbs
            </span>
          </div>
          <div className="checkpoint-arrow">→</div>
          <div className="checkpoint-avg">
            <span className="checkpoint-avg-label">Current</span>
            <span className="checkpoint-avg-value">
              {verdict.currentAverage.toFixed(1)} lbs
            </span>
          </div>
        </div>

        <div className="checkpoint-delta">
          Delta: {verdict.delta > 0 ? '-' : '+'}
          {Math.abs(verdict.delta).toFixed(1)} lbs
        </div>

        <div className={`checkpoint-verdict checkpoint-verdict--${verdict.verdict.split(' ')[0].toLowerCase()}`}>
          <div className="checkpoint-verdict-label">{verdict.verdict}</div>
          <div className="checkpoint-verdict-rec">
            {verdict.recommendation}
          </div>
        </div>

        {verdict.phaseChange && (
          <button
            className="btn btn-primary"
            onClick={() => handleConfirmPhaseChange(verdict)}
          >
            Confirm Phase Change to Phase {verdict.phaseChange.newPhase}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1>Checkpoint Review</h1>
      </div>

      {renderVerdict(checkpoint1, 'Checkpoint 1 — End of Week 4')}

      {config && config.currentPhase >= 2 &&
        renderVerdict(checkpoint2, 'Checkpoint 2 — End of Week 8')}
    </div>
  );
}
