import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getToastMessage,
  notifySuccess,
  notifyDangerSuccess,
  notifyError,
} from '../utils/toast';
import api, { getApiErrorMessage } from '../services/api';
import { AUTH_CHANGED_EVENT, getStoredRole, getStoredUser } from '../services/auth';
import { previewDocument, downloadDocument } from '../services/documentAccess';
import { USER_ROLES, getDocumentStatusLabel } from '../constants/domainLabels';
import DocumentUploadModal from '../components/DocumentUploadModal';
import {
  StatusBadge,
  EmptyState,
  ConfirmationModal,
  SortableHeader,
  FileAccessInline,
  PageHeader,
  ListFiltersCard,
  TablePaginationFooter,
} from '../ui';
import {
  normalizeListFilters,
  buildListQueryParams,
  getNextSortState,
  hasAnyListFilter,
  isDefaultSort
} from '../utils/listQueryUtils';
import { formatShortDate } from '../utils/formatters';
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState(() => getStoredRole());
  const [currentUserId, setCurrentUserId] = useState(() => Number(getStoredUser()?.id || 0));
  const canUpload =
    role === USER_ROLES.AGENT ||
    role === USER_ROLES.CLAIMS_MANAGER ||
    role === USER_ROLES.SUPERVISOR ||
    role === USER_ROLES.ADMIN;

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [retryingIds, setRetryingIds] = useState([]);
  const [previewingById, setPreviewingById] = useState({});
  const [downloadingById, setDownloadingById] = useState({});
  const [accessDeniedMessage, setAccessDeniedMessage] = useState(null);
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

  // Normalizes noisy backend / pipeline error text before showing it in the table.
  const formatDocumentError = (message) => {
    if (!message) {
      return t('documentsPage.processingFailed');
    }

    let cleaned = message.trim();

    cleaned = cleaned.replace(/^FastAPI rejected the document \(HTTP \d+\):\s*/i, '');
    cleaned = cleaned.replace(/^FastAPI service error \(HTTP \d+\):\s*/i, '');
    cleaned = cleaned.replace(/^FastAPI service unavailable:\s*/i, '');
    cleaned = cleaned.replace(/^Pipeline failed:\s*/i, '');
    cleaned = cleaned.replace(/^[A-Za-z]+Error:\s*/i, '');

    return cleaned || t('documentsPage.processingFailed');
  };

  // Main loader used by initial fetch, filters, sort, pagination, and polling.
  const fetchDocuments = useCallback(
    async (page = 1, filters = appliedFiltersRef.current, sort = appliedSortRef.current) => {
      try {
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
        notifyError(getApiErrorMessage(err, t('feedback.loadDocumentsFailed')));
        return [];
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  // Poll only while at least one document is still pending technical processing.
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
    notifySuccess(t('documentsPage.uploadSuccess'));
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
      setRetryingIds((prev) => [...prev, documentId]);

      await api.post(`/documents/${documentId}/retry`);

      const docs = await fetchDocuments(
        currentPageRef.current,
        appliedFiltersRef.current,
        appliedSortRef.current
      );
      setupPolling(docs);
    } catch (err) {
      notifyError(getApiErrorMessage(err, t('feedback.retryDocumentFailed')));
    } finally {
      setRetryingIds((prev) => prev.filter((id) => id !== documentId));
    }
  };

  const setDocumentAccessPending = (setter, documentId, isPending) => {
    setter((prev) => {
      if (isPending) {
        return {
          ...prev,
          [documentId]: true
        };
      }

      if (!prev[documentId]) {
        return prev;
      }

      const next = { ...prev };
      delete next[documentId];
      return next;
    });
  };

  const handlePreviewSourceDocument = async (doc) => {
    if (!doc?.id || previewingById[doc.id]) {
      return;
    }

    try {
      setDocumentAccessPending(setPreviewingById, doc.id, true);
      await previewDocument(doc.id);
    } catch (error) {
      const message = error?.response
        ? getApiErrorMessage(error, t('feedback.openOriginalDocumentFailed'))
        : error?.message || t('feedback.openOriginalDocumentFailed');

      notifyError(message);
    } finally {
      setDocumentAccessPending(setPreviewingById, doc.id, false);
    }
  };

  const handleDownloadSourceDocument = async (doc) => {
    if (!doc?.id || downloadingById[doc.id]) {
      return;
    }

    try {
      setDocumentAccessPending(setDownloadingById, doc.id, true);
      await downloadDocument(doc.id, doc.original_filename);
    } catch (error) {
      const message = error?.response
        ? getApiErrorMessage(error, t('feedback.downloadOriginalDocumentFailed'))
        : error?.message || t('feedback.downloadOriginalDocumentFailed');

      notifyError(message);
    } finally {
      setDocumentAccessPending(setDownloadingById, doc.id, false);
    }
  };

  // Delete is restricted by status and by linkage to dossier / section context.
  const canDeleteDocument = (doc) => {
    const canDeleteByStatus = ['UPLOADED', 'FAILED', 'PROCESSED'].includes(doc.status);
    const isAttached = doc.rubrique_id != null || doc.dossier_id != null;

    if (!canDeleteByStatus || isAttached) {
      return false;
    }

    if (
      role === USER_ROLES.ADMIN ||
      role === USER_ROLES.CLAIMS_MANAGER ||
      role === USER_ROLES.SUPERVISOR
    ) {
      return true;
    }

    if (role === USER_ROLES.AGENT) {
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

    setIsDeleteConfirming(true);
    setDeletingDocumentId(targetId);

    try {
      const response = await api.delete(`/documents/${targetId}`);
      notifyDangerSuccess(getToastMessage(response, t('feedback.documentDeletedSuccess')));
      setDeleteTargetDocument(null);

      const nextPage = documents.length === 1 && currentPageRef.current > 1
        ? currentPageRef.current - 1
        : currentPageRef.current;

      setLoading(true);
      const docs = await fetchDocuments(
        nextPage,
        appliedFiltersRef.current,
        appliedSortRef.current
      );
      setupPolling(docs);
    } catch (err) {
      notifyError(getApiErrorMessage(err, t('feedback.deleteDocumentFailed')));
    } finally {
      setIsDeleteConfirming(false);
      setDeletingDocumentId(null);
    }
  };

  const renderStatusBadge = (status) => {
    const normalizedStatus = (status || '').toLowerCase();
    return (
      <StatusBadge
        status={status}
        context="table"
        className={`documents-status-badge documents-status-badge--${normalizedStatus || 'unknown'}`}
      />
    );
  };

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
      case 'PROCESSED': {
        const canValidate = (() => {
          if (
            role === USER_ROLES.CLAIMS_MANAGER ||
            role === USER_ROLES.SUPERVISOR ||
            role === USER_ROLES.ADMIN
          ) {
            return true;
          }

          if (role === USER_ROLES.AGENT) {
            return Number(doc.user_id) === Number(currentUserId);
          }

          return false;
        })();

        primaryAction = (
          <button
            className={`btn btn-${canValidate ? 'primary' : 'success'} btn-sm document-action-btn document-action-btn--${canValidate ? 'validate' : 'view'}`}
            onClick={() => navigate(`/documents/${doc.id}/validate`)}
          >
            {canValidate ? t('actions.validate') : t('actions.view')}
          </button>
        );
        break;
      }

      case 'VALIDATED':
        primaryAction = (
          <button
            className="btn btn-success btn-sm document-action-btn document-action-btn--view"
            onClick={() => navigate(`/documents/${doc.id}/validate`)}
          >
            {t('actions.view')}
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
            className="btn btn-warning btn-sm document-action-btn"
            onClick={() => handleRetry(doc.id)}
            disabled={isRetrying}
          >
            {isRetrying ? t('documentsPage.retrying') : t('actions.retry')}
          </button>
        );
        break;

      case 'PROCESSING':
        primaryAction = (
          <button className="btn btn-secondary btn-sm document-action-btn" disabled>
            {t('documentsPage.processing')}
          </button>
        );
        break;

      case 'UPLOADED':
      default:
        primaryAction = (
          <button className="btn btn-secondary btn-sm document-action-btn" disabled>
            {t('documentsPage.pending')}
          </button>
        );
        break;
    }

    if (!canDelete) {
      return primaryAction;
    }

    return (
      <div className="d-flex flex-wrap gap-2 align-items-center document-actions">
        {primaryAction}
        <button
          type="button"
          className="btn btn-outline-danger btn-sm document-action-btn document-action-btn--delete"
          onClick={() => requestDeleteDocument(doc)}
          disabled={isDeleting || isDeleteConfirming}
        >
          {isDeleting ? t('documentsPage.deleting') : t('actions.delete')}
        </button>
      </div>
    );
  };

  const emptyTitle = hasActiveFilters ? t('documentsPage.emptyFilterTitle') : t('documentsPage.emptyTitle');
  const emptyDescription = hasActiveFilters
    ? t('documentsPage.emptyFilterDescription')
    : canUpload
      ? t('documentsPage.emptyDescription')
      : t('documentsPage.emptyNoRole');
  const deleteTargetFilename = deleteTargetDocument
    ? (deleteTargetDocument.original_filename || `${t('domain.document')} #${deleteTargetDocument.id}`)
    : '';

  return (
    <div className="container py-4 documents-list">
      {accessDeniedMessage && (
        <div className="alert alert-warning d-flex align-items-center mb-3" role="alert">
          <i className="bi bi-shield-lock me-2"></i>
          <span>{accessDeniedMessage}</span>
        </div>
      )}

      <PageHeader
        icon="bi-files"
        title={t('documentsPage.title')}
        subtitle={t('documentsPage.subtitle')}
        action={
          canUpload && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setUploadModalOpen(true)}
            >
              <i className="bi bi-cloud-upload me-2" aria-hidden="true" />
              {t('documentsPage.uploadButton')}
            </button>
          )
        }
      />

      <ListFiltersCard className="documents-filters-card">
        <form className="row g-3 align-items-end enterprise-filters-form" onSubmit={handleApplyFilters}>
          <div className="col-12 col-lg-4">
            <label htmlFor="documentsSearch" className="form-label mb-1">{t('filters.search')}</label>
            <input
              id="documentsSearch"
              type="text"
              className="form-control"
              placeholder={t('documentsPage.searchPlaceholder')}
              value={filtersDraft.search}
              onChange={(event) => handleFiltersDraftChange('search', event.target.value)}
              disabled={loading}
            />
          </div>

          <div className="col-12 col-md-6 col-lg-2">
            <label htmlFor="documentsStatusFilter" className="form-label mb-1">{t('filters.status')}</label>
            <select
              id="documentsStatusFilter"
              className="form-select"
              value={filtersDraft.status}
              onChange={(event) => handleFiltersDraftChange('status', event.target.value)}
              disabled={loading}
            >
              <option value="">{t('filters.allStatuses')}</option>
              {DOCUMENT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {getDocumentStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-6 col-lg-2">
            <label htmlFor="documentsFromDate" className="form-label mb-1">{t('filters.fromDate')}</label>
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
            <label htmlFor="documentsToDate" className="form-label mb-1">{t('filters.toDate')}</label>
            <input
              id="documentsToDate"
              type="date"
              className="form-control"
              value={filtersDraft.toDate}
              onChange={(event) => handleFiltersDraftChange('toDate', event.target.value)}
              disabled={loading}
            />
          </div>

          <div className="col-12 col-md-6 col-lg-2 d-flex gap-2 enterprise-filters-actions">
            <button type="submit" className="btn btn-primary flex-grow-1" disabled={loading}>
              <i className="bi bi-funnel"></i>
              {t('actions.apply')}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleResetFilters}
              disabled={loading || (!hasActiveFilters && !hasDraftFilters && !hasSortOverride)}
            >
              {t('actions.reset')}
            </button>
          </div>
        </form>
      </ListFiltersCard>

      <div className="card">
        <div className="table-section-shell">
          {loading && documents.length > 0 && (
            <div className="table-loading-overlay" role="status" aria-live="polite" aria-label={t('accessibility.updatingList')}>
              <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
              <span>{t('documentsPage.updatingDocuments')}</span>
            </div>
          )}

          <div className="table-responsive">
            <table className="table table-hover table-striped mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <SortableHeader
                    label={t('documentsPage.columns.id')}
                    sortBy="id"
                    sortState={sortState}
                    onSortChange={handleSortChange}
                    disabled={loading}
                  />
                  <th scope="col">{t('documentsPage.columns.filename')}</th>
                  <SortableHeader
                    label={t('documentsPage.columns.status')}
                    sortBy="status"
                    sortState={sortState}
                    onSortChange={handleSortChange}
                    disabled={loading}
                  />
                  <SortableHeader
                    label={t('documentsPage.columns.date')}
                    sortBy="created_at"
                    sortState={sortState}
                    onSortChange={handleSortChange}
                    disabled={loading}
                  />
                  <th scope="col">{t('documentsPage.columns.error')}</th>
                  <th scope="col">{t('documentsPage.columns.actions')}</th>
                </tr>
              </thead>

              <tbody>
                {documents.length > 0 ? documents.map((doc) => {
                  const formattedError = formatDocumentError(doc.error_message);
                  const displayFilename = doc.original_filename || `${t('domain.document')} #${doc.id}`;
                  const isPreviewing = Boolean(previewingById[doc.id]);
                  const isDownloading = Boolean(downloadingById[doc.id]);

                  return (
                    <tr key={doc.id}>
                      <td className="documents-id-cell">{doc.id}</td>

                      <td className="documents-file-cell">
                        <FileAccessInline
                          filename={displayFilename}
                          onPreview={() => handlePreviewSourceDocument(doc)}
                          onDownload={() => handleDownloadSourceDocument(doc)}
                          isPreviewing={isPreviewing}
                          isDownloading={isDownloading}
                        />
                      </td>

                      <td className="documents-status-cell">{renderStatusBadge(doc.status)}</td>

                      <td className="cell-date">{formatShortDate(doc.created_at)}</td>

                      <td className="small text-danger cell-wrap document-error-cell">
                        {doc.status === 'FAILED' ? (
                          <span title={formattedError}>{formattedError}</span>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="cell-actions">{renderActionButton(doc)}</td>
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
                                {t('actions.reset')}
                              </button>
                            )
                            : canUpload ? (
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setUploadModalOpen(true)}
                              >
                                <i className="bi bi-cloud-upload me-2"></i>
                                {t('documentsPage.uploadButton')}
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

        <TablePaginationFooter
          currentPage={currentPage}
          lastPage={lastPage}
          total={total}
          summaryLabel={t('domain.documents').toLowerCase()}
          onPageChange={handlePageChange}
        />
      </div>

      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploaded={handleUploadModalFinished}
      />

      <ConfirmationModal
        isOpen={Boolean(deleteTargetDocument)}
        title={t('documentsPage.deleteTitle')}
        message={
          deleteTargetDocument
            ? t('documentsPage.deleteMessage', { filename: deleteTargetFilename })
            : ''
        }
        confirmLabel={t('documentsPage.deleteConfirm')}
        confirmingLabel={t('documentsPage.deleteConfirming')}
        confirmVariant="danger"
        initialFocus="cancel"
        isConfirming={isDeleteConfirming}
        onCancel={closeDeleteModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default DocumentsList;