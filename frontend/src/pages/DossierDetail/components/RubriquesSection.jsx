import { useState } from 'react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../../../services/api';
import { previewDocument, downloadDocument } from '../../../services/documentAccess';
import { EmptyState, FileAccessInline, DecisionBadge } from '../../../ui';

const ACCEPTED_DECISION_STATUSES = new Set(['ACCEPTED', 'APPROVED', 'VALIDATED']);
const REJECTED_DECISION_STATUSES = new Set(['REJECTED', 'FAILED', 'ERROR']);

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

const getDecisionRowClass = (decisionStatus) => {
  if (REJECTED_DECISION_STATUSES.has(decisionStatus)) {
    return 'document-row-rejected';
  }

  if (ACCEPTED_DECISION_STATUSES.has(decisionStatus)) {
    return 'document-row-accepted';
  }

  return '';
};

const mapRubriqueStatusToBadge = (status) => {
  const normalized = (status || 'PENDING').toString().toUpperCase();

  if (['ACCEPTED', 'APPROVED', 'VALIDATED', 'PROCESSED', 'COMPLETED', 'COMPLETE'].includes(normalized)) {
    return 'APPROVED';
  }

  if (['REJECTED', 'FAILED', 'ERROR'].includes(normalized)) {
    return 'REJECTED';
  }

  if (normalized.includes('PARTIAL')) {
    return 'PARTIAL';
  }

  if (normalized.includes('REVIEW')) {
    return 'UNDER_REVIEW';
  }

  if (normalized.includes('PENDING')) {
    return 'PENDING';
  }

  return normalized;
};

function RubriquesSection({
  rubriques,
  canAttachDocuments,
  canDeleteRubrique,
  canRejectRubrique,
  canClaimsManagerDecidePendingDocuments,
  canSupervisorOverrideDocumentDecisions,
  canDetachDocuments,
  isFrozen,
  isAttachingByRubriqueId,
  isDeletingRubriqueById,
  isRejectingRubriqueById,
  isDecidingByDocumentId,
  isDetachingByDocumentId,
  openAttachModal,
  requestDeleteRubrique,
  openRejectRubriqueModal,
  handleAcceptDocument,
  openRejectDocumentModal,
  requestDetachDocument,
  formatAmount
}) {
  const [previewingById, setPreviewingById] = useState({});
  const [downloadingById, setDownloadingById] = useState({});

  const setDocumentAccessPending = (setter, documentId, isPending) => {
    setter((prev) => {
      if (isPending) {
        return { ...prev, [documentId]: true };
      }

      if (!prev[documentId]) {
        return prev;
      }

      const next = { ...prev };
      delete next[documentId];
      return next;
    });
  };

  const handlePreviewDocument = async (document) => {
    const documentId = document?.id;

    if (!documentId || previewingById[documentId]) {
      return;
    }

    try {
      setDocumentAccessPending(setPreviewingById, documentId, true);
      await previewDocument(documentId);
    } catch (error) {
      const message = error?.response
        ? getApiErrorMessage(error, 'Failed to open original document.')
        : error?.message || 'Failed to open original document.';

      toast.error(message);
    } finally {
      setDocumentAccessPending(setPreviewingById, documentId, false);
    }
  };

  const handleDownloadDocument = async (document) => {
    const documentId = document?.id;

    if (!documentId || downloadingById[documentId]) {
      return;
    }

    try {
      setDocumentAccessPending(setDownloadingById, documentId, true);
      await downloadDocument(documentId, document?.original_filename);
    } catch (error) {
      const message = error?.response
        ? getApiErrorMessage(error, 'Failed to download original document.')
        : error?.message || 'Failed to download original document.';

      toast.error(message);
    } finally {
      setDocumentAccessPending(setDownloadingById, documentId, false);
    }
  };

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0 d-flex align-items-center">
          <i className="bi bi-diagram-3 me-2"></i>
          Sections
        </h6>
        <span className="text-muted small">
          {rubriques.length} {rubriques.length === 1 ? 'section' : 'sections'}
        </span>
      </div>
      <div className="card-body">
        {rubriques.length === 0 ? (
          <EmptyState
            icon="folder2-open"
            title="No Sections"
            description="Create a section to start attaching validated documents."
          />
        ) : (
          <div className="rubrique-list">
            {rubriques.map((rubrique) => {
              const rubriqueDocuments = rubrique.documents || [];
              const canShowDeleteRubrique = canDeleteRubrique && !isFrozen && rubriqueDocuments.length === 0;
              const isDeletingRubrique = Boolean(isDeletingRubriqueById[rubrique.id]);
              const isRejectingRubrique = Boolean(isRejectingRubriqueById[rubrique.id]);
              const rubriqueStatus = (rubrique.status || 'PENDING').toString().toUpperCase();
              const rubriqueDecisionStatuses = rubriqueDocuments.map((doc) =>
                (doc?.decision_status ?? doc?.decisionStatus ?? 'PENDING').toString().toUpperCase()
              );
              const hasAcceptedDocs = rubriqueDecisionStatuses.some((status) => ACCEPTED_DECISION_STATUSES.has(status));
              const hasRejectedDocs = rubriqueDecisionStatuses.some((status) => REJECTED_DECISION_STATUSES.has(status));
              const hasPendingDocs = rubriqueDecisionStatuses.some((status) => status === 'PENDING' || !status);
              const isRubriqueRejected = REJECTED_DECISION_STATUSES.has(rubriqueStatus);
              const isEffectivelyRejected = rubriqueDocuments.length > 0 && hasRejectedDocs && !hasAcceptedDocs && !hasPendingDocs;
              const isSectionRejectionComplete = isRubriqueRejected || isEffectivelyRejected;
              const showRejectSectionControl = canRejectRubrique && !isFrozen;
              const isRejectSectionDisabled =
                isFrozen ||
                isRejectingRubrique ||
                rubriqueDocuments.length === 0 ||
                hasAcceptedDocs ||
                isSectionRejectionComplete;

              return (
                <div className="card mb-3 rubrique-card" key={rubrique.id}>
                  <div className="card-header rubrique-card__header">
                    <div className="rubrique-card__identity">
                      <h6 className="mb-1 rubrique-card__title">{rubrique.title || `Section #${rubrique.id}`}</h6>
                      <div className="rubrique-card__meta text-muted">
                        <DecisionBadge status={mapRubriqueStatusToBadge(rubriqueStatus)} className="rubrique-card__status-badge" />
                        <span className="rubrique-card__meta-separator" aria-hidden="true">&bull;</span>
                        <span className="rubrique-card__count">
                          {rubriqueDocuments.length} {rubriqueDocuments.length === 1 ? 'document' : 'documents'}
                        </span>
                      </div>
                    </div>

                    <div className="d-flex flex-wrap gap-2 rubrique-card__actions">
                      {canAttachDocuments && !isFrozen && (
                        <button
                          className="btn btn-sm btn-outline-primary rubrique-action-btn"
                          onClick={() => openAttachModal(rubrique)}
                          disabled={Boolean(isAttachingByRubriqueId[rubrique.id])}
                        >
                          <i className="bi bi-link-45deg" aria-hidden="true"></i>
                          Attach Documents
                        </button>
                      )}

                      {canShowDeleteRubrique && (
                        <button
                          className="btn btn-sm btn-outline-danger rubrique-action-btn"
                          onClick={() => requestDeleteRubrique(rubrique)}
                          disabled={isDeletingRubrique}
                        >
                          {isDeletingRubrique ? 'Deleting...' : 'Delete Section'}
                        </button>
                      )}

                      {showRejectSectionControl && (
                        <div className="rubrique-section-control-slot">
                          <button
                            className="btn btn-sm btn-outline-danger rubrique-action-btn rubrique-action-btn--reject-section rubrique-section-control rubrique-section-control--action"
                            onClick={() => openRejectRubriqueModal(rubrique)}
                            disabled={isRejectSectionDisabled}
                          >
                            {isRejectingRubrique ? 'Rejecting...' : 'Reject Section'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card-body">
                    {rubrique.notes?.trim() && (
                      <p className="mb-3 text-muted rubrique-card__notes">{rubrique.notes.trim()}</p>
                    )}
                    {rubriqueDocuments.length === 0 ? (
                      <div className="rubrique-empty-compact">
                        <div className="d-flex align-items-center gap-2 text-muted rubrique-empty-text">
                          <i className="bi bi-file-earmark"></i>
                          <span>
                            {canAttachDocuments && !isFrozen
                              ? 'No documents attached yet. Use Attach Documents to add validated files.'
                              : 'No documents attached yet.'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-striped align-middle mb-0 documents-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Document</th>
                              <th>Decision</th>
                              <th>Total TTC</th>
                              <th>Decision Note</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rubriqueDocuments.map((document) => {
                              const extractionTotal = getDocumentExtractionTotal(document);
                              const decisionStatus = (document.decision_status || 'PENDING').toString().toUpperCase();
                              const documentId = document.id;
                              const originalFilename = document.original_filename || `Document #${documentId}`;
                              const isPreviewing = Boolean(previewingById[documentId]);
                              const isDownloading = Boolean(downloadingById[documentId]);
                              const isDecided = decisionStatus === 'ACCEPTED' || decisionStatus === 'REJECTED' || decisionStatus === 'APPROVED';
                              // Claims Manager: only PENDING in normal UNDER_REVIEW.
                              // Supervisor/Admin: both PENDING and already-decided in IN_ESCALATION.
                              const canDecideCurrentDocument =
                                (canClaimsManagerDecidePendingDocuments && decisionStatus === 'PENDING') ||
                                (canSupervisorOverrideDocumentDecisions && (decisionStatus === 'PENDING' || isDecided));
                              const isBusy = Boolean(isDecidingByDocumentId[documentId] || isDetachingByDocumentId[documentId]);
                              const canShowDecisionActions = !isFrozen && canDecideCurrentDocument;
                              const canShowDetachAction = canDetachDocuments && !isFrozen;
                              const showActionsPlaceholder = !canShowDecisionActions && !canShowDetachAction;
                              const actionPlaceholderText = decisionStatus === 'PENDING' ? '-' : 'Decision completed';
                              const decisionRowClass = getDecisionRowClass(decisionStatus);

                              return (
                                <tr key={documentId} className={decisionRowClass}>
                                  <td className="rubrique-doc-id">{documentId}</td>
                                  <td className="rubrique-doc-file">
                                    <FileAccessInline
                                      filename={originalFilename}
                                      onPreview={() => handlePreviewDocument(document)}
                                      onDownload={() => handleDownloadDocument(document)}
                                      isPreviewing={isPreviewing}
                                      isDownloading={isDownloading}
                                    />
                                  </td>
                                  <td className="rubrique-doc-decision">
                                    <DecisionBadge status={decisionStatus} className="decision-status-badge" />
                                  </td>
                                  <td className="cell-numeric rubrique-doc-total">{extractionTotal === null ? '-' : formatAmount(extractionTotal)}</td>
                                  <td className="rubrique-doc-note">{document.decision_note || '-'}</td>
                                  <td className="document-actions-cell">
                                    <div className="document-actions-wrap">
                                      {canShowDecisionActions && (
                                        <div className="document-decision-actions" role="group" aria-label="Document decision actions">
                                          <button
                                            className="btn btn-sm btn-outline-success document-decision-btn document-decision-btn--accept"
                                            onClick={() => handleAcceptDocument(documentId)}
                                            disabled={isBusy}
                                          >
                                            Accept
                                          </button>
                                          <button
                                            className="btn btn-sm btn-outline-danger document-decision-btn document-decision-btn--reject"
                                            onClick={() => openRejectDocumentModal(document)}
                                            disabled={isBusy}
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      )}

                                      {canShowDetachAction && (
                                        <button
                                          className="btn btn-sm btn-outline-secondary document-detach-btn"
                                          onClick={() => requestDetachDocument(rubrique.id, documentId)}
                                          disabled={isBusy}
                                        >
                                          {isDetachingByDocumentId[documentId] ? 'Detaching...' : 'Detach'}
                                        </button>
                                      )}

                                      {showActionsPlaceholder && (
                                        <span className="text-muted small document-action-placeholder">{actionPlaceholderText}</span>
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
  );
}

export default RubriquesSection;
