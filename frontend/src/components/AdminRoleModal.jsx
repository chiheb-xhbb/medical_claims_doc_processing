import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import WorkspaceModalShell from './WorkspaceModalShell';
import { USER_ROLES, getRoleLabel } from '../constants/domainLabels';

const ROLE_OPTIONS = [
  USER_ROLES.AGENT,
  USER_ROLES.CLAIMS_MANAGER,
  USER_ROLES.SUPERVISOR,
  USER_ROLES.ADMIN,
];

function AdminRoleModal({ isOpen, user, onClose, onConfirm, isBusy }) {
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState(user?.role ?? USER_ROLES.AGENT);

  const roleChanged = selectedRole !== user?.role;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roleChanged || isBusy) return;
    onConfirm?.(selectedRole);
  };

  return (
    <WorkspaceModalShell
      isOpen={isOpen}
      title={t('adminUsers.changeRole')}
      iconClass="bi-person-gear"
      onClose={onClose}
      isBusy={isBusy}
      size="sm"
    >
      {user && (
        <form onSubmit={handleSubmit} noValidate className="chpw-form">
          <div className="admin-modal-target-user mb-4">
            <span className="admin-modal-target-label">{t('adminUsers.user')}</span>
            <span className="admin-modal-target-name">{user.name}</span>
            <span className="admin-modal-target-email">{user.email}</span>
          </div>

          <div className="mb-5">
            <label htmlFor="admin-role-select" className="form-label">
              {t('adminUsers.newRole')}
            </label>
            <select
              id="admin-role-select"
              className="form-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={isBusy}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {getRoleLabel(r)}
                </option>
              ))}
            </select>
          </div>

          <div className="chpw-form-footer">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
              disabled={isBusy}
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!roleChanged || isBusy}
            >
              {isBusy ? (
                <>
                  <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                  {t('changePassword.saving')}
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg" aria-hidden="true" />
                  {t('actions.apply')}
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </WorkspaceModalShell>
  );
}

export default AdminRoleModal;
