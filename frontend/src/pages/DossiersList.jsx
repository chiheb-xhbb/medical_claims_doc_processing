import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { getApiErrorMessage } from '../services/api';
import { AUTH_CHANGED_EVENT, getStoredRole, getStoredUser } from '../services/auth';
import { Loader, ErrorAlert, EmptyState, SuccessAlert, ConfirmationModal } from '../ui';
import './DossiersList/DossiersList.css';

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
      title: 'Dossiers to Review',
      subtitle: 'Review dossiers awaiting business decisions and processing.',
      emptyTitle: 'No Dossiers to Review',
      emptyDescription: 'No dossier is currently available for your review scope.',
      createButtonLabel: 'New Dossier',
      canCreateDossier: false
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

  const fetchDossiers = useCallback(async (page = 1) => {
    try {
      setError(null);

      const response = await api.get(`/dossiers?page=${page}`);
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
  }, []);

  useEffect(() => {
    fetchDossiers(1);
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
    await fetchDossiers(page);
  };

  const canDeleteDossier = (dossier) => {
    if (dossier.status !== 'RECEIVED') {
      return false;
    }

    if (role === 'ADMIN') {
      return true;
    }

    if (role === 'AGENT') {
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
      await fetchDossiers(nextPage);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to delete dossier.'));
    } finally {
      setIsDeleteConfirming(false);
      setDeletingDossierId(null);
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
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
        <Loader message="Loading dossiers..." size="md" />
      </div>
    );
  }

  if (error && dossiers.length === 0) {
    return (
      <div className="container py-5">
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
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <ErrorAlert message={error} title="" showIcon={true} />
          </div>
        </div>
      </div>
    );
  }

  if (dossiers.length === 0) {
    return (
      <div className="container py-5">
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
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow-sm">
              <div className="card-body">
                <EmptyState
                  icon="briefcase"
                  title={pageConfig.emptyTitle}
                  description={pageConfig.emptyDescription}
                  action={
                    pageConfig.canCreateDossier ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => navigate('/dossiers/create')}
                      >
                        <i className="bi bi-plus-circle me-2"></i>
                        Create Dossier
                      </button>
                    ) : null
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            className="btn btn-primary"
            onClick={() => navigate('/dossiers/create')}
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

      {error && (
        <div className="mb-3">
          <ErrorAlert message={error} title="" showIcon={true} />
        </div>
      )}

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover table-striped mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th scope="col">Dossier #</th>
                <th scope="col">Assured Identifier</th>
                <th scope="col">Status</th>
                <th scope="col">Total</th>
                <th scope="col">Documents</th>
                <th scope="col">Created</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {dossiers.map((dossier) => {
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
              })}
            </tbody>
          </table>
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
        isConfirming={isDeleteConfirming}
        onCancel={closeDeleteModal}
        onConfirm={handleConfirmDeleteDossier}
      />
    </div>
  );
}

export default DossiersList;
