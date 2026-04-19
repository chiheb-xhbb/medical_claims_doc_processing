import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resetPassword } from '../services/auth';
import { AUTH_FEEDBACK_KEY } from '../services/api';
import { ErrorAlert, SuccessAlert } from '../ui';
import './ResetPassword/ResetPassword.css';

const LOGIN_SUCCESS_FEEDBACK_PREFIX = 'success:';

function ResetPassword() {
  const { t } = useTranslation();
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
      errors.form = t('auth.resetInvalidLink');
    }

    if (!password) {
      errors.password = t('changePassword.newRequired');
    } else if (password.length < 8) {
      errors.password = t('changePassword.newMinLength');
    }

    if (!passwordConfirmation) {
      errors.passwordConfirmation = t('changePassword.confirmRequired');
    } else if (password !== passwordConfirmation) {
      errors.passwordConfirmation = t('changePassword.confirmMismatch');
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

      setSuccessMessage(t('auth.resetSuccess'));
      setValidationErrors({});

      setTimeout(() => {
        sessionStorage.setItem(
          AUTH_FEEDBACK_KEY,
          `${LOGIN_SUCCESS_FEEDBACK_PREFIX}${t('auth.resetSuccessRedirect')}`
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
        setError(t('login.connectionFailed'));
      } else {
        setError(
          err.response?.data?.message || t('auth.resetFailed')
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
                <h4 className="mb-1">{t('auth.resetTitle')}</h4>
                <small className="text-white">{t('auth.resetSubtitle')}</small>
              </div>

              <div className="card-body p-4 reset-password-card__body">
                {!hasRequiredParams && (
                  <div className="mb-3">
                    <ErrorAlert
                      title=""
                      message={t('auth.resetInvalidLink')}
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
                      {t('login.emailLabel')}
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
                      {t('changePassword.newPassword')}
                    </label>
                    <input
                      type="password"
                      id="password"
                      className={`form-control ${validationErrors.password ? 'is-invalid' : ''}`}
                      placeholder={t('changePassword.newPassword')}
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
                      {t('changePassword.confirmPassword')}
                    </label>
                    <input
                      type="password"
                      id="passwordConfirmation"
                      className={`form-control ${validationErrors.passwordConfirmation ? 'is-invalid' : ''}`}
                      placeholder={t('changePassword.confirmPassword')}
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
                        {t('auth.resetting')}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle me-2"></i>
                        {t('auth.resetPassword')}
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="card-footer bg-white text-center py-3 reset-password-card__footer">
                <Link to="/login" className="text-decoration-none reset-password-card__back-link">
                  <i className="bi bi-arrow-left me-1"></i>
                  {t('auth.backToLogin')}
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