function ListFiltersCard({ children, className = '', bodyClassName = '' }) {
  const cardClassName = ['card', 'enterprise-filters-card', 'mb-4', className]
    .filter(Boolean)
    .join(' ');
  const cardBodyClassName = ['card-body', bodyClassName].filter(Boolean).join(' ');

  return (
    <section className={cardClassName}>
      <div className={cardBodyClassName}>{children}</div>
    </section>
  );
}

export default ListFiltersCard;
