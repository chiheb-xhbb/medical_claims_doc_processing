import { useTranslation } from 'react-i18next';

function ErrorAlert({ message, title = 'Error', showIcon = true }) {
  const { t } = useTranslation();
  if (!message) return null;
  const resolvedTitle = title === 'Error' ? t('common.error') : title;

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
        {resolvedTitle && <h6 className="alert-heading mb-1 fw-semibold">{resolvedTitle}</h6>}
        <p className="mb-0">{message}</p>
      </div>
    </div>
  );
}

export default ErrorAlert;
