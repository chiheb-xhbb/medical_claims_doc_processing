import { useEffect, useState } from 'react';

function TablePaginationFooter({
  currentPage,
  lastPage,
  total,
  summaryLabel,
  onPageChange,
  disabled = false,
}) {
  const [jumpPage, setJumpPage] = useState(String(currentPage));

  useEffect(() => {
    setJumpPage(String(currentPage));
  }, [currentPage]);

  const isPreviousDisabled = disabled || currentPage <= 1;
  const isNextDisabled = disabled || currentPage >= lastPage;
  const isJumpDisabled = disabled || lastPage <= 1;

  const normalizeTargetPage = (value) => {
    const parsed = Number.parseInt(String(value).trim(), 10);

    if (Number.isNaN(parsed)) {
      return null;
    }

    if (parsed < 1) return 1;
    if (parsed > lastPage) return lastPage;
    return parsed;
  };

  const handleJumpSubmit = () => {
    const targetPage = normalizeTargetPage(jumpPage);

    if (targetPage === null || targetPage === currentPage) {
      setJumpPage(String(currentPage));
      return;
    }

    onPageChange(targetPage);
  };

  const handleJumpKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleJumpSubmit();
    }
  };

  const handleJumpBlur = () => {
    const targetPage = normalizeTargetPage(jumpPage);

    if (targetPage === null) {
      setJumpPage(String(currentPage));
      return;
    }

    setJumpPage(String(targetPage));
  };

  return (
    <div className="card-footer bg-white d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 table-pagination-footer">
      <div className="table-pagination-footer__summary">
        <span className="table-pagination-footer__page-pill">
          Page {currentPage} of {lastPage}
        </span>

        <span className="pagination-info table-pagination-footer__total d-inline-flex align-items-center gap-2">
          <i className="bi bi-grid-3x3-gap" aria-hidden="true"></i>
          {total} total {summaryLabel}
        </span>
      </div>

      <div className="table-pagination-footer__actions">
        <div className="table-pagination-footer__jump">
          <label
            htmlFor={`jump-to-page-${summaryLabel.replace(/\s+/g, '-').toLowerCase()}`}
            className="table-pagination-footer__jump-label"
          >
            Jump to
          </label>

          <div className="table-pagination-footer__jump-controls">
            <input
              id={`jump-to-page-${summaryLabel.replace(/\s+/g, '-').toLowerCase()}`}
              type="number"
              min="1"
              max={lastPage}
              step="1"
              inputMode="numeric"
              className="form-control form-control-sm table-pagination-footer__jump-input"
              value={jumpPage}
              onChange={(event) => setJumpPage(event.target.value)}
              onKeyDown={handleJumpKeyDown}
              onBlur={handleJumpBlur}
              disabled={isJumpDisabled}
              aria-label={`Jump to page for ${summaryLabel}`}
            />

            <button
              type="button"
              className="btn btn-outline-secondary btn-sm table-pagination-footer__jump-btn"
              onClick={handleJumpSubmit}
              disabled={isJumpDisabled}
            >
              Go
            </button>
          </div>
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
    </div>
  );
}

export default TablePaginationFooter;