function PageHeader({ icon, title, subtitle, action, className = '', subtitleClassName = '' }) {
  const headerClassName = ['page-header', 'mb-4', className].filter(Boolean).join(' ');

  return (
    <header className={headerClassName}>
      <div className="page-header__left">
        {icon && (
          <div className="page-header__icon-wrap" aria-hidden="true">
            <i className={`bi ${icon}`} />
          </div>
        )}
        <div className="page-header__text">
          <h2 className="page-header__title">{title}</h2>
          {subtitle && <p className={['page-header__subtitle', subtitleClassName].filter(Boolean).join(' ')}>{subtitle}</p>}
        </div>
      </div>
      {action && <div className="page-header__action">{action}</div>}
    </header>
  );
}

export default PageHeader;
