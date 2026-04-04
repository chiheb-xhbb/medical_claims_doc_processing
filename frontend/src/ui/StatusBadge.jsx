const STATUS_CONFIG = {
  UPLOADED: {
    className: 'bg-secondary',
    label: 'Uploaded',
    icon: 'bi-cloud-upload'
  },
  PROCESSING: {
    className: 'bg-primary',
    label: 'Processing',
    spinner: true
  },
  PROCESSED: {
    className: 'bg-warning text-dark',
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

function StatusBadge({ status, context = 'default' }) {
  const normalizedStatus = status?.toUpperCase();
  const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.UPLOADED;
  const contextClass =
    context === 'table' ? 'badge--context-table' : context === 'hero' ? 'badge--context-hero' : '';

  return (
    <span className={['badge', config.className, contextClass].filter(Boolean).join(' ')}>
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
