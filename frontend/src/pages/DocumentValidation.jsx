import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  ConfidenceBadge,
  Loader,
  ErrorAlert,
  SuccessAlert,
  WarningAlert,
  InfoAlert,
  StatusBadge,
} from '../ui';
import './DocumentValidation/DocumentValidation.css';

const FIELD_LABELS = {
  invoice_date: 'Invoice Date',
  provider_name: 'Provider Name',
  total_ttc: 'Total Amount (TTC)',
};

const FIELD_TYPES = {
  invoice_date: 'date',
  provider_name: 'text',
  total_ttc: 'number',
};

const FIELD_ICONS = {
  invoice_date: 'bi-calendar3',
  provider_name: 'bi-building',
  total_ttc: 'bi-currency-euro',
};

const LOW_CONFIDENCE_THRESHOLD = 0.70;

const normalizeDate = (value) => {
  if (!value) return null;

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const clean = raw.replace(/\//g, '-');
  const parts = clean.split('-');

  if (parts.length === 3) {
    const [a, b, c] = parts;

    if (a.length === 2 && c.length === 4) {
      return `${c}-${b}-${a}`;
    }

    if (a.length === 4) {
      return `${a}-${b}-${c}`;
    }
  }

  return null;
};

const formatFileSize = (bytes) => {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

function DocumentValidation() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [document, setDocument] = useState(null);
  const [editedFields, setEditedFields] = useState({});
  const [confidenceScores, setConfidenceScores] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [businessWarnings, setBusinessWarnings] = useState([]);

  const fetchDocument = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/documents/${id}`);
      const doc = response.data;

      setDocument(doc);

      if (doc.latest_extraction) {
        const extraction = doc.latest_extraction;

        const normalizedFields = {
          ...extraction.fields,
          invoice_date: normalizeDate(extraction.fields?.invoice_date),
        };

        setEditedFields(normalizedFields || {});
        setConfidenceScores(extraction.confidence || {});
        setWarnings(extraction.warnings || []);
      } else {
        setEditedFields({});
        setConfidenceScores({});
        setWarnings([]);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Document not found. Please check the document ID and try again.');
      } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        setError('Request timed out. Please check your connection and try again.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Network error. Please check if the server is running.');
      } else {
        setError(err.response?.data?.message || 'Failed to load document. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const handleFieldChange = (fieldKey, value) => {
    setEditedFields((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const handleValidate = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);
      setBusinessWarnings([]);

      const cleanedFields = Object.fromEntries(
        Object.entries(editedFields).map(([key, value]) => [
          key,
          value === '' ? null : value,
        ])
      );

      const response = await api.post(`/documents/${id}/validate`, {
        fields: cleanedFields,
      });

      setBusinessWarnings(response.data?.warnings || []);
      setSuccessMessage('Document validated successfully! The extraction has been confirmed.');

      await fetchDocument();

      setTimeout(() => {
        navigate('/documents');
      }, 2000);
    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'Validation failed. Please check the field values.');
      } else if (err.response?.status === 404) {
        setError('Document not found.');
      } else if (err.response?.status === 422) {
        const data = err.response?.data;
        const errors = data?.errors || {};
        if (errors.total_ttc && Array.isArray(errors.total_ttc) && errors.total_ttc.length > 0) {
          setError(errors.total_ttc[0]);
        } else {
          setError(data?.message || 'Validation failed. Please check the field values.');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to validate document. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLowConfidence = (fieldKey) => {
    const score = confidenceScores[fieldKey];
    return score !== null && score !== undefined && score < LOW_CONFIDENCE_THRESHOLD;
  };

  const isValidated = document?.status?.toUpperCase() === 'VALIDATED';

  if (isLoading) {
    return (
      <div className="container py-5">
        <Loader message="Loading document..." size="lg" />
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <ErrorAlert message={error} title="Error Loading Document" />
          </div>
        </div>
      </div>
    );
  }

  const hasExtraction = document?.latest_extraction && Object.keys(editedFields).length > 0;

  return (
    <div className="container py-4 document-validation">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0 page-title d-flex align-items-center">
          <i className="bi bi-file-earmark-medical me-2 opacity-75"></i>
          Document Validation
        </h2>

        <button
          type="button"
          className="btn btn-outline-primary page-back-btn"
          onClick={() => navigate('/documents')}
        >
          <i className="bi bi-arrow-left" aria-hidden="true"></i>
          Back to Documents
        </button>
      </div>

      {document && (
        <div className="card mb-4 dv-document-header-card">
          <div className="card-header bg-primary text-white dv-document-header-card__header">
            <div className="dv-document-header-card__content">
              <h5 className="mb-1 d-flex align-items-center dv-document-header-card__title">
                <i className="bi bi-file-earmark me-2" aria-hidden="true"></i>
                <span className="text-truncate">{document.original_filename || 'Unnamed document'}</span>
              </h5>

              <div className="dv-document-header-card__meta">
                {formatFileSize(document.file_size) && (
                  <span className="dv-document-header-card__meta-item">
                    <i className="bi bi-hdd" aria-hidden="true"></i>
                    {formatFileSize(document.file_size)}
                  </span>
                )}

                <span className="dv-document-header-card__meta-item">
                  <i className="bi bi-calendar3" aria-hidden="true"></i>
                  {document.created_at
                    ? new Date(document.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </span>
              </div>
            </div>

            <div className="dv-document-header-card__status">
              <StatusBadge status={document.status} context="hero" />
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-4">
          <SuccessAlert message={successMessage} title="Validation Successful" />
        </div>
      )}

      {businessWarnings.length > 0 && (
        <div className="mb-4">
          <WarningAlert warnings={businessWarnings} title="Business Validation Warnings" />
        </div>
      )}

      {error && (
        <div className="mb-4">
          <ErrorAlert message={error} />
        </div>
      )}

      {warnings.length > 0 && (
        <div className="dv-warning-panel mb-4" role="alert">
          <div className="dv-warning-panel__icon-wrap">
            <i className="bi bi-exclamation-triangle-fill"></i>
          </div>
          <div className="dv-warning-panel__body">
            <p className="dv-warning-panel__title">AI Extraction Warnings</p>
            <p className="dv-warning-panel__subtitle">
              The following issues were detected during extraction and may require your review:
            </p>
            <ul className="dv-warning-panel__list">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!hasExtraction && (
        <InfoAlert
          message="No extraction data available for this document. Please wait for processing to complete."
          title="Processing In Progress"
        />
      )}

      {hasExtraction && (
        <div className="card dv-fields-card">

          <div className="dv-fields-card__header">
            <div className="dv-fields-card__header-left">
              <i className="bi bi-table dv-fields-card__header-icon"></i>
              <div>
                <h5 className="dv-fields-card__title">Extracted Fields</h5>
                <p className="dv-fields-card__subtitle">
                  Review and correct the AI-extracted values below before confirming.
                </p>
              </div>
            </div>

            {document?.latest_extraction?.version && (
              <div className="dv-extraction-tag">
                <i className="bi bi-layers"></i>
                <span>v{document.latest_extraction.version}</span>
                {document?.latest_extraction?.meta?.processed_at && (
                  <span className="dv-extraction-tag__date">
                    &mdash; {new Date(document.latest_extraction.meta.processed_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 dv-fields-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Field</th>
                  <th style={{ width: '40%' }}>Value</th>
                  <th className="text-center" style={{ width: '17%' }}>Confidence</th>
                  <th className="text-center" style={{ width: '15%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(FIELD_LABELS).map((fieldKey) => {
                  const lowConfidence = isLowConfidence(fieldKey);
                  const fieldType = FIELD_TYPES[fieldKey];
                  const fieldValue = editedFields[fieldKey];

                  return (
                    <tr
                      key={fieldKey}
                      className={lowConfidence ? 'dv-row--warn' : 'dv-row--ok'}
                    >
                      <td className="dv-field-label">
                        <span className="dv-field-label__inner">
                          <i className={`bi ${FIELD_ICONS[fieldKey]} dv-field-label__icon`}></i>
                          {FIELD_LABELS[fieldKey]}
                        </span>
                      </td>

                      <td className="dv-field-value">
                        <input
                          type={fieldType}
                          className={`form-control dv-field-input${lowConfidence ? ' dv-field-input--warn' : ''}`}
                          value={fieldValue ?? ''}
                          onChange={(e) => {
                            let v = e.target.value;

                            if (fieldType === 'number') {
                              v = v.replace(',', '.');
                              const num = v === '' ? null : Number(v);
                              handleFieldChange(fieldKey, Number.isFinite(num) ? num : null);
                              return;
                            }

                            if (fieldType === 'date') {
                              handleFieldChange(fieldKey, v === '' ? null : v);
                              return;
                            }

                            handleFieldChange(fieldKey, v);
                          }}
                          step={fieldType === 'number' ? '0.01' : undefined}
                          disabled={isValidated}
                        />
                      </td>

                      <td className="text-center dv-field-confidence">
                        <ConfidenceBadge score={confidenceScores[fieldKey]} />
                      </td>

                      <td className="text-center dv-field-status">
                        {lowConfidence ? (
                          <i
                            className="bi bi-exclamation-diamond-fill dv-status-icon dv-status-icon--warn"
                            title="Low confidence — please review this field"
                          ></i>
                        ) : (
                          <i
                            className="bi bi-patch-check-fill dv-status-icon dv-status-icon--ok"
                            title="High confidence"
                          ></i>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="dv-action-bar">
            <div className="dv-action-bar__context">
              {isValidated ? (
                <span className="dv-action-bar__note dv-action-bar__note--validated">
                  <i className="bi bi-shield-check"></i>
                  This document has been validated and is now read-only.
                </span>
              ) : (
                <span className="dv-action-bar__note">
                  <i className="bi bi-info-circle"></i>
                  Confirm all field values are correct before submitting.
                </span>
              )}
            </div>

            <button
              type="button"
              className={`btn btn-lg dv-validate-btn${isValidated ? ' btn-success' : ' btn-primary'}`}
              onClick={handleValidate}
              disabled={isSubmitting || isValidated}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Validating...
                </>
              ) : isValidated ? (
                <>
                  <i className="bi bi-shield-check"></i>
                  Document Validated
                </>
              ) : (
                <>
                  <i className="bi bi-clipboard-check"></i>
                  Validate Document &amp; Submit
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {document && (
        <div className="dv-timestamps">
          <span className="dv-timestamps__item">
            <i className="bi bi-clock-history"></i>
            <strong>Created</strong>
            {document.created_at
              ? new Date(document.created_at).toLocaleString()
              : 'N/A'}
          </span>

          {document.validated_at && (
            <>
              <span className="dv-timestamps__divider" aria-hidden="true"></span>
              <span className="dv-timestamps__item">
                <i className="bi bi-shield-check"></i>
                <strong>Validated</strong>
                {new Date(document.validated_at).toLocaleString()}
              </span>
            </>
          )}

          <span className="dv-timestamps__divider" aria-hidden="true"></span>
          <span className="dv-timestamps__item">
            <i className="bi bi-arrow-repeat"></i>
            <strong>Updated</strong>
            {document.updated_at
              ? new Date(document.updated_at).toLocaleString()
              : 'N/A'}
          </span>
        </div>
      )}

      <p className="dv-compliance-note">
        <i className="bi bi-shield-lock"></i>
        All data is securely processed and validated in compliance with medical data regulations.
      </p>
    </div>
  );
}

export default DocumentValidation;
