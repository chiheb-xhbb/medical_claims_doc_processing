/**
 * StatusBadge - Reusable status badge component
 * 
 * Pure presentational component for displaying document status badges.
 * Supports all document statuses with appropriate colors and icons.
 * 
 * @param {string} status - Document status: 'UPLOADED', 'PROCESSING', 'PROCESSED', 'VALIDATED', 'FAILED'
 */

// Status configuration with Bootstrap classes
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

function StatusBadge({ status }) {
  const normalizedStatus = status?.toUpperCase();
  const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.UPLOADED;

  return (
    <span 
      className={`badge ${config.className} d-inline-flex align-items-center gap-1`}
      style={{
        padding: 'var(--spacing-2) var(--spacing-3)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-semibold)',
        letterSpacing: 'var(--letter-spacing-wide)'
      }}
    >
      {config.spinner ? (
        <span 
          className="spinner-border spinner-border-sm" 
          role="status" 
          style={{ width: '0.75rem', height: '0.75rem' }}
        ></span>
      ) : config.icon && (
        <i className={`bi ${config.icon}`} style={{ fontSize: '0.75rem' }}></i>
      )}
      {config.label}
    </span>
  );
}

export default StatusBadge;
