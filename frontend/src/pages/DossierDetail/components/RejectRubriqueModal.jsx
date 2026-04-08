import { useRef } from 'react';
import DossierModalShell from './DossierModalShell';

function RejectRubriqueModal({
  isOpen,
  rejectRubriqueTarget,
  rejectRubriqueNote,
  setRejectRubriqueNote,
  closeRejectRubriqueModal,
  handleRejectRubriqueConfirm,
  isRejectingRubriqueById
}) {
  const cancelButtonRef = useRef(null);
  const rejectButtonRef = useRef(null);
  const rejectRubriqueNoteRef = useRef(null);

  if (!isOpen) {
    return null;
  }

  const isRejecting = Boolean(isRejectingRubriqueById[rejectRubriqueTarget?.id]);
  const hasDecisionNote = Boolean((rejectRubriqueNote || '').trim());

  return (
    <DossierModalShell
      isOpen={isOpen}
      title="Reject Entire Section"
      description={
        <>
          Section: <strong>{rejectRubriqueTarget?.title || `#${rejectRubriqueTarget?.id || ''}`}</strong>
        </>
      }
      onClose={closeRejectRubriqueModal}
      isBusy={isRejecting}
      initialFocusRef={rejectRubriqueNoteRef}
      primaryActionRef={rejectButtonRef}
      secondaryActionRef={cancelButtonRef}
      footer={(
        <>
          <button
            type="button"
            ref={cancelButtonRef}
            className="btn btn-outline-secondary"
            onClick={closeRejectRubriqueModal}
            disabled={isRejecting}
          >
            Cancel
          </button>
          <button
            type="button"
            ref={rejectButtonRef}
            className="btn btn-danger"
            onClick={handleRejectRubriqueConfirm}
            disabled={isRejecting || !hasDecisionNote}
          >
            {isRejecting ? 'Rejecting...' : 'Reject All Documents'}
          </button>
        </>
      )}
    >
      <p className="text-muted small mb-3">
        All documents in this section will be marked as <strong>REJECTED</strong>.
      </p>
      <div>
        <label htmlFor="rejectRubriqueNote" className="form-label">Decision Note (required)</label>
        <textarea
          ref={rejectRubriqueNoteRef}
          id="rejectRubriqueNote"
          className="form-control"
          rows={3}
          value={rejectRubriqueNote}
          onChange={(event) => setRejectRubriqueNote(event.target.value)}
          placeholder="Explain why this section is rejected"
          disabled={isRejecting}
        />
      </div>
    </DossierModalShell>
  );
}

export default RejectRubriqueModal;
