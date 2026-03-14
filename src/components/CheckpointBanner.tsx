import type { CheckpointVerdict } from '../utils/checkpoints';

interface CheckpointBannerProps {
  verdict: CheckpointVerdict;
  onReview: () => void;
}

export function CheckpointBanner({ verdict, onReview }: CheckpointBannerProps) {
  return (
    <div className="checkpoint-banner" onClick={onReview}>
      <div className="checkpoint-banner-header">
        Checkpoint {verdict.checkpoint} — {verdict.verdict}
      </div>
      <div className="checkpoint-banner-detail">
        {verdict.recommendation}
      </div>
      <button className="checkpoint-review-link" onClick={onReview}>
        Review details →
      </button>
    </div>
  );
}
