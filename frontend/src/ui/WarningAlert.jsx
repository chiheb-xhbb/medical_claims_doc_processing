function WarningAlert({ message, warnings = [], title, showIcon = true }) {
  if (!message && warnings.length === 0) return null;

  return (
    <div 
      className="alert alert-warning d-flex align-items-start" 
      role="alert"
      style={{
        borderRadius: 'var(--alert-radius)',
        borderLeft: '4px solid var(--color-warning)',
        padding: 'var(--alert-padding)'
      }}
    >
      {showIcon && (
        <i className="bi bi-exclamation-triangle-fill me-3 text-warning flex-shrink-0" style={{ fontSize: '1.25rem' }}></i>
      )}
      <div className="flex-grow-1">
        {title && <h6 className="alert-heading mb-2 fw-semibold">{title}</h6>}

        {message && <p className="mb-0">{message}</p>}

        {warnings.length > 0 && (
          <ul className="mb-0 ps-3">
            {warnings.map((warning, index) => (
              <li key={index} className="mb-1">{warning}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default WarningAlert;
