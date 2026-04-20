import { useTranslation } from 'react-i18next';
import DecisionBadge from './DecisionBadge';

const HISTORY_ARRAY_KEYS = [
  'escalation_history',
  'escalationHistory',
  'escalation_events',
  'escalationEvents',
  'workflow_history',
  'workflowHistory',
  'history',
];

const SUCCESS_STATUSES = new Set(['APPROVED', 'ACCEPTED', 'VALIDATED', 'PROCESSED']);
const WARNING_STATUSES = new Set([
  'PENDING',
  'UNDER_REVIEW',
  'IN_ESCALATION',
  'AWAITING_COMPLEMENT',
  'RETURNED',
  'COMPLEMENT_REQUESTED',
  'PARTIAL',
]);
const DANGER_STATUSES = new Set(['REJECTED', 'FAILED', 'ERROR']);

const pickFirstText = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }

    const normalized = candidate.toString().trim();
    if (normalized) {
      return normalized;
    }
  }

  return '';
};

const toTitleCase = (value) => {
  const normalized = (value || '').toString().trim();

  if (!normalized) {
    return '';
  }

  return normalized
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const toTimestampValue = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  const timestamp = parsed.getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const getHistoryEntriesByKey = (dossier, key) => {
  const source = dossier?.[key];

  if (Array.isArray(source)) {
    return source;
  }

  if (Array.isArray(source?.data)) {
    return source.data;
  }

  if (Array.isArray(source?.items)) {
    return source.items;
  }

  if (Array.isArray(source?.entries)) {
    return source.entries;
  }

  return [];
};

const createEventSignature = (event) =>
  [
    event.eventType,
    event.decisionStatus,
    event.timestamp,
    event.actorName,
    event.note,
  ]
    .join('|')
    .toUpperCase();

const resolveHistoryActor = (entry) => {
  const actor = entry?.actor || entry?.user || entry?.author || entry?.performed_by || entry?.performedBy;

  if (typeof actor === 'string') {
    return actor;
  }

  return pickFirstText(
    actor?.name,
    actor?.full_name,
    actor?.email,
    entry?.actor_name,
    entry?.actorName,
    entry?.by,
    entry?.by_name,
    entry?.performed_by_name,
    entry?.created_by_name,
    entry?.user_name
  );
};

const resolveHistoryTimestamp = (entry) => pickFirstText(
  entry?.timestamp,
  entry?.occurred_at,
  entry?.occurredAt,
  entry?.event_at,
  entry?.eventAt,
  entry?.at,
  entry?.created_at,
  entry?.createdAt,
  entry?.decision_at,
  entry?.escalated_at
);

const getDecisionMarkerClass = (decisionStatus) => {
  if (SUCCESS_STATUSES.has(decisionStatus)) {
    return 'audit-timeline__marker--decided-success';
  }

  if (WARNING_STATUSES.has(decisionStatus)) {
    return 'audit-timeline__marker--decided-warning';
  }

  if (DANGER_STATUSES.has(decisionStatus)) {
    return 'audit-timeline__marker--decided-danger';
  }

  return 'audit-timeline__marker--decided-info';
};

const getEventLabel = (eventType, decisionStatus, t) => {
  if (eventType.includes('ESCALAT')) {
    return t('workflow.labelEscalated', { defaultValue: 'Escalated' });
  }

  if (decisionStatus === 'RETURNED') {
    return t('workflow.labelReturned', { defaultValue: 'Returned' });
  }

  if (decisionStatus === 'COMPLEMENT_REQUESTED') {
    return t('workflow.labelComplementRequested', { defaultValue: 'Complement Requested' });
  }

  if (decisionStatus === 'APPROVED') {
    return t('workflow.labelApproved', { defaultValue: 'Approved' });
  }

  if (eventType.includes('RETURN')) {
    return t('workflow.labelReturned', { defaultValue: 'Returned' });
  }

  if (eventType.includes('COMPLEMENT')) {
    return t('workflow.labelComplementRequested', { defaultValue: 'Complement Requested' });
  }

  if (eventType.includes('APPROV')) {
    return t('workflow.labelApproved', { defaultValue: 'Approved' });
  }

  if (eventType.includes('REJECT')) {
    return t('workflow.labelSupervisorRejected', { defaultValue: 'Supervisor Rejected' });
  }

  if (eventType.includes('DECISION') || decisionStatus) {
    return t('workflow.labelSupervisorDecision', { defaultValue: 'Supervisor Decision' });
  }

  return toTitleCase(eventType) || t('workflow.labelWorkflowEvent', { defaultValue: 'Workflow Event' });
};

const getEventMarkerClass = (eventType, decisionStatus) => {
  if (eventType.includes('ESCALAT')) {
    return 'audit-timeline__marker--escalated';
  }

  if (decisionStatus) {
    return getDecisionMarkerClass(decisionStatus);
  }

  if (eventType.includes('RETURN') || eventType.includes('COMPLEMENT')) {
    return 'audit-timeline__marker--decided-warning';
  }

  if (eventType.includes('APPROV')) {
    return 'audit-timeline__marker--decided-success';
  }

  return 'audit-timeline__marker--decided-info';
};

const normalizeHistoryEvent = (entry, orderIndex, t) => {
  const eventType = pickFirstText(
    entry?.event_type,
    entry?.eventType,
    entry?.type,
    entry?.action,
    entry?.label
  ).toUpperCase();

  const decisionStatus = pickFirstText(
    entry?.decision_type,
    entry?.decisionType,
    entry?.decision_status,
    entry?.decisionStatus,
    entry?.decision,
    entry?.status
  ).toUpperCase();

  const timestamp = resolveHistoryTimestamp(entry);
  const actorName = resolveHistoryActor(entry);
  const note = pickFirstText(
    entry?.note,
    entry?.message,
    entry?.reason,
    entry?.comment,
    entry?.decision_note,
    entry?.escalation_reason
  );

  if (!eventType && !decisionStatus && !timestamp && !actorName && !note) {
    return null;
  }

  return {
    key: pickFirstText(entry?.id, entry?.uuid) || `history-${orderIndex}`,
    eventType,
    decisionStatus,
    timestamp,
    actorName,
    note,
    label: getEventLabel(eventType, decisionStatus, t),
    markerClass: getEventMarkerClass(eventType, decisionStatus),
    orderIndex,
  };
};

const buildSnapshotEvents = (dossier, t) => {
  // API snapshot fields represent the currently stored escalation cycle.
  const events = [];

  if (dossier?.escalated_at || dossier?.escalation_reason || dossier?.escalator?.name || dossier?.escalated_by) {
    events.push({
      key: 'snapshot-escalated',
      eventType: 'ESCALATED',
      decisionStatus: '',
      timestamp: dossier?.escalated_at || '',
      actorName: dossier?.escalator?.name || dossier?.escalated_by || '',
      note: dossier?.escalation_reason || '',
      label: t('workflow.labelEscalated', { defaultValue: 'Escalated' }),
      markerClass: 'audit-timeline__marker--escalated',
      orderIndex: 10_000,
    });
  }

  const snapshotDecisionStatus = (dossier?.chef_decision_type || '').toString().toUpperCase();
  if (
    snapshotDecisionStatus ||
    dossier?.chef_decision_at ||
    dossier?.chef_decision_note ||
    dossier?.chef_decision_maker?.name ||
    dossier?.chef_decision_by
  ) {
    events.push({
      key: 'snapshot-decision',
      eventType: 'SUPERVISOR_DECISION',
      decisionStatus: snapshotDecisionStatus,
      timestamp: dossier?.chef_decision_at || '',
      actorName: dossier?.chef_decision_maker?.name || dossier?.chef_decision_by || '',
      note: dossier?.chef_decision_note || '',
      label: t('workflow.labelSupervisorDecision', { defaultValue: 'Supervisor Decision' }),
      markerClass: getDecisionMarkerClass(snapshotDecisionStatus),
      orderIndex: 10_001,
    });
  }

  return events;
};

const normalizeHistoryEventWithT = (t) => (entry, orderIndex) => normalizeHistoryEvent(entry, orderIndex, t);

function AuditTimeline({ dossier, formatDateTime }) {
  const { t } = useTranslation();
  
  const buildTimelineEventsWithT = (dossier) => {
    const historyEvents = [];
    let historyOrderIndex = 0;

    HISTORY_ARRAY_KEYS.forEach((key) => {
      const entries = getHistoryEntriesByKey(dossier, key);
      if (entries.length === 0) {
        return;
      }

      entries.forEach((entry) => {
        const normalized = normalizeHistoryEventWithT(t)(entry, historyOrderIndex);
        historyOrderIndex += 1;

        if (normalized) {
          historyEvents.push(normalized);
        }
      });
    });

    const snapshotEvents = buildSnapshotEvents(dossier, t);
    const historySignatures = new Set(historyEvents.map((event) => createEventSignature(event)));
    const deduplicatedSnapshots = snapshotEvents.filter(
      (event) => !historySignatures.has(createEventSignature(event))
    );
    const merged = [...historyEvents, ...deduplicatedSnapshots];

    return merged.sort((first, second) => {
      const firstTimestamp = toTimestampValue(first.timestamp);
      const secondTimestamp = toTimestampValue(second.timestamp);

      if (firstTimestamp !== null && secondTimestamp !== null) {
        return secondTimestamp - firstTimestamp;
      }

      if (firstTimestamp !== null) {
        return -1;
      }

      if (secondTimestamp !== null) {
        return 1;
      }

      return second.orderIndex - first.orderIndex;
    });
  };

  const timelineEvents = buildTimelineEventsWithT(dossier);

  const renderDateTime = (value) => {
    if (typeof formatDateTime === 'function') {
      return formatDateTime(value);
    }

    return value || '-';
  };

  if (timelineEvents.length === 0) {
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
          {timelineEvents.map((event, index) => {
            const isLast = index === timelineEvents.length - 1;
            const isOlderEvent = index > 0;
            const eventClassName = [
              'audit-timeline__event',
              isLast ? 'audit-timeline__event--last' : '',
              isOlderEvent ? 'audit-timeline__event--older' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div key={event.key} className={eventClassName}>
                <div className={['audit-timeline__marker', event.markerClass].join(' ')} />
                <div className="audit-timeline__content">
                  <div className="audit-timeline__event-header">
                    <span className="audit-timeline__event-label">{event.label}</span>
                    {event.timestamp && (
                      <span className="audit-timeline__event-time">{renderDateTime(event.timestamp)}</span>
                    )}
                  </div>

                  {event.actorName && (
                    <div className="audit-timeline__actor">
                      <i className="bi bi-person" aria-hidden="true" />
                      {event.actorName}
                    </div>
                  )}

                  {event.decisionStatus && (
                    <DecisionBadge status={event.decisionStatus} className="audit-timeline__decision-pill" />
                  )}

                  {event.note && (
                    <p className={`audit-timeline__reason mb-0${event.decisionStatus ? ' audit-timeline__reason--note' : ''}`}>
                      {event.note}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AuditTimeline;
