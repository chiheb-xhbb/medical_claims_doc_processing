import { useTranslation } from 'react-i18next';
import { DOSSIER_STATUSES, USER_ROLES, getRoleLabel } from '../../../constants/domainLabels';

const normalizeText = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

const resolveUserName = (user) => {
  if (typeof user === 'string') return normalizeText(user);
  return normalizeText(user?.name || user?.full_name || user?.email);
};

const CONTEXT_VARIANTS = {
  complement: { icon: 'bi-file-earmark-plus', borderClass: 'active-context--complement' },
  return: { icon: 'bi-arrow-return-left', borderClass: 'active-context--return' },
  escalation: { icon: 'bi-diagram-3', borderClass: 'active-context--escalation' },
};

function resolveActiveContext(dossier, role) {
  const status = normalizeText(dossier?.status).toUpperCase();
  const isAdmin = role === USER_ROLES.ADMIN;

  if (status === DOSSIER_STATUSES.AWAITING_COMPLEMENT) {
    if (role !== USER_ROLES.AGENT && !isAdmin) return null;

    const source = normalizeText(dossier.awaiting_complement_source).toUpperCase();
    const isSupervisorRequest = source === 'SUPERVISOR_COMPLEMENT_REQUEST';
    const isClaimsManagerReturn = source === 'CLAIMS_MANAGER_RETURN';

    if (!isSupervisorRequest && !isClaimsManagerReturn) return null;

    const actor = isClaimsManagerReturn
      ? resolveUserName(dossier.awaiting_complement_user || dossier.returned_to_preparation_user)
      : resolveUserName(dossier.awaiting_complement_user);
      
    const timestamp = isClaimsManagerReturn
      ? normalizeText(dossier.awaiting_complement_at || dossier.returned_to_preparation_at)
      : normalizeText(dossier.awaiting_complement_at);
      
    const note = isClaimsManagerReturn
      ? normalizeText(dossier.awaiting_complement_note || dossier.returned_to_preparation_note)
      : normalizeText(dossier.awaiting_complement_note);

    return {
      type: isSupervisorRequest ? 'complement' : 'return',
      titleKey: isSupervisorRequest
        ? 'dossierDetail.activeContext.complementRequested'
        : 'dossierDetail.activeContext.preparationReopened',
      descriptionKey: 'dossierDetail.activeContext.waitingForRole',
      descriptionParams: { role: getRoleLabel(USER_ROLES.AGENT) },
      sourceKey: isSupervisorRequest
        ? 'dossierDetail.complementBySupervisor'
        : 'dossierDetail.returnedByClaimsManager',
      actor,
      timestamp,
      note,
      noteKey: isSupervisorRequest
        ? 'dossierDetail.activeContext.reason'
        : 'dossierDetail.activeContext.latestNote',
    };
  }

  if (
    status === DOSSIER_STATUSES.UNDER_REVIEW &&
    normalizeText(dossier.chef_decision_type).toUpperCase() === 'RETURNED'
  ) {
    if (role !== USER_ROLES.CLAIMS_MANAGER && !isAdmin) return null;

    return {
      type: 'return',
      titleKey: 'dossierDetail.activeContext.returnedToClaimsManager',
      descriptionKey: 'dossierDetail.activeContext.waitingForRole',
      descriptionParams: { role: getRoleLabel(USER_ROLES.CLAIMS_MANAGER) },
      actor: resolveUserName(dossier.chef_decision_maker),
      timestamp: normalizeText(dossier.chef_decision_at),
      note: normalizeText(dossier.chef_decision_note),
      noteKey: 'dossierDetail.activeContext.latestNote',
    };
  }

  if (status === DOSSIER_STATUSES.IN_ESCALATION) {
    if (role !== USER_ROLES.SUPERVISOR && !isAdmin) return null;

    const reason = normalizeText(dossier.escalation_reason);
    const escalator = resolveUserName(dossier.escalator || dossier.escalated_by);
    const timestamp = normalizeText(dossier.escalated_at);

    if (!reason && !escalator && !timestamp) return null;

    return {
      type: 'escalation',
      titleKey: 'dossierDetail.activeContext.escalatedForSupervisorReview',
      descriptionKey: 'dossierDetail.activeContext.waitingForRole',
      descriptionParams: { role: getRoleLabel(USER_ROLES.SUPERVISOR) },
      actor: escalator,
      timestamp,
      note: reason,
      noteKey: 'dossierDetail.activeContext.reason',
    };
  }

  return null;
}

function ActiveWorkflowContextCard({ dossier, role, formatDateTime }) {
  const { t } = useTranslation();

  const context = resolveActiveContext(dossier, role);
  if (!context) return null;

  const variant = CONTEXT_VARIANTS[context.type] || CONTEXT_VARIANTS.return;

  const renderTimestamp = (value) => {
    if (!value) return '';
    return typeof formatDateTime === 'function' ? formatDateTime(value) : value;
  };

  return (
    <div className={`card mb-4 active-context-card ${variant.borderClass}`}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0 d-flex align-items-center">
          <i className={`bi ${variant.icon} me-2 text-muted`} aria-hidden="true" />
          {t('dossierDetail.activeContext.title')}
        </h6>
      </div>
      <div className="card-body py-3 d-flex flex-column gap-2">
        <p className="mb-0 active-context-card__heading">{t(context.titleKey)}</p>
        <p className="mb-0 text-muted small">
          {t(context.descriptionKey, context.descriptionParams)}
          {context.sourceKey && (
            <> &bull; {t(context.sourceKey)}</>
          )}
          {context.actor && <> &bull; {t('dossierDetail.activeContext.by')} {context.actor}</>}
          {context.timestamp && <> &bull; {t('dossierDetail.activeContext.at')} {renderTimestamp(context.timestamp)}</>}
        </p>
        {context.note && (
          <div className="active-context-card__note">
            <strong>{t(context.noteKey)}:</strong> {context.note}
          </div>
        )}
      </div>
    </div>
  );
}

export default ActiveWorkflowContextCard;
