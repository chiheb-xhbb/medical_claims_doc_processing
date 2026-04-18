import { useCallback, useEffect, useState } from 'react';
import {
  getToastMessage,
  notifySuccess,
  notifyDangerSuccess,
  notifyError,
} from '../utils/toast';
import api, { getApiErrorMessage } from '../services/api';
import { getStoredUser } from '../services/auth';
import { USER_ROLES, USER_ROLE_LABELS } from '../constants/domainLabels';
import {
  ConfirmationModal,
  EmptyState,
  Loader,
  PageHeader,
  ListFiltersCard,
  TablePaginationFooter,
  UserRoleBadge,
  AccountStatusBadge,
} from '../ui';
import AdminRoleModal from '../components/AdminRoleModal';
import AdminPasswordModal from '../components/AdminPasswordModal';
import { formatDateTime } from '../utils/formatters';
import './AdminUsers/AdminUsers.css';

const ROLE_OPTIONS = [
  USER_ROLES.AGENT,
  USER_ROLES.CLAIMS_MANAGER,
  USER_ROLES.SUPERVISOR,
  USER_ROLES.ADMIN,
];

const CREATE_USER_INITIAL_FORM = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  role: USER_ROLES.AGENT,
  is_active: true,
};

const CLOSED_MODAL = { isOpen: false, user: null };
const INITIAL_STATUS_MODAL = { isOpen: false, user: null, nextIsActive: true };

const getFirstErrorMessage = (errorValue) => {
  if (!errorValue) return null;
  return Array.isArray(errorValue) ? errorValue[0] : errorValue;
};

function AdminUsers() {
  const currentUserId = Number(getStoredUser()?.id || 0);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState({
    page: 1,
    perPage: 10,
    search: '',
    role: '',
    status: '',
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
  });

  const [createForm, setCreateForm] = useState(CREATE_USER_INITIAL_FORM);
  const [createErrors, setCreateErrors] = useState({});
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Modal state for role changes.
  const [roleModal, setRoleModal] = useState(CLOSED_MODAL);
  const [roleModalBusy, setRoleModalBusy] = useState(false);

  // Modal state for admin password reset.
  const [passwordModal, setPasswordModal] = useState(CLOSED_MODAL);
  const [passwordModalBusy, setPasswordModalBusy] = useState(false);
  const [passwordModalServerErrors, setPasswordModalServerErrors] = useState({});

  // Modal state for account activation / deactivation.
  const [statusModal, setStatusModal] = useState(INITIAL_STATUS_MODAL);
  const [statusModalBusy, setStatusModalBusy] = useState(false);

  // Loads the current page of users using the active filters.
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setListError(null);

    try {
      const params = { page: query.page, per_page: query.perPage };
      if (query.search) params.search = query.search;
      if (query.role) params.role = query.role;
      if (query.status) params.status = query.status;

      const response = await api.get('/admin/users', { params });
      const payload = response.data || {};
      const list = Array.isArray(payload.data) ? payload.data : [];

      setUsers(list);
      setPagination({
        currentPage: Number(payload.current_page || 1),
        lastPage: Number(payload.last_page || 1),
        total: Number(payload.total || list.length),
      });
    } catch (err) {
      const message = getApiErrorMessage(err, 'Failed to load users. Please try again.');
      setListError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  }, [query.page, query.perPage, query.role, query.search, query.status]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers, reloadToken]);

  const refreshUsers = () => setReloadToken((prev) => prev + 1);

  // Create form helpers.
  const setCreateField = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    if (createErrors[field]) {
      setCreateErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateCreateForm = () => {
    const formErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!createForm.name.trim()) formErrors.name = 'Name is required.';

    if (!createForm.email.trim()) {
      formErrors.email = 'Email is required.';
    } else if (!emailRegex.test(createForm.email.trim())) {
      formErrors.email = 'Please enter a valid email address.';
    }

    if (!createForm.password) {
      formErrors.password = 'Password is required.';
    } else if (createForm.password.length < 8) {
      formErrors.password = 'Password must be at least 8 characters.';
    }

    if (!createForm.password_confirmation) {
      formErrors.password_confirmation = 'Password confirmation is required.';
    } else if (createForm.password !== createForm.password_confirmation) {
      formErrors.password_confirmation = 'Password confirmation does not match.';
    }

    if (!ROLE_OPTIONS.includes(createForm.role)) {
      formErrors.role = 'Please choose a valid role.';
    }

    setCreateErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    if (!validateCreateForm()) return;

    setIsCreatingUser(true);

    try {
      const payload = {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        password_confirmation: createForm.password_confirmation,
        role: createForm.role,
        is_active: Boolean(createForm.is_active),
      };

      const response = await api.post('/admin/users', payload);

      notifySuccess(getToastMessage(response, 'User created successfully.'));
      setCreateForm(CREATE_USER_INITIAL_FORM);
      setCreateErrors({});

      if (query.page === 1) {
        refreshUsers();
      } else {
        setQuery((prev) => ({ ...prev, page: 1 }));
      }
    } catch (err) {
      setCreateErrors(err.response?.data?.errors || {});
      notifyError(getApiErrorMessage(err, 'Failed to create user. Please try again.'));
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Filters and pagination stay local to this page.
  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setQuery((prev) => ({ ...prev, page: 1, search: searchInput.trim() }));
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setQuery((prev) => ({ ...prev, page: 1, search: '', role: '', status: '' }));
  };

  const handleRoleFilterChange = (event) => {
    setQuery((prev) => ({ ...prev, page: 1, role: event.target.value }));
  };

  const handleStatusFilterChange = (event) => {
    setQuery((prev) => ({ ...prev, page: 1, status: event.target.value }));
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.lastPage || nextPage === query.page) {
      return;
    }

    setQuery((prev) => ({ ...prev, page: nextPage }));
  };

  const hasActiveFilters = Boolean(query.search || query.role || query.status);

  // Role modal flow.
  const openRoleModal = (user) => {
    setRoleModal({ isOpen: true, user });
  };

  const closeRoleModal = () => {
    if (roleModalBusy) return;
    setRoleModal(CLOSED_MODAL);
  };

  const handleConfirmRoleChange = async (newRole) => {
    const target = roleModal.user;
    if (!target || newRole === target.role || roleModalBusy) return;

    setRoleModalBusy(true);

    try {
      const response = await api.patch(`/admin/users/${target.id}/role`, { role: newRole });
      notifySuccess(getToastMessage(response, 'Role updated successfully.'));
      setRoleModal(CLOSED_MODAL);
      refreshUsers();
    } catch (err) {
      notifyError(getApiErrorMessage(err, 'Failed to update role.'));
    } finally {
      setRoleModalBusy(false);
    }
  };

  // Password reset flow stays modal-driven and server-validation aware.
  const openPasswordModal = (user) => {
    setPasswordModalServerErrors({});
    setPasswordModal({ isOpen: true, user });
  };

  const closePasswordModal = () => {
    if (passwordModalBusy) return;
    setPasswordModal(CLOSED_MODAL);
    setPasswordModalServerErrors({});
  };

  const handleConfirmPasswordReset = async (password, passwordConfirmation) => {
    const target = passwordModal.user;
    if (!target || passwordModalBusy) return;

    setPasswordModalBusy(true);
    setPasswordModalServerErrors({});

    try {
      const response = await api.patch(`/admin/users/${target.id}/password`, {
        password,
        password_confirmation: passwordConfirmation,
      });

      notifySuccess(getToastMessage(response, 'Password reset successfully.'));
      setPasswordModal(CLOSED_MODAL);
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && typeof serverErrors === 'object') {
        setPasswordModalServerErrors(serverErrors);
      } else {
        notifyError(getApiErrorMessage(err, 'Failed to reset password.'));
      }
    } finally {
      setPasswordModalBusy(false);
    }
  };

  // Status changes use semantic toasts: activate = green, deactivate = danger-success.
  const openStatusModal = (user) => {
    setStatusModal({ isOpen: true, user, nextIsActive: !user.is_active });
  };

  const closeStatusModal = () => {
    if (statusModalBusy) return;
    setStatusModal(INITIAL_STATUS_MODAL);
  };

  const handleConfirmStatusChange = async () => {
    const target = statusModal.user;
    if (!target) return;

    setStatusModalBusy(true);

    try {
      const response = await api.patch(`/admin/users/${target.id}/status`, {
        is_active: statusModal.nextIsActive,
      });

      const successMessage = getToastMessage(
        response,
        statusModal.nextIsActive
          ? 'User activated successfully.'
          : 'User deactivated successfully.'
      );

      if (statusModal.nextIsActive) {
        notifySuccess(successMessage);
      } else {
        notifyDangerSuccess(successMessage);
      }

      setStatusModal(INITIAL_STATUS_MODAL);
      refreshUsers();
    } catch (err) {
      notifyError(getApiErrorMessage(err, 'Failed to update status.'));
    } finally {
      setStatusModalBusy(false);
    }
  };

  const statusModalTitle = statusModal.nextIsActive ? 'Activate User' : 'Deactivate User';
  const statusModalConfirmLabel = statusModal.nextIsActive ? 'Activate' : 'Deactivate';
  const statusModalVariant = statusModal.nextIsActive ? 'success' : 'danger';
  const statusModalMessage = statusModal.user
    ? statusModal.nextIsActive
      ? `Activate ${statusModal.user.name}'s account? They will be able to log in again immediately.`
      : `Deactivate ${statusModal.user.name}'s account? If they are currently connected, they will be logged out.`
    : '';

  return (
    <div className="container py-4 admin-users-page">
      <PageHeader
        icon="bi-people"
        title="User Management"
        subtitle="Manage platform users, role assignments, and account activation status."
      />

      <div className="card mb-4 admin-users-create-card" id="admin-users-create-form">
        <div className="card-header">
          <h6 className="mb-0 d-flex align-items-center">
            <i className="bi bi-person-plus me-2"></i>
            Create User
          </h6>
        </div>

        <div className="card-body">
          <form onSubmit={handleCreateUser} noValidate>
            <p className="text-muted mb-3 admin-users-create-lead">
              Add a platform user account with the appropriate role and activation state.
            </p>

            <div className="row g-3 admin-users-create-grid">
              <div className="col-md-6">
                <label htmlFor="newUserName" className="form-label">Name</label>
                <input
                  id="newUserName"
                  type="text"
                  className={`form-control ${getFirstErrorMessage(createErrors.name) ? 'is-invalid' : ''}`}
                  value={createForm.name}
                  onChange={(event) => setCreateField('name', event.target.value)}
                  disabled={isCreatingUser}
                />
                {getFirstErrorMessage(createErrors.name) && (
                  <div className="invalid-feedback">{getFirstErrorMessage(createErrors.name)}</div>
                )}
              </div>

              <div className="col-md-6">
                <label htmlFor="newUserEmail" className="form-label">Email</label>
                <input
                  id="newUserEmail"
                  type="email"
                  className={`form-control ${getFirstErrorMessage(createErrors.email) ? 'is-invalid' : ''}`}
                  value={createForm.email}
                  onChange={(event) => setCreateField('email', event.target.value)}
                  disabled={isCreatingUser}
                />
                {getFirstErrorMessage(createErrors.email) && (
                  <div className="invalid-feedback">{getFirstErrorMessage(createErrors.email)}</div>
                )}
              </div>

              <div className="col-md-4">
                <label htmlFor="newUserRole" className="form-label">Role</label>
                <select
                  id="newUserRole"
                  className={`form-select ${getFirstErrorMessage(createErrors.role) ? 'is-invalid' : ''}`}
                  value={createForm.role}
                  onChange={(event) => setCreateField('role', event.target.value)}
                  disabled={isCreatingUser}
                >
                  {ROLE_OPTIONS.map((roleValue) => (
                    <option key={roleValue} value={roleValue}>
                      {USER_ROLE_LABELS[roleValue]}
                    </option>
                  ))}
                </select>
                {getFirstErrorMessage(createErrors.role) && (
                  <div className="invalid-feedback">{getFirstErrorMessage(createErrors.role)}</div>
                )}
              </div>

              <div className="col-md-4">
                <label htmlFor="newUserPassword" className="form-label">Password</label>
                <input
                  id="newUserPassword"
                  type="password"
                  className={`form-control ${getFirstErrorMessage(createErrors.password) ? 'is-invalid' : ''}`}
                  value={createForm.password}
                  onChange={(event) => setCreateField('password', event.target.value)}
                  disabled={isCreatingUser}
                />
                {getFirstErrorMessage(createErrors.password) && (
                  <div className="invalid-feedback">{getFirstErrorMessage(createErrors.password)}</div>
                )}
              </div>

              <div className="col-md-4">
                <label htmlFor="newUserPasswordConfirmation" className="form-label">Confirm Password</label>
                <input
                  id="newUserPasswordConfirmation"
                  type="password"
                  className={`form-control ${getFirstErrorMessage(createErrors.password_confirmation) ? 'is-invalid' : ''}`}
                  value={createForm.password_confirmation}
                  onChange={(event) => setCreateField('password_confirmation', event.target.value)}
                  disabled={isCreatingUser}
                />
                {getFirstErrorMessage(createErrors.password_confirmation) && (
                  <div className="invalid-feedback">{getFirstErrorMessage(createErrors.password_confirmation)}</div>
                )}
              </div>
            </div>

            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mt-4 admin-users-create-footer">
              <div className="form-check form-switch m-0">
                <input
                  id="newUserActive"
                  type="checkbox"
                  className="form-check-input"
                  checked={Boolean(createForm.is_active)}
                  onChange={(event) => setCreateField('is_active', event.target.checked)}
                  disabled={isCreatingUser}
                />
                <label className="form-check-label" htmlFor="newUserActive">
                  Account active
                </label>
              </div>

              <button type="submit" className="btn btn-primary" disabled={isCreatingUser}>
                {isCreatingUser ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle me-2"></i>
                    Create User
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ListFiltersCard className="admin-users-filters-card">
        <form className="row g-3 align-items-end enterprise-filters-form" onSubmit={handleSearchSubmit}>
          <div className="col-12 col-lg-5">
            <label htmlFor="userSearch" className="form-label mb-1">Search</label>
            <input
              id="userSearch"
              type="text"
              className="form-control"
              placeholder="Search by name or email"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              disabled={loading}
            />
          </div>

          <div className="col-12 col-md-6 col-lg-2">
            <label htmlFor="roleFilter" className="form-label mb-1">Role</label>
            <select
              id="roleFilter"
              className="form-select"
              value={query.role}
              onChange={handleRoleFilterChange}
              disabled={loading}
            >
              <option value="">All Roles</option>
              {ROLE_OPTIONS.map((roleValue) => (
                <option key={roleValue} value={roleValue}>
                  {USER_ROLE_LABELS[roleValue]}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-6 col-lg-2">
            <label htmlFor="statusFilter" className="form-label mb-1">Status</label>
            <select
              id="statusFilter"
              className="form-select"
              value={query.status}
              onChange={handleStatusFilterChange}
              disabled={loading}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="col-12 col-md-6 col-lg-3 d-flex gap-2 enterprise-filters-actions">
            <button type="submit" className="btn btn-primary flex-grow-1" disabled={loading}>
              <i className="bi bi-search" aria-hidden="true"></i>
              Search
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleResetFilters}
              disabled={loading || !hasActiveFilters}
            >
              Reset
            </button>
          </div>
        </form>
      </ListFiltersCard>

      <div className="card">
        {loading && users.length === 0 ? (
          <div className="card-body">
            <Loader message="Loading users..." size="md" />
          </div>
        ) : users.length === 0 ? (
          <div className="card-body">
            {listError ? (
              <EmptyState
                icon="exclamation-triangle"
                title="Unable to Load Users"
                description={listError}
              />
            ) : (
              <EmptyState
                icon="people"
                title="No Users Found"
                description="No user matches the current search and filter criteria."
              />
            )}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0 align-middle admin-users-table">
                <colgroup>
                  <col className="admin-users-col--name" />
                  <col className="admin-users-col--email" />
                  <col className="admin-users-col--role" />
                  <col className="admin-users-col--status" />
                  <col className="admin-users-col--created" />
                  <col className="admin-users-col--actions" />
                </colgroup>

                <thead className="table-light">
                  <tr>
                    <th scope="col" className="admin-users-head-name">Name</th>
                    <th scope="col" className="admin-users-head-email">Email</th>
                    <th scope="col" className="admin-users-head-role">Role</th>
                    <th scope="col" className="admin-users-head-status">Status</th>
                    <th scope="col" className="admin-users-head-created">Created</th>
                    <th scope="col" className="admin-users-head-actions">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => {
                    const isSelf = Number(user.id) === currentUserId;
                    const canDeactivate = !(isSelf && user.is_active);

                    return (
                      <tr key={user.id}>
                        <td className="fw-semibold admin-users-name-cell">{user.name || '-'}</td>
                        <td className="admin-users-email-cell">{user.email || '-'}</td>
                        <td className="admin-users-role-cell">
                          <UserRoleBadge role={user.role} className="admin-users-role-badge" />
                        </td>
                        <td className="admin-users-status-cell">
                          <AccountStatusBadge isActive={user.is_active} className="admin-users-status-badge" />
                        </td>
                        <td className="cell-date admin-users-created-cell">{formatDateTime(user.created_at)}</td>
                        <td className="cell-actions admin-users-actions-cell">
                          <div className="user-action-group">
                            <button
                              type="button"
                              className="user-action-btn"
                              onClick={() => openRoleModal(user)}
                              title={`Change role for ${user.name}`}
                              aria-label={`Change role for ${user.name}`}
                            >
                              <i className="bi bi-pencil" aria-hidden="true" />
                            </button>

                            <button
                              type="button"
                              className="user-action-btn"
                              onClick={() => openPasswordModal(user)}
                              title={`Reset password for ${user.name}`}
                              aria-label={`Reset password for ${user.name}`}
                            >
                              <i className="bi bi-arrow-clockwise" aria-hidden="true" />
                            </button>

                            <button
                              type="button"
                              className="user-action-btn"
                              onClick={() => openStatusModal(user)}
                              disabled={!canDeactivate}
                              title={
                                !canDeactivate
                                  ? 'You cannot deactivate your own account.'
                                  : user.is_active
                                    ? `Deactivate ${user.name}`
                                    : `Activate ${user.name}`
                              }
                              aria-label={
                                user.is_active
                                  ? `Deactivate ${user.name}`
                                  : `Activate ${user.name}`
                              }
                            >
                              {user.is_active ? (
                                <i className="bi bi-toggle-on" aria-hidden="true" />
                              ) : (
                                <i className="bi bi-toggle-off" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <TablePaginationFooter
              currentPage={pagination.currentPage}
              lastPage={pagination.lastPage}
              total={pagination.total}
              summaryLabel="users"
              onPageChange={handlePageChange}
              disabled={loading}
            />
          </>
        )}
      </div>

      <AdminRoleModal
        isOpen={roleModal.isOpen}
        user={roleModal.user}
        onClose={closeRoleModal}
        onConfirm={handleConfirmRoleChange}
        isBusy={roleModalBusy}
      />

      <AdminPasswordModal
        isOpen={passwordModal.isOpen}
        user={passwordModal.user}
        onClose={closePasswordModal}
        onConfirm={handleConfirmPasswordReset}
        isBusy={passwordModalBusy}
        serverErrors={passwordModalServerErrors}
      />

      <ConfirmationModal
        isOpen={statusModal.isOpen}
        title={statusModalTitle}
        message={statusModalMessage}
        confirmLabel={statusModalConfirmLabel}
        confirmingLabel="Applying..."
        confirmVariant={statusModalVariant}
        isConfirming={statusModalBusy}
        onCancel={closeStatusModal}
        onConfirm={handleConfirmStatusChange}
      />
    </div>
  );
}

export default AdminUsers;