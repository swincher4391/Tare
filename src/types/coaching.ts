export interface CoachingState {
  planInitialized: boolean;
  currentPhase: 1 | 2 | 3;
  planStartDate: string;
  phaseStartDate: string;
  targets: {
    calories: number;
    protein: { min: number; max: number };
    steps: number;
    liftDays: number;
  };

  todayWeight: number | null;
  todaySource: 'withings' | 'manual' | null;
  rollingAverage: number | null;
  previousRollingAverage: number | null;
  rollingAverageTrend: 'up' | 'down' | 'flat';
  trendDurationDays: number;
  validEntriesInWindow: number;

  inCycleWindow: boolean;
  cycleWindowResumeDate: string | null;

  latestPostPeriodAverage: number | null;
  previousPostPeriodAverage: number | null;
  postPeriodDelta: number | null;

  daysUntilCheckpoint: number | null;
  projectedVerdict: 'SUCCESS' | 'MARGINAL' | 'NO_CHANGE' | null;
  checkpointDelta: number | null;

  dayNumber: number;
  weekNumber: number;
  weeksInPhase: number;

  withingsConnected: boolean;

  bodyCompTrend: {
    latestFatPercent: number;
    fatDelta: number;
    latestMuscleMassLbs: number;
    muscleDelta: number;
    latestWaterPercent: number;
    daysSpan: number;
    readings: number;
  } | null;

  miseNutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    mealsPlanned: number;
  } | null;
}

export interface CoachingCard {
  id: string;
  priority: number;
  type: 'info' | 'action' | 'checkpoint' | 'warning' | 'milestone';
  title: string;
  body: string;
  dismissable: boolean;
}
