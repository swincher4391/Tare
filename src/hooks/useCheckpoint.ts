import type { PlanConfig, WeighIn } from '../db';
import { toISODate } from '../utils/averages';
import {
  computeCheckpoint1,
  computeCheckpoint2,
  getCheckpoint1Date,
  getCheckpoint2Date,
  isNearCheckpoint,
  type CheckpointVerdict,
} from '../utils/checkpoints';

export function useCheckpoint(
  config: PlanConfig | null,
  weighIns: WeighIn[]
) {
  const today = toISODate(new Date());

  if (!config) {
    return {
      activeCheckpoint: null,
      checkpoint1: null,
      checkpoint2: null,
      showCheckpointBanner: false,
    };
  }

  const cp1Date = getCheckpoint1Date(config.startDate);
  const cp1Near = isNearCheckpoint(today, cp1Date);
  const checkpoint1: CheckpointVerdict | null = computeCheckpoint1(config, weighIns);

  let checkpoint2: CheckpointVerdict | null = null;
  let cp2Near = false;
  if (config.currentPhase >= 2 && config.phase2StartDate) {
    const cp2Date = getCheckpoint2Date(config.phase2StartDate);
    cp2Near = isNearCheckpoint(today, cp2Date);
    checkpoint2 = computeCheckpoint2(config, weighIns);
  }

  // Determine which checkpoint to show
  let activeCheckpoint: CheckpointVerdict | null = null;
  let showCheckpointBanner = false;

  if (cp2Near && checkpoint2) {
    activeCheckpoint = checkpoint2;
    showCheckpointBanner = true;
  } else if (cp1Near && checkpoint1) {
    activeCheckpoint = checkpoint1;
    showCheckpointBanner = true;
  }

  return {
    activeCheckpoint,
    checkpoint1,
    checkpoint2,
    showCheckpointBanner,
  };
}
