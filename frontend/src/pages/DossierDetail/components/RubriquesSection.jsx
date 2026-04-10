import { useState } from 'react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../../../services/api';
import { previewDocument, downloadDocument } from '../../../services/documentAccess';
import { EmptyState } from '../../../ui';

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

const getDecisionBadgeClass = (decisionStatus) => {
  if (decisionStatus === 'ACCEPTED') {
    return 'bg-success-subtle text-success-emphasis decision-status-badge';
  }

  if (decisionStatus === 'REJECTED') {
    return 'bg-danger-subtle text-danger-emphasis decision-status-badge';
  }

  return 'bg-primary-subtle text-primary-emphasis decision-status-badge';
};

const getDecisionRowClass = (decisionStatus) => {
  if (decisionStatus === 'REJECTED') {
    return 'document-row-rejected';
  }

  if (decisionStatus === 'ACCEPTED') {
    return 'document-row-accepted';
  }

  return '';
};

function RubriquesSection({
  rubriques,
  canAttachDocuments,
  canDeleteRubrique,
  canRejectRubrique,
  canDecideDocuments,
  isReturnedForClaimsReview,
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
        return {
          ...prev,
          [documentId]: true
        };
      }

      if (!prev[documentId]) {
        return prev;
      }

      const next = { ...prev };
      delete next[documentId];
      return next;
    });
  };

  const handlePreviewSourceDocument = async (document) => {
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

  const handleDownloadSourceDocument = async (document) => {
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
              const hasAcceptedDocs = rubriqueDocuments.some((doc) => {
                const status = (doc?.decision_status ?? doc?.decisionStatus ?? '').toString().toUpperCase();
                return status === 'ACCEPTED' || status === 'APPROVED';
              });

              return (
                <div className="card mb-3" key={rubrique.id}>
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-0">{rubrique.title || `Section #${rubrique.id}`}</h6>
                      <small className="text-muted">
                        Status: <span className="fw-semibold">{rubrique.status || 'PENDING'}</span>
                        {' | '}
                        {rubriqueDocuments.length} {rubriqueDocuments.length === 1 ? 'document' : 'documents'}
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

                      {canShowDeleteRubrique && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => requestDeleteRubrique(rubrique)}
                          disabled={isDeletingRubrique}
                        >
                          {isDeletingRubrique ? 'Deleting...' : 'Delete Section'}
                        </button>
                      )}

                      {canRejectRubrique && !isFrozen && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => openRejectRubriqueModal(rubrique)}
                          disabled={isFrozen || isRejectingRubrique || rubriqueDocuments.length === 0 || hasAcceptedDocs}
                        >
                          {isRejectingRubrique ? 'Rejecting...' : 'Reject Section'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="card-body">
                    <p className="mb-3 text-muted">{rubrique.notes || 'No notes for this section.'}</p>

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
                              const decisionStatus = (document.decision_status || 'PENDING').toString().toUpperCase();
                              const documentId = document.id;
                              const originalFilename = document.original_filename || `Document #${documentId}`;
                              const isPreviewing = Boolean(previewingById[documentId]);
                              const isDownloading = Boolean(downloadingById[documentId]);
                              const technicalStatus = (document.status || '').toString().toUpperCase();
                              const isDecided = decisionStatus === 'ACCEPTED' || decisionStatus === 'REJECTED' || decisionStatus === 'APPROVED';
                              const canReDecideReturnedDocument = isReturnedForClaimsReview && isDecided;
                              const canDecideCurrentDocument =
                                decisionStatus === 'PENDING' ||
                                (canReDecideReturnedDocument && technicalStatus === 'VALIDATED');
                              const isBusy = Boolean(isDecidingByDocumentId[documentId] || isDetachingByDocumentId[documentId]);
                              const canShowDecisionActions = canDecideDocuments && !isFrozen && canDecideCurrentDocument;
                              const canShowDetachAction = canDetachDocuments && !isFrozen;
                              const showActionsPlaceholder = !canShowDecisionActions && !canShowDetachAction;
                              const actionPlaceholderText = decisionStatus === 'PENDING' ? '-' : 'Decision completed';
                              const decisionBadgeClass = getDecisionBadgeClass(decisionStatus);
                              const decisionRowClass = getDecisionRowClass(decisionStatus);

                              return (
                                <tr key={documentId} className={decisionRowClass}>
                                  <td>{documentId}</td>
                                  <td>
                                    <div className="dossier-document-file-access">
                                      <button
                                        type="button"
                                        className="btn btn-link dossier-document-file-access__name"
                                        onClick={() => handlePreviewSourceDocument(document)}
                                        disabled={isPreviewing}
                                        title={originalFilename}
                                      >
                                        {originalFilename}
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm dossier-document-file-access__download"
                                        onClick={() => handleDownloadSourceDocument(document)}
                                        disabled={isDownloading}
                                        title="Download original document"
                                        aria-label={`Download ${originalFilename}`}
                                      >
                                        {isDownloading ? (
                                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                        ) : (
                                          <i className="bi bi-download" aria-hidden="true"></i>
                                        )}
                                      </button>
                                    </div>
                                  </td>
                                  <td>
                                    <span className="badge bg-secondary">{document.status || '-'}</span>
                                  </td>
                                  <td>
                                    <span className={`badge ${decisionBadgeClass}`}>{decisionStatus}</span>
                                  </td>
                                  <td>{extractionTotal === null ? '-' : formatAmount(extractionTotal)}</td>
                                  <td>{document.decision_note || '-'}</td>
                                  <td className="document-actions-cell">
                                    <div className="d-flex flex-wrap align-items-center gap-1 document-actions-wrap">
                                      {canShowDecisionActions && (
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

                                      {canShowDetachAction && (
                                        <button
                                          className="btn btn-sm btn-outline-secondary"
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
