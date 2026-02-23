/**
 * ConfidenceBadge - Displays a confidence score as a colored percentage badge
 * 
 * Pure presentational component for displaying AI confidence scores.
 * Color logic:
 *   - Green (85%+): High confidence
 *   - Yellow (70-84%): Medium confidence  
 *   - Red (<70%): Low confidence
 * 
 * @param {number} score - Confidence score between 0 and 1
 */
function ConfidenceBadge({ score }) {
  // Badge base styles using design tokens
  const badgeStyle = {
    padding: 'var(--badge-padding-y) var(--badge-padding-x)',
    fontSize: 'var(--badge-font-size)',
    fontWeight: 'var(--badge-font-weight)',
    letterSpacing: 'var(--letter-spacing-wide)',
    transition: 'var(--transition-all)'
  };

  // Handle null or undefined scores
  if (score === null || score === undefined) {
    return (
      <span 
        className="badge rounded-pill bg-secondary d-inline-flex align-items-center gap-1"
        style={badgeStyle}
      >
        <i className="bi bi-question-circle" style={{ fontSize: '0.75rem' }}></i>
        N/A
      </span>
    );
  }

  const percentage = Math.round(score * 100);

  // Determine badge color and icon based on confidence threshold
  let badgeClass = 'bg-danger'; // Red for low confidence (<70%)
  let icon = 'bi-exclamation-triangle-fill';
  
  if (percentage >= 85) {
    badgeClass = 'bg-success'; // Green for high confidence
    icon = 'bi-check-circle-fill';
  } else if (percentage >= 70) {
    badgeClass = 'bg-warning text-dark'; // Yellow for medium confidence
    icon = 'bi-exclamation-circle-fill';
  }

  return (
    <span 
      className={`badge rounded-pill ${badgeClass} d-inline-flex align-items-center gap-1`}
      style={badgeStyle}
    >
      <i className={`bi ${icon}`} style={{ fontSize: '0.75rem' }}></i>
      {percentage}%
    </span>
  );
}

export default ConfidenceBadge;
