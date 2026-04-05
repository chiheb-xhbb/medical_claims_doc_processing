import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getApiErrorMessage } from '../services/api';
import { getStoredUser } from '../services/auth';
import { ConfirmationModal, EmptyState, Loader } from '../ui';
import './AdminUsers/AdminUsers.css';

const ROLE_OPTIONS = ['AGENT', 'GESTIONNAIRE', 'ADMIN'];

const ROLE_LABELS = {
  AGENT: 'Agent',
  GESTIONNAIRE: 'Gestionnaire',
  ADMIN: 'Admin'
};

const CREATE_USER_INITIAL_FORM = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  role: 'AGENT',
  is_active: true
};

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString();
};

const getFirstErrorMessage = (errorValue) => {
  if (!errorValue) {
    return null;
  }

  return Array.isArray(errorValue) ? errorValue[0] : errorValue;
};

const getRoleBadgeClass = (role) => {
  if (role === 'ADMIN') {
    return 'bg-primary-subtle text-primary-emphasis';
  }

  if (role === 'GESTIONNAIRE') {
    return 'bg-warning-subtle text-warning-emphasis';
  }

  return 'bg-info-subtle text-info-emphasis';
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
    status: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0
  });

  const [createForm, setCreateForm] = useState(CREATE_USER_INITIAL_FORM);
  const [createErrors, setCreateErrors] = useState({});
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const [roleDrafts, setRoleDrafts] = useState({});
  const [updatingRoleIds, setUpdatingRoleIds] = useState([]);
  const [updatingStatusIds, setUpdatingStatusIds] = useState([]);

  const [statusModalState, setStatusModalState] = useState({
    isOpen: false,
    user: null,
    nextIsActive: true
  });
  const [isConfirmingStatus, setIsConfirmingStatus] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setListError(null);

    try {
      const params = {
        page: query.page,
        per_page: query.perPage
      };

      if (query.search) {
        params.search = query.search;
      }

      if (query.role) {
        params.role = query.role;
      }

      if (query.status) {
        params.status = query.status;
      }

      const response = await api.get('/admin/users', { params });
      const payload = response.data || {};
      const list = Array.isArray(payload.data) ? payload.data : [];

      setUsers(list);
      setPagination({
        currentPage: Number(payload.current_page || 1),
        lastPage: Number(payload.last_page || 1),
        total: Number(payload.total || list.length)
      });
      setRoleDrafts(() => {
        const nextDrafts = {};
        list.forEach((user) => {
          nextDrafts[user.id] = user.role;
        });
        return nextDrafts;
      });
    } catch (err) {
      const message = getApiErrorMessage(err, 'Failed to load users. Please try again.');
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [query.page, query.perPage, query.role, query.search, query.status]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers, reloadToken]);

  const refreshUsers = () => {
    setReloadToken((prev) => prev + 1);
  };

  const setCreateField = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));

    if (createErrors[field]) {
      setCreateErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateCreateForm = () => {
    const formErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!createForm.name.trim()) {
      formErrors.name = 'Name is required.';
    }

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

    if (!validateCreateForm()) {
      return;
    }

    try {
      setIsCreatingUser(true);

      const payload = {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        password_confirmation: createForm.password_confirmation,
        role: createForm.role,
        is_active: Boolean(createForm.is_active)
      };

      const response = await api.post('/admin/users', payload);
      const backendMessage = response.data?.message || 'User created successfully.';

      setCreateForm(CREATE_USER_INITIAL_FORM);
      setCreateErrors({});
      toast.success(backendMessage);

      if (query.page === 1) {
        refreshUsers();
      } else {
        setQuery((prev) => ({ ...prev, page: 1 }));
      }
    } catch (err) {
      setCreateErrors(err.response?.data?.errors || {});
      toast.error(getApiErrorMessage(err, 'Failed to create user. Please try again.'));
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setQuery((prev) => ({
      ...prev,
      page: 1,
      search: searchInput.trim()
    }));
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setQuery((prev) => ({
      ...prev,
      page: 1,
      search: '',
      role: '',
      status: ''
    }));
  };

  const handleRoleFilterChange = (event) => {
    const nextRole = event.target.value;
    setQuery((prev) => ({
      ...prev,
      page: 1,
      role: nextRole
    }));
  };

  const handleStatusFilterChange = (event) => {
    const nextStatus = event.target.value;
    setQuery((prev) => ({
      ...prev,
      page: 1,
      status: nextStatus
    }));
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.lastPage || nextPage === query.page) {
      return;
    }

    setQuery((prev) => ({
      ...prev,
      page: nextPage
    }));
  };

  const handleRoleDraftChange = (userId, nextRole) => {
    setRoleDrafts((prev) => ({
      ...prev,
      [userId]: nextRole
    }));
  };

  const handleUpdateRole = async (user) => {
    const nextRole = roleDrafts[user.id] || user.role;
    if (!nextRole || nextRole === user.role) {
      return;
    }

    setUpdatingRoleIds((prev) => [...prev, user.id]);

    try {
      const response = await api.patch(`/admin/users/${user.id}/role`, { role: nextRole });
      toast.success(response.data?.message || 'User role updated successfully.');
      refreshUsers();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update user role.'));
    } finally {
      setUpdatingRoleIds((prev) => prev.filter((id) => id !== user.id));
    }
  };

  const openStatusModal = (user) => {
    setStatusModalState({
      isOpen: true,
      user,
      nextIsActive: !user.is_active
    });
  };

  const closeStatusModal = () => {
    if (isConfirmingStatus) {
      return;
    }

    setStatusModalState({
      isOpen: false,
      user: null,
      nextIsActive: true
    });
  };

  const handleConfirmStatusChange = async () => {
    const targetUser = statusModalState.user;
    if (!targetUser) {
      return;
    }

    setIsConfirmingStatus(true);
    setUpdatingStatusIds((prev) => [...prev, targetUser.id]);

    try {
      const response = await api.patch(`/admin/users/${targetUser.id}/status`, {
        is_active: statusModalState.nextIsActive
      });

      toast.success(response.data?.message || 'User status updated successfully.');
      setStatusModalState({
        isOpen: false,
        user: null,
        nextIsActive: true
      });
      refreshUsers();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update user status.'));
    } finally {
      setIsConfirmingStatus(false);
      setUpdatingStatusIds((prev) => prev.filter((id) => id !== targetUser.id));
    }
  };

  const hasActiveFilters = Boolean(query.search || query.role || query.status);
  const statusModalTitle = statusModalState.nextIsActive ? 'Activate User' : 'Deactivate User';
  const statusModalConfirmLabel = statusModalState.nextIsActive ? 'Activate' : 'Deactivate';
  const statusModalVariant = statusModalState.nextIsActive ? 'success' : 'danger';
  const statusModalMessage = statusModalState.user
    ? statusModalState.nextIsActive
      ? `Activate ${statusModalState.user.name}'s account? They will be able to log in again immediately.`
      : `Deactivate ${statusModalState.user.name}'s account? If they are currently connected, they will be logged out.`
    : '';

  return (
    <div className="container py-4 admin-users-page">
      <div className="mb-4">
        <h2 className="mb-1 page-title d-flex align-items-center">
          <i className="bi bi-people me-2 opacity-75"></i>
          User Management
        </h2>
        <p className="text-muted mb-0">
          Manage platform users, account roles, and account activation status.
        </p>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0 d-flex align-items-center">
            <i className="bi bi-person-plus me-2"></i>
            Create User
          </h6>
        </div>
        <div className="card-body">
          <form onSubmit={handleCreateUser} noValidate>
            <div className="row g-3">
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
                      {ROLE_LABELS[roleValue]}
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

            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mt-4">
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

      <div className="card">
        <div className="card-header admin-users-filters">
          <form className="row g-2 align-items-end w-100 m-0" onSubmit={handleSearchSubmit}>
            <div className="col-md-5">
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

            <div className="col-md-2">
              <label htmlFor="roleFilter" className="form-label mb-1">Role</label>
              <select
                id="roleFilter"
                className="form-select"
                value={query.role}
                onChange={handleRoleFilterChange}
                disabled={loading}
              >
                <option value="">All</option>
                {ROLE_OPTIONS.map((roleValue) => (
                  <option key={roleValue} value={roleValue}>
                    {ROLE_LABELS[roleValue]}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label htmlFor="statusFilter" className="form-label mb-1">Status</label>
              <select
                id="statusFilter"
                className="form-select"
                value={query.status}
                onChange={handleStatusFilterChange}
                disabled={loading}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="col-md-3 d-flex gap-2">
              <button type="submit" className="btn btn-outline-primary flex-grow-1" disabled={loading}>
                <i className="bi bi-search"></i>
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
        </div>

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
              <table className="table table-hover table-striped mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Created</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => {
                    const isUpdatingRole = updatingRoleIds.includes(user.id);
                    const isUpdatingStatus = updatingStatusIds.includes(user.id);
                    const selectedRole = roleDrafts[user.id] || user.role;
                    const roleChanged = selectedRole !== user.role;
                    const isSelf = Number(user.id) === currentUserId;
                    const canDeactivate = !(isSelf && user.is_active);

                    return (
                      <tr key={user.id}>
                        <td className="fw-semibold">{user.name || '-'}</td>
                        <td className="admin-users-email-cell">{user.email || '-'}</td>
                        <td>
                          <span className={`badge ${getRoleBadgeClass(user.role)} admin-users-role-badge`}>
                            {ROLE_LABELS[user.role] || user.role || '-'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${user.is_active ? 'bg-success-subtle text-success-emphasis' : 'bg-danger-subtle text-danger-emphasis'} admin-users-status-badge`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>{formatDateTime(user.created_at)}</td>
                        <td>
                          <div className="admin-users-actions">
                            <div className="input-group input-group-sm">
                              <select
                                className="form-select admin-users-role-select"
                                value={selectedRole}
                                onChange={(event) => handleRoleDraftChange(user.id, event.target.value)}
                                disabled={isUpdatingRole || isUpdatingStatus}
                                aria-label={`Role for ${user.name}`}
                              >
                                {ROLE_OPTIONS.map((roleValue) => (
                                  <option key={roleValue} value={roleValue}>
                                    {ROLE_LABELS[roleValue]}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => handleUpdateRole(user)}
                                disabled={!roleChanged || isUpdatingRole || isUpdatingStatus}
                                type="button"
                              >
                                {isUpdatingRole ? 'Saving...' : 'Save Role'}
                              </button>
                            </div>

                            <button
                              type="button"
                              className={`btn btn-sm ${user.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                              onClick={() => openStatusModal(user)}
                              disabled={isUpdatingRole || isUpdatingStatus || !canDeactivate}
                              title={!canDeactivate ? 'You cannot deactivate your own account.' : undefined}
                            >
                              {isUpdatingStatus
                                ? 'Saving...'
                                : user.is_active
                                  ? 'Deactivate'
                                  : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="card-footer bg-white d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <span className="pagination-info d-inline-flex align-items-center gap-2">
                <i className="bi bi-grid-3x3-gap"></i>
                Page {pagination.currentPage} of {pagination.lastPage} ({pagination.total} total users)
              </span>

              <div className="btn-group pagination-controls">
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1 || loading}
                  type="button"
                >
                  <i className="bi bi-chevron-left me-1"></i>
                  Previous
                </button>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.lastPage || loading}
                  type="button"
                >
                  Next
                  <i className="bi bi-chevron-right ms-1"></i>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmationModal
        isOpen={statusModalState.isOpen}
        title={statusModalTitle}
        message={statusModalMessage}
        confirmLabel={statusModalConfirmLabel}
        confirmingLabel="Applying..."
        confirmVariant={statusModalVariant}
        isConfirming={isConfirmingStatus}
        onCancel={closeStatusModal}
        onConfirm={handleConfirmStatusChange}
      />
    </div>
  );
}

export default AdminUsers;
