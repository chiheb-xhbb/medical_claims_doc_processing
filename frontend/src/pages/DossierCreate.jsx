import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ErrorAlert } from '../ui';
import './DossierCreate/DossierCreate.css';

function DossierCreate() {
  const navigate = useNavigate();

  const [assuredIdentifier, setAssuredIdentifier] = useState('');
  const [episodeDescription, setEpisodeDescription] = useState('');
  const [notes, setNotes] = useState('');

  const [validationErrors, setValidationErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const formErrors = {};
    const normalizedIdentifier = assuredIdentifier.trim();

    if (!normalizedIdentifier) {
      formErrors.assured_identifier = 'Assured identifier is required.';
    } else if (normalizedIdentifier.length !== 8) {
      formErrors.assured_identifier = 'Assured identifier must be exactly 8 characters.';
    }

    setValidationErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        assured_identifier: assuredIdentifier.trim(),
        episode_description: episodeDescription.trim() || null,
        notes: notes.trim() || null
      };

      const response = await api.post('/dossiers', payload);
      const responseData = response.data || {};
      const createdDossier = responseData.dossier || responseData;

      if (createdDossier?.id) {
        navigate(`/dossiers/${createdDossier.id}`);
        return;
      }

      navigate('/dossiers');
    } catch (err) {
      if (err.response?.status === 422) {
        const backendErrors = err.response?.data?.errors || {};
        const firstError = Object.values(backendErrors)[0];

        if (firstError) {
          setError(Array.isArray(firstError) ? firstError[0] : firstError);
        } else {
          setError(err.response?.data?.message || 'Validation failed. Please check your input.');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to create dossier. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5 dossier-create-page">
      <div className="row justify-content-center">
        <div className="col-lg-8 col-xl-7">
          <div className="card shadow-lg">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0 d-flex align-items-center">
                <i className="bi bi-folder-plus me-2"></i>
                Create Dossier
              </h4>
            </div>

            <div className="card-body p-4 p-lg-5">
              {error && (
                <div className="mb-4">
                  <ErrorAlert message={error} title="" />
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-4">
                  <label htmlFor="assuredIdentifier" className="form-label">
                    Assured Identifier <span className="text-danger">*</span>
                  </label>
                  <input
                    id="assuredIdentifier"
                    type="text"
                    className={`form-control ${validationErrors.assured_identifier ? 'is-invalid' : ''}`}
                    value={assuredIdentifier}
                    onChange={(event) => {
                      setAssuredIdentifier(event.target.value);
                      if (validationErrors.assured_identifier) {
                        setValidationErrors((prev) => ({ ...prev, assured_identifier: null }));
                      }
                    }}
                    maxLength={8}
                    placeholder="Ex: AB1234CD"
                    disabled={submitting}
                  />
                  {validationErrors.assured_identifier && (
                    <div className="invalid-feedback">{validationErrors.assured_identifier}</div>
                  )}
                  <small className="text-muted">Exactly 8 characters.</small>
                </div>

                <div className="mb-4">
                  <label htmlFor="episodeDescription" className="form-label">
                    Episode Description
                  </label>
                  <textarea
                    id="episodeDescription"
                    className="form-control"
                    rows={3}
                    value={episodeDescription}
                    onChange={(event) => setEpisodeDescription(event.target.value)}
                    placeholder="Describe the medical episode or context"
                    disabled={submitting}
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="notes" className="form-label">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    className="form-control"
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional internal notes"
                    disabled={submitting}
                  />
                </div>

                <div className="d-flex justify-content-end gap-2 pt-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/dossiers')}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle me-2"></i>
                        Create Dossier
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DossierCreate;
