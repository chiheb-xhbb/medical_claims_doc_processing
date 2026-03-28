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

  if (!isOpen) {
    return null;
  }

  const isRejecting = Boolean(isRejectingRubriqueById[rejectRubriqueTarget?.id]);

  return (
    <DossierModalShell
      isOpen={isOpen}
      title="Reject Entire Rubrique"
      description={
        <>
          Rubrique: <strong>{rejectRubriqueTarget?.title || `#${rejectRubriqueTarget?.id || ''}`}</strong>
        </>
      }
      onClose={closeRejectRubriqueModal}
      isBusy={isRejecting}
      initialFocus="secondary"
      primaryActionRef={rejectButtonRef}
      secondaryActionRef={cancelButtonRef}
      footer={(
        <>
          <button
            ref={cancelButtonRef}
            className="btn btn-outline-secondary"
            onClick={closeRejectRubriqueModal}
            disabled={isRejecting}
          >
            Cancel
          </button>
          <button
            ref={rejectButtonRef}
            className="btn btn-danger"
            onClick={handleRejectRubriqueConfirm}
            disabled={isRejecting}
          >
            {isRejecting ? 'Rejecting...' : 'Reject All Documents'}
          </button>
        </>
      )}
    >
      <p className="text-muted small mb-3">
        All documents in this rubrique will be marked as <strong>REJECTED</strong>.
      </p>
      <div>
        <label htmlFor="rejectRubriqueNote" className="form-label">Decision Note (optional)</label>
        <textarea
          id="rejectRubriqueNote"
          className="form-control"
          rows={3}
          value={rejectRubriqueNote}
          onChange={(event) => setRejectRubriqueNote(event.target.value)}
          placeholder="Optional: explain why this rubrique is rejected"
          disabled={isRejecting}
        />
      </div>
    </DossierModalShell>
  );
}

export default RejectRubriqueModal;
