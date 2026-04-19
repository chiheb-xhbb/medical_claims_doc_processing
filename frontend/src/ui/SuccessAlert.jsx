import { useTranslation } from 'react-i18next';

function SuccessAlert({ message, title = 'Success', showIcon = true }) {
  const { t } = useTranslation();
  if (!message) return null;
  const resolvedTitle = title === 'Success' ? t('common.success') : title;

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
        {resolvedTitle && <h6 className="alert-heading mb-1 fw-semibold">{resolvedTitle}</h6>}
        <p className="mb-0">{message}</p>
      </div>
    </div>
  );
}

export default SuccessAlert;
