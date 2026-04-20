import i18n from '../i18n';
import { getRoleLabel } from '../constants/domainLabels';

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const resolveMeta = (notification) => {
  const meta = notification?.meta;
  return meta && typeof meta === 'object' ? meta : {};
};

const resolveType = (notification) => normalizeText(notification?.type).toUpperCase();

const resolveNumeroDossier = (notification, meta) => {
  return normalizeText(meta.numero_dossier || notification?.dossier?.numero_dossier);
};

const resolveActorName = (notification, meta) => {
  return normalizeText(meta.actor_name || notification?.actor?.name);
};

const resolveActorRoleLabel = (notification, meta) => {
  const actorRole = normalizeText(meta.actor_role || notification?.actor?.role).toUpperCase();
  return actorRole ? getRoleLabel(actorRole) : '';
};

const buildStoredFallback = (notification) => {
  const caseFile = i18n.t('domain.caseFile');

  return {
    title: normalizeText(notification?.title) || i18n.t('notifications.eventTitles.DEFAULT'),
    message:
      normalizeText(notification?.message) ||
      i18n.t('notifications.eventMessages.DEFAULT', { caseFile }),
  };
};

const buildInterpolation = (notification, meta) => {
  const caseFile = i18n.t('domain.caseFile');
  const numeroDossier = resolveNumeroDossier(notification, meta);

  return {
    caseFile,
    numeroDossier,
    caseFileRef: numeroDossier ? `${caseFile} ${numeroDossier}` : caseFile,
    actorName: resolveActorName(notification, meta),
    actorRole: resolveActorRoleLabel(notification, meta),
    claimsManager: i18n.t('roles.CLAIMS_MANAGER'),
    supervisor: i18n.t('roles.SUPERVISOR'),
  };
};

export const getLocalizedNotificationContent = (notification) => {
  const fallback = buildStoredFallback(notification);
  const type = resolveType(notification);

  if (!type) {
    return fallback;
  }

  const titleKey = `notifications.eventTitles.${type}`;
  const messageKey = `notifications.eventMessages.${type}`;

  if (!i18n.exists(titleKey) || !i18n.exists(messageKey)) {
    return fallback;
  }

  const interpolation = buildInterpolation(notification, resolveMeta(notification));

  const title = normalizeText(i18n.t(titleKey, interpolation));
  const message = normalizeText(i18n.t(messageKey, interpolation));

  return {
    title: title || fallback.title,
    message: message || fallback.message,
  };
};
