import { getAccountStatusLabel } from '../constants/domainLabels';

function AccountStatusBadge({ isActive, className = '' }) {
  const isAccountActive = Boolean(isActive);

  return (
    <span
      className={[
        'badge',
        'account-status-badge',
        isAccountActive ? 'account-status-badge--active' : 'account-status-badge--inactive',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {getAccountStatusLabel(isAccountActive)}
    </span>
  );
}

export default AccountStatusBadge;
