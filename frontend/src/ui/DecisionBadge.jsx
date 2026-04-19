import { getDecisionLabel } from '../constants/domainLabels';

const DECISION_CLASS_MAP = {
  ACCEPTED: 'decision-badge--success',
  APPROVED: 'decision-badge--success',
  VALIDATED: 'decision-badge--success',
  PROCESSED: 'decision-badge--success',
  REJECTED: 'decision-badge--danger',
  FAILED: 'decision-badge--danger',
  ERROR: 'decision-badge--danger',
  RETURNED: 'decision-badge--warning',
  COMPLEMENT_REQUESTED: 'decision-badge--warning',
  UNDER_REVIEW: 'decision-badge--warning',
  PARTIAL: 'decision-badge--warning',
  IN_ESCALATION: 'decision-badge--warning',
  AWAITING_COMPLEMENT: 'decision-badge--warning',
  PENDING: 'decision-badge--warning',
  RECEIVED: 'decision-badge--neutral',
  IN_PROGRESS: 'decision-badge--info',
};

function DecisionBadge({ status, className = '' }) {
  const normalizedStatus = (status || '').toString().toUpperCase();
  const label = getDecisionLabel(normalizedStatus);
  const badgeClass = DECISION_CLASS_MAP[normalizedStatus] || 'decision-badge--neutral';

  return (
    <span className={['badge', 'decision-badge', badgeClass, className].filter(Boolean).join(' ')}>
      {label}
    </span>
  );
}

export default DecisionBadge;
