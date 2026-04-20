import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getDossierStatusLabel, getRoleLabel } from '../../../constants/domainLabels';
import { Loader } from '../../../ui';

const EVENT_PRESENTATION = Object.freeze({
  DOSSIER_CREATED: {
    icon: 'bi-file-earmark-plus',
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
    markerClass: 'workflow-history-card__marker--warning',
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
    markerClass: 'workflow-history-card__marker--warning',
  },
  SUPERVISOR_REQUESTED_COMPLEMENT: {
    icon: 'bi-file-earmark-plus',
    markerClass: 'workflow-history-card__marker--warning',
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

const buildTransitionLabel = (fromStatus, toStatus) => {
  const normalizedFromStatus = normalizeEnum(fromStatus);
  const normalizedToStatus = normalizeEnum(toStatus);

  if (!normalizedFromStatus || !normalizedToStatus) {
    return '';
  }

  return `${getDossierStatusLabel(normalizedFromStatus)} -> ${getDossierStatusLabel(normalizedToStatus)}`;
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
                {t('workflowHistory.emptyTitle')}
              </p>
              <p className="workflow-history-card__state-message mb-0">
                {t('workflowHistory.emptyDescription')}
              </p>
            </div>
          </div>
        )}

        {!isLoading && !hasError && timelineEvents.length > 0 && (
          <div className="workflow-history-card__timeline">
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
              const transitionLabel = buildTransitionLabel(event?.from_status, event?.to_status);
              const timestampLabel = renderTimestamp(event?.created_at);
              const isLast = index === timelineEvents.length - 1;

              return (
                <div
                  key={event?.id || `${eventType}-${event?.created_at || index}`}
                  className={`workflow-history-card__event${isLast ? ' workflow-history-card__event--last' : ''}`}
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
                        <span className="workflow-history-card__actor-role">{actorRoleLabel}</span>
                      )}

                      {transitionLabel && (
                        <span className="workflow-history-card__transition">
                          <span className="workflow-history-card__transition-label">
                            {t('workflowHistory.transitionLabel')}:
                          </span>
                          <span className="workflow-history-card__transition-value">
                            {transitionLabel}
                          </span>
                        </span>
                      )}
                    </div>

                    {note && (
                      <p className="workflow-history-card__note mb-0">
                        <span className="workflow-history-card__note-label">
                          {t('workflowHistory.noteLabel')}:
                        </span>{' '}
                        {note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkflowHistoryCard;
