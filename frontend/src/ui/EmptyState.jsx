/**
 * EmptyState - Reusable empty state component
 * 
 * Pure presentational component for displaying empty content states.
 * Used when lists are empty or no data is available.
 * 
 * @param {string} icon - Bootstrap icon class name (without 'bi bi-' prefix)
 * @param {string} title - Empty state title
 * @param {string} description - Description text
 * @param {React.ReactNode} action - Optional action button/element
 */
function EmptyState({ icon = 'folder2-open', title, description, action }) {
  return (
    <div className="text-center py-5">
      <i 
        className={`bi bi-${icon} text-muted`} 
        style={{ fontSize: '4rem' }}
      ></i>
      {title && (
        <h5 className="mt-3 text-muted">{title}</h5>
      )}
      {description && (
        <p className="text-muted mb-4">{description}</p>
      )}
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
}

export default EmptyState;
