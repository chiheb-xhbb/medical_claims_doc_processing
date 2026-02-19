import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth';

function Login() {
  const navigate = useNavigate();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Validation state
  const [validationErrors, setValidationErrors] = useState({});

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Client-side validation
  const validateForm = () => {
    const errors = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      navigate('/documents', { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid credentials. Please check your email and password.');
      } else if (err.response?.status === 422) {
        // Handle Laravel validation errors
        const serverErrors = err.response.data.errors;
        if (serverErrors) {
          const firstError = Object.values(serverErrors)[0];
          setError(Array.isArray(firstError) ? firstError[0] : firstError);
        } else {
          setError(err.response.data.message || 'Validation failed.');
        }
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Connection failed. Please check if the server is running.');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5 col-xl-4">
            <div className="card shadow">
              {/* Header */}
              <div className="card-header bg-primary text-white text-center py-4">
                <h4 className="mb-0 d-flex align-items-center justify-content-center">
                  <i className="bi bi-file-medical me-2"></i>
                  MedDocs
                </h4>
                <small className="opacity-75">Medical Document Processing</small>
              </div>

              {/* Body */}
              <div className="card-body p-4">
                <h5 className="text-center mb-4">Sign In</h5>

                {/* Error Alert */}
                {error && (
                  <div className="alert alert-danger d-flex align-items-center" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <div>{error}</div>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} noValidate>
                  {/* Email Field */}
                  <div className="mb-3">
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
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (validationErrors.email) {
                          setValidationErrors(prev => ({ ...prev, email: null }));
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

                  {/* Password Field */}
                  <div className="mb-4">
                    <label htmlFor="password" className="form-label">
                      <i className="bi bi-lock me-1"></i>
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      className={`form-control ${validationErrors.password ? 'is-invalid' : ''}`}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (validationErrors.password) {
                          setValidationErrors(prev => ({ ...prev, password: null }));
                        }
                      }}
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    {validationErrors.password && (
                      <div className="invalid-feedback">{validationErrors.password}</div>
                    )}
                  </div>

                  {/* Submit Button */}
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
                        Logging in...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-box-arrow-in-right me-2"></i>
                        Login
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Footer */}
              <div className="card-footer bg-white text-center py-3">
                <small className="text-muted">
                  <i className="bi bi-shield-lock me-1"></i>
                  Internal use only - Contact admin for access
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
