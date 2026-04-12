const DECISION_CONFIG = {
  ACCEPTED: {
    label: 'Accepted',
    className: 'decision-badge--success',
  },
  APPROVED: {
    label: 'Approved',
    className: 'decision-badge--success',
  },
  VALIDATED: {
    label: 'Validated',
    className: 'decision-badge--success',
  },
  PROCESSED: {
    label: 'Processed',
    className: 'decision-badge--success',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'decision-badge--danger',
  },
  FAILED: {
    label: 'Failed',
    className: 'decision-badge--danger',
  },
  ERROR: {
    label: 'Error',
    className: 'decision-badge--danger',
  },
  RETURNED: {
    label: 'Returned',
    className: 'decision-badge--warning',
  },
  COMPLEMENT_REQUESTED: {
    label: 'Complement Requested',
    className: 'decision-badge--warning',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    className: 'decision-badge--warning',
  },
  PARTIAL: {
    label: 'Partial',
    className: 'decision-badge--warning',
  },
  IN_ESCALATION: {
    label: 'In Escalation',
    className: 'decision-badge--warning',
  },
  AWAITING_COMPLEMENT: {
    label: 'Awaiting Complement',
    className: 'decision-badge--warning',
  },
  PENDING: {
    label: 'Pending',
    className: 'decision-badge--warning',
  },
  RECEIVED: {
    label: 'Received',
    className: 'decision-badge--neutral',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'decision-badge--info',
  },
};

const formatFallbackLabel = (value) => {
  const normalized = (value || '').toString().trim();

  if (!normalized) {
    return '-';
  }

  return normalized
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

function DecisionBadge({ status, className = '' }) {
  const normalizedStatus = (status || '').toString().toUpperCase();
  const config = DECISION_CONFIG[normalizedStatus] || {
    label: formatFallbackLabel(normalizedStatus),
    className: 'decision-badge--neutral',
  };

  return (
    <span className={['badge', 'decision-badge', config.className, className].filter(Boolean).join(' ')}>
      {config.label}
    </span>
  );
}

export default DecisionBadge;
