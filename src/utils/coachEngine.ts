import type { CoachingState, CoachingCard } from '../types/coaching';

export function generateCoachingCards(state: CoachingState): CoachingCard[] {
  const cards: CoachingCard[] = [];

  // Priority 0 — Plan not initialized
  if (!state.planInitialized) {
    cards.push({
      id: 'setup',
      priority: 0,
      type: 'action',
      title: 'Set up your plan',
      body: 'Go to Settings to set your plan start date and starting weight. The coach needs this to track your progress.',
      dismissable: false,
    });
    return cards; // Only card when plan isn't initialized
  }

  // Priority 1 — Checkpoint imminent
  if (state.daysUntilCheckpoint !== null && state.daysUntilCheckpoint >= 0 && state.daysUntilCheckpoint <= 3) {
    let guidance = '';
    if (state.projectedVerdict === 'SUCCESS') {
      guidance = 'On track to continue current phase.';
    } else if (state.projectedVerdict === 'MARGINAL') {
      guidance = `Borderline — steps may increase to ${(state.targets.steps + 1000).toLocaleString()}/day. No other changes.`;
    } else if (state.projectedVerdict === 'NO_CHANGE') {
      const nextPhase = Math.min(state.currentPhase + 1, 3);
      guidance = `May need to move to Phase ${nextPhase}. Review with your coach before changing anything.`;
    }

    cards.push({
      id: 'checkpoint',
      priority: 1,
      type: 'checkpoint',
      title: `Checkpoint in ${state.daysUntilCheckpoint} day${state.daysUntilCheckpoint !== 1 ? 's' : ''}`,
      body: `Current delta: ${state.checkpointDelta !== null ? state.checkpointDelta.toFixed(1) : '?'} lbs from Phase ${state.currentPhase} start. Tracking toward: ${state.projectedVerdict ?? 'unknown'}. ${guidance}`,
      dismissable: false,
    });
  }

  // Priority 2 — Retention window
  if (state.inCycleWindow) {
    const resumeStr = state.cycleWindowResumeDate
      ? new Date(state.cycleWindowResumeDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '';
    cards.push({
      id: 'retention',
      priority: 2,
      type: 'info',
      title: 'Retention window',
      body: `Weight typically shifts +2–4 lbs from water retention around menstruation. Excluded from your rolling average.${resumeStr ? ` Resumes ${resumeStr}.` : ''}`,
      dismissable: true,
    });
  }

  // Priority 3 — Sparse data
  if (state.validEntriesInWindow < 5 && !state.inCycleWindow) {
    cards.push({
      id: 'sparse',
      priority: 3,
      type: 'action',
      title: 'More data needed',
      body: `Only ${state.validEntriesInWindow} of 7 entries in the rolling window. Step on the scale tomorrow — the average gets more reliable with daily readings.`,
      dismissable: true,
    });
  }

  // Priority 4 — Trend alerts (only outside cycle window)
  if (!state.inCycleWindow) {
    if (state.rollingAverageTrend === 'up' && state.trendDurationDays >= 5) {
      cards.push({
        id: 'trend-up',
        priority: 4,
        type: 'warning',
        title: `Average trending up for ${state.trendDurationDays} days`,
        body: 'Check calorie-dense portions — oil, butter, nuts, cheese, rice, pasta. Are you weighing or estimating?',
        dismissable: true,
      });
    }

    if (state.rollingAverageTrend === 'down' && state.trendDurationDays >= 5) {
      cards.push({
        id: 'trend-down',
        priority: 4,
        type: 'info',
        title: `Average trending down for ${state.trendDurationDays} days`,
        body: 'Trend is moving in the right direction. No changes — keep doing what you\'re doing.',
        dismissable: true,
      });
    }

    if (state.rollingAverageTrend === 'flat' && state.trendDurationDays >= 14) {
      const nextPhase = Math.min(state.currentPhase + 1, 3);
      cards.push({
        id: 'trend-flat',
        priority: 4,
        type: 'warning',
        title: `Average flat for ${state.trendDurationDays} days`,
        body: `Two weeks without movement at verified intake. If this continues to the checkpoint, the plan calls for escalation to Phase ${nextPhase}.`,
        dismissable: true,
      });
    }
  }

  // Priority 5 — Post-period comparison
  if (state.postPeriodDelta !== null && state.latestPostPeriodAverage !== null) {
    if (state.postPeriodDelta < 0) {
      cards.push({
        id: 'post-period-loss',
        priority: 5,
        type: 'milestone',
        title: `Post-period: ${state.latestPostPeriodAverage.toFixed(1)} lbs (${state.postPeriodDelta.toFixed(1)})`,
        body: `Down ${Math.abs(state.postPeriodDelta).toFixed(1)} lbs from last cycle's post-period average. This is the number that matters — cycle-to-cycle trend after water retention clears.`,
        dismissable: true,
      });
    } else {
      cards.push({
        id: 'post-period-gain',
        priority: 5,
        type: 'info',
        title: `Post-period: ${state.latestPostPeriodAverage.toFixed(1)} lbs (+${state.postPeriodDelta.toFixed(1)})`,
        body: `Up ${state.postPeriodDelta.toFixed(1)} lbs from last cycle. One cycle isn't a pattern — check again after the next period.`,
        dismissable: true,
      });
    }
  } else if (state.latestPostPeriodAverage === null && state.planInitialized) {
    cards.push({
      id: 'post-period-waiting',
      priority: 5,
      type: 'info',
      title: 'Post-period average: awaiting cycle',
      body: 'Log your next period start in the Cycles tab. The post-period average is the plan\'s primary signal — it filters out cycle noise to show your true trend.',
      dismissable: true,
    });
  }

  // Priority 6 — Phase status
  cards.push({
    id: 'phase-status',
    priority: 6,
    type: 'info',
    title: `Phase ${state.currentPhase} · Week ${state.weekNumber} of ${state.weeksInPhase}`,
    body: `${state.targets.calories.toLocaleString()} cal · ${state.targets.protein.min}–${state.targets.protein.max}g protein · ${(state.targets.steps / 1000).toFixed(0)}k steps · ${state.targets.liftDays}x lifting`,
    dismissable: false,
  });

  // Priority 7 — Mise nutrition
  if (state.miseNutrition) {
    const n = state.miseNutrition;
    const calOver = n.calories - state.targets.calories;
    const proteinShort = n.protein < state.targets.protein.min;

    if (calOver > 200) {
      cards.push({
        id: 'mise-over',
        priority: 7,
        type: 'warning',
        title: `Planned intake: over by ${calOver} cal`,
        body: `${n.calories} cal planned vs ${state.targets.calories} target. Where's the overage? Check calorie-dense items.`,
        dismissable: true,
      });
    } else if (proteinShort) {
      cards.push({
        id: 'mise-protein',
        priority: 7,
        type: 'action',
        title: `Protein short: ${n.protein}g / ${state.targets.protein.min}g min`,
        body: 'Add a protein source — scoop of powder in the shake, extra egg at breakfast, or swap a carb side for edamame.',
        dismissable: true,
      });
    } else {
      cards.push({
        id: 'mise-ok',
        priority: 7,
        type: 'info',
        title: 'Planned intake: on target',
        body: `${n.calories} / ${state.targets.calories} cal · ${n.protein}g / ${state.targets.protein.min}–${state.targets.protein.max}g protein`,
        dismissable: true,
      });
    }
  }

  // Priority 8 — No weight today
  if (state.todayWeight === null && state.withingsConnected && !state.inCycleWindow) {
    cards.push({
      id: 'no-weight',
      priority: 8,
      type: 'info',
      title: 'No reading today',
      body: 'Scale hasn\'t synced yet. Step on or refresh the page.',
      dismissable: true,
    });
  }

  // Sort by priority
  cards.sort((a, b) => a.priority - b.priority);

  return cards;
}
