const STATUS_CONFIG = {
  UPLOADED: {
    className: 'bg-warning text-dark',
    label: 'Uploaded',
    icon: 'bi-cloud-upload'
  },
  PROCESSING: {
    className: 'bg-secondary',
    label: 'Processing',
    spinner: true
  },
  PROCESSED: {
    className: 'bg-success',
    label: 'Processed',
    icon: 'bi-check2'
  },
  VALIDATED: {
    className: 'bg-success',
    label: 'Validated',
    icon: 'bi-check-circle-fill'
  },
  FAILED: {
    className: 'bg-danger',
    label: 'Failed',
    icon: 'bi-x-circle-fill'
  }
};

function StatusBadge({ status, context = 'default', className = '' }) {
  const normalizedStatus = status?.toUpperCase();
  const fallbackConfig = {
    className: 'bg-secondary',
    label: normalizedStatus ? normalizedStatus.replace(/_/g, ' ') : 'Unknown',
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
      {config.label}
    </span>
  );
}

export default StatusBadge;
