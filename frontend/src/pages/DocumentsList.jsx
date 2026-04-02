import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { getApiErrorMessage } from '../services/api';
import { AUTH_CHANGED_EVENT, getStoredRole, getStoredUser } from '../services/auth';
import DocumentUploadModal from '../components/DocumentUploadModal';
import { StatusBadge, ErrorAlert, EmptyState, SuccessAlert, ConfirmationModal, SortableHeader } from '../ui';
import {
  normalizeListFilters,
  buildListQueryParams,
  getNextSortState,
  hasAnyListFilter,
  isDefaultSort
} from '../utils/listQueryUtils';
import './DocumentsList/DocumentsList.css';

const DOCUMENT_STATUS_OPTIONS = ['UPLOADED', 'PROCESSING', 'PROCESSED', 'VALIDATED', 'FAILED'];

const DEFAULT_DOCUMENT_FILTERS = {
  search: '',
  status: '',
  fromDate: '',
  toDate: ''
};

const DEFAULT_DOCUMENT_SORT = {
  sortBy: 'created_at',
  sortDirection: 'desc'
};

function DocumentsList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState(() => getStoredRole());
  const [currentUserId, setCurrentUserId] = useState(() => Number(getStoredUser()?.id || 0));
  const canUpload = role === 'AGENT' || role === 'GESTIONNAIRE' || role === 'ADMIN';

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [retryingIds, setRetryingIds] = useState([]);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [deleteTargetDocument, setDeleteTargetDocument] = useState(null);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState(null);
  const [filtersDraft, setFiltersDraft] = useState(DEFAULT_DOCUMENT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_DOCUMENT_FILTERS);
  const [sortState, setSortState] = useState(DEFAULT_DOCUMENT_SORT);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const currentPageRef = useRef(currentPage);
  const appliedFiltersRef = useRef(DEFAULT_DOCUMENT_FILTERS);
  const appliedSortRef = useRef(DEFAULT_DOCUMENT_SORT);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    const syncRole = () => {
      setRole(getStoredRole());
      setCurrentUserId(Number(getStoredUser()?.id || 0));
    };

    window.addEventListener(AUTH_CHANGED_EVENT, syncRole);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncRole);
    };
  }, []);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    appliedFiltersRef.current = appliedFilters;
  }, [appliedFilters]);

  useEffect(() => {
    appliedSortRef.current = sortState;
  }, [sortState]);

  const needsPolling = useCallback((docs) => {
    return docs.some((doc) => doc.status === 'UPLOADED' || doc.status === 'PROCESSING');
  }, []);

  const formatDocumentError = (message) => {
    if (!message) {
      return 'Processing failed.';
    }

    let cleaned = message.trim();

    cleaned = cleaned.replace(/^FastAPI rejected the document \(HTTP \d+\):\s*/i, '');
    cleaned = cleaned.replace(/^FastAPI service error \(HTTP \d+\):\s*/i, '');
    cleaned = cleaned.replace(/^FastAPI service unavailable:\s*/i, '');
    cleaned = cleaned.replace(/^Pipeline failed:\s*/i, '');
    cleaned = cleaned.replace(/^[A-Za-z]+Error:\s*/i, '');

    return cleaned || 'Processing failed.';
  };

  const fetchDocuments = useCallback(
    async (page = 1, filters = appliedFiltersRef.current, sort = appliedSortRef.current) => {
      try {
        setError(null);

        const response = await api.get('/documents', {
          params: buildListQueryParams(page, filters, sort)
        });
        const data = response.data;

        setDocuments(data.data || []);
        setCurrentPage(data.current_page ?? 1);
        setLastPage(data.last_page ?? 1);
        setTotal(data.total ?? 0);

        return data.data || [];
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load documents. Please try again.');
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const setupPolling = useCallback(
    (docs) => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      if (needsPolling(docs)) {
        pollingIntervalRef.current = setInterval(async () => {
          const newDocs = await fetchDocuments(
            currentPageRef.current,
            appliedFiltersRef.current,
            appliedSortRef.current
          );

          if (!needsPolling(newDocs) && pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }, 3000);
      }
    },
    [fetchDocuments, needsPolling]
  );

  useEffect(() => {
    const loadDocuments = async () => {
      const docs = await fetchDocuments(1, appliedFiltersRef.current, appliedSortRef.current);
      setupPolling(docs);
    };

    loadDocuments();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [fetchDocuments, setupPolling]);

  useEffect(() => {
    const redirectedMessage = location.state?.accessDeniedMessage;
    if (!redirectedMessage) {
      return;
    }

    setAccessDeniedMessage(redirectedMessage);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const handlePageChange = async (page) => {
    if (page < 1 || page > lastPage) return;

    setLoading(true);
    const docs = await fetchDocuments(page, appliedFiltersRef.current, appliedSortRef.current);
    setupPolling(docs);
  };

  const handleUploadModalFinished = async () => {
    setSuccessMessage('Document(s) uploaded successfully.');
    setLoading(true);
    const docs = await fetchDocuments(
      currentPageRef.current,
      appliedFiltersRef.current,
      appliedSortRef.current
    );
    setupPolling(docs);
  };

  const handleFiltersDraftChange = (field, value) => {
    setFiltersDraft((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApplyFilters = async (event) => {
    event.preventDefault();

    const normalizedFilters = normalizeListFilters(filtersDraft);

    setFiltersDraft((prev) => ({
      ...prev,
      search: normalizedFilters.search
    }));
    setAppliedFilters(normalizedFilters);
    appliedFiltersRef.current = normalizedFilters;
    setLoading(true);

    const docs = await fetchDocuments(1, normalizedFilters, appliedSortRef.current);
    setupPolling(docs);
  };

  const handleResetFilters = async () => {
    const resetFilters = { ...DEFAULT_DOCUMENT_FILTERS };
    const resetSort = { ...DEFAULT_DOCUMENT_SORT };

    setFiltersDraft(resetFilters);
    setAppliedFilters(resetFilters);
    setSortState(resetSort);
    appliedFiltersRef.current = resetFilters;
    appliedSortRef.current = resetSort;
    setLoading(true);

    const docs = await fetchDocuments(1, resetFilters, resetSort);
    setupPolling(docs);
  };

  const handleSortChange = async (sortBy) => {
    const nextSort = getNextSortState(sortState, sortBy);

    setSortState(nextSort);
    appliedSortRef.current = nextSort;
    setLoading(true);

    const docs = await fetchDocuments(1, appliedFiltersRef.current, nextSort);
    setupPolling(docs);
  };

  const handleRetry = async (documentId) => {
    try {
      setError(null);
      setSuccessMessage(null);
      setRetryingIds((prev) => [...prev, documentId]);

      await api.post(`/documents/${documentId}/retry`);

      const docs = await fetchDocuments(currentPageRef.current);
      setupPolling(docs);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retry document.');
    } finally {
      setRetryingIds((prev) => prev.filter((id) => id !== documentId));
    }
  };

  const canDeleteDocument = (doc) => {
    const canDeleteByStatus = ['UPLOADED', 'FAILED', 'PROCESSED'].includes(doc.status);
    const isAttached = doc.rubrique_id != null || doc.dossier_id != null;

    if (!canDeleteByStatus || isAttached) {
      return false;
    }

    if (role === 'ADMIN') {
      return true;
    }

    if (role === 'AGENT' || role === 'GESTIONNAIRE') {
      return Number(doc.user_id) === Number(currentUserId);
    }

    return false;
  };

  const requestDeleteDocument = (doc) => {
    if (!canDeleteDocument(doc) || isDeleteConfirming) {
      return;
    }

    setDeleteTargetDocument(doc);
  };

  const closeDeleteModal = () => {
    if (isDeleteConfirming) {
      return;
    }

    setDeleteTargetDocument(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetDocument) {
      return;
    }

    const targetId = deleteTargetDocument.id;

    setError(null);
    setSuccessMessage(null);
    setIsDeleteConfirming(true);
    setDeletingDocumentId(targetId);

    try {
      const response = await api.delete(`/documents/${targetId}`);
      setSuccessMessage(response.data?.message || 'Document deleted successfully.');
      setDeleteTargetDocument(null);

      const nextPage = documents.length === 1 && currentPageRef.current > 1
        ? currentPageRef.current - 1
        : currentPageRef.current;

      setLoading(true);
      const docs = await fetchDocuments(nextPage);
      setupPolling(docs);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete document.'));
    } finally {
      setIsDeleteConfirming(false);
      setDeletingDocumentId(null);
    }
  };

  const renderStatusBadge = (status) => <StatusBadge status={status} />;

  const hasActiveFilters = hasAnyListFilter(appliedFilters);
  const hasDraftFilters = hasAnyListFilter(filtersDraft);
  const hasSortOverride = !isDefaultSort(sortState, DEFAULT_DOCUMENT_SORT);

  const renderActionButton = (doc) => {
    const isRetrying = retryingIds.includes(doc.id);
    const canRetry = Number(doc.user_id) === Number(currentUserId);
    const canDelete = canDeleteDocument(doc);
    const isDeleting = deletingDocumentId === doc.id;
    let primaryAction;

    switch (doc.status) {
      case 'PROCESSED':
        primaryAction = (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/documents/${doc.id}/validate`)}
          >
            Validate
          </button>
        );
        break;

      case 'VALIDATED':
        primaryAction = (
          <button
            className="btn btn-success btn-sm"
            onClick={() => navigate(`/documents/${doc.id}/validate`)}
          >
            View
          </button>
        );
        break;

      case 'FAILED':
        if (!canRetry) {
          primaryAction = <span className="text-muted small">-</span>;
          break;
        }

        primaryAction = (
          <button
            className="btn btn-warning btn-sm"
            onClick={() => handleRetry(doc.id)}
            disabled={isRetrying}
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        );
        break;

      case 'PROCESSING':
        primaryAction = (
          <button className="btn btn-secondary btn-sm" disabled>
            Processing...
          </button>
        );
        break;

      case 'UPLOADED':
      default:
        primaryAction = (
          <button className="btn btn-secondary btn-sm" disabled>
            Pending...
          </button>
        );
        break;
    }

    if (!canDelete) {
      return primaryAction;
    }

    return (
      <div className="d-flex flex-wrap gap-2 align-items-center">
        {primaryAction}
        <button
          type="button"
          className="btn btn-outline-danger btn-sm"
          onClick={() => requestDeleteDocument(doc)}
          disabled={isDeleting || isDeleteConfirming}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    );
  };

  const emptyTitle = hasActiveFilters ? 'No Documents Match Your Filters' : 'No Documents Found';
  const emptyDescription = hasActiveFilters
    ? 'Try adjusting your search, status, or date range and apply again.'
    : canUpload
      ? 'Upload documents to get started.'
      : 'No documents are available for your role right now.';

  return (
    <div className="container py-4 documents-list">
      {accessDeniedMessage && (
        <div className="alert alert-warning d-flex align-items-center mb-3" role="alert">
          <i className="bi bi-shield-lock me-2"></i>
          <span>{accessDeniedMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="mb-3">
          <SuccessAlert message={successMessage} title="" />
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0 page-title">
          <i className="bi bi-files me-2 opacity-75"></i>
          Documents
        </h2>

        {canUpload && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setUploadModalOpen(true)}
          >
            <i className="bi bi-cloud-upload me-2"></i>
            Upload Documents
          </button>
        )}
      </div>

      {error && documents.length > 0 && (
        <div className="mb-3">
          <ErrorAlert message={error} title="" showIcon={true} />
        </div>
      )}

      <div className="card documents-filters-card mb-4">
        <div className="card-body">
          <form className="row g-3 align-items-end documents-filters-form" onSubmit={handleApplyFilters}>
            <div className="col-12 col-lg-4">
              <label htmlFor="documentsSearch" className="form-label mb-1">Search</label>
              <input
                id="documentsSearch"
                type="text"
                className="form-control"
                placeholder="Search by document ID or filename"
                value={filtersDraft.search}
                onChange={(event) => handleFiltersDraftChange('search', event.target.value)}
                disabled={loading}
              />
            </div>

            <div className="col-12 col-md-6 col-lg-2">
              <label htmlFor="documentsStatusFilter" className="form-label mb-1">Status</label>
              <select
                id="documentsStatusFilter"
                className="form-select"
                value={filtersDraft.status}
                onChange={(event) => handleFiltersDraftChange('status', event.target.value)}
                disabled={loading}
              >
                <option value="">All Statuses</option>
                {DOCUMENT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6 col-lg-2">
              <label htmlFor="documentsFromDate" className="form-label mb-1">From Date</label>
              <input
                id="documentsFromDate"
                type="date"
                className="form-control"
                value={filtersDraft.fromDate}
                onChange={(event) => handleFiltersDraftChange('fromDate', event.target.value)}
                disabled={loading}
              />
            </div>

            <div className="col-12 col-md-6 col-lg-2">
              <label htmlFor="documentsToDate" className="form-label mb-1">To Date</label>
              <input
                id="documentsToDate"
                type="date"
                className="form-control"
                value={filtersDraft.toDate}
                onChange={(event) => handleFiltersDraftChange('toDate', event.target.value)}
                disabled={loading}
              />
            </div>

            <div className="col-12 col-md-6 col-lg-2 d-flex gap-2 documents-filters-actions">
              <button type="submit" className="btn btn-primary flex-grow-1" disabled={loading}>
                <i className="bi bi-funnel"></i>
                Apply
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleResetFilters}
                disabled={loading || (!hasActiveFilters && !hasDraftFilters && !hasSortOverride)}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="table-section-shell">
          {loading && documents.length > 0 && (
            <div className="table-loading-overlay" role="status" aria-live="polite" aria-label="Updating list">
              <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
              <span>Updating documents...</span>
            </div>
          )}

          <div className="table-responsive">
            <table className="table table-hover table-striped mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <SortableHeader
                    label="ID"
                    sortBy="id"
                    sortState={sortState}
                    onSortChange={handleSortChange}
                    disabled={loading}
                  />
                  <th scope="col">Filename</th>
                  <SortableHeader
                    label="Status"
                    sortBy="status"
                    sortState={sortState}
                    onSortChange={handleSortChange}
                    disabled={loading}
                  />
                  <SortableHeader
                    label="Date"
                    sortBy="created_at"
                    sortState={sortState}
                    onSortChange={handleSortChange}
                    disabled={loading}
                  />
                  <th scope="col">Error</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>

              <tbody>
                {documents.length > 0 ? documents.map((doc) => {
                  const formattedError = formatDocumentError(doc.error_message);

                  return (
                    <tr key={doc.id}>
                      <td>{doc.id}</td>

                      <td>
                        <i className="bi bi-file-earmark me-2 text-muted"></i>
                        {doc.original_filename}
                      </td>

                      <td>{renderStatusBadge(doc.status)}</td>

                      <td>{new Date(doc.created_at).toLocaleString()}</td>

                      <td
                        className="text-danger small"
                        style={{ maxWidth: '320px', whiteSpace: 'normal' }}
                      >
                        {doc.status === 'FAILED' ? (
                          <span title={formattedError}>{formattedError}</span>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td>{renderActionButton(doc)}</td>
                    </tr>
                  );
                }) : loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`documents-skeleton-${index}`} className="skeleton-row">
                      <td><div className="skeleton-line skeleton-line-short"></div></td>
                      <td><div className="skeleton-line"></div></td>
                      <td><div className="skeleton-line skeleton-line-medium"></div></td>
                      <td><div className="skeleton-line"></div></td>
                      <td><div className="skeleton-line"></div></td>
                      <td><div className="skeleton-line skeleton-line-medium"></div></td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <div className="inline-empty-state-wrapper">
                        <ErrorAlert message={error} title="" showIcon={true} />
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <div className="inline-empty-state-wrapper">
                        <EmptyState
                          icon={hasActiveFilters ? 'search' : 'folder2-open'}
                          title={emptyTitle}
                          description={emptyDescription}
                          action={hasActiveFilters || hasSortOverride
                            ? (
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={handleResetFilters}
                              >
                                <i className="bi bi-arrow-counterclockwise me-2"></i>
                                Reset
                              </button>
                            )
                            : canUpload ? (
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setUploadModalOpen(true)}
                              >
                                <i className="bi bi-cloud-upload me-2"></i>
                                Upload Documents
                              </button>
                            ) : null}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-footer bg-white d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <span className="pagination-info d-inline-flex align-items-center gap-2">
            <i className="bi bi-grid-3x3-gap"></i>
            Page {currentPage} of {lastPage} ({total} total documents)
          </span>

          <div className="btn-group pagination-controls">
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <i className="bi bi-chevron-left me-1"></i>
              Previous
            </button>

            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === lastPage}
            >
              Next
              <i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        </div>
      </div>

      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploaded={handleUploadModalFinished}
      />

      <ConfirmationModal
        isOpen={Boolean(deleteTargetDocument)}
        title="Delete Document"
        message={
          deleteTargetDocument
            ? `Delete "${deleteTargetDocument.original_filename}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        confirmingLabel="Deleting..."
        confirmVariant="danger"
        isConfirming={isDeleteConfirming}
        onCancel={closeDeleteModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default DocumentsList;
