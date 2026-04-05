import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { getApiErrorMessage } from '../services/api';
import { AUTH_CHANGED_EVENT, getStoredRole, getStoredUser } from '../services/auth';
import DossierCreateModal from '../components/DossierCreateModal';
import { ErrorAlert, EmptyState, SuccessAlert, ConfirmationModal, SortableHeader } from '../ui';
import {
  normalizeListFilters,
  buildListQueryParams,
  getNextSortState,
  hasAnyListFilter,
  isDefaultSort
} from '../utils/listQueryUtils';
import './DossiersList/DossiersList.css';

const DOSSIER_STATUS_OPTIONS = {
  AGENT: ['RECEIVED', 'IN_PROGRESS', 'TO_VALIDATE', 'PROCESSED'],
  GESTIONNAIRE: ['RECEIVED', 'IN_PROGRESS', 'TO_VALIDATE', 'PROCESSED'],
  ADMIN: ['RECEIVED', 'IN_PROGRESS', 'TO_VALIDATE', 'PROCESSED']
};

const DEFAULT_DOSSIER_FILTERS = {
  search: '',
  status: '',
  fromDate: '',
  toDate: ''
};

const DEFAULT_DOSSIER_SORT = {
  sortBy: 'created_at',
  sortDirection: 'desc'
};

const getRolePageConfig = (role) => {
  if (role === 'AGENT') {
    return {
      title: 'My Dossiers',
      subtitle: 'Prepare, submit, and follow your dossier history.',
      emptyTitle: 'No Dossiers Yet',
      emptyDescription: 'Create your first dossier to group validated medical documents.',
      createButtonLabel: 'New Dossier',
      canCreateDossier: true
    };
  }

  if (role === 'GESTIONNAIRE') {
    return {
      title: 'Dossiers',
      subtitle: 'Create your dossiers and review dossiers awaiting business decisions.',
      emptyTitle: 'No Dossiers Found',
      emptyDescription: 'No dossier is currently available. You can create a new dossier to get started.',
      createButtonLabel: 'New Dossier',
      canCreateDossier: true
    };
  }

  if (role === 'ADMIN') {
    return {
      title: 'All Dossiers',
      subtitle: 'Supervise dossier activity across preparation and review.',
      emptyTitle: 'No Dossiers Found',
      emptyDescription: 'No dossier is currently available in the system.',
      createButtonLabel: 'New Dossier',
      canCreateDossier: true
    };
  }

  return {
    title: 'Dossiers',
    subtitle: 'Track dossier preparation and review workflow.',
    emptyTitle: 'No Dossiers Found',
    emptyDescription: 'No dossier is currently available.',
    createButtonLabel: 'New Dossier',
    canCreateDossier: false
  };
};

const formatAmount = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return '-';
  }

  return `${amount.toFixed(3)} TND`;
};

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString();
};

function DossiersList() {
  const navigate = useNavigate();
  const location = useLocation();

  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState(() => getStoredRole());
  const [currentUserId, setCurrentUserId] = useState(() => Number(getStoredUser()?.id || 0));
  const [accessDeniedMessage, setAccessDeniedMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [deleteTargetDossier, setDeleteTargetDossier] = useState(null);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [deletingDossierId, setDeletingDossierId] = useState(null);
  const [filtersDraft, setFiltersDraft] = useState(DEFAULT_DOSSIER_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_DOSSIER_FILTERS);
  const [sortState, setSortState] = useState(DEFAULT_DOSSIER_SORT);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const appliedFiltersRef = useRef(DEFAULT_DOSSIER_FILTERS);
  const appliedSortRef = useRef(DEFAULT_DOSSIER_SORT);

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

  const pageConfig = useMemo(() => getRolePageConfig(role), [role]);
  const dossierStatusOptions = useMemo(
    () => DOSSIER_STATUS_OPTIONS[role] || DOSSIER_STATUS_OPTIONS.ADMIN,
    [role]
  );

  useEffect(() => {
    appliedFiltersRef.current = appliedFilters;
  }, [appliedFilters]);

  useEffect(() => {
    appliedSortRef.current = sortState;
  }, [sortState]);

  const fetchDossiers = useCallback(
    async (page = 1, filters = appliedFiltersRef.current, sort = appliedSortRef.current) => {
      try {
        setError(null);

        const response = await api.get('/dossiers', {
          params: buildListQueryParams(page, filters, sort)
        });
        const payload = response.data || {};

        if (Array.isArray(payload)) {
          setDossiers(payload);
          setCurrentPage(1);
          setLastPage(1);
          setTotal(payload.length);
          return;
        }

        const list = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload.dossiers)
            ? payload.dossiers
            : [];
        setDossiers(list);
        setCurrentPage(payload?.current_page ?? 1);
        setLastPage(payload?.last_page ?? 1);
        setTotal(payload?.total ?? list.length);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load dossiers. Please try again.'));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchDossiers(1, appliedFiltersRef.current, appliedSortRef.current);
  }, [fetchDossiers]);

  useEffect(() => {
    const redirectedMessage = location.state?.accessDeniedMessage;
    if (!redirectedMessage) {
      return;
    }

    setAccessDeniedMessage(redirectedMessage);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const handlePageChange = async (page) => {
    if (page < 1 || page > lastPage) {
      return;
    }

    setLoading(true);
    await fetchDossiers(page, appliedFiltersRef.current, appliedSortRef.current);
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

    await fetchDossiers(1, normalizedFilters, appliedSortRef.current);
  };

  const handleResetFilters = async () => {
    const resetFilters = { ...DEFAULT_DOSSIER_FILTERS };
    const resetSort = { ...DEFAULT_DOSSIER_SORT };

    setFiltersDraft(resetFilters);
    setAppliedFilters(resetFilters);
    setSortState(resetSort);
    appliedFiltersRef.current = resetFilters;
    appliedSortRef.current = resetSort;
    setLoading(true);

    await fetchDossiers(1, resetFilters, resetSort);
  };

  const handleSortChange = async (sortBy) => {
    const nextSort = getNextSortState(sortState, sortBy);

    setSortState(nextSort);
    appliedSortRef.current = nextSort;
    setLoading(true);

    await fetchDossiers(1, appliedFiltersRef.current, nextSort);
  };

  const canDeleteDossier = (dossier) => {
    if (dossier.status !== 'RECEIVED') {
      return false;
    }

    if (role === 'ADMIN') {
      return true;
    }

    if (role === 'AGENT' || role === 'GESTIONNAIRE') {
      return Number(dossier.created_by) === Number(currentUserId);
    }

    return false;
  };

  const requestDeleteDossier = (dossier) => {
    if (!canDeleteDossier(dossier) || isDeleteConfirming) {
      return;
    }

    setDeleteTargetDossier(dossier);
  };

  const closeDeleteModal = () => {
    if (isDeleteConfirming) {
      return;
    }

    setDeleteTargetDossier(null);
  };

  const handleConfirmDeleteDossier = async () => {
    if (!deleteTargetDossier) {
      return;
    }

    const targetId = deleteTargetDossier.id;

    setActionError(null);
    setSuccessMessage(null);
    setIsDeleteConfirming(true);
    setDeletingDossierId(targetId);

    try {
      const response = await api.delete(`/dossiers/${targetId}`);
      setSuccessMessage(response.data?.message || 'Dossier deleted successfully.');
      setDeleteTargetDossier(null);

      const nextPage = dossiers.length === 1 && currentPage > 1
        ? currentPage - 1
        : currentPage;

      setLoading(true);
      await fetchDossiers(nextPage, appliedFiltersRef.current, appliedSortRef.current);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to delete dossier.'));
    } finally {
      setIsDeleteConfirming(false);
      setDeletingDossierId(null);
    }
  };

  const hasActiveFilters = hasAnyListFilter(appliedFilters);
  const hasDraftFilters = hasAnyListFilter(filtersDraft);
  const hasSortOverride = !isDefaultSort(sortState, DEFAULT_DOSSIER_SORT);

  const emptyTitle = hasActiveFilters ? 'No Dossiers Match Your Filters' : pageConfig.emptyTitle;
  const emptyDescription = hasActiveFilters
    ? 'Try adjusting your search, status, or date range and apply again.'
    : pageConfig.emptyDescription;

  return (
    <div className="container py-4 dossiers-list">
      <div className="d-flex justify-content-between align-items-center mb-4 dossiers-list-header">
        <div>
          <h2 className="mb-1 page-title d-flex align-items-center">
            <i className="bi bi-briefcase me-2 opacity-75"></i>
            {pageConfig.title}
          </h2>
          <p className="text-muted mb-0">{pageConfig.subtitle}</p>
        </div>

        {pageConfig.canCreateDossier && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreateModalOpen(true)}
          >
            <i className="bi bi-plus-circle me-2"></i>
            {pageConfig.createButtonLabel}
          </button>
        )}
      </div>

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
      {actionError && (
        <div className="mb-3">
          <ErrorAlert message={actionError} title="" showIcon={true} />
        </div>
      )}

      {error && dossiers.length > 0 && (
        <div className="mb-3">
          <ErrorAlert message={error} title="" showIcon={true} />
        </div>
      )}

      <div className="card dossiers-filters-card mb-4">
        <div className="card-body">
          <form className="row g-3 align-items-end dossiers-filters-form" onSubmit={handleApplyFilters}>
            <div className="col-12 col-lg-4">
              <label htmlFor="dossiersSearch" className="form-label mb-1">Search</label>
              <input
                id="dossiersSearch"
                type="text"
                className="form-control"
                placeholder="Search by dossier number or assured identifier"
                value={filtersDraft.search}
                onChange={(event) => handleFiltersDraftChange('search', event.target.value)}
                disabled={loading}
              />
            </div>

            <div className="col-12 col-md-6 col-lg-2">
              <label htmlFor="dossiersStatusFilter" className="form-label mb-1">Status</label>
              <select
                id="dossiersStatusFilter"
                className="form-select"
                value={filtersDraft.status}
                onChange={(event) => handleFiltersDraftChange('status', event.target.value)}
                disabled={loading}
              >
                <option value="">All Statuses</option>
                {dossierStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6 col-lg-2">
              <label htmlFor="dossiersFromDate" className="form-label mb-1">From Date</label>
              <input
                id="dossiersFromDate"
                type="date"
                className="form-control"
                value={filtersDraft.fromDate}
                onChange={(event) => handleFiltersDraftChange('fromDate', event.target.value)}
                disabled={loading}
              />
            </div>

            <div className="col-12 col-md-6 col-lg-2">
              <label htmlFor="dossiersToDate" className="form-label mb-1">To Date</label>
              <input
                id="dossiersToDate"
                type="date"
                className="form-control"
                value={filtersDraft.toDate}
                onChange={(event) => handleFiltersDraftChange('toDate', event.target.value)}
                disabled={loading}
              />
            </div>

            <div className="col-12 col-md-6 col-lg-2 d-flex gap-2 dossiers-filters-actions">
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
          {loading && dossiers.length > 0 && (
            <div className="table-loading-overlay" role="status" aria-live="polite" aria-label="Updating list">
              <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
              <span>Updating dossiers...</span>
            </div>
          )}

          <div className="table-responsive">
            <table className="table table-hover table-striped mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <SortableHeader
                    label="Dossier #"
                    sortBy="numero_dossier"
                    sortState={sortState}
                    onSortChange={handleSortChange}
                    disabled={loading}
                  />
                  <th scope="col">Assured Identifier</th>
                  <SortableHeader
                    label="Status"
                    sortBy="status"
                    sortState={sortState}
                    onSortChange={handleSortChange}
                    disabled={loading}
                  />
                  <SortableHeader
                    label="Total"
                    sortBy="montant_total"
                    sortState={sortState}
                    onSortChange={handleSortChange}
                    disabled={loading}
                  />
                  <th scope="col">Documents</th>
                  <SortableHeader
                    label="Created"
                    sortBy="created_at"
                    sortState={sortState}
                    onSortChange={handleSortChange}
                    disabled={loading}
                  />
                  <th scope="col">Actions</th>
                </tr>
              </thead>

              <tbody>
                {dossiers.length > 0 ? dossiers.map((dossier) => {
                  const documentsCount = dossier.documents_count ?? dossier.documents?.length ?? 0;

                  return (
                    <tr key={dossier.id}>
                      <td className="fw-semibold">{dossier.numero_dossier || '-'}</td>
                      <td>{dossier.assured_identifier || '-'}</td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary-emphasis dossier-status">
                          {(dossier.status || '-').toString()}
                        </span>
                      </td>
                      <td>{formatAmount(dossier.montant_total)}</td>
                      <td>{documentsCount}</td>
                      <td>{formatDate(dossier.created_at)}</td>
                      <td>
                        <div className="d-flex gap-2 align-items-center">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => navigate(`/dossiers/${dossier.id}`)}
                          >
                            <i className="bi bi-eye me-1"></i>
                            Details
                          </button>

                          {canDeleteDossier(dossier) && (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => requestDeleteDossier(dossier)}
                              disabled={isDeleteConfirming || deletingDossierId === dossier.id}
                            >
                              {deletingDossierId === dossier.id ? 'Deleting...' : 'Delete'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`dossiers-skeleton-${index}`} className="skeleton-row">
                      <td><div className="skeleton-line"></div></td>
                      <td><div className="skeleton-line"></div></td>
                      <td><div className="skeleton-line skeleton-line-medium"></div></td>
                      <td><div className="skeleton-line skeleton-line-short"></div></td>
                      <td><div className="skeleton-line skeleton-line-short"></div></td>
                      <td><div className="skeleton-line"></div></td>
                      <td><div className="skeleton-line skeleton-line-medium"></div></td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <div className="inline-empty-state-wrapper">
                        <ErrorAlert message={error} title="" showIcon={true} />
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <div className="inline-empty-state-wrapper">
                        <EmptyState
                          icon={hasActiveFilters ? 'search' : 'briefcase'}
                          title={emptyTitle}
                          description={emptyDescription}
                          action={
                            hasActiveFilters || hasSortOverride ? (
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={handleResetFilters}
                              >
                                <i className="bi bi-arrow-counterclockwise me-2"></i>
                                Reset
                              </button>
                            ) : pageConfig.canCreateDossier ? (
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setCreateModalOpen(true)}
                              >
                                <i className="bi bi-plus-circle me-2"></i>
                                Create Dossier
                              </button>
                            ) : null
                          }
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
            Page {currentPage} of {lastPage} ({total} total dossiers)
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

      <DossierCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={Boolean(deleteTargetDossier)}
        title="Delete Dossier"
        message={
          deleteTargetDossier
            ? `Delete dossier "${deleteTargetDossier.numero_dossier}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        confirmingLabel="Deleting..."
        confirmVariant="danger"
        initialFocus="cancel"
        isConfirming={isDeleteConfirming}
        onCancel={closeDeleteModal}
        onConfirm={handleConfirmDeleteDossier}
      />
    </div>
  );
}

export default DossiersList;
