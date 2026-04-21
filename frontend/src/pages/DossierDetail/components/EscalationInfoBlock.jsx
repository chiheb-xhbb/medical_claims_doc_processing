import { useTranslation } from 'react-i18next';
import { AuditTimeline } from '../../../ui';

const normalizeText = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  const normalized = String(value).trim();
  return normalized || '';
};

const normalizeEnum = (value) => normalizeText(value).toUpperCase();

const resolveUserName = (user) => {
  if (typeof user === 'string') {
    return normalizeText(user);
  }

  return normalizeText(user?.name || user?.full_name || user?.email);
};

const getAwaitingComplementSourceLabel = (source, t) => {
  const normalizedSource = normalizeEnum(source);

  if (normalizedSource.includes('SUPERVISOR')) {
    return t('dossierDetail.complementBySupervisor');
  }

  if (normalizedSource.includes('CLAIMS_MANAGER') || normalizedSource.includes('RETURN')) {
    return t('dossierDetail.returnedByClaimsManager');
  }

  return t('workflow.currentReturnToPreparationContext');
};

function EscalationInfoBlock({ dossier, formatDateTime }) {
  const { t } = useTranslation();

  const isAwaitingComplement = normalizeEnum(dossier?.status) === 'AWAITING_COMPLEMENT';
  const awaitingComplementSource = normalizeText(dossier?.awaiting_complement_source);
  const awaitingComplementUser = resolveUserName(dossier?.awaiting_complement_user);
  const awaitingComplementAt = normalizeText(dossier?.awaiting_complement_at);
  const awaitingComplementNote = normalizeText(dossier?.awaiting_complement_note);

  const renderTimestamp = (value) => {
    if (!value) {
      return '';
    }

    return typeof formatDateTime === 'function' ? formatDateTime(value) : value;
  };

  return (
    <>
      <AuditTimeline dossier={dossier} formatDateTime={formatDateTime} />

      {isAwaitingComplement && (
        <div className="card mb-4 workflow-context-card workflow-context-card--return">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="mb-0 d-flex align-items-center">
              <i className="bi bi-arrow-return-left me-2 text-muted" aria-hidden="true" />
              {t('workflow.currentReturnToPreparationContext')}
            </h6>
            {awaitingComplementAt && (
              <span className="ms-auto text-muted small">{renderTimestamp(awaitingComplementAt)}</span>
            )}
          </div>
          <div className="card-body py-3 d-flex flex-column gap-2">
            <p className="mb-0 text-muted small">
              {getAwaitingComplementSourceLabel(awaitingComplementSource, t)}
              {awaitingComplementUser && <> &bull; {awaitingComplementUser}</>}
            </p>

            {awaitingComplementNote && (
              <p className="mb-0 text-muted workflow-context-card__note">
                <strong>{t('workflow.currentReturnNoteLabel')}:</strong>{' '}
                {awaitingComplementNote}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default EscalationInfoBlock;
