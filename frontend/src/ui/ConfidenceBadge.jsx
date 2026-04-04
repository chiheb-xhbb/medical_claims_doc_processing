function ConfidenceBadge({ score }) {
  if (score === null || score === undefined) {
    return (
      <span className="badge rounded-pill bg-secondary d-inline-flex align-items-center gap-1 confidence-badge">
        <i className="bi bi-question-circle confidence-badge__icon" aria-hidden="true"></i>
        N/A
      </span>
    );
  }

  const percentage = Math.round(score * 100);
  let badgeClass = 'bg-danger';
  let icon = 'bi-exclamation-triangle-fill';

  if (percentage >= 85) {
    badgeClass = 'bg-success';
    icon = 'bi-check-circle-fill';
  } else if (percentage >= 70) {
    badgeClass = 'bg-warning text-dark';
    icon = 'bi-exclamation-circle-fill';
  }

  return (
    <span
      className={`badge rounded-pill ${badgeClass} d-inline-flex align-items-center gap-1 confidence-badge`}
    >
      <i className={`bi ${icon} confidence-badge__icon`} aria-hidden="true"></i>
      {percentage}%
    </span>
  );
}

export default ConfidenceBadge;
