import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import DossierModalShell from './DossierModalShell';

function RejectDocumentModal({
  isOpen,
  rejectTargetDocument,
  rejectNote,
  setRejectNote,
  isReturnedForClaimsReview,
  closeRejectDocumentModal,
  handleRejectDocument,
  isDecidingByDocumentId
}) {
  const { t } = useTranslation();
  const cancelButtonRef = useRef(null);
  const rejectButtonRef = useRef(null);
  const rejectNoteRef = useRef(null);

  if (!isOpen) {
    return null;
  }

  const isRejecting = Boolean(isDecidingByDocumentId[rejectTargetDocument?.id] || false);
  const hasDecisionNote = Boolean((rejectNote || '').trim());
  const reviewMessage = isReturnedForClaimsReview
    ? t('workflow.rejectDocumentPromptReturned')
    : t('workflow.rejectDocumentPrompt');

  return (
    <DossierModalShell
      isOpen={isOpen}
      title={t('workflow.rejectDocumentTitle')}
      description={
        <>
          {t('domain.document')}: <strong>{rejectTargetDocument?.original_filename || `#${rejectTargetDocument?.id || ''}`}</strong>
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
            {t('actions.cancel')}
          </button>
          <button
            type="button"
            ref={rejectButtonRef}
            className="btn btn-danger"
            onClick={handleRejectDocument}
            disabled={isRejecting || !hasDecisionNote}
          >
            {isRejecting ? t('workflow.rejectingDocument') : t('workflow.rejectDocumentLabel')}
          </button>
        </>
      )}
    >
      <div>
        <label htmlFor="rejectNote" className="form-label">{t('workflow.decisionNoteRequired')}</label>
        <textarea
          ref={rejectNoteRef}
          id="rejectNote"
          className="form-control"
          rows={4}
          value={rejectNote}
          onChange={(event) => setRejectNote(event.target.value)}
          placeholder={t('workflow.rejectReasonPlaceholder')}
          disabled={isRejecting}
        />
      </div>
    </DossierModalShell>
  );
}

export default RejectDocumentModal;
