function TablePaginationFooter({
  currentPage,
  lastPage,
  total,
  summaryLabel,
  onPageChange,
  disabled = false,
}) {
  const isPreviousDisabled = disabled || currentPage <= 1;
  const isNextDisabled = disabled || currentPage >= lastPage;

  return (
    <div className="card-footer bg-white d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 table-pagination-footer">
      <div className="table-pagination-footer__summary">
        <span className="table-pagination-footer__page-pill">Page {currentPage} of {lastPage}</span>
        <span className="pagination-info table-pagination-footer__total d-inline-flex align-items-center gap-2">
          <i className="bi bi-grid-3x3-gap" aria-hidden="true"></i>
          {total} total {summaryLabel}
        </span>
      </div>

      <div className="btn-group pagination-controls table-pagination-footer__controls">
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isPreviousDisabled}
          type="button"
        >
          <i className="bi bi-chevron-left me-1" aria-hidden="true"></i>
          Previous
        </button>

        <button
          className="btn btn-outline-primary btn-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isNextDisabled}
          type="button"
        >
          Next
          <i className="bi bi-chevron-right ms-1" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  );
}

export default TablePaginationFooter;
