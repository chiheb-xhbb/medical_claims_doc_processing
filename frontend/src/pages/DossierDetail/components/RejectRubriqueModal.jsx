import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      title={t('workflow.rejectSectionTitle')}
      description={
        <>
          {t('domain.section')}: <strong>{rejectRubriqueTarget?.title || `#${rejectRubriqueTarget?.id || ''}`}</strong>
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
            {t('actions.cancel')}
          </button>
          <button
            type="button"
            ref={rejectButtonRef}
            className="btn btn-danger"
            onClick={handleRejectRubriqueConfirm}
            disabled={isRejecting || !hasDecisionNote}
          >
            {isRejecting ? t('workflow.rejectingSection') : t('workflow.rejectAllDocuments')}
          </button>
        </>
      )}
    >
      <p className="text-muted small mb-3">
        {t('workflow.rejectSectionImpact')} <strong>{t('decision.REJECTED')}</strong>.
      </p>
      <div>
        <label htmlFor="rejectRubriqueNote" className="form-label">{t('workflow.decisionNoteRequired')}</label>
        <textarea
          ref={rejectRubriqueNoteRef}
          id="rejectRubriqueNote"
          className="form-control"
          rows={3}
          value={rejectRubriqueNote}
          onChange={(event) => setRejectRubriqueNote(event.target.value)}
          placeholder={t('workflow.rejectSectionReasonPlaceholder')}
          disabled={isRejecting}
        />
      </div>
    </DossierModalShell>
  );
}

export default RejectRubriqueModal;
