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
  complement: {
    icon: 'bi-file-earmark-plus',
    cardClass: 'active-context-card--complement',
    badgeClass: 'active-context-card__badge--complement',
  },
  return: {
    icon: 'bi-arrow-return-left',
    cardClass: 'active-context-card--returned',
    badgeClass: 'active-context-card__badge--returned',
  },
  escalation: {
    icon: 'bi-diagram-3',
    cardClass: 'active-context-card--escalated',
    badgeClass: 'active-context-card__badge--escalated',
  },
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
      badgeKey: isSupervisorRequest
        ? 'dossierDetail.activeContext.badges.complementRequested'
        : 'dossierDetail.activeContext.badges.preparationReopened',
      statusRole: getRoleLabel(USER_ROLES.AGENT),
      sourceLabelKey: isSupervisorRequest
        ? 'dossierDetail.activeContext.requestedBy'
        : 'dossierDetail.activeContext.returnedBy',
      sourceRole: isSupervisorRequest
        ? getRoleLabel(USER_ROLES.SUPERVISOR)
        : getRoleLabel(USER_ROLES.CLAIMS_MANAGER),
      recordedBy: actor,
      timestamp,
      note,
      noteLabelKey: isSupervisorRequest
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
      badgeKey: 'dossierDetail.activeContext.badges.returned',
      statusRole: getRoleLabel(USER_ROLES.CLAIMS_MANAGER),
      sourceLabelKey: 'dossierDetail.activeContext.returnedBy',
      sourceRole: getRoleLabel(USER_ROLES.SUPERVISOR),
      recordedBy: resolveUserName(dossier.chef_decision_maker),
      timestamp: normalizeText(dossier.chef_decision_at),
      note: normalizeText(dossier.chef_decision_note),
      noteLabelKey: 'dossierDetail.activeContext.latestNote',
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
      badgeKey: 'dossierDetail.activeContext.badges.escalated',
      statusRole: getRoleLabel(USER_ROLES.SUPERVISOR),
      sourceLabelKey: 'dossierDetail.activeContext.escalatedBy',
      sourceRole: getRoleLabel(USER_ROLES.CLAIMS_MANAGER),
      recordedBy: escalator,
      timestamp,
      note: reason,
      noteLabelKey: 'dossierDetail.activeContext.reason',
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

  const metadataItems = [
    {
      labelKey: context.sourceLabelKey,
      value: context.sourceRole,
    },
    {
      labelKey: 'dossierDetail.activeContext.recordedBy',
      value: context.recordedBy,
    },
    {
      labelKey: 'dossierDetail.activeContext.date',
      value: renderTimestamp(context.timestamp),
    },
  ].filter((item) => normalizeText(item.value));

  const noteText = normalizeText(context.note);

  return (
    <div className={`card mb-4 active-context-card ${variant.cardClass}`}>
      <div className="card-header active-context-card__header">
        <div className="active-context-card__header-left">
          <i className={`bi ${variant.icon} active-context-card__icon`} aria-hidden="true" />
          <h6 className="mb-0 active-context-card__title">{t('dossierDetail.activeContext.title')}</h6>
        </div>

        <div className="active-context-card__header-meta">
          <span className={`active-context-card__badge ${variant.badgeClass}`}>
            {t(context.badgeKey)}
          </span>
        </div>
      </div>

      <div className="card-body active-context-card__body">
        <p className="mb-0 active-context-card__status-line">
          {t('dossierDetail.activeContext.waitingForRole', { role: context.statusRole })}
        </p>

        {metadataItems.length > 0 && (
          <div className="active-context-card__meta-grid">
            {metadataItems.map((item) => (
              <div key={item.labelKey} className="active-context-card__meta-item">
                <span className="active-context-card__meta-label">{t(item.labelKey)}</span>
                <span className="active-context-card__meta-value">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {noteText && (
          <div className="active-context-card__note">
            <p className="mb-1 active-context-card__note-label">{t(context.noteLabelKey)}</p>
            <p className="mb-0 active-context-card__note-text">{noteText}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ActiveWorkflowContextCard;
