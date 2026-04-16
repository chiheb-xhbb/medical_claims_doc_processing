import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/auth';
import { AUTH_FEEDBACK_KEY } from '../services/api';
import { ErrorAlert, SuccessAlert } from '../ui';
import './ResetPassword/ResetPassword.css';

const LOGIN_SUCCESS_FEEDBACK_PREFIX = 'success:';
const RESET_SUCCESS_MESSAGE = 'Password reset successfully. Redirecting to sign in...';

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const email = useMemo(() => searchParams.get('email') || '', [searchParams]);

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const hasRequiredParams = Boolean(token && email);

  const validateForm = () => {
    const errors = {};

    if (!hasRequiredParams) {
      errors.form = 'This password reset link is invalid or incomplete.';
    }

    if (!password) {
      errors.password = 'New password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }

    if (!passwordConfirmation) {
      errors.passwordConfirmation = 'Password confirmation is required.';
    } else if (password !== passwordConfirmation) {
      errors.passwordConfirmation = 'Password confirmation does not match.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await resetPassword({
        token,
        email,
        password,
        passwordConfirmation,
      });

      setSuccessMessage(RESET_SUCCESS_MESSAGE);
      setValidationErrors({});

      setTimeout(() => {
        sessionStorage.setItem(
          AUTH_FEEDBACK_KEY,
          `${LOGIN_SUCCESS_FEEDBACK_PREFIX}Password reset successfully. You can now sign in.`
        );
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err) {
      if (err.response?.status === 422) {
        const serverErrors = err.response?.data?.errors || {};
        setValidationErrors({
          password: Array.isArray(serverErrors.password) ? serverErrors.password[0] : serverErrors.password,
          passwordConfirmation: Array.isArray(serverErrors.password_confirmation)
            ? serverErrors.password_confirmation[0]
            : serverErrors.password_confirmation,
        });
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Connection failed. Please check if the server is running.');
      } else {
        setError(
          err.response?.data?.message || 'This password reset request is invalid or has expired.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page min-vh-100 d-flex align-items-center justify-content-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5 col-xl-4">
            <div className="card shadow-lg reset-password-card">
              <div className="card-header bg-primary text-white text-center py-4 reset-password-card__header">
                <h4 className="mb-1">Password Reset</h4>
                <small className="text-white">Choose a new password for your account.</small>
              </div>

              <div className="card-body p-4 reset-password-card__body">
                {!hasRequiredParams && (
                  <div className="mb-3">
                    <ErrorAlert
                      title=""
                      message="This password reset link is invalid or incomplete."
                    />
                  </div>
                )}

                {error && (
                  <div className="mb-3">
                    <ErrorAlert title="" message={error} />
                  </div>
                )}

                {successMessage && (
                  <div className="mb-3">
                    <SuccessAlert title="" message={successMessage} />
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      <i className="bi bi-envelope me-1"></i>
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="form-control reset-password-card__readonly-input"
                      value={email}
                      readOnly
                      disabled
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">
                      <i className="bi bi-lock me-1"></i>
                      New Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      className={`form-control ${validationErrors.password ? 'is-invalid' : ''}`}
                      placeholder="Enter your new password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        if (validationErrors.password) {
                          setValidationErrors((prev) => ({ ...prev, password: null }));
                        }
                      }}
                      disabled={loading || !hasRequiredParams}
                      autoComplete="new-password"
                      autoFocus={hasRequiredParams}
                    />
                    {validationErrors.password && (
                      <div className="invalid-feedback">{validationErrors.password}</div>
                    )}
                  </div>

                  <div className="mb-4">
                    <label htmlFor="passwordConfirmation" className="form-label">
                      <i className="bi bi-shield-lock me-1"></i>
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="passwordConfirmation"
                      className={`form-control ${validationErrors.passwordConfirmation ? 'is-invalid' : ''}`}
                      placeholder="Confirm your new password"
                      value={passwordConfirmation}
                      onChange={(event) => {
                        setPasswordConfirmation(event.target.value);
                        if (validationErrors.passwordConfirmation) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            passwordConfirmation: null,
                          }));
                        }
                      }}
                      disabled={loading || !hasRequiredParams}
                      autoComplete="new-password"
                    />
                    {validationErrors.passwordConfirmation && (
                      <div className="invalid-feedback">
                        {validationErrors.passwordConfirmation}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100 py-2"
                    disabled={loading || !hasRequiredParams}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Resetting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle me-2"></i>
                        Reset Password
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="card-footer bg-white text-center py-3 reset-password-card__footer">
                <Link to="/login" className="text-decoration-none reset-password-card__back-link">
                  <i className="bi bi-arrow-left me-1"></i>
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;