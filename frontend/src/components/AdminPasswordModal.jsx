import { useEffect, useState } from 'react';
import WorkspaceModalShell from './WorkspaceModalShell';

const EMPTY_FORM = { password: '', confirmPassword: '' };

const getFirst = (v) => (Array.isArray(v) ? v[0] : v) || null;

function AdminPasswordModal({
  isOpen,
  user,
  onClose,
  onConfirm,
  isBusy,
  serverErrors,
  onClearServerError,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_FORM);
      setFieldErrors({});
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [isOpen]);

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);

    if (field === 'password') {
      onClearServerError?.('password');
    }

    if (field === 'confirmPassword') {
      onClearServerError?.('password_confirmation');
    }
  };

  const validate = () => {
    const errors = {};

    if (!form.password) {
      errors.password = 'New password is required.';
    } else if (form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = 'Please confirm the new password.';
    } else if (form.confirmPassword !== form.password) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate() || isBusy) {
      return;
    }

    onConfirm?.(form.password, form.confirmPassword);
  };

  const handleClose = () => {
    if (isBusy) {
      return;
    }

    onClearServerError?.('password');
    onClearServerError?.('password_confirmation');
    onClose?.();
  };

  const pwError = fieldErrors.password || getFirst(serverErrors?.password);
  const confirmError =
    fieldErrors.confirmPassword || getFirst(serverErrors?.password_confirmation);

  return (
    <WorkspaceModalShell
      isOpen={isOpen}
      title="Reset Password"
      iconClass="bi-key"
      onClose={handleClose}
      isBusy={isBusy}
      size="sm"
    >
      {user && (
        <form onSubmit={handleSubmit} noValidate className="chpw-form">
          <div className="admin-modal-target-user mb-4">
            <span className="admin-modal-target-label">Resetting password for</span>
            <span className="admin-modal-target-name">{user.name}</span>
            <span className="admin-modal-target-email">{user.email}</span>
          </div>

          <div className="mb-4">
            <label htmlFor="admin-pw-new" className="form-label">
              New password
            </label>
            <div className="position-relative">
              <input
                id="admin-pw-new"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                className={`form-control pe-5${pwError ? ' is-invalid' : ''}`}
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                disabled={isBusy}
              />
              <button
                type="button"
                className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted text-decoration-none shadow-none border-0 p-2"
                onClick={() => setShowNew((prev) => !prev)}
                aria-label={showNew ? 'Hide password' : 'Show password'}
                title={showNew ? 'Hide password' : 'Show password'}
                disabled={isBusy}
              >
                <i
                  className={`bi ${showNew ? 'bi-eye-slash' : 'bi-eye'}`}
                  aria-hidden="true"
                />
              </button>
            </div>
            {pwError && <div className="invalid-feedback d-block">{pwError}</div>}
            <div className="form-text mt-1">Minimum 8 characters.</div>
          </div>

          <div className="mb-5">
            <label htmlFor="admin-pw-confirm" className="form-label">
              Confirm new password
            </label>
            <div className="position-relative">
              <input
                id="admin-pw-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                className={`form-control pe-5${confirmError ? ' is-invalid' : ''}`}
                value={form.confirmPassword}
                onChange={(e) => setField('confirmPassword', e.target.value)}
                disabled={isBusy}
              />
              <button
                type="button"
                className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted text-decoration-none shadow-none border-0 p-2"
                onClick={() => setShowConfirm((prev) => !prev)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                title={showConfirm ? 'Hide password' : 'Show password'}
                disabled={isBusy}
              >
                <i
                  className={`bi ${showConfirm ? 'bi-eye-slash' : 'bi-eye'}`}
                  aria-hidden="true"
                />
              </button>
            </div>
            {confirmError && <div className="invalid-feedback d-block">{confirmError}</div>}
          </div>

          <div className="chpw-form-footer">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleClose}
              disabled={isBusy}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isBusy}>
              {isBusy ? (
                <>
                  <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-key" aria-hidden="true" />
                  Reset password
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </WorkspaceModalShell>
  );
}

export default AdminPasswordModal;