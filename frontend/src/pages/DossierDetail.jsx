import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStoredRole, AUTH_CHANGED_EVENT } from '../services/auth';
import {
  getDossierDetail,
  createRubrique,
  attachDocuments,
  detachDocument,
  submitDossier,
  processDossier,
  acceptDocument,
  rejectDocument,
  rejectRubrique,
  getValidatedDocuments
} from '../services/dossierWorkflow';
import { Loader, ErrorAlert, SuccessAlert, EmptyState } from '../ui';
import './DossierDetail/DossierDetail.css';

const DOSSIER_FROZEN_STATUSES = ['PROCESSED', 'EXPORTED'];

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

const formatApiError = (error, fallbackMessage) => {
  if (!error?.response) {
    return 'Network error. Please check your connection and retry.';
  }

  const status = error.response.status;
  const backendErrors = error.response?.data?.errors || {};
  const firstBackendError = Object.values(backendErrors)[0];

  if (firstBackendError) {
    return Array.isArray(firstBackendError) ? firstBackendError[0] : firstBackendError;
  }

  const backendMessage = error.response?.data?.message;

  if (status === 403) {
    return backendMessage || 'You are not allowed to perform this action.';
  }

  if (status === 404) {
    return backendMessage || 'The requested resource was not found.';
  }

  if (status === 422) {
    return backendMessage || 'This action violates a business rule.';
  }

  return backendMessage || fallbackMessage;
};

const mapDossierDetailResponse = (apiResponse) => {
  const payload = apiResponse || {};
  const dossier = payload.dossier || payload;
  const rubriques = Array.isArray(payload.rubriques)
    ? payload.rubriques
    : Array.isArray(dossier?.rubriques)
      ? dossier.rubriques
      : [];

  return {
    dossier: dossier || null,
    rubriques: rubriques.map((rubrique) => ({
      ...rubrique,
      documents: Array.isArray(rubrique?.documents) ? rubrique.documents : []
    })),
    requested_total: payload.requested_total ?? dossier?.requested_total ?? 0,
    current_total: payload.current_total ?? dossier?.current_total ?? 0,
    display_total: payload.display_total ?? dossier?.display_total ?? null
  };
};

const getDocumentExtractionTotal = (document) => {
  const extractions = Array.isArray(document?.extractions) ? document.extractions : [];

  if (extractions.length === 0) {
    return null;
  }

  const latestExtraction = [...extractions].sort((a, b) => Number(b?.version || 0) - Number(a?.version || 0))[0];
  const total = latestExtraction?.result_json?.fields?.total_ttc;

  if (total === null || total === undefined || total === '') {
    return null;
  }

  const numeric = Number(total);
  return Number.isNaN(numeric) ? null : numeric;
};

function DossierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [dossierData, setDossierData] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [detailError, setDetailError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [rubriqueTitle, setRubriqueTitle] = useState('');
  const [rubriqueNotes, setRubriqueNotes] = useState('');

  const [isCreatingRubrique, setIsCreatingRubrique] = useState(false);
  const [isSubmittingDossier, setIsSubmittingDossier] = useState(false);
  const [isProcessingDossier, setIsProcessingDossier] = useState(false);
  const [isAttachingByRubriqueId, setIsAttachingByRubriqueId] = useState({});
  const [isRejectingRubriqueById, setIsRejectingRubriqueById] = useState({});
  const [isDetachingByDocumentId, setIsDetachingByDocumentId] = useState({});
  const [isDecidingByDocumentId, setIsDecidingByDocumentId] = useState({});

  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [attachTargetRubrique, setAttachTargetRubrique] = useState(null);
  const [validatedDocuments, setValidatedDocuments] = useState([]);
  const [isLoadingValidatedDocuments, setIsLoadingValidatedDocuments] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTargetDocument, setRejectTargetDocument] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  // Rubrique rejection modal state (replaces window.prompt + window.confirm)
  const [isRejectRubriqueModalOpen, setIsRejectRubriqueModalOpen] = useState(false);
  const [rejectRubriqueTarget, setRejectRubriqueTarget] = useState(null);
  const [rejectRubriqueNote, setRejectRubriqueNote] = useState('');

  // Fix: auto-dismiss successMessage after 4 seconds
  const successDismissTimer = useRef(null);
  useEffect(() => {
    if (successMessage) {
      if (successDismissTimer.current) {
        clearTimeout(successDismissTimer.current);
      }
      successDismissTimer.current = setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    }
    return () => {
      if (successDismissTimer.current) {
        clearTimeout(successDismissTimer.current);
      }
    };
  }, [successMessage]);

  const refreshDetail = useCallback(async () => {
    setIsLoadingDetail(true);
    setDetailError(null);

    try {
      const response = await getDossierDetail(id);
      const normalized = mapDossierDetailResponse(response);
      setDossierData(normalized);
    } catch (error) {
      setDetailError(formatApiError(error, 'Failed to load dossier details. Please try again.'));
      setDossierData(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [id]);

  useEffect(() => {
    refreshDetail();
  }, [refreshDetail]);

  const [role, setRole] = useState(() => getStoredRole());

  useEffect(() => {
    const syncRole = () => setRole(getStoredRole());
    window.addEventListener(AUTH_CHANGED_EVENT, syncRole);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, syncRole);
  }, []);

  const dossier = dossierData?.dossier;
  const rubriques = useMemo(() => dossierData?.rubriques ?? [], [dossierData]);
  const dossierStatus = (dossier?.status || '').toUpperCase();

  const canPrepare = role === 'AGENT' || role === 'ADMIN';
  const canReview = role === 'GESTIONNAIRE' || role === 'ADMIN';

  const isFrozen = DOSSIER_FROZEN_STATUSES.includes(dossierStatus);
  // Preparation actions: AGENT or ADMIN + correct status
  const canCreateRubrique = canPrepare && (dossierStatus === 'RECEIVED' || dossierStatus === 'IN_PROGRESS');
  const canAttachDocuments = canPrepare && dossierStatus === 'IN_PROGRESS';
  const canDetachDocuments = canPrepare && dossierStatus === 'IN_PROGRESS';
  const canSubmitDossier = canPrepare && dossierStatus === 'IN_PROGRESS';
  // Review actions: GESTIONNAIRE or ADMIN + dossier status TO_VALIDATE
  const canDecideDocuments = canReview && dossierStatus === 'TO_VALIDATE';
  const canProcessDossier = canReview && dossierStatus === 'TO_VALIDATE';
  const canRejectRubrique = canReview && dossierStatus === 'TO_VALIDATE';

  const allAttachedDocumentIds = useMemo(() => {
    const ids = new Set();

    rubriques.forEach((rubrique) => {
      (rubrique.documents || []).forEach((document) => {
        if (document?.id) {
          ids.add(document.id);
        }
      });
    });

    return ids;
  }, [rubriques]);

  const attachableDocuments = useMemo(() => {
    return validatedDocuments.filter((document) => {
      if (!document?.id) {
        return false;
      }

      // Exclude documents already displayed in any rubrique on this page.
      // This covers the case where a doc was just attached in this session
      // and its rubrique_id is not yet null in the server's latest response.
      if (allAttachedDocumentIds.has(document.id)) {
        return false;
      }

      // Primary filter: rubrique_id === null means the document is truly free.
      // The backend enforces the same rule in RubriqueController::attachDocuments().
      // Both checks together make the duplicate-attachment prevention robust.
      return document.rubrique_id === null || document.rubrique_id === undefined;
    });
  }, [validatedDocuments, allAttachedDocumentIds]);

  const handleToggleDocument = (documentId) => {
    setSelectedDocumentIds((prev) => {
      if (prev.includes(documentId)) {
        return prev.filter((idValue) => idValue !== documentId);
      }

      return [...prev, documentId];
    });
  };

  const openAttachModal = async (rubrique) => {
    setSuccessMessage(null);
    setDetailError(null);
    setAttachTargetRubrique(rubrique);
    setSelectedDocumentIds([]);
    setIsAttachModalOpen(true);
    setIsLoadingValidatedDocuments(true);

    try {
      const documents = await getValidatedDocuments();
      setValidatedDocuments(Array.isArray(documents) ? documents : []);
    } catch (error) {
      setDetailError(formatApiError(error, 'Failed to load validated documents.'));
      setValidatedDocuments([]);
    } finally {
      setIsLoadingValidatedDocuments(false);
    }
  };

  const closeAttachModal = () => {
    setIsAttachModalOpen(false);
    setAttachTargetRubrique(null);
    setSelectedDocumentIds([]);
    setValidatedDocuments([]);
  };

  const openRejectDocumentModal = (document) => {
    setRejectTargetDocument(document);
    setRejectNote('');
    setIsRejectModalOpen(true);
  };

  const closeRejectDocumentModal = () => {
    setIsRejectModalOpen(false);
    setRejectTargetDocument(null);
    setRejectNote('');
  };

  const withMapPending = (setter, key, value) => {
    setter((previous) => ({
      ...previous,
      [key]: value
    }));
  };

  const handleCreateRubrique = async (event) => {
    event.preventDefault();

    if (!rubriqueTitle.trim()) {
      setDetailError('Rubrique title is required.');
      return;
    }

    try {
      setIsCreatingRubrique(true);
      setDetailError(null);
      setSuccessMessage(null);

      const response = await createRubrique(id, {
        title: rubriqueTitle.trim(),
        notes: rubriqueNotes.trim() || null
      });

      setRubriqueTitle('');
      setRubriqueNotes('');
      setSuccessMessage(response?.message || 'Rubrique created successfully.');
      await refreshDetail();
    } catch (error) {
      setDetailError(formatApiError(error, 'Failed to create rubrique.'));
    } finally {
      setIsCreatingRubrique(false);
    }
  };

  const handleAttachDocuments = async () => {
    if (!attachTargetRubrique?.id) {
      return;
    }

    if (selectedDocumentIds.length === 0) {
      setDetailError('Select at least one validated document to attach.');
      return;
    }

    try {
      withMapPending(setIsAttachingByRubriqueId, attachTargetRubrique.id, true);
      setDetailError(null);
      setSuccessMessage(null);

      const response = await attachDocuments(attachTargetRubrique.id, selectedDocumentIds);

      setSuccessMessage(response?.message || 'Documents attached successfully.');
      closeAttachModal();
      await refreshDetail();
    } catch (error) {
      setDetailError(formatApiError(error, 'Failed to attach documents.'));
    } finally {
      withMapPending(setIsAttachingByRubriqueId, attachTargetRubrique.id, false);
    }
  };

  const handleDetachDocument = async (rubriqueId, documentId) => {
    if (!window.confirm('Detach this document from the rubrique?')) {
      return;
    }

    try {
      withMapPending(setIsDetachingByDocumentId, documentId, true);
      setDetailError(null);
      setSuccessMessage(null);

      const response = await detachDocument(rubriqueId, documentId);
      setSuccessMessage(response?.message || 'Document detached successfully.');
      await refreshDetail();
    } catch (error) {
      setDetailError(formatApiError(error, 'Failed to detach document.'));
    } finally {
      withMapPending(setIsDetachingByDocumentId, documentId, false);
    }
  };

  const handleSubmitDossier = async () => {
    if (!window.confirm('Submit dossier for validation?')) {
      return;
    }

    try {
      setIsSubmittingDossier(true);
      setDetailError(null);
      setSuccessMessage(null);

      const response = await submitDossier(id);
      setSuccessMessage(response?.message || 'Dossier submitted successfully.');
      await refreshDetail();
    } catch (error) {
      setDetailError(formatApiError(error, 'Failed to submit dossier.'));
    } finally {
      setIsSubmittingDossier(false);
    }
  };

  const handleProcessDossier = async () => {
    if (!window.confirm('Process dossier now? This will freeze modifications.')) {
      return;
    }

    try {
      setIsProcessingDossier(true);
      setDetailError(null);
      setSuccessMessage(null);

      const response = await processDossier(id);
      setSuccessMessage(response?.message || 'Dossier processed successfully.');
      await refreshDetail();
    } catch (error) {
      setDetailError(formatApiError(error, 'Failed to process dossier.'));
    } finally {
      setIsProcessingDossier(false);
    }
  };

  const handleAcceptDocument = async (documentId) => {
    try {
      withMapPending(setIsDecidingByDocumentId, documentId, true);
      setDetailError(null);
      setSuccessMessage(null);

      const response = await acceptDocument(documentId, null);
      setSuccessMessage(response?.message || 'Document accepted successfully.');
      await refreshDetail();
    } catch (error) {
      setDetailError(formatApiError(error, 'Failed to accept document.'));
    } finally {
      withMapPending(setIsDecidingByDocumentId, documentId, false);
    }
  };

  const handleRejectDocument = async () => {
    const documentId = rejectTargetDocument?.id;
    if (!documentId) {
      return;
    }

    const normalizedNote = rejectNote.trim();
    if (!normalizedNote) {
      setDetailError('A rejection note is required.');
      return;
    }

    try {
      withMapPending(setIsDecidingByDocumentId, documentId, true);
      setDetailError(null);
      setSuccessMessage(null);

      const response = await rejectDocument(documentId, normalizedNote);
      setSuccessMessage(response?.message || 'Document rejected successfully.');
      closeRejectDocumentModal();
      await refreshDetail();
    } catch (error) {
      setDetailError(formatApiError(error, 'Failed to reject document.'));
    } finally {
      withMapPending(setIsDecidingByDocumentId, documentId, false);
    }
  };

  const openRejectRubriqueModal = (rubrique) => {
    setRejectRubriqueTarget(rubrique);
    setRejectRubriqueNote('');
    setIsRejectRubriqueModalOpen(true);
  };

  const closeRejectRubriqueModal = () => {
    setIsRejectRubriqueModalOpen(false);
    setRejectRubriqueTarget(null);
    setRejectRubriqueNote('');
  };

  const handleRejectRubriqueConfirm = async () => {
    const rubriqueId = rejectRubriqueTarget?.id;
    if (!rubriqueId) {
      return;
    }

    try {
      withMapPending(setIsRejectingRubriqueById, rubriqueId, true);
      setDetailError(null);
      setSuccessMessage(null);

      const note = rejectRubriqueNote.trim() || null;
      const response = await rejectRubrique(rubriqueId, note);
      setSuccessMessage(response?.message || 'Rubrique rejected successfully.');
      closeRejectRubriqueModal();
      await refreshDetail();
    } catch (error) {
      setDetailError(formatApiError(error, 'Failed to reject rubrique.'));
    } finally {
      withMapPending(setIsRejectingRubriqueById, rubriqueId, false);
    }
  };

  if (isLoadingDetail) {
    return (
      <div className="container py-5">
        <Loader message="Loading dossier details..." size="md" />
      </div>
    );
  }

  if (detailError && !dossier) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <ErrorAlert message={detailError} title="" />
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

      {detailError && (
        <div className="mb-3">
          <ErrorAlert message={detailError} title="" />
        </div>
      )}

      {successMessage && (
        <div className="mb-3">
          <SuccessAlert message={successMessage} title="" />
        </div>
      )}

      {isFrozen && (
        <div className="alert alert-warning finalized-banner mb-4">
          <strong>Finalized dossier.</strong> This dossier is {dossierStatus} and is now read-only.
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
                <p className="detail-label mb-1">Stored Total</p>
                <p className="detail-value mb-0">{formatAmount(dossier.montant_total)}</p>
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
            <div className="col-md-4">
              <div className="detail-item">
                <p className="detail-label mb-1">Requested Total</p>
                <p className="detail-value mb-0">{formatAmount(dossierData?.requested_total)}</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="detail-item">
                <p className="detail-label mb-1">Current Total</p>
                <p className="detail-value mb-0">{formatAmount(dossierData?.current_total)}</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="detail-item">
                <p className="detail-label mb-1">Display Total</p>
                <p className="detail-value mb-0">{formatDisplayTotal(dossierData?.display_total)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0 d-flex align-items-center">
            <i className="bi bi-gear me-2"></i>
            Workflow Actions
          </h6>
        </div>
        <div className="card-body">
          {(canCreateRubrique && !isFrozen) && (
            <form className="mb-4" onSubmit={handleCreateRubrique}>
              <div className="row g-2 align-items-end">
                <div className="col-lg-4">
                  <label htmlFor="rubriqueTitle" className="form-label mb-1">Rubrique Title</label>
                  <input
                    id="rubriqueTitle"
                    type="text"
                    className="form-control"
                    value={rubriqueTitle}
                    onChange={(event) => setRubriqueTitle(event.target.value)}
                    disabled={isCreatingRubrique}
                    placeholder="Ex: Pharmacy invoices"
                  />
                </div>
                <div className="col-lg-5">
                  <label htmlFor="rubriqueNotes" className="form-label mb-1">Notes (optional)</label>
                  <input
                    id="rubriqueNotes"
                    type="text"
                    className="form-control"
                    value={rubriqueNotes}
                    onChange={(event) => setRubriqueNotes(event.target.value)}
                    disabled={isCreatingRubrique}
                    placeholder="Short internal note"
                  />
                </div>
                <div className="col-lg-3">
                  <button type="submit" className="btn btn-primary w-100" disabled={isCreatingRubrique || !rubriqueTitle.trim()}>
                    {isCreatingRubrique ? 'Creating...' : 'Create Rubrique'}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="d-flex flex-wrap gap-2">
            {canSubmitDossier && !isFrozen && (
              <button
                className="btn btn-outline-primary"
                onClick={handleSubmitDossier}
                disabled={isSubmittingDossier}
              >
                {isSubmittingDossier ? 'Submitting...' : 'Submit Dossier'}
              </button>
            )}

            {canProcessDossier && !isFrozen && (
              <button
                className="btn btn-outline-success"
                onClick={handleProcessDossier}
                disabled={isProcessingDossier}
              >
                {isProcessingDossier ? 'Processing...' : 'Process Dossier'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0 d-flex align-items-center">
            <i className="bi bi-diagram-3 me-2"></i>
            Rubriques
          </h6>
          <span className="text-muted small">{rubriques.length} rubrique(s)</span>
        </div>
        <div className="card-body">
          {rubriques.length === 0 ? (
            <EmptyState
              icon="folder2-open"
              title="No Rubriques"
              description="Create a rubrique to start attaching validated documents."
            />
          ) : (
            <div className="rubrique-list">
              {rubriques.map((rubrique) => {
                const rubriqueDocuments = rubrique.documents || [];

                return (
                  <div className="card mb-3" key={rubrique.id}>
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-0">{rubrique.title || `Rubrique #${rubrique.id}`}</h6>
                        <small className="text-muted">
                          Status: <span className="fw-semibold">{rubrique.status || 'PENDING'}</span>
                          {' · '}
                          {rubriqueDocuments.length} document(s)
                        </small>
                      </div>

                      <div className="d-flex flex-wrap gap-2">
                        {canAttachDocuments && !isFrozen && (
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openAttachModal(rubrique)}
                            disabled={Boolean(isAttachingByRubriqueId[rubrique.id])}
                          >
                            Attach Documents
                          </button>
                        )}

                        {canRejectRubrique && !isFrozen && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => openRejectRubriqueModal(rubrique)}
                            disabled={Boolean(isRejectingRubriqueById[rubrique.id]) || rubriqueDocuments.length === 0}
                          >
                            {isRejectingRubriqueById[rubrique.id] ? 'Rejecting...' : 'Reject Rubrique'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="card-body">
                      <p className="mb-3 text-muted">{rubrique.notes || 'No notes for this rubrique.'}</p>

                      {rubriqueDocuments.length === 0 ? (
                        <EmptyState
                          icon="file-earmark"
                          title="No Documents in this Rubrique"
                          description="Attach validated documents to this rubrique."
                        />
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-striped align-middle mb-0">
                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>Filename</th>
                                <th>Technical Status</th>
                                <th>Decision Status</th>
                                <th>Total TTC</th>
                                <th>Decision Note</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rubriqueDocuments.map((document) => {
                                const extractionTotal = getDocumentExtractionTotal(document);
                                const decisionStatus = document.decision_status || 'PENDING';
                                const documentId = document.id;
                                const isBusy = Boolean(isDecidingByDocumentId[documentId] || isDetachingByDocumentId[documentId]);

                                return (
                                  <tr key={documentId}>
                                    <td>{documentId}</td>
                                    <td>{document.original_filename || `Document #${documentId}`}</td>
                                    <td>
                                      <span className="badge bg-secondary">{document.status || '-'}</span>
                                    </td>
                                    <td>
                                      <span className="badge bg-primary-subtle text-primary-emphasis">{decisionStatus}</span>
                                    </td>
                                    <td>{extractionTotal === null ? '-' : formatAmount(extractionTotal)}</td>
                                    <td>{document.decision_note || '-'}</td>
                                    <td>
                                      <div className="d-flex flex-wrap gap-1">
                                        {canDecideDocuments && !isFrozen && decisionStatus === 'PENDING' && (
                                          <>
                                            <button
                                              className="btn btn-sm btn-outline-success"
                                              onClick={() => handleAcceptDocument(documentId)}
                                              disabled={isBusy}
                                            >
                                              Accept
                                            </button>
                                            <button
                                              className="btn btn-sm btn-outline-danger"
                                              onClick={() => openRejectDocumentModal(document)}
                                              disabled={isBusy}
                                            >
                                              Reject
                                            </button>
                                          </>
                                        )}

                                        {canDetachDocuments && !isFrozen && (
                                          <button
                                            className="btn btn-sm btn-outline-secondary"
                                            onClick={() => handleDetachDocument(rubrique.id, documentId)}
                                            disabled={isBusy}
                                          >
                                            {isDetachingByDocumentId[documentId] ? 'Detaching...' : 'Detach'}
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
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isAttachModalOpen && (
        <div className="dossier-modal-backdrop">
          <div className="dossier-modal-card">
            <h5 className="mb-3">Attach Validated Documents</h5>
            <p className="text-muted">
              Target rubrique: <strong>{attachTargetRubrique?.title || '-'}</strong>
            </p>

            {isLoadingValidatedDocuments ? (
              <Loader message="Loading validated documents..." size="sm" />
            ) : attachableDocuments.length === 0 ? (
              <EmptyState
                icon="check2-square"
                title="No Attachable Documents"
                description="There are no validated and unassigned documents available."
              />
            ) : (
              <div className="attach-docs-list">
                {attachableDocuments.map((doc) => (
                  <label key={doc.id} className="attach-doc-item">
                    <input
                      type="checkbox"
                      className="form-check-input me-3"
                      checked={selectedDocumentIds.includes(doc.id)}
                      onChange={() => handleToggleDocument(doc.id)}
                      disabled={isAttachingByRubriqueId[attachTargetRubrique?.id] || false}
                    />
                    <span className="fw-medium">{doc.original_filename || `Document #${doc.id}`}</span>
                    <span className="text-muted small ms-2">#{doc.id}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button className="btn btn-outline-secondary" onClick={closeAttachModal}>
                Cancel
              </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAttachDocuments}
                  disabled={
                    !attachTargetRubrique?.id ||
                    (isAttachingByRubriqueId[attachTargetRubrique?.id] || false) ||
                    selectedDocumentIds.length === 0
                  }
                >
                  {(isAttachingByRubriqueId[attachTargetRubrique?.id] || false)
                    ? 'Attaching...'
                    : `Attach Selected (${selectedDocumentIds.length})`}
                </button>
              </div>
            </div>
        </div>
      )}

      {isRejectModalOpen && (
        <div className="dossier-modal-backdrop">
          <div className="dossier-modal-card">
            <h5 className="mb-2">Reject Document</h5>
            <p className="text-muted mb-3">
              Document: <strong>{rejectTargetDocument?.original_filename || `#${rejectTargetDocument?.id || ''}`}</strong>
            </p>

            <label htmlFor="rejectNote" className="form-label">Decision Note (required)</label>
            <textarea
              id="rejectNote"
              className="form-control"
              rows={4}
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              placeholder="Explain why this document is rejected"
            />

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button className="btn btn-outline-secondary" onClick={closeRejectDocumentModal}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleRejectDocument}
                disabled={isDecidingByDocumentId[rejectTargetDocument?.id] || false}
              >
                {(isDecidingByDocumentId[rejectTargetDocument?.id] || false) ? 'Rejecting...' : 'Reject Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isRejectRubriqueModalOpen && (
        <div className="dossier-modal-backdrop">
          <div className="dossier-modal-card">
            <h5 className="mb-2">Reject Entire Rubrique</h5>
            <p className="text-muted mb-3">
              Rubrique: <strong>{rejectRubriqueTarget?.title || `#${rejectRubriqueTarget?.id || ''}`}</strong>
            </p>
            <p className="text-muted small mb-3">
              All documents in this rubrique will be marked as <strong>REJECTED</strong>.
            </p>

            <label htmlFor="rejectRubriqueNote" className="form-label">Decision Note (optional)</label>
            <textarea
              id="rejectRubriqueNote"
              className="form-control"
              rows={3}
              value={rejectRubriqueNote}
              onChange={(event) => setRejectRubriqueNote(event.target.value)}
              placeholder="Optional: explain why this rubrique is rejected"
              disabled={Boolean(isRejectingRubriqueById[rejectRubriqueTarget?.id])}
            />

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                className="btn btn-outline-secondary"
                onClick={closeRejectRubriqueModal}
                disabled={Boolean(isRejectingRubriqueById[rejectRubriqueTarget?.id])}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleRejectRubriqueConfirm}
                disabled={Boolean(isRejectingRubriqueById[rejectRubriqueTarget?.id])}
              >
                {Boolean(isRejectingRubriqueById[rejectRubriqueTarget?.id]) ? 'Rejecting...' : 'Reject All Documents'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DossierDetail;
