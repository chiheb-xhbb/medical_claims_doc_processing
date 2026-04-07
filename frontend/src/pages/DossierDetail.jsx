import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getStoredRole, getStoredUser, AUTH_CHANGED_EVENT } from '../services/auth';
import {
  getDossierDetail,
  createRubrique,
  attachDocuments,
  detachDocument,
  deleteRubrique,
  submitDossier,
  processDossier,
  acceptDocument,
  rejectDocument,
  rejectRubrique,
  getValidatedDocuments,
  escalateDossier,
  approveDerogation,
  returnToGestionnaire,
  requestComplement,
} from '../services/dossierWorkflow';
import { Loader, EmptyState, ConfirmationModal } from '../ui';
import DossierSummaryCard from './DossierDetail/components/DossierSummaryCard';
import WorkflowActionsCard from './DossierDetail/components/WorkflowActionsCard';
import RubriquesSection from './DossierDetail/components/RubriquesSection';
import AttachDocumentsModal from './DossierDetail/components/AttachDocumentsModal';
import RejectDocumentModal from './DossierDetail/components/RejectDocumentModal';
import RejectRubriqueModal from './DossierDetail/components/RejectRubriqueModal';
import EscalationInfoBlock from './DossierDetail/components/EscalationInfoBlock';
import ChefActionPanel from './DossierDetail/components/ChefActionPanel';
import './DossierDetail/DossierDetail.css';

const DOSSIER_FROZEN_STATUSES = ['PROCESSED'];
const INITIAL_CONFIRMATION_MODAL = {
  isOpen: false,
  action: null,
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  confirmingLabel: 'Processing...',
  confirmVariant: 'primary',
  initialFocus: 'confirm',
  payload: null
};

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

function DossierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [dossierData, setDossierData] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState(null);

  const [rubriqueTitle, setRubriqueTitle] = useState('');
  const [rubriqueNotes, setRubriqueNotes] = useState('');

  const [isCreatingRubrique, setIsCreatingRubrique] = useState(false);
  const [isSubmittingDossier, setIsSubmittingDossier] = useState(false);
  const [isProcessingDossier, setIsProcessingDossier] = useState(false);
  const [isEscalatingDossier, setIsEscalatingDossier] = useState(false);
  const [isChefActing, setIsChefActing] = useState(false);
  const [isAttachingByRubriqueId, setIsAttachingByRubriqueId] = useState({});
  const [isDeletingRubriqueById, setIsDeletingRubriqueById] = useState({});
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

  const [isRejectRubriqueModalOpen, setIsRejectRubriqueModalOpen] = useState(false);
  const [rejectRubriqueTarget, setRejectRubriqueTarget] = useState(null);
  const [rejectRubriqueNote, setRejectRubriqueNote] = useState('');
  const [confirmationModal, setConfirmationModal] = useState(INITIAL_CONFIRMATION_MODAL);

  // Escalation modal state
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');

  const refreshDetail = useCallback(async () => {
    setIsLoadingDetail(true);
    setLoadErrorMessage(null);

    try {
      const response = await getDossierDetail(id);
      const normalized = mapDossierDetailResponse(response);
      setDossierData(normalized);
    } catch (error) {
      const message = formatApiError(error, 'Failed to load dossier details. Please try again.');
      setLoadErrorMessage(message);
      toast.error(message);
      setDossierData(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [id]);

  useEffect(() => {
    refreshDetail();
  }, [refreshDetail]);

  const [role, setRole] = useState(() => getStoredRole());
  const [currentUserId, setCurrentUserId] = useState(() => Number(getStoredUser()?.id || 0));

  useEffect(() => {
    const syncRole = () => {
      setRole(getStoredRole());
      setCurrentUserId(Number(getStoredUser()?.id || 0));
    };
    window.addEventListener(AUTH_CHANGED_EVENT, syncRole);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, syncRole);
  }, []);

  const dossier = dossierData?.dossier;
  const rubriques = useMemo(() => dossierData?.rubriques ?? [], [dossierData]);
  const dossierStatus = (dossier?.status || '').toUpperCase();
  const isDossierOwnedByCurrentUser = Number(dossier?.created_by) === currentUserId;

  const isChef = role === 'CHEF_HIERARCHIQUE';
  const isChefReviewer = role === 'CHEF_HIERARCHIQUE' || role === 'ADMIN';
  const canPrepare = !isChef && (role === 'AGENT' || role === 'GESTIONNAIRE' || role === 'ADMIN');
  const canManagePreparation = role === 'ADMIN' || isDossierOwnedByCurrentUser;
  const canReview = role === 'GESTIONNAIRE' || role === 'ADMIN';

  const isFrozen = DOSSIER_FROZEN_STATUSES.includes(dossierStatus);

  const canCreateRubrique = canPrepare && canManagePreparation && (dossierStatus === 'RECEIVED' || dossierStatus === 'IN_PROGRESS' || dossierStatus === 'COMPLEMENT_ATTENDU');
  const canDeleteRubrique = canPrepare && canManagePreparation && (dossierStatus === 'RECEIVED' || dossierStatus === 'IN_PROGRESS' || dossierStatus === 'COMPLEMENT_ATTENDU');
  const canAttachDocuments = canPrepare && canManagePreparation && (dossierStatus === 'IN_PROGRESS' || dossierStatus === 'COMPLEMENT_ATTENDU');
  const canDetachDocuments = canPrepare && canManagePreparation && (dossierStatus === 'IN_PROGRESS' || dossierStatus === 'COMPLEMENT_ATTENDU');
  const canSubmitDossier = canPrepare && canManagePreparation && (dossierStatus === 'IN_PROGRESS' || dossierStatus === 'COMPLEMENT_ATTENDU');
  const canDecideDocuments = canReview && dossierStatus === 'TO_VALIDATE';
  const canProcessDossier = canReview && dossierStatus === 'TO_VALIDATE';
  const canRejectRubrique = canReview && dossierStatus === 'TO_VALIDATE';

  const canEscalate = (role === 'GESTIONNAIRE' || role === 'ADMIN') && dossierStatus === 'TO_VALIDATE';

  const canChefAct = isChefReviewer && dossierStatus === 'EN_DEROGATION';

  const showWorkflowActions = !isFrozen && !isChef && (canCreateRubrique || canSubmitDossier || canProcessDossier);

  const isReturnedToGestionnaire =
    dossierStatus === 'TO_VALIDATE' &&
    dossier?.chef_decision_type === 'RETURNED';

  const isComplementPending = dossierStatus === 'COMPLEMENT_ATTENDU';

  const isConfirmingAction =
    (confirmationModal.action === 'submit' && isSubmittingDossier) ||
    (confirmationModal.action === 'process' && isProcessingDossier) ||
    (confirmationModal.action === 'detach' && Boolean(isDetachingByDocumentId[confirmationModal.payload?.documentId])) ||
    (confirmationModal.action === 'delete_rubrique' && Boolean(isDeletingRubriqueById[confirmationModal.payload?.rubriqueId])) ||
    (confirmationModal.action === 'accept_document' && Boolean(isDecidingByDocumentId[confirmationModal.payload?.documentId]));

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

      if (role !== 'ADMIN' && Number(document.user_id) !== Number(currentUserId)) {
        return false;
      }

      if (allAttachedDocumentIds.has(document.id)) {
        return false;
      }

      return document.rubrique_id === null || document.rubrique_id === undefined;
    });
  }, [validatedDocuments, allAttachedDocumentIds, role, currentUserId]);

  const handleToggleDocument = (documentId) => {
    setSelectedDocumentIds((prev) => {
      if (prev.includes(documentId)) {
        return prev.filter((idValue) => idValue !== documentId);
      }

      return [...prev, documentId];
    });
  };

  const openAttachModal = async (rubrique) => {
    setAttachTargetRubrique(rubrique);
    setSelectedDocumentIds([]);
    setIsAttachModalOpen(true);
    setIsLoadingValidatedDocuments(true);

    try {
      const documents = await getValidatedDocuments();
      setValidatedDocuments(Array.isArray(documents) ? documents : []);
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to load validated documents.'));
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

  const openConfirmationModal = (configuration) => {
    setConfirmationModal({
      ...INITIAL_CONFIRMATION_MODAL,
      isOpen: true,
      ...configuration
    });
  };

  const closeConfirmationModal = () => {
    if (isConfirmingAction) {
      return;
    }

    setConfirmationModal(INITIAL_CONFIRMATION_MODAL);
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
      toast.error('Rubrique title is required.');
      return;
    }

    try {
      setIsCreatingRubrique(true);

      const response = await createRubrique(id, {
        title: rubriqueTitle.trim(),
        notes: rubriqueNotes.trim() || null
      });

      setRubriqueTitle('');
      setRubriqueNotes('');
      toast.success(response?.message || 'Rubrique created successfully.');
      await refreshDetail();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to create rubrique.'));
    } finally {
      setIsCreatingRubrique(false);
    }
  };

  const handleAttachDocuments = async () => {
    if (!attachTargetRubrique?.id) {
      return;
    }

    if (selectedDocumentIds.length === 0) {
      toast.error('Select at least one validated document to attach.');
      return;
    }

    try {
      withMapPending(setIsAttachingByRubriqueId, attachTargetRubrique.id, true);

      const response = await attachDocuments(attachTargetRubrique.id, selectedDocumentIds);

      toast.success(response?.message || 'Documents attached successfully.');
      closeAttachModal();
      await refreshDetail();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to attach documents.'));
    } finally {
      withMapPending(setIsAttachingByRubriqueId, attachTargetRubrique.id, false);
    }
  };

  const executeDetachDocument = async (rubriqueId, documentId) => {
    if (!rubriqueId || !documentId) {
      return;
    }

    try {
      withMapPending(setIsDetachingByDocumentId, documentId, true);

      const response = await detachDocument(rubriqueId, documentId);
      toast.success(response?.message || 'Document detached successfully.');
      await refreshDetail();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to detach document.'));
    } finally {
      withMapPending(setIsDetachingByDocumentId, documentId, false);
    }
  };

  const executeDeleteRubrique = async (rubriqueId) => {
    if (!rubriqueId) {
      return;
    }

    try {
      withMapPending(setIsDeletingRubriqueById, rubriqueId, true);

      const response = await deleteRubrique(rubriqueId);
      toast.success(response?.message || 'Rubrique deleted successfully.');
      await refreshDetail();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to delete rubrique.'));
    } finally {
      withMapPending(setIsDeletingRubriqueById, rubriqueId, false);
    }
  };

  const executeSubmitDossier = async () => {
    try {
      setIsSubmittingDossier(true);

      const response = await submitDossier(id);
      toast.success(response?.message || 'Dossier submitted successfully.');
      await refreshDetail();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to submit dossier.'));
    } finally {
      setIsSubmittingDossier(false);
    }
  };

  const executeProcessDossier = async () => {
    try {
      setIsProcessingDossier(true);

      const response = await processDossier(id);
      toast.success(response?.message || 'Dossier processed successfully.');
      await refreshDetail();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to process dossier.'));
    } finally {
      setIsProcessingDossier(false);
    }
  };

  const handleEscalateConfirm = async () => {
    const trimmedReason = escalationReason.trim();
    if (!trimmedReason) {
      toast.error('Escalation reason is required.');
      return;
    }

    try {
      setIsEscalatingDossier(true);
      const response = await escalateDossier(id, trimmedReason);
      toast.success(response?.message || 'Dossier escalated to Chef Hiérarchique.');
      setEscalateModalOpen(false);
      setEscalationReason('');
      await refreshDetail();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to escalate dossier.'));
    } finally {
      setIsEscalatingDossier(false);
    }
  };

  const handleChefApprove = async (note) => {
    try {
      setIsChefActing(true);
      const response = await approveDerogation(id, note);
      toast.success(response?.message || 'Derogation approved. Dossier is now processed.');
      await refreshDetail();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to approve derogation.'));
    } finally {
      setIsChefActing(false);
    }
  };

  const handleChefReturn = async (note) => {
    try {
      setIsChefActing(true);
      const response = await returnToGestionnaire(id, note);
      toast.success(response?.message || 'Dossier returned to Gestionnaire for review.');
      await refreshDetail();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to return dossier.'));
    } finally {
      setIsChefActing(false);
    }
  };

  const handleChefRequestComplement = async (note) => {
    try {
      setIsChefActing(true);
      const response = await requestComplement(id, note);
      toast.success(response?.message || 'Complement request sent to preparation owner.');
      await refreshDetail();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to request complement.'));
    } finally {
      setIsChefActing(false);
    }
  };

  const requestDetachDocument = (rubriqueId, documentId) => {
    openConfirmationModal({
      action: 'detach',
      title: 'Remove Document from Rubrique',
      message: 'This will remove the document from the selected rubrique.',
      confirmLabel: 'Remove Document',
      cancelLabel: 'Cancel',
      confirmingLabel: 'Removing...',
      confirmVariant: 'danger',
      initialFocus: 'cancel',
      payload: { rubriqueId, documentId }
    });
  };

  const requestSubmitDossier = () => {
    openConfirmationModal({
      action: 'submit',
      title: 'Submit Dossier',
      message: 'Submit this dossier for validation? Editing rubriques will be disabled after submission.',
      confirmLabel: 'Submit Dossier',
      cancelLabel: 'Cancel',
      confirmingLabel: 'Submitting...',
      confirmVariant: 'primary'
    });
  };

  const requestProcessDossier = () => {
    openConfirmationModal({
      action: 'process',
      title: 'Process Dossier',
      message: 'Process this dossier now? This action freezes all dossier modifications.',
      confirmLabel: 'Process Dossier',
      cancelLabel: 'Cancel',
      confirmingLabel: 'Processing...',
      confirmVariant: 'success',
      initialFocus: 'cancel'
    });
  };

  const requestDeleteRubrique = (rubrique) => {
    if (!rubrique?.id) {
      return;
    }

    openConfirmationModal({
      action: 'delete_rubrique',
      title: 'Delete Rubrique',
      message: 'This will permanently remove the empty rubrique. This action cannot be undone.',
      confirmLabel: 'Delete Rubrique',
      cancelLabel: 'Cancel',
      confirmingLabel: 'Deleting...',
      confirmVariant: 'danger',
      initialFocus: 'cancel',
      payload: { rubriqueId: rubrique.id }
    });
  };

  const requestAcceptDocument = (documentId) => {
    if (!documentId) {
      return;
    }

    const acceptMessage = isReturnedToGestionnaire
      ? 'Accept this document for the returned dossier review? This will update the current decision.'
      : 'Accept this document as valid? This decision is final for the current review.';

    openConfirmationModal({
      action: 'accept_document',
      title: 'Accept Document',
      message: acceptMessage,
      confirmLabel: 'Accept Document',
      cancelLabel: 'Cancel',
      confirmingLabel: 'Accepting...',
      confirmVariant: 'success',
      initialFocus: 'cancel',
      payload: { documentId }
    });
  };

  const handleConfirmationAction = async () => {
    if (confirmationModal.action === 'detach') {
      await executeDetachDocument(confirmationModal.payload?.rubriqueId, confirmationModal.payload?.documentId);
    }

    if (confirmationModal.action === 'submit') {
      await executeSubmitDossier();
    }

    if (confirmationModal.action === 'process') {
      await executeProcessDossier();
    }

    if (confirmationModal.action === 'delete_rubrique') {
      await executeDeleteRubrique(confirmationModal.payload?.rubriqueId);
    }

    if (confirmationModal.action === 'accept_document') {
      await executeAcceptDocument(confirmationModal.payload?.documentId);
    }

    setConfirmationModal(INITIAL_CONFIRMATION_MODAL);
  };

  const executeAcceptDocument = async (documentId) => {
    try {
      withMapPending(setIsDecidingByDocumentId, documentId, true);

      const response = await acceptDocument(documentId, null);
      toast.success(response?.message || 'Document accepted successfully.');
      await refreshDetail();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to accept document.'));
    } finally {
      withMapPending(setIsDecidingByDocumentId, documentId, false);
    }
  };

  const handleAcceptDocument = (documentId) => {
    requestAcceptDocument(documentId);
  };

  const handleRejectDocument = async () => {
    const documentId = rejectTargetDocument?.id;
    if (!documentId) {
      return;
    }

    const normalizedNote = rejectNote.trim();
    if (!normalizedNote) {
      toast.error('A rejection note is required.');
      return;
    }

    try {
      withMapPending(setIsDecidingByDocumentId, documentId, true);

      const response = await rejectDocument(documentId, normalizedNote);
      toast.success(response?.message || 'Document rejected successfully.');
      closeRejectDocumentModal();
      await refreshDetail();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to reject document.'));
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

      const note = rejectRubriqueNote.trim() || null;
      const response = await rejectRubrique(rubriqueId, note);
      toast.success(response?.message || 'Rubrique rejected successfully.');
      closeRejectRubriqueModal();
      await refreshDetail();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to reject rubrique.'));
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

  if (loadErrorMessage && !dossier) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card">
              <div className="card-body">
                <EmptyState
                  icon="exclamation-triangle"
                  title="Unable to Load Dossier"
                  description={loadErrorMessage}
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

        <button
          type="button"
          className="btn btn-outline-primary page-back-btn"
          onClick={() => navigate('/dossiers')}
        >
          <i className="bi bi-arrow-left" aria-hidden="true"></i>
          Back to Dossiers
        </button>
      </div>

      {isFrozen && (
        <div className="alert alert-warning finalized-banner mb-4">
          <strong>Finalized dossier.</strong> This dossier is {dossierStatus} and is now read-only.
        </div>
      )}

      {dossierStatus === 'EN_DEROGATION' && !isChef && (
        <div className="alert derogation-notice mb-4" role="alert">
          <i className="bi bi-diagram-3 me-2" aria-hidden="true"></i>
          <span>
            <strong>Pending hierarchical review.</strong> This dossier has been escalated to the Chef Hiérarchique and is awaiting a decision.
          </span>
        </div>
      )}

      {isReturnedToGestionnaire && canReview && (
        <div className="alert returned-warning mb-4" role="alert">
          <div>
            <i className="bi bi-arrow-return-left me-2" aria-hidden="true"></i>
            <strong>Returned by Chef Hiérarchique</strong>
          </div>
          <p className="mb-0 mt-2">
            Re-review mode: previous document decisions are preserved below and can be updated.
          </p>
          {dossier.chef_decision_note && (
            <p className="mb-0 mt-2">Chef note: {dossier.chef_decision_note}</p>
          )}
        </div>
      )}

      {isComplementPending && isDossierOwnedByCurrentUser && (
        <div className="alert complement-alert mb-4" role="alert">
          <div>
            <i className="bi bi-file-earmark-plus me-2" aria-hidden="true"></i>
            <strong>Complement Required</strong>
          </div>
          {dossier.chef_decision_note && (
            <p className="mb-0 mt-2">{dossier.chef_decision_note}</p>
          )}
        </div>
      )}

      <DossierSummaryCard
        dossier={dossier}
        dossierData={dossierData}
        formatAmount={formatAmount}
        formatDateTime={formatDateTime}
        formatDisplayTotal={formatDisplayTotal}
      />

      <EscalationInfoBlock dossier={dossier} formatDateTime={formatDateTime} />

      {canChefAct && (
        <ChefActionPanel
          dossierId={id}
          onApprove={handleChefApprove}
          onReturn={handleChefReturn}
          onComplement={handleChefRequestComplement}
          isBusy={isChefActing}
        />
      )}

      {showWorkflowActions && (
        <WorkflowActionsCard
          canCreateRubrique={canCreateRubrique}
          isFrozen={isFrozen}
          handleCreateRubrique={handleCreateRubrique}
          rubriqueTitle={rubriqueTitle}
          rubriqueNotes={rubriqueNotes}
          setRubriqueTitle={setRubriqueTitle}
          setRubriqueNotes={setRubriqueNotes}
          isCreatingRubrique={isCreatingRubrique}
          canSubmitDossier={canSubmitDossier}
          isSubmittingDossier={isSubmittingDossier}
          requestSubmitDossier={requestSubmitDossier}
          canProcessDossier={canProcessDossier}
          isProcessingDossier={isProcessingDossier}
          requestProcessDossier={requestProcessDossier}
        />
      )}

      {canEscalate && (
        <div className="card mb-4">
          <div className="card-header d-flex align-items-center gap-2">
            <i className="bi bi-diagram-3 text-muted" aria-hidden="true"></i>
            <h6 className="mb-0">Escalation</h6>
          </div>
          <div className="card-body">
            {!escalateModalOpen ? (
              <div>
                <p className="text-muted mb-3">
                  Escalate this dossier to the Chef Hiérarchique for hierarchical review if standard processing is not applicable.
                </p>
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => setEscalateModalOpen(true)}
                  disabled={isEscalatingDossier}
                >
                  <i className="bi bi-diagram-3 me-2" aria-hidden="true"></i>
                  Escalate to Chef Hiérarchique
                </button>
              </div>
            ) : (
              <div style={{ maxWidth: 640 }}>
                <div className="mb-3">
                  <label htmlFor="escalation-reason" className="form-label">
                    Escalation Reason <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="escalation-reason"
                    className="form-control"
                    rows={3}
                    value={escalationReason}
                    onChange={(e) => setEscalationReason(e.target.value)}
                    placeholder="Describe why this dossier requires hierarchical review…"
                    disabled={isEscalatingDossier}
                    autoFocus
                  />
                </div>
                <div className="d-flex gap-2 justify-content-end">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => { setEscalateModalOpen(false); setEscalationReason(''); }}
                    disabled={isEscalatingDossier}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleEscalateConfirm}
                    disabled={isEscalatingDossier || !escalationReason.trim()}
                  >
                    {isEscalatingDossier ? 'Escalating...' : 'Confirm Escalation'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <RubriquesSection
        rubriques={rubriques}
        canAttachDocuments={canAttachDocuments}
        canDeleteRubrique={canDeleteRubrique}
        canRejectRubrique={canRejectRubrique}
        canDecideDocuments={canDecideDocuments}
        isReturnedToGestionnaire={isReturnedToGestionnaire}
        canDetachDocuments={canDetachDocuments}
        isFrozen={isFrozen}
        isAttachingByRubriqueId={isAttachingByRubriqueId}
        isDeletingRubriqueById={isDeletingRubriqueById}
        isRejectingRubriqueById={isRejectingRubriqueById}
        isDecidingByDocumentId={isDecidingByDocumentId}
        isDetachingByDocumentId={isDetachingByDocumentId}
        openAttachModal={openAttachModal}
        requestDeleteRubrique={requestDeleteRubrique}
        openRejectRubriqueModal={openRejectRubriqueModal}
        handleAcceptDocument={handleAcceptDocument}
        openRejectDocumentModal={openRejectDocumentModal}
        requestDetachDocument={requestDetachDocument}
        formatAmount={formatAmount}
      />

      <AttachDocumentsModal
        isOpen={isAttachModalOpen}
        attachTargetRubrique={attachTargetRubrique}
        isLoadingValidatedDocuments={isLoadingValidatedDocuments}
        attachableDocuments={attachableDocuments}
        selectedDocumentIds={selectedDocumentIds}
        handleToggleDocument={handleToggleDocument}
        isAttachingByRubriqueId={isAttachingByRubriqueId}
        handleAttachDocuments={handleAttachDocuments}
        closeAttachModal={closeAttachModal}
      />

      <RejectDocumentModal
        isOpen={isRejectModalOpen}
        rejectTargetDocument={rejectTargetDocument}
        rejectNote={rejectNote}
        setRejectNote={setRejectNote}
        isReturnedToGestionnaire={isReturnedToGestionnaire}
        closeRejectDocumentModal={closeRejectDocumentModal}
        handleRejectDocument={handleRejectDocument}
        isDecidingByDocumentId={isDecidingByDocumentId}
      />

      <RejectRubriqueModal
        isOpen={isRejectRubriqueModalOpen}
        rejectRubriqueTarget={rejectRubriqueTarget}
        rejectRubriqueNote={rejectRubriqueNote}
        setRejectRubriqueNote={setRejectRubriqueNote}
        closeRejectRubriqueModal={closeRejectRubriqueModal}
        handleRejectRubriqueConfirm={handleRejectRubriqueConfirm}
        isRejectingRubriqueById={isRejectingRubriqueById}
      />

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmLabel={confirmationModal.confirmLabel}
        cancelLabel={confirmationModal.cancelLabel}
        confirmingLabel={confirmationModal.confirmingLabel}
        confirmVariant={confirmationModal.confirmVariant}
        initialFocus={confirmationModal.initialFocus}
        isConfirming={isConfirmingAction}
        onCancel={closeConfirmationModal}
        onConfirm={handleConfirmationAction}
      />
    </div>
  );
}

export default DossierDetail;
