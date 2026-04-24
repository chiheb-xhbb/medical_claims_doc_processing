import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getToastMessage,
  notifySuccess,
  notifyDangerSuccess,
  notifyWorkflowSuccess,
  notifyError,
} from '../utils/toast';
import { getStoredRole, getStoredUser, AUTH_CHANGED_EVENT } from '../services/auth';
import {
  USER_ROLES,
  DOSSIER_STATUSES,
  getDossierStatusLabel,
} from '../constants/domainLabels';
import {
  getDossierDetail,
  getDossierWorkflowEvents,
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
  returnDossierToPreparation,
} from '../services/dossierWorkflow';
import { Loader, EmptyState, ConfirmationModal, PageHeader, WorkflowBanner } from '../ui';
import { formatAmountTnd, formatDateTime } from '../utils/formatters';
import DossierSummaryCard from './DossierDetail/components/DossierSummaryCard';
import WorkflowActionsCard from './DossierDetail/components/WorkflowActionsCard';
import RubriquesSection from './DossierDetail/components/RubriquesSection';
import AttachDocumentsModal from './DossierDetail/components/AttachDocumentsModal';
import RejectDocumentModal from './DossierDetail/components/RejectDocumentModal';
import RejectRubriqueModal from './DossierDetail/components/RejectRubriqueModal';
import EscalationInfoBlock from './DossierDetail/components/EscalationInfoBlock';
import WorkflowHistoryCard from './DossierDetail/components/WorkflowHistoryCard';
import SupervisorActionPanel from './DossierDetail/components/SupervisorActionPanel';
import DossierModalShell from './DossierDetail/components/DossierModalShell';
import './DossierDetail/DossierDetail.css';

const DOSSIER_FROZEN_STATUSES = [DOSSIER_STATUSES.PROCESSED];

const INITIAL_CONFIRMATION_MODAL = {
  isOpen: false,
  action: null,
  title: '',
  message: '',
  confirmLabel: '',
  cancelLabel: '',
  confirmingLabel: '',
  confirmVariant: 'primary',
  initialFocus: 'confirm',
  payload: null,
};

const formatApiError = (error, fallbackMessage, t) => {
  if (!error?.response) {
    return t('feedback.networkErrorRetry');
  }

  const status = error.response.status;
  const backendErrors = error.response?.data?.errors || {};
  const firstBackendError = Object.values(backendErrors)[0];

  if (firstBackendError) {
    return Array.isArray(firstBackendError) ? firstBackendError[0] : firstBackendError;
  }

  const backendMessage = error.response?.data?.message;

  if (status === 403) {
    return backendMessage || t('feedback.forbiddenAction');
  }

  if (status === 404) {
    return backendMessage || t('feedback.resourceNotFound');
  }

  if (status === 422) {
    return backendMessage || t('feedback.businessRuleViolation');
  }

  return backendMessage || fallbackMessage;
};

// Normalize backend detail payload so the page can rely on one stable shape.
const mapDossierDetailResponse = (apiResponse) => {
  const payload = apiResponse || {};
  const dossier = payload.dossier || payload;
  const rubriques = Array.isArray(payload.rubriques)
    ? payload.rubriques
    : Array.isArray(dossier?.rubriques)
      ? dossier.rubriques
      : [];
  const status = String(dossier?.status || '').toUpperCase();
  const isProcessed = status === DOSSIER_STATUSES.PROCESSED;
  const payloadFinancialSummary = payload.financial_summary;
  const dossierFinancialSummary = dossier?.financial_summary;
  const sourceFinancialSummary =
    (payloadFinancialSummary && typeof payloadFinancialSummary === 'object')
      ? payloadFinancialSummary
      : (dossierFinancialSummary && typeof dossierFinancialSummary === 'object')
        ? dossierFinancialSummary
        : null;

  const requestedTotal =
    sourceFinancialSummary?.requested_total ??
    payload.requested_total ??
    dossier?.requested_total ??
    null;

  const acceptedTotal =
    sourceFinancialSummary?.accepted_total ??
    payload.current_total ??
    dossier?.current_total ??
    null;

  const rejectedTotal = sourceFinancialSummary?.rejected_total ?? null;

  let finalReimbursableTotal = null;

  if (isProcessed) {
    finalReimbursableTotal = sourceFinancialSummary?.final_reimbursable_total ?? null;

    if (finalReimbursableTotal === null || finalReimbursableTotal === undefined) {
      finalReimbursableTotal =
        dossier?.montant_total ??
        payload.montant_total ??
        null;
    }
  }

  const financialSummary = {
    requested_total: requestedTotal,
    accepted_total: acceptedTotal,
    rejected_total: rejectedTotal,
    final_reimbursable_total: finalReimbursableTotal,
  };

  return {
    dossier: dossier || null,
    rubriques: rubriques.map((rubrique) => ({
      ...rubrique,
      documents: Array.isArray(rubrique?.documents) ? rubrique.documents : [],
    })),
    requested_total: payload.requested_total ?? dossier?.requested_total ?? requestedTotal ?? 0,
    current_total: payload.current_total ?? dossier?.current_total ?? acceptedTotal ?? 0,
    display_total:
      payload.display_total ??
      dossier?.display_total ??
      finalReimbursableTotal ??
      acceptedTotal ??
      null,
    financial_summary: financialSummary,
  };
};

function DossierDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [dossierData, setDossierData] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [isRefreshingDetail, setIsRefreshingDetail] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState(null);
  const [workflowEvents, setWorkflowEvents] = useState([]);
  const [isLoadingWorkflowHistory, setIsLoadingWorkflowHistory] = useState(true);
  const [workflowHistoryLoadFailed, setWorkflowHistoryLoadFailed] = useState(false);

  const [rubriqueTitle, setRubriqueTitle] = useState('');
  const [rubriqueNotes, setRubriqueNotes] = useState('');

  const [isCreatingRubrique, setIsCreatingRubrique] = useState(false);
  const [isSubmittingDossier, setIsSubmittingDossier] = useState(false);
  const [isProcessingDossier, setIsProcessingDossier] = useState(false);
  const [isEscalatingDossier, setIsEscalatingDossier] = useState(false);
  const [isSupervisorActing, setIsSupervisorActing] = useState(false);
  const [isReturningToPreparation, setIsReturningToPreparation] = useState(false);

  const [returnToPreparationModalOpen, setReturnToPreparationModalOpen] = useState(false);
  const [returnToPreparationNote, setReturnToPreparationNote] = useState('');
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

  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');

  // Main detail load with blocking loader.
  const refreshDetail = useCallback(async () => {
    setIsLoadingDetail(true);
    setLoadErrorMessage(null);

    try {
      const response = await getDossierDetail(id);
      const normalized = mapDossierDetailResponse(response);
      setDossierData(normalized);
    } catch (error) {
      const message = formatApiError(error, t('feedback.loadCaseFileDetailsFailed'), t);
      setLoadErrorMessage(message);
      notifyError(message);
      setDossierData(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [id, t]);

  // Silent refresh keeps the page stable after successful mutations.
  const refreshDetailSilently = useCallback(async () => {
    setIsRefreshingDetail(true);

    try {
      const response = await getDossierDetail(id);
      const normalized = mapDossierDetailResponse(response);
      setDossierData(normalized);
    } catch (error) {
      const message = formatApiError(error, t('feedback.loadCaseFileDetailsFailed'), t);
      notifyError(message);
    } finally {
      setIsRefreshingDetail(false);
    }
  }, [id, t]);

  useEffect(() => {
    refreshDetail();
  }, [refreshDetail]);

  const refreshWorkflowHistory = useCallback(async () => {
    setIsLoadingWorkflowHistory(true);
    setWorkflowHistoryLoadFailed(false);

    try {
      const events = await getDossierWorkflowEvents(id);
      setWorkflowEvents(Array.isArray(events) ? events : []);
    } catch {
      setWorkflowHistoryLoadFailed(true);
      setWorkflowEvents([]);
    } finally {
      setIsLoadingWorkflowHistory(false);
    }
  }, [id]);

  useEffect(() => {
    refreshWorkflowHistory();
  }, [refreshWorkflowHistory]);

  const refreshDossierView = useCallback(async () => {
    await refreshDetailSilently();
    await refreshWorkflowHistory();
  }, [refreshDetailSilently, refreshWorkflowHistory]);

  const [role, setRole] = useState(() => getStoredRole());
  const [currentUserId, setCurrentUserId] = useState(() => Number(getStoredUser()?.id || 0));

  // Keep role/session state aligned with auth changes from elsewhere in the app.
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
  const dossierStatusLabel = getDossierStatusLabel(dossierStatus) || dossierStatus || '-';
  const isDossierOwnedByCurrentUser = Number(dossier?.created_by) === currentUserId;

  const isSupervisor = role === USER_ROLES.SUPERVISOR;
  const isSupervisorReviewer = role === USER_ROLES.SUPERVISOR || role === USER_ROLES.ADMIN;
  const canPrepare =
    role === USER_ROLES.AGENT ||
    role === USER_ROLES.CLAIMS_MANAGER ||
    role === USER_ROLES.SUPERVISOR ||
    role === USER_ROLES.ADMIN;

  const canManagePreparation = role === USER_ROLES.ADMIN || isDossierOwnedByCurrentUser;
  const canReview = role === USER_ROLES.CLAIMS_MANAGER || role === USER_ROLES.ADMIN;

  const isFrozen = DOSSIER_FROZEN_STATUSES.includes(dossierStatus);

  // These gates keep the page aligned with the dossier state machine and RBAC.
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

  const isReturnedForClaimsReview =
    dossierStatus === DOSSIER_STATUSES.UNDER_REVIEW &&
    dossier?.chef_decision_type === 'RETURNED';

  const canClaimsManagerDecidePendingDocuments =
    canReview &&
    dossierStatus === DOSSIER_STATUSES.UNDER_REVIEW &&
    !isReturnedForClaimsReview;

  const canProcessDossier = canReview && dossierStatus === DOSSIER_STATUSES.UNDER_REVIEW;
  const canRejectRubrique =
    canReview && dossierStatus === DOSSIER_STATUSES.UNDER_REVIEW && !isReturnedForClaimsReview;

  const canEscalate =
    (role === USER_ROLES.CLAIMS_MANAGER || role === USER_ROLES.ADMIN) &&
    dossierStatus === DOSSIER_STATUSES.UNDER_REVIEW;

  const canReturnToPreparation =
    (role === USER_ROLES.CLAIMS_MANAGER || role === USER_ROLES.ADMIN) &&
    dossierStatus === DOSSIER_STATUSES.UNDER_REVIEW &&
    !isReturnedForClaimsReview;

  const canSupervisorOverrideDocumentDecisions =
    isSupervisorReviewer && dossierStatus === DOSSIER_STATUSES.IN_ESCALATION;

  const canSupervisorAct =
    isSupervisorReviewer && dossierStatus === DOSSIER_STATUSES.IN_ESCALATION;

  const showWorkflowActions =
    !isFrozen &&
    (canCreateRubrique || canSubmitDossier || canProcessDossier || canEscalate || canReturnToPreparation);

  const isComplementPending = dossierStatus === DOSSIER_STATUSES.AWAITING_COMPLEMENT;

  const isConfirmingAction =
    (confirmationModal.action === 'submit' && isSubmittingDossier) ||
    (confirmationModal.action === 'process' && isProcessingDossier) ||
    (confirmationModal.action === 'detach' &&
      Boolean(isDetachingByDocumentId[confirmationModal.payload?.documentId])) ||
    (confirmationModal.action === 'delete_rubrique' &&
      Boolean(isDeletingRubriqueById[confirmationModal.payload?.rubriqueId])) ||
    (confirmationModal.action === 'accept_document' &&
      Boolean(isDecidingByDocumentId[confirmationModal.payload?.documentId]));

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

      const isOwnerScopedRole = role === USER_ROLES.AGENT;
      if (isOwnerScopedRole && Number(document.user_id) !== Number(currentUserId)) {
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
      notifyError(formatApiError(error, t('feedback.loadValidatedDocumentsFailed'), t));
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
      ...configuration,
    });
  };

  const closeConfirmationModal = () => {
    if (isConfirmingAction) {
      return;
    }

    setConfirmationModal(INITIAL_CONFIRMATION_MODAL);
  };

  // Small helper to update per-item pending maps without repeating spread logic.
  const withMapPending = (setter, key, value) => {
    setter((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleCreateRubrique = async (event) => {
    event.preventDefault();

    if (!rubriqueTitle.trim()) {
      notifyError(t('workflow.sectionTitleRequired'));
      return;
    }

    try {
      setIsCreatingRubrique(true);

      const response = await createRubrique(id, {
        title: rubriqueTitle.trim(),
        notes: rubriqueNotes.trim() || null,
      });

      setRubriqueTitle('');
      setRubriqueNotes('');
      notifySuccess(getToastMessage(response, t('feedback.sectionCreatedSuccess')));
      await refreshDetailSilently();
    } catch (error) {
      notifyError(formatApiError(error, t('feedback.createSectionFailed'), t));
    } finally {
      setIsCreatingRubrique(false);
    }
  };

  const handleAttachDocuments = async () => {
    if (!attachTargetRubrique?.id) {
      return;
    }

    if (selectedDocumentIds.length === 0) {
      notifyError(t('workflow.selectValidatedDocumentRequired'));
      return;
    }

    try {
      withMapPending(setIsAttachingByRubriqueId, attachTargetRubrique.id, true);

      const response = await attachDocuments(attachTargetRubrique.id, selectedDocumentIds);

      notifySuccess(getToastMessage(response, t('feedback.documentsAttachedSuccess')));
      closeAttachModal();
      await refreshDetailSilently();
    } catch (error) {
      notifyError(formatApiError(error, t('feedback.attachDocumentsFailed'), t));
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
      notifyDangerSuccess(getToastMessage(response, t('feedback.documentDetachedSuccess')));
      await refreshDetailSilently();
    } catch (error) {
      notifyError(formatApiError(error, t('feedback.detachDocumentFailed'), t));
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
      notifyDangerSuccess(getToastMessage(response, t('feedback.sectionDeletedSuccess')));
      await refreshDetailSilently();
    } catch (error) {
      notifyError(formatApiError(error, t('feedback.deleteSectionFailed'), t));
    } finally {
      withMapPending(setIsDeletingRubriqueById, rubriqueId, false);
    }
  };

  const executeSubmitDossier = async () => {
    try {
      setIsSubmittingDossier(true);

      const response = await submitDossier(id);
      notifySuccess(getToastMessage(response, t('feedback.caseFileSubmittedSuccess')));
      await refreshDossierView();
    } catch (error) {
      notifyError(formatApiError(error, t('feedback.submitCaseFileFailed'), t));
    } finally {
      setIsSubmittingDossier(false);
    }
  };

  const executeProcessDossier = async () => {
    try {
      setIsProcessingDossier(true);

      const response = await processDossier(id);
      notifySuccess(getToastMessage(response, t('feedback.caseFileProcessedSuccess')));
      await refreshDossierView();
    } catch (error) {
      notifyError(formatApiError(error, t('feedback.processCaseFileFailed'), t));
    } finally {
      setIsProcessingDossier(false);
    }
  };

  const handleEscalateConfirm = async () => {
    const trimmedReason = escalationReason.trim();
    if (!trimmedReason) {
      notifyError(t('feedback.escalationReasonRequired'));
      return;
    }

    try {
      setIsEscalatingDossier(true);
      const response = await escalateDossier(id, trimmedReason);
      notifySuccess(getToastMessage(response, t('feedback.caseFileEscalatedSuccess')));
      setEscalateModalOpen(false);
      setEscalationReason('');
      await refreshDossierView();
    } catch (error) {
      notifyError(formatApiError(error, t('feedback.escalateCaseFileFailed'), t));
    } finally {
      setIsEscalatingDossier(false);
    }
  };

  const handleSupervisorApprove = async (note) => {
    try {
      setIsSupervisorActing(true);
      const response = await approveEscalation(id, note);
      notifySuccess(getToastMessage(response, t('feedback.escalationApprovedProcessed')));
      await refreshDossierView();
    } catch (error) {
      notifyError(formatApiError(error, t('feedback.approveEscalationFailed'), t));
    } finally {
      setIsSupervisorActing(false);
    }
  };

  const handleSupervisorReturn = async (note) => {
    try {
      setIsSupervisorActing(true);
      const response = await returnToClaimsManager(id, note);
      notifyWorkflowSuccess(
        getToastMessage(response, t('feedback.caseFileReturnedToClaims'))
      );
      await refreshDossierView();
    } catch (error) {
      notifyError(formatApiError(error, t('feedback.returnCaseFileFailed'), t));
    } finally {
      setIsSupervisorActing(false);
    }
  };

  const handleSupervisorRequestComplement = async (note) => {
    try {
      setIsSupervisorActing(true);
      const response = await requestComplement(id, note);
      notifyWorkflowSuccess(
        getToastMessage(response, t('feedback.complementRequestedPreparationOwner'))
      );
      await refreshDossierView();
    } catch (error) {
      notifyError(formatApiError(error, t('feedback.requestComplementFailed'), t));
    } finally {
      setIsSupervisorActing(false);
    }
  };

  const handleReturnToPreparationConfirm = async () => {
    const trimmedNote = returnToPreparationNote.trim();
    if (!trimmedNote) {
      notifyError(t('feedback.returnNoteRequired'));
      return;
    }

    try {
      setIsReturningToPreparation(true);
      const response = await returnDossierToPreparation(id, trimmedNote);
      notifyWorkflowSuccess(getToastMessage(response, t('feedback.caseFileReturnedPreparation')));
      setReturnToPreparationModalOpen(false);
      setReturnToPreparationNote('');
      await refreshDossierView();
    } catch (error) {
      notifyError(formatApiError(error, t('feedback.returnCaseFileToPreparationFailed'), t));
    } finally {
      setIsReturningToPreparation(false);
    }
  };

  const requestDetachDocument = (rubriqueId, documentId) => {
    openConfirmationModal({
      action: 'detach',
      title: t('workflow.detachConfirmTitle'),
      message: t('workflow.detachConfirmMessage'),
      confirmLabel: t('workflow.detachConfirmLabel'),
      cancelLabel: t('actions.cancel'),
      confirmingLabel: t('workflow.removing'),
      confirmVariant: 'danger',
      initialFocus: 'cancel',
      payload: { rubriqueId, documentId },
    });
  };

  const requestSubmitDossier = () => {
    openConfirmationModal({
      action: 'submit',
      title: t('workflow.submitConfirmTitle'),
      message: t('workflow.submitConfirmMessage'),
      confirmLabel: t('workflow.submitCaseFile'),
      cancelLabel: t('actions.cancel'),
      confirmingLabel: t('workflow.submitting'),
      confirmVariant: 'primary',
    });
  };

  const requestProcessDossier = () => {
    openConfirmationModal({
      action: 'process',
      title: t('workflow.processConfirmTitle'),
      message: t('workflow.processConfirmMessage'),
      confirmLabel: t('workflow.processCaseFile'),
      cancelLabel: t('actions.cancel'),
      confirmingLabel: t('workflow.processing'),
      confirmVariant: 'success',
      initialFocus: 'cancel',
      payload: null,
    });
  };

  const requestDeleteRubrique = (rubrique) => {
    if (!rubrique?.id) {
      return;
    }

    openConfirmationModal({
      action: 'delete_rubrique',
      title: t('workflow.deleteRubriqueTitle'),
      message: t('workflow.deleteRubriqueMessage'),
      confirmLabel: t('workflow.deleteRubriqueLabel'),
      cancelLabel: t('actions.cancel'),
      confirmingLabel: t('sections.deleting'),
      confirmVariant: 'danger',
      initialFocus: 'cancel',
      payload: { rubriqueId: rubrique.id },
    });
  };

  const requestAcceptDocument = (documentId) => {
    if (!documentId) {
      return;
    }

    openConfirmationModal({
      action: 'accept_document',
      title: t('workflow.acceptDocumentTitle'),
      message: t('workflow.acceptDocumentMessage'),
      confirmLabel: t('workflow.acceptDocumentLabel'),
      cancelLabel: t('actions.cancel'),
      confirmingLabel: t('workflow.accepting'),
      confirmVariant: 'success',
      initialFocus: 'cancel',
      payload: { documentId },
    });
  };

  // One dispatcher keeps all confirmation-backed actions consistent.
  const handleConfirmationAction = async () => {
    if (confirmationModal.action === 'detach') {
      await executeDetachDocument(
        confirmationModal.payload?.rubriqueId,
        confirmationModal.payload?.documentId
      );
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
      notifySuccess(getToastMessage(response, t('feedback.documentAcceptedSuccess')));
      await refreshDetailSilently();
    } catch (error) {
      notifyError(formatApiError(error, t('feedback.acceptDocumentFailed'), t));
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
      notifyError(t('feedback.rejectNoteRequired'));
      return;
    }

    try {
      withMapPending(setIsDecidingByDocumentId, documentId, true);

      const response = await rejectDocument(documentId, normalizedNote);
      notifyDangerSuccess(getToastMessage(response, t('feedback.documentRejectedSuccess')));
      closeRejectDocumentModal();
      await refreshDetailSilently();
    } catch (error) {
      notifyError(formatApiError(error, t('feedback.rejectDocumentFailed'), t));
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
      notifyDangerSuccess(getToastMessage(response, t('feedback.sectionRejectedSuccess')));
      closeRejectRubriqueModal();
      await refreshDetailSilently();
    } catch (error) {
      notifyError(formatApiError(error, t('feedback.rejectSectionFailed'), t));
    } finally {
      withMapPending(setIsRejectingRubriqueById, rubriqueId, false);
    }
  };

  // Keep loading / not-found branches early so the main render stays readable.
  if (isLoadingDetail) {
    return (
      <div className="container py-5">
        <Loader message={t('dossierDetail.loadingMessage')} size="md" />
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
                  title={t('dossierDetail.errorTitle')}
                  description={loadErrorMessage}
                  action={
                    <button className="btn btn-primary" onClick={() => navigate('/dossiers')}>
                      {t('dossierDetail.backToCaseFiles')}
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
                  title={t('dossierDetail.notFoundTitle')}
                  description={t('dossierDetail.notFoundDescription')}
                  action={
                    <button className="btn btn-primary" onClick={() => navigate('/dossiers')}>
                      {t('dossierDetail.backToCaseFiles')}
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
        title={t('dossierDetail.pageTitle')}
        subtitle={t('dossierDetail.pageSubtitle')}
        action={
          <button
            type="button"
            className="btn btn-outline-primary page-back-btn"
            onClick={() => navigate('/dossiers')}
          >
            <i className="bi bi-arrow-left me-2" aria-hidden="true" />
            {t('dossierDetail.backToCaseFiles')}
          </button>
        }
      />

      {/* Top-level workflow banners keep the current dossier state explicit. */}
      {isFrozen && (
        <WorkflowBanner title={t('dossierDetail.finalized')} variant="success" icon="bi-lock-fill">
          {t('dossierDetail.finalizedMessage', { status: dossierStatusLabel })}
        </WorkflowBanner>
      )}

      {dossierStatus === DOSSIER_STATUSES.IN_ESCALATION && !isSupervisor && (
        <WorkflowBanner
          title={t('dossierDetail.pendingSupervisor')}
          variant="warning"
          icon="bi-diagram-3"
        >
          {t('dossierDetail.pendingSupervisorMessage')}
        </WorkflowBanner>
      )}

      {isReturnedForClaimsReview && canReview && (
        <WorkflowBanner
          title={t('dossierDetail.returnedBySupervisor')}
          variant="warning"
          icon="bi-arrow-return-left"
        >
          {t('dossierDetail.returnedBySupervisorMessage')}
          {dossier.chef_decision_note && (
            <div className="mt-1">
              <strong>{t('dossierDetail.supervisorNote')}:</strong> {dossier.chef_decision_note}
            </div>
          )}
        </WorkflowBanner>
      )}

      {isComplementPending && isDossierOwnedByCurrentUser && (() => {
        const isSupervisorRequest =
          dossier.awaiting_complement_source === 'SUPERVISOR_COMPLEMENT_REQUEST';
        const sourceLabel = isSupervisorRequest
          ? t('dossierDetail.complementBySupervisor')
          : t('dossierDetail.returnedByClaimsManager');
        const noteLabel = isSupervisorRequest ? t('dossierDetail.supervisorNote') : t('dossierDetail.returnNote');

        return (
          <WorkflowBanner
            title={t('dossierDetail.preparationReopened')}
            variant="warning"
            icon="bi-arrow-return-left"
          >
            <div className="d-flex flex-column gap-1">
              <div className="text-muted small fw-normal lh-sm mb-0">
                {sourceLabel}
                {dossier.awaiting_complement_user?.name && (
                  <> &bull; {dossier.awaiting_complement_user.name}</>
                )}
                {dossier.awaiting_complement_at && (
                  <> &bull; {formatDateTime(dossier.awaiting_complement_at)}</>
                )}
              </div>
              {dossier.awaiting_complement_note && (
                <div className="text-dark fw-medium lh-sm mb-0">
                  <strong>{noteLabel}:</strong> {dossier.awaiting_complement_note}
                </div>
              )}
            </div>
          </WorkflowBanner>
        );
      })()}

      <DossierSummaryCard
        dossier={dossier}
        dossierData={dossierData}
        formatAmount={formatAmountTnd}
        formatDateTime={formatDateTime}
      />

      <EscalationInfoBlock dossier={dossier} formatDateTime={formatDateTime} />

      <WorkflowHistoryCard
        events={workflowEvents}
        isLoading={isLoadingWorkflowHistory}
        hasError={workflowHistoryLoadFailed}
        onRetry={refreshWorkflowHistory}
        formatDateTime={formatDateTime}
      />

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
          canEscalate={canEscalate}
          isEscalatingDossier={isEscalatingDossier}
          onOpenEscalateModal={() => setEscalateModalOpen(true)}
          canReturnToPreparation={canReturnToPreparation}
          isReturningToPreparation={isReturningToPreparation}
          onOpenReturnToPreparationModal={() => setReturnToPreparationModalOpen(true)}
        />
      )}

      <DossierModalShell
        isOpen={escalateModalOpen}
        title={t('workflow.escalateToSupervisor')}
        onClose={() => {
          setEscalateModalOpen(false);
          setEscalationReason('');
        }}
        isBusy={isEscalatingDossier}
        initialFocus="secondary"
        className="dossier-decision-modal"
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setEscalateModalOpen(false);
                setEscalationReason('');
              }}
              disabled={isEscalatingDossier}
            >
              {t('actions.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-warning"
              onClick={handleEscalateConfirm}
              disabled={isEscalatingDossier || !escalationReason.trim()}
            >
              {isEscalatingDossier ? t('workflow.escalating') : t('workflow.confirmEscalation')}
            </button>
          </>
        }
      >
        <div>
          <label htmlFor="escalation-reason" className="form-label workflow-modal-label">
            {t('workflow.escalationReason')} <span className="text-danger">*</span>
          </label>
          <textarea
            id="escalation-reason"
            className="form-control workflow-modal-textarea"
            rows={3}
            value={escalationReason}
            onChange={(e) => setEscalationReason(e.target.value)}
            placeholder={t('workflow.escalationPlaceholder')}
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
        canClaimsManagerDecidePendingDocuments={canClaimsManagerDecidePendingDocuments}
        canSupervisorOverrideDocumentDecisions={canSupervisorOverrideDocumentDecisions}
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

      <DossierModalShell
        isOpen={returnToPreparationModalOpen}
        title={t('workflow.returnToPreparation')}
        onClose={() => {
          if (!isReturningToPreparation) {
            setReturnToPreparationModalOpen(false);
            setReturnToPreparationNote('');
          }
        }}
        isBusy={isReturningToPreparation}
        initialFocus="secondary"
        className="dossier-decision-modal"
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setReturnToPreparationModalOpen(false);
                setReturnToPreparationNote('');
              }}
              disabled={isReturningToPreparation}
            >
              {t('actions.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReturnToPreparationConfirm}
              disabled={isReturningToPreparation || !returnToPreparationNote.trim()}
            >
              {isReturningToPreparation ? t('workflow.returning') : t('workflow.returnToPreparation')}
            </button>
          </>
        }
      >
        <div>
          <label htmlFor="return-to-preparation-note" className="form-label workflow-modal-label">
            {t('dossierDetail.returnNote')} <span className="text-danger">*</span>
          </label>
          <textarea
            id="return-to-preparation-note"
            className="form-control workflow-modal-textarea"
            rows={3}
            value={returnToPreparationNote}
            onChange={(e) => setReturnToPreparationNote(e.target.value)}
            placeholder={t('workflow.returnNotePlaceholder')}
            disabled={isReturningToPreparation}
            autoFocus
          />
        </div>
      </DossierModalShell>
    </div>
  );
}

export default DossierDetail;
