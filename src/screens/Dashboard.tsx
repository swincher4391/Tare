import { useWeighIns } from '../hooks/useWeighIns';
import { useCycleMarkers } from '../hooks/useCycleMarkers';
import { usePlanConfig } from '../hooks/usePlanConfig';
import { useCheckpoint } from '../hooks/useCheckpoint';
import { useWithingsSync } from '../hooks/useWithingsSync';
import { PostPeriodHero } from '../components/PostPeriodHero';
import { WeighInForm } from '../components/WeighInForm';
import { CycleWindowMessage } from '../components/CycleWindowMessage';
import { RollingAverageChart } from '../components/RollingAverageChart';
import { PhaseIndicator } from '../components/PhaseIndicator';
import { TargetsReminder } from '../components/TargetsReminder';
import { CheckpointBanner } from '../components/CheckpointBanner';
import { CycleCalendar } from '../components/CycleCalendar';
import { CycleDayTrendChart } from '../components/CycleDayTrendChart';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useCoachingState } from '../hooks/useCoachingState';
import { formatSummary } from '../utils/summaryFormatter';
import { getCurrentCycleDay, getPreviousCycleDayWeight, getWeightsForCycleDay } from '../utils/cycleWindows';
import { toISODate } from '../utils/averages';

export function Dashboard() {
  const {
    weighIns,
    todayEntry,
    rollingAverage,
    trend,
    addWeighIn,
  } = useWeighIns();

  const { syncing, connected } = useWithingsSync();
  const coachingState = useCoachingState(connected ?? false);

  const {
    cycleMarkers,
    inCycleWindow,
    resumeDate,
    latestPostPeriod,
    postPeriodDelta,
  } = useCycleMarkers(weighIns);

  const {
    config,
    currentWeek,
    totalWeeksInPhase,
    daysToCheckpoint,
    checkpoint1Date,
  } = usePlanConfig();

  const { activeCheckpoint, showCheckpointBanner } = useCheckpoint(
    config,
    weighIns
  );

  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const trendArrow =
    trend === 'up' ? '↑' : trend === 'down' ? '↓' : trend === 'flat' ? '→' : '';

  // Cycle day tracking
  const today = toISODate(new Date());
  const cycleDay = getCurrentCycleDay(today, cycleMarkers);
  const prevCycleDayWeight = getPreviousCycleDayWeight(today, cycleMarkers, weighIns);
  const cycleDayHistory = cycleDay !== null ? getWeightsForCycleDay(cycleDay, cycleMarkers, weighIns) : [];

  // Next comparison date: latest cycle marker periodStart + 11 days
  const nextComparisonDate = (() => {
    if (cycleMarkers.length === 0) return null;
    const latest = cycleMarkers[cycleMarkers.length - 1];
    const d = new Date(latest.periodStart + 'T00:00:00');
    d.setDate(d.getDate() + 11);
    return d.toISOString().split('T')[0];
  })();

  return (
    <div className="screen dashboard">
      {/* Checkpoint Banner */}
      {showCheckpointBanner && activeCheckpoint && (
        <CheckpointBanner
          verdict={activeCheckpoint}
          onReview={() => navigate('/checkpoint')}
        />
      )}

      {/* Hero: Post-Period Average */}
      <PostPeriodHero
        average={latestPostPeriod?.average ?? null}
        delta={postPeriodDelta}
        inCycleWindow={inCycleWindow}
        nextComparisonDate={nextComparisonDate}
      />

      {/* Cycle Day */}
      {cycleDay !== null && (
        <div className="cycle-day-card">
          <div className="cycle-day-header">
            <div className="cycle-day-number">Day {cycleDay}</div>
            {prevCycleDayWeight ? (
              <div className="cycle-day-compare">
                Last cycle: {prevCycleDayWeight.weight.toFixed(1)} lbs
                {todayEntry && (
                  <span className="cycle-day-delta">
                    {' '}({(todayEntry.weight - prevCycleDayWeight.weight) > 0 ? '+' : ''}{(todayEntry.weight - prevCycleDayWeight.weight).toFixed(1)})
                  </span>
                )}
              </div>
            ) : (
              <div className="cycle-day-compare">No data last cycle</div>
            )}
          </div>
          <CycleDayTrendChart
            cycleDay={cycleDay}
            points={cycleDayHistory}
            todayWeight={todayEntry?.weight}
          />
        </div>
      )}

      {/* Today's Entry */}
      <div className="card">
        <div className="card-label">
          Today
          {todayEntry && (
            <span className="source-indicator">
              {todayEntry.source === 'withings' ? 'via scale' : 'manual'}
            </span>
          )}
          {!todayEntry && syncing && (
            <span className="source-indicator">syncing...</span>
          )}
        </div>
        {inCycleWindow && resumeDate ? (
          <CycleWindowMessage
            resumeDate={resumeDate}
            todayWeight={todayEntry?.weight ?? null}
            todayNote={todayEntry?.note ?? ''}
            onLogAnyway={(w, n) => addWeighIn(w, n, true)}
          />
        ) : todayEntry ? (
          <>
            <div className="today-weight-display">
              <span className="today-weight-value">{todayEntry.weight.toFixed(1)} lbs</span>
              {todayEntry.fatPercent != null && (
                <span className="today-body-comp"> · {todayEntry.fatPercent.toFixed(1)}% fat</span>
              )}
            </div>
            {todayEntry.note && <div className="today-note">{todayEntry.note}</div>}
            <details className="manual-entry-toggle">
              <summary>Log manually</summary>
              <WeighInForm
                todayWeight={todayEntry.weight}
                todayNote={todayEntry.note ?? ''}
                onSave={(w, n) => addWeighIn(w, n)}
              />
            </details>
          </>
        ) : connected ? (
          <>
            <div className="today-weight-display">
              <span className="today-weight-waiting">Waiting for scale sync</span>
            </div>
            <details className="manual-entry-toggle">
              <summary>Log manually</summary>
              <WeighInForm
                todayWeight={null}
                todayNote=""
                onSave={(w, n) => addWeighIn(w, n)}
              />
            </details>
          </>
        ) : (
          <WeighInForm
            todayWeight={null}
            todayNote=""
            onSave={(w, n) => addWeighIn(w, n)}
          />
        )}
      </div>

      {/* Rolling Average */}
      <div className="card">
        <div className="card-label">7-Day Rolling Average</div>
        {rollingAverage !== null ? (
          <div className="rolling-average-display">
            <span className="rolling-average-value">
              {rollingAverage.toFixed(1)} lbs
            </span>
            {trendArrow && (
              <span
                className={`trend-arrow trend-arrow--${trend}`}
                aria-label={`Trend: ${trend}`}
              >
                {trendArrow}
              </span>
            )}
          </div>
        ) : (
          <div className="rolling-average-empty">Not enough data</div>
        )}
      </div>

      {/* Phase & Targets */}
      {config && (
        <>
          <PhaseIndicator
            phase={config.currentPhase}
            currentWeek={currentWeek}
            totalWeeks={totalWeeksInPhase}
            daysToCheckpoint={daysToCheckpoint}
          />
          <TargetsReminder {...config.targets} />
        </>
      )}

      {/* Chart */}
      <div className="card">
        <div className="card-label">30-Day Trend</div>
        <RollingAverageChart
          weighIns={weighIns}
          cycleMarkers={cycleMarkers}
          checkpointDate={checkpoint1Date}
        />
      </div>

      {/* Cycle + Weight Calendar */}
      <div className="card">
        <div className="card-label">Cycle &amp; Weight</div>
        <CycleCalendar weighIns={weighIns} cycleMarkers={cycleMarkers} />
      </div>

      {/* Copy Summary */}
      <button
        className="copy-summary-btn"
        onClick={() => {
          const summary = coachingState ? formatSummary(coachingState) : '';
          navigator.clipboard.writeText(summary).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          });
        }}
      >
        {copied ? 'Copied!' : 'Copy summary'}
      </button>
    </div>
  );
}
