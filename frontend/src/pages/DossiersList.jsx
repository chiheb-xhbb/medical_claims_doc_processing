import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Loader, ErrorAlert, EmptyState } from '../ui';
import './DossiersList/DossiersList.css';

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

  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

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
      setError(err.response?.data?.message || 'Failed to load dossiers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDossiers(1);
  }, [fetchDossiers]);

  const handlePageChange = async (page) => {
    if (page < 1 || page > lastPage) {
      return;
    }

    setLoading(true);
    await fetchDossiers(page);
  };

  if (loading) {
    return (
      <div className="container py-5">
        <Loader message="Loading dossiers..." size="md" />
      </div>
    );
  }

  if (error && dossiers.length === 0) {
    return (
      <div className="container py-5">
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
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow-sm">
              <div className="card-body">
                <EmptyState
                  icon="briefcase"
                  title="No Dossiers Yet"
                  description="Create your first dossier to group validated medical documents."
                  action={
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate('/dossiers/create')}
                    >
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Dossier
                    </button>
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
        <h2 className="mb-0 page-title d-flex align-items-center">
          <i className="bi bi-briefcase me-2 opacity-75"></i>
          Dossiers
        </h2>

        <button
          className="btn btn-primary"
          onClick={() => navigate('/dossiers/create')}
        >
          <i className="bi bi-plus-circle me-2"></i>
          New Dossier
        </button>
      </div>

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
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => navigate(`/dossiers/${dossier.id}`)}
                      >
                        <i className="bi bi-eye me-1"></i>
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card-footer bg-white d-flex justify-content-between align-items-center">
          <span className="text-muted pagination-info">
            Page {currentPage} of {lastPage} ({total} total dossiers)
          </span>

          <div className="btn-group">
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
    </div>
  );
}

export default DossiersList;
