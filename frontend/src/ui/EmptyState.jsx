function EmptyState({ icon = 'folder2-open', title, description, action }) {
  return (
    <div className="empty-state">
      <i className={`bi bi-${icon} empty-state-icon`}></i>
      {title && (
        <h5 className="empty-state-title">{title}</h5>
      )}
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      {action && (
        <div className="empty-state-actions">{action}</div>
      )}
    </div>
  );
}

export default EmptyState;
