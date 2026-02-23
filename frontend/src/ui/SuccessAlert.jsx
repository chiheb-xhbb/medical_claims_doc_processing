/**
 * Success alert component
 * @param {string} message - Success message
 * @param {string} title - Optional title (default: 'Success')
 * @param {boolean} showIcon - Show icon (default: true)
 */
function SuccessAlert({ message, title = 'Success', showIcon = true }) {
  if (!message) return null;

  return (
    <div 
      className="alert alert-success d-flex align-items-start" 
      role="alert"
      style={{
        borderRadius: 'var(--alert-radius)',
        borderLeft: '4px solid var(--color-success)',
        padding: 'var(--alert-padding)'
      }}
    >
      {showIcon && (
        <i className="bi bi-check-circle-fill me-3 text-success flex-shrink-0" style={{ fontSize: '1.25rem' }}></i>
      )}
      <div>
        {title && <h6 className="alert-heading mb-1 fw-semibold">{title}</h6>}
        <p className="mb-0">{message}</p>
      </div>
    </div>
  );
}

export default SuccessAlert;
