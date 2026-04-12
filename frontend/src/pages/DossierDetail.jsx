import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getStoredRole, getStoredUser, AUTH_CHANGED_EVENT } from '../services/auth';
import {
  USER_ROLES,
  DOSSIER_STATUSES,
  DOSSIER_STATUS_LABELS
} from '../constants/domainLabels';
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
  approveEscalation,
  returnToClaimsManager,
  requestComplement,
} from '../services/dossierWorkflow';
import { Loader, EmptyState, ConfirmationModal, PageHeader, WorkflowBanner } from '../ui';
import { formatAmountTnd, formatDisplayAmountTnd, formatDateTime } from '../utils/formatters';
import DossierSummaryCard from './DossierDetail/components/DossierSummaryCard';
import WorkflowActionsCard from './DossierDetail/components/WorkflowActionsCard';
import RubriquesSection from './DossierDetail/components/RubriquesSection';
import AttachDocumentsModal from './DossierDetail/components/AttachDocumentsModal';
import RejectDocumentModal from './DossierDetail/components/RejectDocumentModal';
import RejectRubriqueModal from './DossierDetail/components/RejectRubriqueModal';
import EscalationInfoBlock from './DossierDetail/components/EscalationInfoBlock';
import SupervisorActionPanel from './DossierDetail/components/SupervisorActionPanel';
import DossierModalShell from './DossierDetail/components/DossierModalShell';
import './DossierDetail/DossierDetail.css';

const DOSSIER_FROZEN_STATUSES = [DOSSIER_STATUSES.PROCESSED];
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
  const [isRefreshingDetail, setIsRefreshingDetail] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState(null);

  const [rubriqueTitle, setRubriqueTitle] = useState('');
  const [rubriqueNotes, setRubriqueNotes] = useState('');

  const [isCreatingRubrique, setIsCreatingRubrique] = useState(false);
  const [isSubmittingDossier, setIsSubmittingDossier] = useState(false);
  const [isProcessingDossier, setIsProcessingDossier] = useState(false);
  const [isEscalatingDossier, setIsEscalatingDossier] = useState(false);
  const [isSupervisorActing, setIsSupervisorActing] = useState(false);
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
      const message = formatApiError(error, 'Failed to load case file details. Please try again.');
      setLoadErrorMessage(message);
      toast.error(message);
      setDossierData(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [id]);

  const refreshDetailSilently = useCallback(async () => {
    setIsRefreshingDetail(true);

    try {
      const response = await getDossierDetail(id);
      const normalized = mapDossierDetailResponse(response);
      setDossierData(normalized);
    } catch (error) {
      const message = formatApiError(error, 'Failed to load case file details. Please try again.');
      toast.error(message);
    } finally {
      setIsRefreshingDetail(false);
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
  const dossierStatusLabel = DOSSIER_STATUS_LABELS[dossierStatus] || dossierStatus || '-';
  const isDossierOwnedByCurrentUser = Number(dossier?.created_by) === currentUserId;

  const isSupervisor = role === USER_ROLES.SUPERVISOR;
  const isSupervisorReviewer = role === USER_ROLES.SUPERVISOR || role === USER_ROLES.ADMIN;
  const canPrepare = !isSupervisor && (role === USER_ROLES.AGENT || role === USER_ROLES.CLAIMS_MANAGER || role === USER_ROLES.ADMIN);
  const canManagePreparation = role === USER_ROLES.ADMIN || isDossierOwnedByCurrentUser;
  const canReview = role === USER_ROLES.CLAIMS_MANAGER || role === USER_ROLES.ADMIN;

  const isFrozen = DOSSIER_FROZEN_STATUSES.includes(dossierStatus);

  const canCreateRubrique = canPrepare && canManagePreparation && (
    dossierStatus === DOSSIER_STATUSES.RECEIVED ||
    dossierStatus === DOSSIER_STATUSES.IN_PROGRESS ||
    dossierStatus === DOSSIER_STATUSES.AWAITING_COMPLEMENT
  );
  const canDeleteRubrique = canPrepare && canManagePreparation && (
    dossierStatus === DOSSIER_STATUSES.RECEIVED ||
    dossierStatus === DOSSIER_STATUSES.IN_PROGRESS ||
    dossierStatus === DOSSIER_STATUSES.AWAITING_COMPLEMENT
  );
  const canAttachDocuments = canPrepare && canManagePreparation && (
    dossierStatus === DOSSIER_STATUSES.IN_PROGRESS ||
    dossierStatus === DOSSIER_STATUSES.AWAITING_COMPLEMENT
  );
  const canDetachDocuments = canPrepare && canManagePreparation && (
    dossierStatus === DOSSIER_STATUSES.IN_PROGRESS ||
    dossierStatus === DOSSIER_STATUSES.AWAITING_COMPLEMENT
  );
  const canSubmitDossier = canPrepare && canManagePreparation && (
    dossierStatus === DOSSIER_STATUSES.IN_PROGRESS ||
    dossierStatus === DOSSIER_STATUSES.AWAITING_COMPLEMENT
  );
  const canDecideDocuments = canReview && dossierStatus === DOSSIER_STATUSES.UNDER_REVIEW;
  const canProcessDossier = canReview && dossierStatus === DOSSIER_STATUSES.UNDER_REVIEW;
  const canRejectRubrique = canReview && dossierStatus === DOSSIER_STATUSES.UNDER_REVIEW;

  const canEscalate = (role === USER_ROLES.CLAIMS_MANAGER || role === USER_ROLES.ADMIN) && dossierStatus === DOSSIER_STATUSES.UNDER_REVIEW;

  const canSupervisorAct = isSupervisorReviewer && dossierStatus === DOSSIER_STATUSES.IN_ESCALATION;

  const showWorkflowActions = !isFrozen && !isSupervisor && (canCreateRubrique || canSubmitDossier || canProcessDossier);

  const isReturnedForClaimsReview =
    dossierStatus === DOSSIER_STATUSES.UNDER_REVIEW &&
    dossier?.chef_decision_type === 'RETURNED';

  const isComplementPending = dossierStatus === DOSSIER_STATUSES.AWAITING_COMPLEMENT;

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

      if (role !== USER_ROLES.ADMIN && Number(document.user_id) !== Number(currentUserId)) {
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
      toast.error('Section title is required.');
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
      toast.success(response?.message || 'Section created successfully.');
      await refreshDetailSilently();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to create section.'));
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
      await refreshDetailSilently();
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
      await refreshDetailSilently();
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
      toast.success(response?.message || 'Section deleted successfully.');
      await refreshDetailSilently();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to delete section.'));
    } finally {
      withMapPending(setIsDeletingRubriqueById, rubriqueId, false);
    }
  };

  const executeSubmitDossier = async () => {
    try {
      setIsSubmittingDossier(true);

      const response = await submitDossier(id);
      toast.success(response?.message || 'Case file submitted successfully.');
      await refreshDetailSilently();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to submit case file.'));
    } finally {
      setIsSubmittingDossier(false);
    }
  };

  const executeProcessDossier = async () => {
    try {
      setIsProcessingDossier(true);

      const response = await processDossier(id);
      toast.success(response?.message || 'Case file processed successfully.');
      await refreshDetailSilently();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to process case file.'));
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
      toast.success(response?.message || 'Case file escalated to Supervisor.');
      setEscalateModalOpen(false);
      setEscalationReason('');
      await refreshDetailSilently();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to escalate case file.'));
    } finally {
      setIsEscalatingDossier(false);
    }
  };

  const handleSupervisorApprove = async (note) => {
    try {
      setIsSupervisorActing(true);
      const response = await approveEscalation(id, note);
      toast.success(response?.message || 'Escalation approved. Case file is now processed.');
      await refreshDetailSilently();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to approve escalation.'));
    } finally {
      setIsSupervisorActing(false);
    }
  };

  const handleSupervisorReturn = async (note) => {
    try {
      setIsSupervisorActing(true);
      const response = await returnToClaimsManager(id, note);
      toast.success(response?.message || 'Case file returned to Claims Manager for review.');
      await refreshDetailSilently();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to return case file.'));
    } finally {
      setIsSupervisorActing(false);
    }
  };

  const handleSupervisorRequestComplement = async (note) => {
    try {
      setIsSupervisorActing(true);
      const response = await requestComplement(id, note);
      toast.success(response?.message || 'Complement request sent to preparation owner.');
      await refreshDetailSilently();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to request complement.'));
    } finally {
      setIsSupervisorActing(false);
    }
  };

  const requestDetachDocument = (rubriqueId, documentId) => {
    openConfirmationModal({
      action: 'detach',
      title: 'Remove Document from Section',
      message: 'This will remove the document from the selected section.',
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
      title: 'Submit Case File',
      message: 'Submit this case file for review? Editing sections will be disabled after submission.',
      confirmLabel: 'Submit Case File',
      cancelLabel: 'Cancel',
      confirmingLabel: 'Submitting...',
      confirmVariant: 'primary'
    });
  };

  const requestProcessDossier = () => {
    openConfirmationModal({
      action: 'process',
      title: 'Process Case File',
      message: 'Process this case file now? This action freezes all case file modifications.',
      confirmLabel: 'Process Case File',
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
      title: 'Delete Section',
      message: 'This will permanently remove the empty section. This action cannot be undone.',
      confirmLabel: 'Delete Section',
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

    const acceptMessage = isReturnedForClaimsReview
      ? 'Accept this document for the returned case file review? This will update the current decision.'
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
      await refreshDetailSilently();
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
      await refreshDetailSilently();
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
      toast.success(response?.message || 'Section rejected successfully.');
      closeRejectRubriqueModal();
      await refreshDetailSilently();
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to reject section.'));
    } finally {
      withMapPending(setIsRejectingRubriqueById, rubriqueId, false);
    }
  };

  if (isLoadingDetail) {
    return (
      <div className="container py-5">
        <Loader message="Loading case file details..." size="md" />
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
                  title="Unable to Load Case File"
                  description={loadErrorMessage}
                  action={
                    <button className="btn btn-primary" onClick={() => navigate('/dossiers')}>
                      Back to Case Files
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
                  title="Case File Not Found"
                  description="The requested case file could not be found."
                  action={
                    <button className="btn btn-primary" onClick={() => navigate('/dossiers')}>
                      Back to Case Files
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
    <div className="container py-4 dossier-detail-page" aria-busy={isRefreshingDetail}>
      <PageHeader
        icon="bi-folder2-open"
        title="Case File Details"
        subtitle="Review dossier identity, workflow state, escalation history, and section-level document decisions."
        action={
          <button
            type="button"
            className="btn btn-outline-primary page-back-btn"
            onClick={() => navigate('/dossiers')}
          >
            <i className="bi bi-arrow-left me-2" aria-hidden="true" />
            Back to Case Files
          </button>
        }
      />

      {isFrozen && (
        <WorkflowBanner
          title="Finalized case file"
          variant="success"
          icon="bi-lock-fill"
        >
          This case file is {dossierStatusLabel} and is now read-only.
        </WorkflowBanner>
      )}

      {dossierStatus === DOSSIER_STATUSES.IN_ESCALATION && !isSupervisor && (
        <WorkflowBanner
          title="Pending supervisor review"
          variant="warning"
          icon="bi-diagram-3"
        >
          This case file has been escalated to the Supervisor and is awaiting a decision.
        </WorkflowBanner>
      )}

      {isReturnedForClaimsReview && canReview && (
        <WorkflowBanner
          title="Returned by Supervisor"
          variant="warning"
          icon="bi-arrow-return-left"
        >
          Re-review mode: previous document decisions are preserved below and can be updated.
          {dossier.chef_decision_note && (
            <div className="mt-1">
              <strong>Note:</strong> {dossier.chef_decision_note}
            </div>
          )}
        </WorkflowBanner>
      )}

      {isComplementPending && isDossierOwnedByCurrentUser && (
        <WorkflowBanner
          title="Complement Required"
          variant="warning"
          icon="bi-file-earmark-plus"
        >
          {dossier.chef_decision_note && (
            <div>
              <strong>Note:</strong> {dossier.chef_decision_note}
            </div>
          )}
        </WorkflowBanner>
      )}

      <DossierSummaryCard
        dossier={dossier}
        dossierData={dossierData}
        formatAmount={formatAmountTnd}
        formatDateTime={formatDateTime}
        formatDisplayTotal={formatDisplayAmountTnd}
      />

      <EscalationInfoBlock dossier={dossier} formatDateTime={formatDateTime} />

      {canSupervisorAct && (
        <SupervisorActionPanel
          onApprove={handleSupervisorApprove}
          onReturn={handleSupervisorReturn}
          onComplement={handleSupervisorRequestComplement}
          isBusy={isSupervisorActing}
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
          <div className="workflow-action-toolbar">
            <h6 className="mb-0 d-flex align-items-center workflow-action-toolbar__title">
              <i className="bi bi-diagram-3 me-2" aria-hidden="true" />
              Escalation
            </h6>
            <div className="workflow-action-toolbar__controls">
              <button
                type="button"
                className="btn btn-outline-warning workflow-level-action-btn escalation-panel__trigger"
                onClick={() => setEscalateModalOpen(true)}
                disabled={isEscalatingDossier}
              >
                <i className="bi bi-diagram-3 me-2" aria-hidden="true" />
                Escalate to Supervisor
              </button>
            </div>
          </div>
        </div>
      )}

      <DossierModalShell
        isOpen={escalateModalOpen}
        title="Escalate to Supervisor"
        onClose={() => { setEscalateModalOpen(false); setEscalationReason(''); }}
        isBusy={isEscalatingDossier}
        initialFocus="secondary"
        className="dossier-decision-modal"
        footer={
          <>
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
              className="btn btn-warning"
              onClick={handleEscalateConfirm}
              disabled={isEscalatingDossier || !escalationReason.trim()}
            >
              {isEscalatingDossier ? 'Escalating...' : 'Confirm Escalation'}
            </button>
          </>
        }
      >
        <div>
          <label htmlFor="escalation-reason" className="form-label workflow-modal-label">
            Escalation Reason <span className="text-danger">*</span>
          </label>
          <textarea
            id="escalation-reason"
            className="form-control workflow-modal-textarea"
            rows={3}
            value={escalationReason}
            onChange={(e) => setEscalationReason(e.target.value)}
            placeholder="Describe why this case file requires supervisor review..."
            disabled={isEscalatingDossier}
            autoFocus
          />
        </div>
      </DossierModalShell>

      <RubriquesSection
        rubriques={rubriques}
        canAttachDocuments={canAttachDocuments}
        canDeleteRubrique={canDeleteRubrique}
        canRejectRubrique={canRejectRubrique}
        canDecideDocuments={canDecideDocuments}
        isReturnedForClaimsReview={isReturnedForClaimsReview}
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
        formatAmount={formatAmountTnd}
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
        isReturnedForClaimsReview={isReturnedForClaimsReview}
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
