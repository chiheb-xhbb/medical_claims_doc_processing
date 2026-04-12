const VARIANT_CONFIG = {
  warning: { iconDefault: 'bi-exclamation-triangle-fill' },
  danger:  { iconDefault: 'bi-diagram-3' },
  info:    { iconDefault: 'bi-info-circle-fill' },
  success: { iconDefault: 'bi-check-circle-fill' },
};

function WorkflowBanner({ icon, variant = 'warning', title, children, className = '' }) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.warning;
  const iconName = icon || config.iconDefault;
  const bannerClassName = ['workflow-banner', `workflow-banner--${variant}`, 'mb-4', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={bannerClassName} role="status" aria-live="polite">
      <div className="workflow-banner__icon-wrap" aria-hidden="true">
        <i className={`bi ${iconName}`} />
      </div>
      <div className="workflow-banner__body">
        <span className="workflow-banner__title">{title}</span>
        {children && <div className="workflow-banner__detail">{children}</div>}
      </div>
    </div>
  );
}

export default WorkflowBanner;
