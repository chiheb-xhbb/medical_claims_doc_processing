import { DOSSIER_STATUSES, getDossierStatusLabel } from '../constants/domainLabels';

export const CASE_FILE_STATUS_VARIANTS = Object.freeze({
  HERO: 'hero',
  TABLE: 'table',
});

const STATUS_CLASS_BY_VALUE = Object.freeze({
  [DOSSIER_STATUSES.RECEIVED]: 'case-file-status-badge--received',
  [DOSSIER_STATUSES.IN_PROGRESS]: 'case-file-status-badge--in-progress',
  [DOSSIER_STATUSES.UNDER_REVIEW]: 'case-file-status-badge--under-review',
  [DOSSIER_STATUSES.IN_ESCALATION]: 'case-file-status-badge--in-escalation',
  [DOSSIER_STATUSES.AWAITING_COMPLEMENT]: 'case-file-status-badge--awaiting-complement',
  [DOSSIER_STATUSES.PROCESSED]: 'case-file-status-badge--processed',
});

const VARIANT_CLASS_BY_VALUE = Object.freeze({
  [CASE_FILE_STATUS_VARIANTS.HERO]: 'case-file-status-badge--hero',
  [CASE_FILE_STATUS_VARIANTS.TABLE]: 'case-file-status-badge--table',
});

const normalizeStatus = (status) => (status || '').toString().trim().toUpperCase();

function CaseFileStatusBadge({ status, variant = CASE_FILE_STATUS_VARIANTS.TABLE, className = '' }) {
  const normalizedStatus = normalizeStatus(status);
  const normalizedVariant = (variant || '').toString().trim().toLowerCase();
  const statusClass = STATUS_CLASS_BY_VALUE[normalizedStatus] || 'case-file-status-badge--unknown';
  const variantClass = VARIANT_CLASS_BY_VALUE[normalizedVariant] || VARIANT_CLASS_BY_VALUE[CASE_FILE_STATUS_VARIANTS.TABLE];
  const label = getDossierStatusLabel(normalizedStatus);

  return (
    <span className={['case-file-status-badge', statusClass, variantClass, className].filter(Boolean).join(' ')}>
      <span className="case-file-status-badge__dot" aria-hidden="true" />
      <span className="case-file-status-badge__label">{label}</span>
    </span>
  );
}

export default CaseFileStatusBadge;