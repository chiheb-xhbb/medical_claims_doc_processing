/**
 * SectionDivider - Reusable section divider component
 * 
 * Pure presentational component for visual separation between sections.
 * Displays a horizontal line with optional centered text.
 * 
 * @param {string} label - Optional centered label text
 * @param {string} icon - Optional Bootstrap icon class (without 'bi bi-' prefix)
 */
function SectionDivider({ label, icon }) {
  if (!label) {
    return (
      <hr 
        style={{ 
          borderColor: 'var(--color-border-light)',
          margin: 'var(--spacing-6) 0'
        }} 
      />
    );
  }

  return (
    <div className="d-flex align-items-center my-4">
      <hr className="flex-grow-1" style={{ borderColor: 'var(--color-border-light)' }} />
      <span 
        className="px-3 text-muted fw-medium small text-uppercase" 
        style={{ letterSpacing: 'var(--letter-spacing-widest)' }}
      >
        {icon && <i className={`bi bi-${icon} me-2`}></i>}
        {label}
      </span>
      <hr className="flex-grow-1" style={{ borderColor: 'var(--color-border-light)' }} />
    </div>
  );
}

export default SectionDivider;
