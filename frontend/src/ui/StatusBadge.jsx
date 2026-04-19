import i18n from '../i18n';
import { getDocumentStatusLabel } from '../constants/domainLabels';

const STATUS_CONFIG = {
  UPLOADED: {
    className: 'bg-warning text-dark',
    icon: 'bi-cloud-upload'
  },
  PROCESSING: {
    className: 'bg-secondary',
    spinner: true
  },
  PROCESSED: {
    className: 'bg-success',
    icon: 'bi-check2'
  },
  VALIDATED: {
    className: 'bg-success',
    icon: 'bi-check-circle-fill'
  },
  FAILED: {
    className: 'bg-danger',
    icon: 'bi-x-circle-fill'
  }
};

function StatusBadge({ status, context = 'default', className = '' }) {
  const normalizedStatus = status?.toUpperCase();
  const label = normalizedStatus
    ? getDocumentStatusLabel(normalizedStatus)
    : i18n.t('common.unknown');
  const fallbackConfig = {
    className: 'bg-secondary',
    icon: 'bi-question-circle',
  };
  const config = STATUS_CONFIG[normalizedStatus] || fallbackConfig;
  const contextClass =
    context === 'table' ? 'badge--context-table' : context === 'hero' ? 'badge--context-hero' : '';

  return (
    <span className={['badge', 'status-badge', config.className, contextClass, className].filter(Boolean).join(' ')}>
      {config.spinner ? (
        <span
          className="spinner-border spinner-border-sm status-badge-spinner"
          aria-hidden="true"
        />
      ) : config.icon && (
        <i className={`bi ${config.icon}`}></i>
      )}
      {label}
    </span>
  );
}

export default StatusBadge;
