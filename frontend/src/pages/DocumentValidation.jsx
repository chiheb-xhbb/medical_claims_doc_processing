import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { getApiErrorMessage } from '../services/api';
import { previewDocument, downloadDocument } from '../services/documentAccess';
import {
  ConfidenceBadge,
  Loader,
  EmptyState,
  WarningAlert,
  InfoAlert,
  StatusBadge,
  FileAccessInline,
  PageHeader,
} from '../ui';
import {
  normalizeDateInput,
  formatFileSize,
  formatShortDate,
  formatDateTime,
} from '../utils/formatters';
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

function DocumentValidation() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [document, setDocument] = useState(null);
  const [editedFields, setEditedFields] = useState({});
  const [confidenceScores, setConfidenceScores] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businessWarnings, setBusinessWarnings] = useState([]);
  const [clientWarnings, setClientWarnings] = useState([]);
  const [isOpeningOriginalDocument, setIsOpeningOriginalDocument] = useState(false);
  const [isDownloadingOriginalDocument, setIsDownloadingOriginalDocument] = useState(false);

  useEffect(() => {
    const activeWarnings = [];
    
    if (editedFields.total_ttc !== undefined && editedFields.total_ttc !== null && editedFields.total_ttc !== '') {
      const amount = Number(editedFields.total_ttc);
      if (amount <= 0) {
        activeWarnings.push('Amount must be positive.');
      } else if (amount > 10000) {
        activeWarnings.push('High amount detected: requires supervisor review.');
      }
    }

    if (editedFields.invoice_date) {
      const date = new Date(editedFields.invoice_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date > today) {
        activeWarnings.push('Invoice date is in the future.');
      }
    }

    setClientWarnings(activeWarnings);
  }, [editedFields.total_ttc, editedFields.invoice_date]);

  const fetchDocument = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadErrorMessage(null);

      const response = await api.get(`/documents/${id}`);
      const doc = response.data;

      setDocument(doc);

      if (doc.latest_extraction) {
        const extraction = doc.latest_extraction;

        const normalizedFields = {
          ...extraction.fields,
          invoice_date: normalizeDateInput(extraction.fields?.invoice_date),
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
      let errorMessage;

      if (err.response?.status === 404) {
        errorMessage = 'Document not found. Please check the document ID and try again.';
      } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check if the server is running.';
      } else {
        errorMessage = err.response?.data?.message || 'Failed to load document. Please try again.';
      }

      setLoadErrorMessage(errorMessage);
      toast.error(errorMessage);
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
      toast.success('Document validated successfully! The extraction has been confirmed.');

      await fetchDocument();

      setTimeout(() => {
        navigate('/documents');
      }, 2000);
    } catch (err) {
      let errorMessage;

      if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || 'Validation failed. Please check the field values.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Document not found.';
      } else if (err.response?.status === 422) {
        const data = err.response?.data;
        const errors = data?.errors || {};
        if (errors.total_ttc && Array.isArray(errors.total_ttc) && errors.total_ttc.length > 0) {
          errorMessage = errors.total_ttc[0];
        } else {
          errorMessage = data?.message || 'Validation failed. Please check the field values.';
        }
      } else {
        errorMessage = err.response?.data?.message || 'Failed to validate document. Please try again.';
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreviewOriginalDocument = async () => {
    if (!document?.id || isOpeningOriginalDocument) {
      return;
    }

    try {
      setIsOpeningOriginalDocument(true);
      await previewDocument(document.id);
    } catch (error) {
      const message = error?.response
        ? getApiErrorMessage(error, 'Failed to open original document.')
        : error?.message || 'Failed to open original document.';

      toast.error(message);
    } finally {
      setIsOpeningOriginalDocument(false);
    }
  };

  const handleDownloadOriginalDocument = async () => {
    if (!document?.id || isDownloadingOriginalDocument) {
      return;
    }

    try {
      setIsDownloadingOriginalDocument(true);
      await downloadDocument(document.id, document.original_filename);
    } catch (error) {
      const message = error?.response
        ? getApiErrorMessage(error, 'Failed to download original document.')
        : error?.message || 'Failed to download original document.';

      toast.error(message);
    } finally {
      setIsDownloadingOriginalDocument(false);
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

  if (loadErrorMessage && !document) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="card">
              <div className="card-body">
                <EmptyState
                  icon="file-earmark-x"
                  title="Error Loading Document"
                  description={loadErrorMessage}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasExtraction = document?.latest_extraction && Object.keys(editedFields).length > 0;
  const displayFilename = document?.original_filename || 'Unnamed document';
  const fileSizeLabel = formatFileSize(document?.file_size, null);

  return (
    <div className="container py-4 document-validation">
      <PageHeader
        icon="bi-file-earmark-medical"
        title="Document Validation"
        subtitle="Review extracted fields, resolve warnings, and confirm final values for compliant processing."
        action={
          <button
            type="button"
            className="btn btn-outline-primary page-back-btn"
            onClick={() => navigate('/documents')}
          >
            <i className="bi bi-arrow-left me-2" aria-hidden="true" />
            Back to Documents
          </button>
        }
      />

      {document && (
        <div className="card mb-4 dv-document-header-card">
          <div className="card-header bg-primary text-white dv-document-header-card__header">
            <div className="dv-document-header-card__content">
              <h5 className="mb-1 dv-document-header-card__title">
                <FileAccessInline
                  filename={displayFilename}
                  onPreview={handlePreviewOriginalDocument}
                  onDownload={handleDownloadOriginalDocument}
                  isPreviewing={isOpeningOriginalDocument}
                  isDownloading={isDownloadingOriginalDocument}
                  inverted
                />
              </h5>

              <div className="dv-document-header-card__meta">
                {fileSizeLabel && (
                  <span className="dv-document-header-card__meta-item">
                    <i className="bi bi-hdd" aria-hidden="true"></i>
                    {fileSizeLabel}
                  </span>
                )}

                <span className="dv-document-header-card__meta-item">
                  <i className="bi bi-calendar3" aria-hidden="true"></i>
                  {formatShortDate(document.created_at)}
                </span>
              </div>
            </div>

            <div className="dv-document-header-card__status">
              <StatusBadge status={document.status} context="hero" />
            </div>
          </div>
        </div>
      )}

      {(businessWarnings.length > 0 || clientWarnings.length > 0) && (
        <div className="mb-4">
          <WarningAlert 
            warnings={Array.from(new Set([...clientWarnings, ...businessWarnings]))} 
            title="Business Validation Warnings" 
          />
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
                    &mdash; {formatDateTime(document.latest_extraction.meta.processed_at)}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 dv-fields-table">
              <thead>
                <tr>
                  <th className="dv-col-field">Field</th>
                  <th className="dv-col-value">Value</th>
                  <th className="text-center dv-col-confidence">Confidence</th>
                  <th className="text-center dv-col-status">Status</th>
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
            {formatDateTime(document.created_at)}
          </span>

          {document.validated_at && (
            <>
              <span className="dv-timestamps__divider" aria-hidden="true"></span>
              <span className="dv-timestamps__item">
                <i className="bi bi-shield-check"></i>
                <strong>Validated</strong>
                {formatDateTime(document.validated_at)}
              </span>
            </>
          )}

          <span className="dv-timestamps__divider" aria-hidden="true"></span>
          <span className="dv-timestamps__item">
            <i className="bi bi-arrow-repeat"></i>
            <strong>Updated</strong>
            {formatDateTime(document.updated_at)}
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
