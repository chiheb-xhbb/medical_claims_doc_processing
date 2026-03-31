function SortableHeader({ label, sortBy, sortState, onSortChange, disabled = false }) {
  const isActive = sortState?.sortBy === sortBy;
  const iconClass = isActive
    ? sortState?.sortDirection === 'asc'
      ? 'bi-arrow-up'
      : 'bi-arrow-down'
    : 'bi-arrow-down-up';

  return (
    <th scope="col" className={`sortable-column ${isActive ? 'sort-active' : ''}`}>
      <button
        type="button"
        className="sort-header-button"
        onClick={() => onSortChange(sortBy)}
        disabled={disabled}
        aria-label={`Sort by ${label} ${isActive && sortState?.sortDirection === 'asc' ? 'descending' : 'ascending'}`}
      >
        <span>{label}</span>
        <i className={`bi ${iconClass} sort-indicator`} aria-hidden="true"></i>
      </button>
    </th>
  );
}

export default SortableHeader;
