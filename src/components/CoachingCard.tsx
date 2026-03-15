import type { CoachingCard as CoachingCardType } from '../types/coaching';

interface CoachingCardProps {
  card: CoachingCardType;
  onDismiss?: () => void;
}

export function CoachingCard({ card, onDismiss }: CoachingCardProps) {
  return (
    <div className={`coaching-card coaching-card--${card.type}`}>
      <div className="coaching-card-content">
        <div className="coaching-card-title">{card.title}</div>
        <div className="coaching-card-body">{card.body}</div>
      </div>
      {card.dismissable && onDismiss && (
        <button
          className="coaching-card-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}
