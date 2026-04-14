import { useEffect, useState } from 'react';
import WorkspaceModalShell from './WorkspaceModalShell';
import { USER_ROLES, USER_ROLE_LABELS } from '../constants/domainLabels';

const ROLE_OPTIONS = [
  USER_ROLES.AGENT,
  USER_ROLES.CLAIMS_MANAGER,
  USER_ROLES.SUPERVISOR,
  USER_ROLES.ADMIN,
];

function AdminRoleModal({ isOpen, user, onClose, onConfirm, isBusy }) {
  const [selectedRole, setSelectedRole] = useState(user?.role ?? USER_ROLES.AGENT);

  // Reset to the user's current role whenever the modal opens with a (possibly different) user
  useEffect(() => {
    if (isOpen && user) {
      setSelectedRole(user.role);
    }
  }, [isOpen, user]);

  const roleChanged = selectedRole !== user?.role;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roleChanged || isBusy) return;
    onConfirm?.(selectedRole);
  };

  return (
    <WorkspaceModalShell
      isOpen={isOpen}
      title="Change Role"
      iconClass="bi-person-gear"
      onClose={onClose}
      isBusy={isBusy}
      size="sm"
    >
      {user && (
        <form onSubmit={handleSubmit} noValidate className="chpw-form">
          <div className="admin-modal-target-user mb-4">
            <span className="admin-modal-target-label">User</span>
            <span className="admin-modal-target-name">{user.name}</span>
            <span className="admin-modal-target-email">{user.email}</span>
          </div>

          <div className="mb-5">
            <label htmlFor="admin-role-select" className="form-label">
              New role
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
                  {USER_ROLE_LABELS[r]}
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
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!roleChanged || isBusy}
            >
              {isBusy ? (
                <>
                  <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg" aria-hidden="true" />
                  Apply
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
