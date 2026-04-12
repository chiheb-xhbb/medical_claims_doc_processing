import { USER_ROLES, USER_ROLE_LABELS } from '../constants/domainLabels';

const ROLE_VARIANT_CLASS = {
  [USER_ROLES.AGENT]: 'user-role-badge--agent',
  [USER_ROLES.CLAIMS_MANAGER]: 'user-role-badge--claims-manager',
  [USER_ROLES.SUPERVISOR]: 'user-role-badge--supervisor',
  [USER_ROLES.ADMIN]: 'user-role-badge--admin',
};

function UserRoleBadge({ role, className = '' }) {
  const normalizedRole = (role || '').toString().toUpperCase();
  const label = USER_ROLE_LABELS[normalizedRole] || normalizedRole || '-';

  return (
    <span
      className={[
        'badge',
        'user-role-badge',
        ROLE_VARIANT_CLASS[normalizedRole] || 'user-role-badge--default',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </span>
  );
}

export default UserRoleBadge;
