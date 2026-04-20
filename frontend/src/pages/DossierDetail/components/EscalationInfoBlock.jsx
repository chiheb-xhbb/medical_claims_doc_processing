import { useTranslation } from 'react-i18next';
import { AuditTimeline } from '../../../ui';

function EscalationInfoBlock({ dossier, formatDateTime }) {
  const { t } = useTranslation();
  const returnNote = dossier?.returned_to_preparation_note;
  const returnAt = dossier?.returned_to_preparation_at;

  const renderTimestamp = (value) => {
    if (!value) return null;
    return typeof formatDateTime === 'function' ? formatDateTime(value) : value;
  };

  return (
    <>
      <AuditTimeline dossier={dossier} formatDateTime={formatDateTime} />
      {returnNote && (
        <div className="card mb-4 workflow-context-card workflow-context-card--return">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="mb-0 d-flex align-items-center">
              <i className="bi bi-arrow-return-left me-2 text-muted" aria-hidden="true" />
              {t('workflow.currentReturnToPreparationContext')}
            </h6>
            {returnAt && (
              <span className="ms-auto text-muted small">{renderTimestamp(returnAt)}</span>
            )}
          </div>
          <div className="card-body py-3">
            <p className="mb-0 text-muted workflow-context-card__note">
              <strong>{t('workflow.currentReturnNoteLabel')}:</strong>{' '}
              {returnNote}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default EscalationInfoBlock;
