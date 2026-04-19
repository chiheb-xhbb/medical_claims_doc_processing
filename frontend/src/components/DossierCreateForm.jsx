import { useState, useId, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { ErrorAlert } from '../ui';
import '../pages/DossierCreate/DossierCreate.css';

function DossierCreateForm({ onCancel, onSuccess, onBusyChange }) {
  const { t } = useTranslation();
  const baseId = useId();
  const assuredId = `${baseId}-assured`;
  const episodeId = `${baseId}-episode`;
  const notesId = `${baseId}-notes`;

  const [assuredIdentifier, setAssuredIdentifier] = useState('');
  const [episodeDescription, setEpisodeDescription] = useState('');
  const [notes, setNotes] = useState('');

  const [validationErrors, setValidationErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    onBusyChange?.(submitting);
  }, [submitting, onBusyChange]);

  const validateForm = () => {
    const formErrors = {};
    const normalizedIdentifier = assuredIdentifier.trim();

    if (!normalizedIdentifier) {
      formErrors.assured_identifier = t('dossierCreate.assuredRequired');
    } else if (normalizedIdentifier.length !== 8) {
      formErrors.assured_identifier = t('dossierCreate.assuredLength');
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
        onSuccess?.(createdDossier.id);
        return;
      }

      onSuccess?.(null);
    } catch (err) {
      if (err.response?.status === 422) {
        const backendErrors = err.response?.data?.errors || {};
        const firstError = Object.values(backendErrors)[0];

        if (firstError) {
          setError(Array.isArray(firstError) ? firstError[0] : firstError);
        } else {
          setError(err.response?.data?.message || t('dossierCreate.validationFailed'));
        }
      } else {
        setError(err.response?.data?.message || t('dossierCreate.createFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dossier-create-form">
      {error && (
        <div className="mb-4">
          <ErrorAlert message={error} title="" />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor={assuredId} className="form-label">
            {t('dossierCreate.assuredIdentifier')} <span className="text-danger">*</span>
          </label>
          <input
            id={assuredId}
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
            placeholder={t('dossierCreate.assuredPlaceholder')}
            disabled={submitting}
          />
          {validationErrors.assured_identifier && (
            <div className="invalid-feedback">{validationErrors.assured_identifier}</div>
          )}
          <small className="text-muted">{t('dossierCreate.assuredHint')}</small>
        </div>

        <div className="mb-4">
          <label htmlFor={episodeId} className="form-label">
            {t('dossierCreate.episodeDescription')}
          </label>
          <textarea
            id={episodeId}
            className="form-control"
            rows={3}
            value={episodeDescription}
            onChange={(event) => setEpisodeDescription(event.target.value)}
            placeholder={t('dossierCreate.episodePlaceholder')}
            disabled={submitting}
          />
        </div>

        <div className="mb-4">
          <label htmlFor={notesId} className="form-label">
            {t('dossierCreate.notes')}
          </label>
          <textarea
            id={notesId}
            className="form-control"
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t('dossierCreate.notesPlaceholder')}
            disabled={submitting}
          />
        </div>

        <div className="d-flex justify-content-end gap-2 pt-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            {t('actions.cancel')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                {t('dossierCreate.creating')}
              </>
            ) : (
              <>
                <i className="bi bi-check2-circle me-2"></i>
                {t('dossierCreate.createCaseFile')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DossierCreateForm;
