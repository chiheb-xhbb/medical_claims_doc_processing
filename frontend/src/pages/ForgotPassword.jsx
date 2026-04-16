import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/auth';
import { ErrorAlert, SuccessAlert } from '../ui';
import './ForgotPassword/ForgotPassword.css';

const GENERIC_SUCCESS_MESSAGE = 'If this email is registered, a password reset link has been sent.';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validateForm = () => {
    const errors = {};

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!isValidEmail(email.trim())) {
      errors.email = 'Please enter a valid email address.';
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
      await forgotPassword(email.trim());
      setSuccessMessage(GENERIC_SUCCESS_MESSAGE);
      setValidationErrors({});
    } catch (err) {
      if (err.response?.status === 422) {
        const serverErrors = err.response?.data?.errors || {};
        const emailError = Array.isArray(serverErrors.email)
          ? serverErrors.email[0]
          : serverErrors.email;

        setValidationErrors((prev) => ({
          ...prev,
          email: emailError || 'Please enter a valid email address.',
        }));
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Connection failed. Please check if the server is running.');
      } else {
        setError('Unable to process your request right now. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page min-vh-100 d-flex align-items-center justify-content-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5 col-xl-4">
            <div className="card shadow-lg forgot-password-card">
              <div className="card-header bg-primary text-white text-center py-4 forgot-password-card__header">
                <h4 className="mb-1">Forgot Password</h4>
                <small className="text-white">Password Recovery</small>
              </div>

              <div className="card-body p-4 forgot-password-card__body">
                <p className="forgot-password-card__helper text-muted text-center mb-4">
                  Enter your account email address and we will send you a password reset link.
                </p>

                {error && (
                  <div className="mb-3">
                    <ErrorAlert message={error} title="" />
                  </div>
                )}

                {successMessage && (
                  <div className="mb-3">
                    <SuccessAlert message={successMessage} title="" />
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-4">
                    <label htmlFor="email" className="form-label">
                      <i className="bi bi-envelope me-1"></i>
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      className={`form-control ${validationErrors.email ? 'is-invalid' : ''}`}
                      placeholder="agent@carte.com.tn"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (validationErrors.email) {
                          setValidationErrors((prev) => ({ ...prev, email: null }));
                        }
                      }}
                      disabled={loading}
                      autoComplete="email"
                      autoFocus
                    />
                    {validationErrors.email && (
                      <div className="invalid-feedback">{validationErrors.email}</div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100 py-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send me-2"></i>
                        Send Reset Link
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="card-footer bg-white text-center py-3 forgot-password-card__footer">
                <Link to="/login" className="text-decoration-none forgot-password-card__back-link">
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

export default ForgotPassword;