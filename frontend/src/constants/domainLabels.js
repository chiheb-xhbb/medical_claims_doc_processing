import i18n from '../i18n';

// Internal enum constants — never translated, sent as-is to the API.
export const USER_ROLES = Object.freeze({
  AGENT: 'AGENT',
  CLAIMS_MANAGER: 'CLAIMS_MANAGER',
  SUPERVISOR: 'SUPERVISOR',
  ADMIN: 'ADMIN'
});

export const DOSSIER_STATUSES = Object.freeze({
  RECEIVED: 'RECEIVED',
  IN_PROGRESS: 'IN_PROGRESS',
  UNDER_REVIEW: 'UNDER_REVIEW',
  IN_ESCALATION: 'IN_ESCALATION',
  AWAITING_COMPLEMENT: 'AWAITING_COMPLEMENT',
  PROCESSED: 'PROCESSED'
});

// i18n-aware label resolvers — call these at render time so the
// current language is always used.

const formatEnumFallback = (value) => {
  const normalized = (value ?? '').toString().trim();

  if (!normalized) {
    return i18n.t('common.unknown');
  }

  return normalized
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
};

export function getRoleLabel(role) {
  return i18n.t(`roles.${role}`, { defaultValue: formatEnumFallback(role) });
}

export function getDossierStatusLabel(status) {
  return i18n.t(`dossierStatus.${status}`, { defaultValue: formatEnumFallback(status) });
}

export function getDocumentStatusLabel(status) {
  return i18n.t(`documentStatus.${status}`, { defaultValue: formatEnumFallback(status) });
}

export function getDecisionLabel(status) {
  return i18n.t(`decision.${status}`, { defaultValue: formatEnumFallback(status) });
}

export function getAccountStatusLabel(isActive) {
  return isActive ? i18n.t('accountStatus.active') : i18n.t('accountStatus.inactive');
}

// Static lookup tables kept for backward compatibility with existing code
// that reads USER_ROLE_LABELS / DOSSIER_STATUS_LABELS as plain objects.
// These resolve against the *current* language at access time via a Proxy.

const createI18nProxy = (keyPrefix) =>
  new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== 'string') return undefined;
        return i18n.t(`${keyPrefix}.${prop}`, { defaultValue: formatEnumFallback(prop) });
      },
    }
  );

export const USER_ROLE_LABELS = createI18nProxy('roles');
export const DOSSIER_STATUS_LABELS = createI18nProxy('dossierStatus');
