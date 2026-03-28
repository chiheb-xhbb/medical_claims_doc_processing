import { useRef } from 'react';
import DossierModalShell from './DossierModalShell';

function RejectDocumentModal({
  isOpen,
  rejectTargetDocument,
  rejectNote,
  setRejectNote,
  closeRejectDocumentModal,
  handleRejectDocument,
  isDecidingByDocumentId
}) {
  const cancelButtonRef = useRef(null);
  const rejectButtonRef = useRef(null);

  if (!isOpen) {
    return null;
  }

  const isRejecting = Boolean(isDecidingByDocumentId[rejectTargetDocument?.id] || false);

  return (
    <DossierModalShell
      isOpen={isOpen}
      title="Reject Document"
      description={
        <>
          Document: <strong>{rejectTargetDocument?.original_filename || `#${rejectTargetDocument?.id || ''}`}</strong>
        </>
      }
      onClose={closeRejectDocumentModal}
      isBusy={isRejecting}
      initialFocus="secondary"
      primaryActionRef={rejectButtonRef}
      secondaryActionRef={cancelButtonRef}
      footer={(
        <>
          <button
            ref={cancelButtonRef}
            className="btn btn-outline-secondary"
            onClick={closeRejectDocumentModal}
            disabled={isRejecting}
          >
            Cancel
          </button>
          <button
            ref={rejectButtonRef}
            className="btn btn-danger"
            onClick={handleRejectDocument}
            disabled={isRejecting}
          >
            {isRejecting ? 'Rejecting...' : 'Reject Document'}
          </button>
        </>
      )}
    >
      <div>
        <label htmlFor="rejectNote" className="form-label">Decision Note (required)</label>
        <textarea
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
