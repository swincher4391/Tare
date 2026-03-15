import type { CoachingState } from '../types/coaching';

export function formatSummary(state: CoachingState): string {
  const parts: string[] = [];

  // Date or Day N
  if (state.planInitialized) {
    parts.push(`Day ${state.dayNumber}`);
  } else {
    const d = new Date();
    parts.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }

  // Weight or retention window
  if (state.inCycleWindow) {
    const resumeStr = state.cycleWindowResumeDate
      ? new Date(state.cycleWindowResumeDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '';
    parts.push(`Retention window${resumeStr ? ` (resumes ${resumeStr})` : ''}`);
    if (state.rollingAverage !== null) {
      parts.push(`Last avg: ${state.rollingAverage.toFixed(1)}`);
    }
  } else if (state.todayWeight !== null) {
    let weightStr = `${state.todayWeight.toFixed(1)} lbs`;
    if (state.bodyCompTrend?.latestFatPercent) {
      weightStr += ` (${state.bodyCompTrend.latestFatPercent}% fat)`;
    }
    parts.push(weightStr);
    if (state.rollingAverage !== null) {
      const arrow = state.rollingAverageTrend === 'up' ? '↑' : state.rollingAverageTrend === 'down' ? '↓' : '→';
      parts.push(`7-day avg: ${state.rollingAverage.toFixed(1)} ${arrow}`);
    }
  } else {
    parts.push('No reading today');
    if (state.rollingAverage !== null) {
      parts.push(`Last avg: ${state.rollingAverage.toFixed(1)}`);
    }
  }

  // Post-period
  if (!state.inCycleWindow) {
    if (state.latestPostPeriodAverage !== null) {
      let ppStr = `Post-period: ${state.latestPostPeriodAverage.toFixed(1)}`;
      if (state.postPeriodDelta !== null) {
        const sign = state.postPeriodDelta <= 0 ? '' : '+';
        ppStr += ` (${sign}${state.postPeriodDelta.toFixed(1)})`;
      }
      parts.push(ppStr);
    } else if (state.planInitialized) {
      parts.push('Post-period: awaiting cycle');
    }
  }

  // Phase info
  if (state.planInitialized) {
    let phaseStr = `Phase ${state.currentPhase} Week ${state.weekNumber}`;
    if (state.daysUntilCheckpoint !== null && state.daysUntilCheckpoint > 0) {
      phaseStr += ` · Checkpoint in ${state.daysUntilCheckpoint} days`;
    }
    parts.push(phaseStr);
  } else {
    parts.push('Plan not started');
  }

  return parts.join(' | ');
}
