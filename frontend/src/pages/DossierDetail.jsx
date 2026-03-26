import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Loader, ErrorAlert, SuccessAlert, EmptyState } from '../ui';
import './DossierDetail/DossierDetail.css';

const FROZEN_STATUSES = ['VALIDE', 'REJETE', 'EXPORTE'];

const formatAmount = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return '-';
  }

  return `${amount.toFixed(3)} TND`;
};

const formatDisplayTotal = (value) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const numeric = formatAmount(value);
  if (numeric !== '-') {
    return numeric;
  }

  return String(value);
};

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString();
};

function DossierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [dossier, setDossier] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(true);

  const [error, setError] = useState(null);
  const [attachError, setAttachError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [attaching, setAttaching] = useState(false);

  const fetchDossier = useCallback(async () => {
    const response = await api.get(`/dossiers/${id}`);
    const payload = response.data || {};
    const dossierData = payload.dossier || payload;
    const dossierDocuments = payload.documents || dossierData.documents || [];

    setDossier({
      ...dossierData,
      documents: dossierDocuments
    });

    return dossierData;
  }, [id]);

  const fetchDocuments = useCallback(async () => {
    let page = 1;
    let lastPage = 1;
    const allDocuments = [];

    do {
      const response = await api.get(`/documents?page=${page}`);
      const payload = response.data || {};

      const pageItems = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.data)
          ? payload.data
          : [];

      allDocuments.push(...pageItems);

      if (Array.isArray(payload)) {
        lastPage = 1;
      } else {
        lastPage = Number(payload.last_page || 1);
      }

      page += 1;
    } while (page <= lastPage);

    setDocuments(allDocuments);
  }, []);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setLoadingDocuments(true);
    setError(null);

    const [dossierResult, documentsResult] = await Promise.allSettled([
      fetchDossier(),
      fetchDocuments()
    ]);

    if (dossierResult.status === 'rejected') {
      setError(
        dossierResult.reason?.response?.data?.message ||
        'Failed to load dossier details. Please try again.'
      );
    } else if (documentsResult.status === 'rejected') {
      setError(
        documentsResult.reason?.response?.data?.message ||
        'Dossier loaded, but documents could not be loaded. Please retry.'
      );
    }

    setLoading(false);
    setLoadingDocuments(false);
  }, [fetchDossier, fetchDocuments]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const attachedDocuments = useMemo(() => dossier?.documents || [], [dossier]);

  const attachedIds = useMemo(
    () => new Set(attachedDocuments.map((doc) => doc.id)),
    [attachedDocuments]
  );

  const eligibleDocuments = useMemo(
    () => documents.filter((doc) => doc.status === 'VALIDATED' && !attachedIds.has(doc.id)),
    [documents, attachedIds]
  );

  const isFrozen = FROZEN_STATUSES.includes((dossier?.status || '').toUpperCase());

  const handleToggleDocument = (documentId) => {
    setSelectedDocumentIds((prev) => {
      if (prev.includes(documentId)) {
        return prev.filter((idValue) => idValue !== documentId);
      }

      return [...prev, documentId];
    });
  };

  const handleAttachDocuments = async () => {
    if (selectedDocumentIds.length === 0) {
      setAttachError('Select at least one validated document to attach.');
      return;
    }

    try {
      setAttaching(true);
      setAttachError(null);
      setSuccessMessage(null);

      await api.post(`/dossiers/${id}/attach-documents`, {
        document_ids: selectedDocumentIds
      });

      setSelectedDocumentIds([]);
      await Promise.all([fetchDossier(), fetchDocuments()]);
      setSuccessMessage('Documents attached successfully and dossier total has been refreshed.');
    } catch (err) {
      if (err.response?.status === 422) {
        const backendErrors = err.response?.data?.errors || {};
        const firstError = Object.values(backendErrors)[0];

        if (firstError) {
          setAttachError(Array.isArray(firstError) ? firstError[0] : firstError);
        } else {
          setAttachError(err.response?.data?.message || 'Attachment validation failed.');
        }
      } else {
        setAttachError(err.response?.data?.message || 'Failed to attach documents. Please try again.');
      }
    } finally {
      setAttaching(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
        <Loader message="Loading dossier details..." size="md" />
      </div>
    );
  }

  if (error && !dossier) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <ErrorAlert message={error} title="" />
          </div>
        </div>
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card">
              <div className="card-body">
                <EmptyState
                  icon="folder-x"
                  title="Dossier Not Found"
                  description="The requested dossier could not be found."
                  action={
                    <button className="btn btn-primary" onClick={() => navigate('/dossiers')}>
                      Back to Dossiers
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
    <div className="container py-4 dossier-detail-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0 page-title d-flex align-items-center">
          <i className="bi bi-folder2-open me-2 opacity-75"></i>
          Dossier Details
        </h2>

        <button className="btn btn-outline-primary" onClick={() => navigate('/dossiers')}>
          <i className="bi bi-arrow-left me-2"></i>
          Back to Dossiers
        </button>
      </div>

      {error && (
        <div className="mb-3">
          <ErrorAlert message={error} title="" />
        </div>
      )}

      {successMessage && (
        <div className="mb-3">
          <SuccessAlert message={successMessage} title="" />
        </div>
      )}

      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0 d-flex align-items-center">
            <i className="bi bi-briefcase me-2"></i>
            {dossier.numero_dossier || 'Dossier'}
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-4">
            <div className="col-md-6 col-lg-4">
              <div className="detail-item">
                <p className="detail-label mb-1">Assured Identifier</p>
                <p className="detail-value mb-0">{dossier.assured_identifier || '-'}</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4">
              <div className="detail-item">
                <p className="detail-label mb-1">Status</p>
                <p className="detail-value mb-0">
                  <span className="badge bg-primary-subtle text-primary-emphasis dossier-status">{dossier.status || '-'}</span>
                </p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4">
              <div className="detail-item">
                <p className="detail-label mb-1">Total Amount</p>
                <p className="detail-value mb-0">{formatAmount(dossier.montant_total)}</p>
                {(dossier.display_total !== null && dossier.display_total !== undefined) && (
                  <small className="text-muted d-block mt-1">
                    Display Total: {formatDisplayTotal(dossier.display_total)}
                  </small>
                )}
              </div>
            </div>
            <div className="col-md-6">
              <div className="detail-item">
                <p className="detail-label mb-1">Episode Description</p>
                <p className="detail-value mb-0">{dossier.episode_description || '-'}</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="detail-item">
                <p className="detail-label mb-1">Notes</p>
                <p className="detail-value mb-0">{dossier.notes || '-'}</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4">
              <div className="detail-item">
                <p className="detail-label mb-1">Created At</p>
                <p className="detail-value mb-0">{formatDateTime(dossier.created_at)}</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4">
              <div className="detail-item">
                <p className="detail-label mb-1">Updated At</p>
                <p className="detail-value mb-0">{formatDateTime(dossier.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0 d-flex align-items-center">
            <i className="bi bi-paperclip me-2"></i>
            Attach Validated Documents
          </h6>
          <span className="text-muted small">
            {isFrozen
              ? `Attachment disabled for status ${dossier.status}`
              : `${eligibleDocuments.length} eligible document(s)`}
          </span>
        </div>
        <div className="card-body">
          {attachError && (
            <div className="mb-3">
              <ErrorAlert message={attachError} title="" />
            </div>
          )}

          {isFrozen ? (
            <EmptyState
              icon="lock"
              title="Attachment Disabled"
              description="This dossier is frozen, so documents can no longer be attached."
            />
          ) : loadingDocuments ? (
            <Loader message="Loading documents..." size="sm" />
          ) : eligibleDocuments.length === 0 ? (
            <EmptyState
              icon="check2-square"
              title="No Eligible Documents"
              description="Only validated and not-yet-attached documents can be added to this dossier."
            />
          ) : (
            <>
              <div className="attach-docs-list">
                {eligibleDocuments.map((doc) => (
                  <label key={doc.id} className="attach-doc-item">
                    <input
                      type="checkbox"
                      className="form-check-input me-3"
                      checked={selectedDocumentIds.includes(doc.id)}
                      onChange={() => handleToggleDocument(doc.id)}
                      disabled={attaching}
                    />
                    <span className="fw-medium">{doc.original_filename || `Document #${doc.id}`}</span>
                    <span className="text-muted small ms-2">#{doc.id}</span>
                  </label>
                ))}
              </div>

              <div className="d-flex justify-content-end mt-3">
                <button
                  className="btn btn-primary"
                  onClick={handleAttachDocuments}
                  disabled={attaching || selectedDocumentIds.length === 0}
                >
                  {attaching ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Attaching...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-link-45deg me-2"></i>
                      Attach Selected ({selectedDocumentIds.length})
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0 d-flex align-items-center">
            <i className="bi bi-files me-2"></i>
            Attached Documents
          </h6>
          <span className="text-muted small">{attachedDocuments.length} document(s)</span>
        </div>
        <div className="card-body p-0">
          {attachedDocuments.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon="folder2-open"
                title="No Documents Attached"
                description="Attach validated documents to build dossier totals."
              />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Filename</th>
                    <th scope="col">Status</th>
                    <th scope="col">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {attachedDocuments.map((doc) => (
                    <tr key={doc.id}>
                      <td>{doc.id}</td>
                      <td>{doc.original_filename || `Document #${doc.id}`}</td>
                      <td>
                        <span className="badge bg-success">{doc.status || 'VALIDATED'}</span>
                      </td>
                      <td>{formatDateTime(doc.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DossierDetail;
