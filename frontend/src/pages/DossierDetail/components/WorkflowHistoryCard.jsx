import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getDossierStatusLabel, getRoleLabel } from '../../../constants/domainLabels';
import { Loader } from '../../../ui';

const EVENT_PRESENTATION = Object.freeze({
  DOSSIER_CREATED: {
    icon: 'bi-folder-plus',
    markerClass: 'workflow-history-card__marker--created',
  },
  DOSSIER_SUBMITTED_FOR_REVIEW: {
    icon: 'bi-send-check',
    markerClass: 'workflow-history-card__marker--review',
  },
  DOSSIER_RESUBMITTED_FOR_REVIEW: {
    icon: 'bi-arrow-repeat',
    markerClass: 'workflow-history-card__marker--review',
  },
  DOSSIER_RETURNED_TO_PREPARATION: {
    icon: 'bi-arrow-return-left',
    markerClass: 'workflow-history-card__marker--returned',
  },
  DOSSIER_ESCALATED: {
    icon: 'bi-diagram-3',
    markerClass: 'workflow-history-card__marker--escalation',
  },
  SUPERVISOR_APPROVED_ESCALATION: {
    icon: 'bi-shield-check',
    markerClass: 'workflow-history-card__marker--success',
  },
  SUPERVISOR_RETURNED_TO_CLAIMS_MANAGER: {
    icon: 'bi-arrow-counterclockwise',
    markerClass: 'workflow-history-card__marker--returned',
  },
  SUPERVISOR_REQUESTED_COMPLEMENT: {
    icon: 'bi-file-earmark-plus',
    markerClass: 'workflow-history-card__marker--complement',
  },
  DOSSIER_PROCESSED: {
    icon: 'bi-check2-circle',
    markerClass: 'workflow-history-card__marker--success',
  },
});

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  const normalized = String(value).trim();
  return normalized || '';
};

const normalizeEnum = (value) => normalizeText(value).toUpperCase();

const parseTimestamp = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  const numeric = parsed.getTime();
  return Number.isNaN(numeric) ? null : numeric;
};

const getActorName = (event) => {
  return normalizeText(
    event?.actor?.name ||
      event?.meta?.actor_name ||
      event?.meta?.performed_by_name ||
      event?.meta?.created_by_name
  );
};

const getActorRole = (event) => {
  const role = normalizeEnum(event?.actor?.role || event?.meta?.actor_role);
  return role || '';
};

const ACTOR_ROLE_BADGE_CLASS = Object.freeze({
  AGENT: 'workflow-history-card__actor-role--agent',
  CLAIMS_MANAGER: 'workflow-history-card__actor-role--claims-manager',
  SUPERVISOR: 'workflow-history-card__actor-role--supervisor',
});

const getActorRoleBadgeClass = (role) =>
  ACTOR_ROLE_BADGE_CLASS[normalizeEnum(role)] || 'workflow-history-card__actor-role--neutral';

const buildTransitionData = ({ fromStatus, toStatus, eventType, t }) => {
  const normalizedFromStatus = normalizeEnum(fromStatus);
  const normalizedToStatus = normalizeEnum(toStatus);
  const normalizedEventType = normalizeEnum(eventType);
  const isCreationEvent = normalizedEventType === 'DOSSIER_CREATED';

  if (isCreationEvent && !normalizedFromStatus) {
    return {
      fromLabel: t('workflowHistory.initialState'),
      toLabel: getDossierStatusLabel(normalizedToStatus || 'RECEIVED'),
    };
  }

  if (!normalizedFromStatus || !normalizedToStatus) {
    return null;
  }

  return {
    fromLabel: getDossierStatusLabel(normalizedFromStatus),
    toLabel: getDossierStatusLabel(normalizedToStatus),
  };
};

function WorkflowHistoryCard({
  events,
  isLoading,
  hasError,
  onRetry,
  formatDateTime,
}) {
  const { t } = useTranslation();

  const timelineEvents = useMemo(() => {
    if (!Array.isArray(events)) {
      return [];
    }

    return events
      .map((event, index) => ({
        ...event,
        _stableIndex: index,
      }))
      .sort((first, second) => {
        const firstTimestamp = parseTimestamp(first?.created_at);
        const secondTimestamp = parseTimestamp(second?.created_at);

        if (firstTimestamp !== null && secondTimestamp !== null) {
          return firstTimestamp - secondTimestamp;
        }

        if (firstTimestamp !== null) {
          return -1;
        }

        if (secondTimestamp !== null) {
          return 1;
        }

        return first._stableIndex - second._stableIndex;
      });
  }, [events]);

  const renderTimestamp = (value) => {
    if (!value) {
      return '';
    }

    if (typeof formatDateTime === 'function') {
      return formatDateTime(value);
    }

    return value;
  };

  const eventUnitLabel =
    timelineEvents.length === 1 ? t('workflowHistory.event') : t('workflowHistory.events');
  const timelineAriaLabel = `${t('workflowHistory.immutableLog')}: ${timelineEvents.length} ${eventUnitLabel}`;

  return (
    <div className="card mb-4 workflow-history-card workflow-context-card workflow-context-card--history">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0 d-flex align-items-center">
          <i className="bi bi-clock-history me-2 text-muted" aria-hidden="true" />
          {t('workflowHistory.title')}
        </h6>
        {!isLoading && !hasError && (
          <span className="text-muted small">
            {t('workflowHistory.eventCount', { count: timelineEvents.length })}
          </span>
        )}
      </div>

      <div className="card-body p-0">
        {isLoading && (
          <div className="workflow-history-card__state">
            <Loader message={t('workflowHistory.loading')} size="sm" />
          </div>
        )}

        {!isLoading && hasError && (
          <div className="workflow-history-card__state">
            <div className="workflow-history-card__state-inner">
              <p className="workflow-history-card__state-title mb-1">
                {t('workflowHistory.error')}
              </p>
              <div className="d-flex align-items-center gap-2">
                <p className="workflow-history-card__state-message mb-0">
                  {t('workflowHistory.errorDescription')}
                </p>
                {typeof onRetry === 'function' && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={onRetry}
                  >
                    {t('actions.retry')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {!isLoading && !hasError && timelineEvents.length === 0 && (
          <div className="workflow-history-card__state">
            <div className="workflow-history-card__state-inner">
              <p className="workflow-history-card__state-title mb-1">
                {t('workflowHistory.empty')}
              </p>
            </div>
          </div>
        )}

        {!isLoading && !hasError && timelineEvents.length > 0 && (
          <div className="workflow-history-card__timeline" role="list" aria-label={timelineAriaLabel}>
            {timelineEvents.map((event, index) => {
              const eventType = normalizeEnum(event?.event_type);
              const eventPresentation = EVENT_PRESENTATION[eventType] || {
                icon: 'bi-clock-history',
                markerClass: 'workflow-history-card__marker--neutral',
              };
              const eventLabelKey = eventType
                ? `workflowHistory.eventLabels.${eventType}`
                : 'workflowHistory.eventLabels.DEFAULT';

              const eventTitle = t(eventLabelKey, {
                defaultValue: normalizeText(event?.title) || t('workflowHistory.eventLabels.DEFAULT'),
              });
              const localizedDescription = eventType
                ? t(`workflowHistory.eventDescriptions.${eventType}`, { defaultValue: '' })
                : '';
              const description = localizedDescription || normalizeText(event?.description);
              const note = normalizeText(event?.note);
              const actorName = getActorName(event) || t('workflowHistory.systemActor');
              const actorRole = getActorRole(event);
              const actorRoleLabel = actorRole ? getRoleLabel(actorRole) : '';
              const actorRoleClass = actorRole
                ? getActorRoleBadgeClass(actorRole)
                : 'workflow-history-card__actor-role--neutral';
              const transition = buildTransitionData({
                fromStatus: event?.from_status,
                toStatus: event?.to_status,
                eventType,
                t,
              });
              const timestampLabel = renderTimestamp(event?.created_at);
              const isLast = index === timelineEvents.length - 1;

              return (
                <div
                  key={event?.id || `${eventType}-${event?.created_at || index}`}
                  className={`workflow-history-card__event${isLast ? ' workflow-history-card__event--last' : ''}`}
                  role="listitem"
                >
                  <div className={`workflow-history-card__marker ${eventPresentation.markerClass}`}>
                    <i className={`bi ${eventPresentation.icon}`} aria-hidden="true" />
                  </div>

                  <div className="workflow-history-card__content">
                    <div className="workflow-history-card__event-header">
                      <div className="workflow-history-card__event-heading">
                        <p className="workflow-history-card__event-title mb-0">{eventTitle}</p>
                        {description && (
                          <p className="workflow-history-card__event-description mb-0">
                            {description}
                          </p>
                        )}
                      </div>
                      {timestampLabel && (
                        <span className="workflow-history-card__event-time">{timestampLabel}</span>
                      )}
                    </div>

                    <div className="workflow-history-card__event-meta">
                      <span className="workflow-history-card__actor">
                        <i className="bi bi-person" aria-hidden="true" />
                        {actorName}
                      </span>

                      {actorRoleLabel && (
                        <span className={`workflow-history-card__actor-role ${actorRoleClass}`}>
                          {actorRoleLabel}
                        </span>
                      )}

                      {transition && (
                        <span
                          className="workflow-history-card__transition"
                          aria-label={`${t('workflowHistory.transition')}: ${transition.fromLabel} → ${transition.toLabel}`}
                        >
                          <strong>{transition.fromLabel}</strong>
                          {' → '}
                          <strong>{transition.toLabel}</strong>
                        </span>
                      )}
                    </div>

                    {note && (
                      <div className="workflow-history-card__note">
                        <strong className="workflow-history-card__note-label">
                          {t('workflowHistory.note')}:
                        </strong>{' '}
                        {note}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="workflow-history-card__end">
              <div className="workflow-history-card__end-line" />
              <div className="workflow-history-card__end-dot" />
              <span className="workflow-history-card__end-label">
                {t('workflowHistory.endOfHistory')}
              </span>
              <div className="workflow-history-card__end-dot" />
              <div className="workflow-history-card__end-line" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkflowHistoryCard;
