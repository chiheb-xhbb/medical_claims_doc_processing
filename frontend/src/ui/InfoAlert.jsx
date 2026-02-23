/**
 * Info alert component
 * @param {string} message - Info message
 * @param {string} title - Optional title
 * @param {boolean} showIcon - Show icon (default: true)
 */
function InfoAlert({ message, title, showIcon = true }) {
  if (!message) return null;

  return (
    <div 
      className="alert alert-info d-flex align-items-start" 
      role="alert"
      style={{
        borderRadius: 'var(--alert-radius)',
        borderLeft: '4px solid var(--color-info)',
        padding: 'var(--alert-padding)'
      }}
    >
      {showIcon && (
        <i className="bi bi-info-circle-fill me-3 text-info flex-shrink-0" style={{ fontSize: '1.25rem' }}></i>
      )}
      <div>
        {title && <h6 className="alert-heading mb-1 fw-semibold">{title}</h6>}
        <p className="mb-0">{message}</p>
      </div>
    </div>
  );
}

export default InfoAlert;
