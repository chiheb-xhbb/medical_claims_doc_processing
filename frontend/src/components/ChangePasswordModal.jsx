import { useState } from 'react';
import { changePassword } from '../services/auth';
import WorkspaceModalShell from './WorkspaceModalShell';

const EMPTY_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const getFirst = (v) => (Array.isArray(v) ? v[0] : v) || null;

function ChangePasswordModal({ isOpen, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
    if (globalError) setGlobalError(null);
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
  };

  const validate = () => {
    const errors = {};

    if (!form.currentPassword) {
      errors.currentPassword = 'Current password is required.';
    }

    if (!form.newPassword) {
      errors.newPassword = 'New password is required.';
    } else if (form.newPassword.length < 8) {
      errors.newPassword = 'New password must be at least 8 characters.';
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password.';
    } else if (form.confirmPassword !== form.newPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setBusy(true);
    setGlobalError(null);

    try {
      await changePassword(form.currentPassword, form.newPassword, form.confirmPassword);
      setSuccess(true);
      setForm(EMPTY_FORM);
      setFieldErrors({});
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && typeof serverErrors === 'object') {
        setFieldErrors({
          currentPassword: getFirst(serverErrors.current_password),
          newPassword: getFirst(serverErrors.password),
          confirmPassword: getFirst(serverErrors.password_confirmation),
        });
      } else {
        setGlobalError(
          err.response?.data?.message || 'Something went wrong. Please try again.'
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (busy) return;
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setGlobalError(null);
    setSuccess(false);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    onClose?.();
  };

  return (
    <WorkspaceModalShell
      isOpen={isOpen}
      title="Change Password"
      iconClass="bi-shield-lock"
      onClose={handleClose}
      isBusy={busy}
      size="sm"
    >
      {success ? (
        <div className="chpw-success">
          <div className="chpw-success__icon" aria-hidden="true">
            <i className="bi bi-check-circle-fill" />
          </div>
          <p className="chpw-success__title">Password updated</p>
          <p className="chpw-success__sub">Your password has been changed successfully.</p>
          <button className="btn btn-primary mt-3" onClick={handleClose}>
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="chpw-form">
          {globalError && (
            <div className="chpw-global-error" role="alert">
              <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
              {globalError}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="chpw-current" className="form-label">
              Current password
            </label>
            <div className="position-relative">
              <input
                id="chpw-current"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                className={`form-control pe-5${fieldErrors.currentPassword ? ' is-invalid' : ''}`}
                value={form.currentPassword}
                onChange={(e) => setField('currentPassword', e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted text-decoration-none shadow-none border-0 p-2"
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
                title={showCurrent ? 'Hide password' : 'Show password'}
                disabled={busy}
              >
                <i className={`bi ${showCurrent ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
              </button>
            </div>
            {fieldErrors.currentPassword && (
              <div className="invalid-feedback d-block">{fieldErrors.currentPassword}</div>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="chpw-new" className="form-label">
              New password
            </label>
            <div className="position-relative">
              <input
                id="chpw-new"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                className={`form-control pe-5${fieldErrors.newPassword ? ' is-invalid' : ''}`}
                value={form.newPassword}
                onChange={(e) => setField('newPassword', e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted text-decoration-none shadow-none border-0 p-2"
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? 'Hide password' : 'Show password'}
                title={showNew ? 'Hide password' : 'Show password'}
                disabled={busy}
              >
                <i className={`bi ${showNew ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
              </button>
            </div>
            {fieldErrors.newPassword && (
              <div className="invalid-feedback d-block">{fieldErrors.newPassword}</div>
            )}
            <div className="form-text mt-1">Minimum 8 characters.</div>
          </div>

          <div className="mb-5">
            <label htmlFor="chpw-confirm" className="form-label">
              Confirm new password
            </label>
            <div className="position-relative">
              <input
                id="chpw-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                className={`form-control pe-5${fieldErrors.confirmPassword ? ' is-invalid' : ''}`}
                value={form.confirmPassword}
                onChange={(e) => setField('confirmPassword', e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted text-decoration-none shadow-none border-0 p-2"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                title={showConfirm ? 'Hide password' : 'Show password'}
                disabled={busy}
              >
                <i className={`bi ${showConfirm ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <div className="invalid-feedback d-block">{fieldErrors.confirmPassword}</div>
            )}
          </div>

          <div className="chpw-form-footer">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? (
                <>
                  <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-shield-check" aria-hidden="true" />
                  Update password
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </WorkspaceModalShell>
  );
}

export default ChangePasswordModal;
