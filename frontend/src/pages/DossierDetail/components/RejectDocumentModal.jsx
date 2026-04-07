import { useRef } from 'react';
import DossierModalShell from './DossierModalShell';

function RejectDocumentModal({
  isOpen,
  rejectTargetDocument,
  rejectNote,
  setRejectNote,
  isReturnedToGestionnaire,
  closeRejectDocumentModal,
  handleRejectDocument,
  isDecidingByDocumentId
}) {
  const cancelButtonRef = useRef(null);
  const rejectButtonRef = useRef(null);
  const rejectNoteRef = useRef(null);

  if (!isOpen) {
    return null;
  }

  const isRejecting = Boolean(isDecidingByDocumentId[rejectTargetDocument?.id] || false);
  const hasDecisionNote = Boolean((rejectNote || '').trim());
  const reviewMessage = isReturnedToGestionnaire
    ? 'Reject this document for the returned dossier review? This will update the current decision.'
    : 'Reject this document for the current review.';

  return (
    <DossierModalShell
      isOpen={isOpen}
      title="Reject Document"
      description={
        <>
          Document: <strong>{rejectTargetDocument?.original_filename || `#${rejectTargetDocument?.id || ''}`}</strong>
          <div className="mt-2">{reviewMessage}</div>
        </>
      }
      onClose={closeRejectDocumentModal}
      isBusy={isRejecting}
      initialFocusRef={rejectNoteRef}
      primaryActionRef={rejectButtonRef}
      secondaryActionRef={cancelButtonRef}
      footer={(
        <>
          <button
            type="button"
            ref={cancelButtonRef}
            className="btn btn-outline-secondary"
            onClick={closeRejectDocumentModal}
            disabled={isRejecting}
          >
            Cancel
          </button>
          <button
            type="button"
            ref={rejectButtonRef}
            className="btn btn-danger"
            onClick={handleRejectDocument}
            disabled={isRejecting || !hasDecisionNote}
          >
            {isRejecting ? 'Rejecting...' : 'Reject Document'}
          </button>
        </>
      )}
    >
      <div>
        <label htmlFor="rejectNote" className="form-label">Decision Note (required)</label>
        <textarea
          ref={rejectNoteRef}
          id="rejectNote"
          className="form-control"
          rows={4}
          value={rejectNote}
          onChange={(event) => setRejectNote(event.target.value)}
          placeholder="Explain why this document is rejected"
          disabled={isRejecting}
        />
      </div>
    </DossierModalShell>
  );
}

export default RejectDocumentModal;
