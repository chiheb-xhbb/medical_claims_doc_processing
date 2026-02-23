/**
 * Error alert component
 * @param {string} message - Error message
 * @param {string} title - Optional title (default: 'Error')
 * @param {boolean} showIcon - Show icon (default: true)
 */
function ErrorAlert({ message, title = 'Error', showIcon = true }) {
  if (!message) return null;

  return (
    <div 
      className="alert alert-danger d-flex align-items-start" 
      role="alert"
      style={{
        borderRadius: 'var(--alert-radius)',
        borderLeft: '4px solid var(--color-danger)',
        padding: 'var(--alert-padding)'
      }}
    >
      {showIcon && (
        <i className="bi bi-exclamation-triangle-fill me-3 flex-shrink-0" style={{ fontSize: '1.25rem' }}></i>
      )}
      <div>
        {title && <h6 className="alert-heading mb-1 fw-semibold">{title}</h6>}
        <p className="mb-0">{message}</p>
      </div>
    </div>
  );
}

export default ErrorAlert;
