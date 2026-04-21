import { useTranslation } from 'react-i18next';
import DecisionBadge from './DecisionBadge';

const SUCCESS_DECISION_STATUSES = new Set(['APPROVED', 'ACCEPTED', 'VALIDATED', 'PROCESSED']);
const WARNING_DECISION_STATUSES = new Set([
  'RETURNED',
  'COMPLEMENT_REQUESTED',
  'PENDING',
  'UNDER_REVIEW',
  'IN_ESCALATION',
  'AWAITING_COMPLEMENT',
  'PARTIAL',
]);

const normalizeText = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  const normalized = String(value).trim();
  return normalized || '';
};

const normalizeEnum = (value) => normalizeText(value).toUpperCase();

const resolveActorName = (primaryActor, fallbackActor) => {
  if (typeof primaryActor === 'string') {
    return normalizeText(primaryActor);
  }

  const primaryName = normalizeText(
    primaryActor?.name || primaryActor?.full_name || primaryActor?.email
  );

  if (primaryName) {
    return primaryName;
  }

  if (typeof fallbackActor === 'string') {
    return normalizeText(fallbackActor);
  }

  return normalizeText(fallbackActor?.name || fallbackActor?.full_name || fallbackActor?.email);
};

const getDecisionMarkerClass = (decisionStatus) => {
  if (SUCCESS_DECISION_STATUSES.has(decisionStatus)) {
    return 'audit-timeline__marker--decided-success';
  }

  if (WARNING_DECISION_STATUSES.has(decisionStatus)) {
    return 'audit-timeline__marker--decided-warning';
  }

  return 'audit-timeline__marker--decided-info';
};

const getDecisionLabel = (decisionStatus, t) => {
  if (decisionStatus === 'RETURNED') {
    return t('workflow.labelReturned', { defaultValue: 'Returned' });
  }

  if (decisionStatus === 'COMPLEMENT_REQUESTED') {
    return t('workflow.labelComplementRequested', { defaultValue: 'Complement Requested' });
  }

  if (decisionStatus === 'APPROVED') {
    return t('workflow.labelApproved', { defaultValue: 'Approved' });
  }

  return t('workflow.labelSupervisorDecision', { defaultValue: 'Supervisor Decision' });
};

const buildCurrentHierarchicalEvent = (dossier, t) => {
  const decisionStatus = normalizeEnum(dossier?.chef_decision_type);

  if (decisionStatus) {
    return {
      key: 'current-supervisor-decision',
      label: getDecisionLabel(decisionStatus, t),
      markerClass: getDecisionMarkerClass(decisionStatus),
      timestamp: normalizeText(dossier?.chef_decision_at),
      actorName: resolveActorName(dossier?.chef_decision_maker, dossier?.chef_decision_by),
      note: normalizeText(dossier?.chef_decision_note),
      decisionStatus,
    };
  }

  if (normalizeEnum(dossier?.status) === 'IN_ESCALATION') {
    return {
      key: 'current-escalation',
      label: t('workflow.labelEscalated', { defaultValue: 'Escalated' }),
      markerClass: 'audit-timeline__marker--escalated',
      timestamp: normalizeText(dossier?.escalated_at),
      actorName: resolveActorName(dossier?.escalator, dossier?.escalated_by),
      note: normalizeText(dossier?.escalation_reason),
      decisionStatus: '',
    };
  }

  return null;
};

function AuditTimeline({ dossier, formatDateTime }) {
  const { t } = useTranslation();

  const currentHierarchicalEvent = buildCurrentHierarchicalEvent(dossier, t);

  const renderDateTime = (value) => {
    if (!value) {
      return '';
    }

    if (typeof formatDateTime === 'function') {
      return formatDateTime(value);
    }

    return value;
  };

  if (!currentHierarchicalEvent) {
    return null;
  }

  return (
    <div className="card mb-4 workflow-context-card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0 d-flex align-items-center">
          <i className="bi bi-diagram-3 me-2 text-muted" aria-hidden="true" />
          {t('workflow.currentEscalationContext', { defaultValue: 'Current Hierarchical Context' })}
        </h6>
      </div>
      <div className="card-body p-0">
        <div className="audit-timeline">
          <div className="audit-timeline__event audit-timeline__event--last">
            <div className={['audit-timeline__marker', currentHierarchicalEvent.markerClass].join(' ')} />
            <div className="audit-timeline__content">
              <div className="audit-timeline__event-header">
                <span className="audit-timeline__event-label">{currentHierarchicalEvent.label}</span>
                {currentHierarchicalEvent.timestamp && (
                  <span className="audit-timeline__event-time">
                    {renderDateTime(currentHierarchicalEvent.timestamp)}
                  </span>
                )}
              </div>

              {currentHierarchicalEvent.actorName && (
                <div className="audit-timeline__actor">
                  <i className="bi bi-person" aria-hidden="true" />
                  {currentHierarchicalEvent.actorName}
                </div>
              )}

              {currentHierarchicalEvent.decisionStatus && (
                <DecisionBadge
                  status={currentHierarchicalEvent.decisionStatus}
                  className="audit-timeline__decision-pill"
                />
              )}

              {currentHierarchicalEvent.note && (
                <p
                  className={`audit-timeline__reason mb-0${
                    currentHierarchicalEvent.decisionStatus ? ' audit-timeline__reason--note' : ''
                  }`}
                >
                  {currentHierarchicalEvent.note}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuditTimeline;
