import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { getApiErrorMessage } from '../services/api';
import { AUTH_CHANGED_EVENT, getStoredRole, getStoredUser } from '../services/auth';
import {
  USER_ROLES,
  DOSSIER_STATUSES,
  DOSSIER_STATUS_LABELS
} from '../constants/domainLabels';
import DossierCreateModal from '../components/DossierCreateModal';
import {
  EmptyState,
  ConfirmationModal,
  SortableHeader,
  PageHeader,
  CaseFileStatusBadge,
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
import { formatAmountTnd, formatShortDate } from '../utils/formatters';
import './DossiersList/DossiersList.css';

const DOSSIER_STATUS_OPTIONS = {
  [USER_ROLES.AGENT]: [
    DOSSIER_STATUSES.RECEIVED,
    DOSSIER_STATUSES.IN_PROGRESS,
    DOSSIER_STATUSES.UNDER_REVIEW,
    DOSSIER_STATUSES.AWAITING_COMPLEMENT,
    DOSSIER_STATUSES.PROCESSED
  ],
  [USER_ROLES.CLAIMS_MANAGER]: [
    DOSSIER_STATUSES.RECEIVED,
    DOSSIER_STATUSES.IN_PROGRESS,
    DOSSIER_STATUSES.UNDER_REVIEW,
    DOSSIER_STATUSES.IN_ESCALATION,
    DOSSIER_STATUSES.AWAITING_COMPLEMENT,
    DOSSIER_STATUSES.PROCESSED
  ],
  [USER_ROLES.SUPERVISOR]: [
    DOSSIER_STATUSES.RECEIVED,
    DOSSIER_STATUSES.IN_PROGRESS,
    DOSSIER_STATUSES.UNDER_REVIEW,
    DOSSIER_STATUSES.IN_ESCALATION,
    DOSSIER_STATUSES.AWAITING_COMPLEMENT,
    DOSSIER_STATUSES.PROCESSED
  ],
  [USER_ROLES.ADMIN]: [
    DOSSIER_STATUSES.RECEIVED,
    DOSSIER_STATUSES.IN_PROGRESS,
    DOSSIER_STATUSES.UNDER_REVIEW,
    DOSSIER_STATUSES.IN_ESCALATION,
    DOSSIER_STATUSES.AWAITING_COMPLEMENT,
    DOSSIER_STATUSES.PROCESSED
  ]
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
  if (role === USER_ROLES.AGENT) {
    return {
      title: 'My Case Files',
      subtitle: 'Prepare, submit, and track your case file history.',
      emptyTitle: 'No Case Files Yet',
      emptyDescription: 'Create your first case file to group validated medical documents.',
      createButtonLabel: 'New Case File',
      canCreateDossier: true
    };
  }

  if (role === USER_ROLES.CLAIMS_MANAGER) {
    return {
      title: 'Case Files',
      subtitle: 'Create case files and review items awaiting business decisions.',
      emptyTitle: 'No Case Files Found',
      emptyDescription: 'No case file is currently available. You can create a new case file to get started.',
      createButtonLabel: 'New Case File',
      canCreateDossier: true
    };
  }

  if (role === USER_ROLES.SUPERVISOR) {
    return {
      title: 'Case Files',
      subtitle: 'Prepare case files or review escalated ones requiring supervisor decisions.',
      emptyTitle: 'No Case Files Found',
      emptyDescription: 'Create a new case file or wait for escalated ones.',
      createButtonLabel: 'New Case File',
      canCreateDossier: true
    };
  }

  if (role === USER_ROLES.ADMIN) {
    return {
      title: 'All Case Files',
      subtitle: 'Supervise case file activity across preparation and review.',
      emptyTitle: 'No Case Files Found',
      emptyDescription: 'No case file is currently available in the system.',
      createButtonLabel: 'New Case File',
      canCreateDossier: true
    };
  }

  return {
    title: 'Case Files',
    subtitle: 'Track case file preparation and review workflow.',
    emptyTitle: 'No Case Files Found',
    emptyDescription: 'No case file is currently available.',
    createButtonLabel: 'New Case File',
    canCreateDossier: false
  };
};

function DossiersList() {
  const navigate = useNavigate();
  const location = useLocation();

  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState(() => getStoredRole());
  const [currentUserId, setCurrentUserId] = useState(() => Number(getStoredUser()?.id || 0));
  const [accessDeniedMessage, setAccessDeniedMessage] = useState(null);
  const [deleteTargetDossier, setDeleteTargetDossier] = useState(null);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [deletingDossierId, setDeletingDossierId] = useState(null);
  const [filtersDraft, setFiltersDraft] = useState(() => {
    const storedRole = getStoredRole();
    if (storedRole === USER_ROLES.SUPERVISOR) {
      return { ...DEFAULT_DOSSIER_FILTERS, status: DOSSIER_STATUSES.IN_ESCALATION };
    }
    return DEFAULT_DOSSIER_FILTERS;
  });
  const [appliedFilters, setAppliedFilters] = useState(() => {
    const storedRole = getStoredRole();
    if (storedRole === USER_ROLES.SUPERVISOR) {
      return { ...DEFAULT_DOSSIER_FILTERS, status: DOSSIER_STATUSES.IN_ESCALATION };
    }
    return DEFAULT_DOSSIER_FILTERS;
  });
  const [sortState, setSortState] = useState(DEFAULT_DOSSIER_SORT);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const appliedFiltersRef = useRef(
    getStoredRole() === USER_ROLES.SUPERVISOR
      ? { ...DEFAULT_DOSSIER_FILTERS, status: DOSSIER_STATUSES.IN_ESCALATION }
      : DEFAULT_DOSSIER_FILTERS
  );
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
    () => DOSSIER_STATUS_OPTIONS[role] || DOSSIER_STATUS_OPTIONS[USER_ROLES.ADMIN],
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
        toast.error(getApiErrorMessage(err, 'Failed to load case files. Please try again.'));
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
    const resetFilters =
      role === USER_ROLES.SUPERVISOR
        ? { ...DEFAULT_DOSSIER_FILTERS, status: DOSSIER_STATUSES.IN_ESCALATION }
        : { ...DEFAULT_DOSSIER_FILTERS };
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
    if (dossier.status !== DOSSIER_STATUSES.RECEIVED) {
      return false;
    }

    if (role === USER_ROLES.ADMIN) {
      return true;
    }

    if (role === USER_ROLES.AGENT || role === USER_ROLES.CLAIMS_MANAGER || role === USER_ROLES.SUPERVISOR) {
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

    setIsDeleteConfirming(true);
    setDeletingDossierId(targetId);

    try {
      const response = await api.delete(`/dossiers/${targetId}`);
      toast.success(response.data?.message || 'Case file deleted successfully.');
      setDeleteTargetDossier(null);

      const nextPage = dossiers.length === 1 && currentPage > 1
        ? currentPage - 1
        : currentPage;

      setLoading(true);
      await fetchDossiers(nextPage, appliedFiltersRef.current, appliedSortRef.current);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete case file.'));
    } finally {
      setIsDeleteConfirming(false);
      setDeletingDossierId(null);
    }
  };

  const hasActiveFilters = hasAnyListFilter(appliedFilters);
  const hasDraftFilters = hasAnyListFilter(filtersDraft);
  const hasSortOverride = !isDefaultSort(sortState, DEFAULT_DOSSIER_SORT);

  const emptyTitle = hasActiveFilters ? 'No Case Files Match Your Filters' : pageConfig.emptyTitle;
  const emptyDescription = hasActiveFilters
    ? 'Try adjusting your search, status, or date range and apply again.'
    : pageConfig.emptyDescription;

  return (
    <div className="container py-4 dossiers-list">
      <PageHeader
        icon="bi-briefcase"
        title={pageConfig.title}
        subtitle={pageConfig.subtitle}
        action={
          pageConfig.canCreateDossier && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCreateModalOpen(true)}
            >
              <i className="bi bi-plus-circle me-2" aria-hidden="true" />
              {pageConfig.createButtonLabel}
            </button>
          )
        }
      />

      {accessDeniedMessage && (
        <div className="alert alert-warning d-flex align-items-center mb-3" role="alert">
          <i className="bi bi-shield-lock me-2"></i>
          <span>{accessDeniedMessage}</span>
        </div>
      )}

      <ListFiltersCard className="dossiers-filters-card">
        <form className="row g-3 align-items-end enterprise-filters-form" onSubmit={handleApplyFilters}>
            <div className="col-12 col-lg-4">
              <label htmlFor="dossiersSearch" className="form-label mb-1">Search</label>
              <input
                id="dossiersSearch"
                type="text"
                className="form-control"
                placeholder="Search by case file number or assured identifier"
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
                    {DOSSIER_STATUS_LABELS[status] || status}
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

            <div className="col-12 col-md-6 col-lg-2 d-flex gap-2 enterprise-filters-actions">
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
      </ListFiltersCard>

      <div className="card">
        <div className="table-section-shell">
          {loading && dossiers.length > 0 && (
            <div className="table-loading-overlay" role="status" aria-live="polite" aria-label="Updating list">
              <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
              <span>Updating case files...</span>
            </div>
          )}

          <div className="table-responsive">
            <table className="table table-hover table-striped mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <SortableHeader
                    label="Case File #"
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
                  const isReturnedRow =
                    role === USER_ROLES.CLAIMS_MANAGER &&
                    dossier.status === DOSSIER_STATUSES.UNDER_REVIEW &&
                    dossier.chef_decision_type === 'RETURNED';
                  const isComplementRow =
                    role === USER_ROLES.AGENT &&
                    dossier.status === DOSSIER_STATUSES.AWAITING_COMPLEMENT;
                  const rowAccentClass = (isReturnedRow || isComplementRow) ? 'dossier-row--accent-amber' : '';

                  return (
                    <tr key={dossier.id} className={rowAccentClass}>
                      <td className="fw-semibold">{dossier.numero_dossier || '-'}</td>
                      <td>{dossier.assured_identifier || '-'}</td>
                      <td className="dossiers-status-cell">
                        <CaseFileStatusBadge status={dossier.status} variant="table" />
                      </td>
                      <td className="cell-numeric">{formatAmountTnd(dossier.montant_total)}</td>
                      <td className="cell-numeric">{documentsCount}</td>
                      <td className="cell-date">{formatShortDate(dossier.created_at)}</td>
                      <td className="cell-actions">
                        <div className="dossiers-actions-wrap d-flex gap-2 align-items-center">
                          <button
                            className="btn btn-outline-primary btn-sm dossiers-action-btn dossiers-action-btn--details"
                            onClick={() => navigate(`/dossiers/${dossier.id}`)}
                          >
                            <i className="bi bi-eye dossiers-action-btn__icon" aria-hidden="true"></i>
                            {role === USER_ROLES.SUPERVISOR ? 'Review' : 'Details'}
                          </button>

                          {canDeleteDossier(dossier) && (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm dossiers-action-btn dossiers-action-btn--delete"
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
                                Create Case File
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
        <TablePaginationFooter
          currentPage={currentPage}
          lastPage={lastPage}
          total={total}
          summaryLabel="case files"
          onPageChange={handlePageChange}
        />
      </div>

      <DossierCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={Boolean(deleteTargetDossier)}
        title="Delete Case File"
        message={
          deleteTargetDossier
            ? `Delete case file "${deleteTargetDossier.numero_dossier}"? This action cannot be undone.`
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
