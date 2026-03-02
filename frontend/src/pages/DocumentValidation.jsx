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
  SectionDivider 
} from '../ui';

// Field label mapping for display
const FIELD_LABELS = {
  invoice_date: 'Invoice Date',
  provider_name: 'Provider Name',
  total_ttc: 'Total Amount (TTC)'
};

// Field input type mapping
const FIELD_TYPES = {
  invoice_date: 'date',
  provider_name: 'text',
  total_ttc: 'number'
};

// Confidence threshold for highlighting low confidence rows
const LOW_CONFIDENCE_THRESHOLD = 0.70;

// Normalize date to YYYY-MM-DD format for <input type="date">
const normalizeDate = (value) => {
  if (!value) return null;

  const raw = String(value).trim();

  // Case 1: Already correct format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  // Case 2: DD-MM-YYYY or DD/MM/YYYY
  const clean = raw.replace(/\//g, '-');
  const parts = clean.split('-');

  if (parts.length === 3) {
    const [a, b, c] = parts;

    // DD-MM-YYYY
    if (a.length === 2 && c.length === 4) {
      return `${c}-${b}-${a}`;
    }

    // YYYY-MM-DD but badly formatted
    if (a.length === 4) {
      return `${a}-${b}-${c}`;
    }
  }

  // Unknown format
  return null;
};
// Custom styles using CSS variables
const styles = {
  pageContainer: {
    maxWidth: 'var(--container-max-width)',
    animation: 'fadeIn var(--transition-slow)'
  },
  card: {
    borderRadius: 'var(--card-radius)',
    border: 'none'
  },
  cardHeader: {
    background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
    borderBottom: 'none'
  },
  warningPanel: {
    borderLeft: '4px solid var(--color-warning)',
    borderRadius: '0 var(--radius-lg) var(--radius-lg) 0',
    backgroundColor: 'var(--color-warning-subtle)'
  },
  lowConfidenceRow: {
    backgroundColor: 'var(--color-warning-subtle)',
    borderLeft: '4px solid var(--color-warning)'
  },
  tableInput: {
    transition: 'var(--transition-all)',
    borderRadius: 'var(--radius-md)'
  },
  validateButton: {
    padding: 'var(--spacing-4) var(--spacing-8)',
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    letterSpacing: 'var(--letter-spacing-wide)',
    borderRadius: 'var(--radius-lg)',
    transition: 'var(--transition-all)',
    boxShadow: 'var(--shadow-primary)'
  },
  statusIcon: {
    fontSize: '1.5rem',
    transition: 'var(--transition-transform)'
  }
};

function DocumentValidation() {
  const { id } = useParams();
  const navigate = useNavigate();

  // State management
  const [document, setDocument] = useState(null);
  const [editedFields, setEditedFields] = useState({});
  const [confidenceScores, setConfidenceScores] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [businessWarnings, setBusinessWarnings] = useState([]);

  // Fetch document data from API
  const fetchDocument = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/documents/${id}`);
      const doc = response.data;

      setDocument(doc);

      // Extract fields, confidence, and warnings from latest_extraction
      if (doc.latest_extraction) {
        const extraction = doc.latest_extraction;
        
        // Normalize date fields before setting state
        const normalizedFields = {
          ...extraction.fields,
          invoice_date: normalizeDate(extraction.fields?.invoice_date)
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

  // Load document on mount
  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  // Handle field value changes
  const handleFieldChange = (fieldKey, value) => {
    setEditedFields(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  // Handle form submission
  const handleValidate = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);
      setBusinessWarnings([]);

      // Convert empty strings to null
      const cleanedFields = Object.fromEntries(
        Object.entries(editedFields).map(([key, value]) => [
          key,
          value === '' ? null : value
        ])
      );

      const response = await api.post(`/documents/${id}/validate`, {
        fields: cleanedFields
      });

      setBusinessWarnings(response.data?.warnings || []);
      setSuccessMessage('Document validated successfully! The extraction has been confirmed.');

      // Refetch document to get updated status
      await fetchDocument();

      // Redirect to documents list after 2 seconds
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

  // Get status badge class based on document status
  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'UPLOADED':
        return 'bg-secondary';
  
      case 'PROCESSING':
        return 'bg-info text-dark';
  
      case 'PROCESSED':
        return 'bg-warning text-dark';
  
      case 'VALIDATED':
        return 'bg-success';
  
      case 'FAILED':
        return 'bg-danger';
  
      default:
        return 'bg-secondary';
    }
  };
  

  // Check if a field has low confidence
  const isLowConfidence = (fieldKey) => {
    const score = confidenceScores[fieldKey];
    return score !== null && score !== undefined && score < LOW_CONFIDENCE_THRESHOLD;
  };

  // Check if document is already validated
  const isValidated = document?.status?.toUpperCase() === 'VALIDATED';

  // Render loading spinner
  if (isLoading) {
    return (
      <div className="container py-5" style={styles.pageContainer}>
        <Loader message="Loading document..." size="lg" />
      </div>
    );
  }

  // Render error state for document not found or critical errors
  if (error && !document) {
    return (
      <div className="container py-5" style={styles.pageContainer}>
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <ErrorAlert 
              message={error} 
              title="Error Loading Document" 
            />
          </div>
        </div>
      </div>
    );
  }

  // Check for missing extraction data
  const hasExtraction = document?.latest_extraction && Object.keys(editedFields).length > 0;

  return (
    <div className="container py-5" style={styles.pageContainer}>
      <div className="row justify-content-center">
        <div className="col-12">
          <div className="card shadow-lg" style={styles.card}>
            {/* Card Header */}
            <div className="card-header text-white p-4" style={styles.cardHeader}>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h4 className="mb-2 fw-semibold d-flex align-items-center">
                    <i className="bi bi-file-earmark-medical-fill me-2 fs-3"></i>
                    Document Validation
                  </h4>
                  {document && (
                    <div className="d-flex align-items-center gap-3 mt-2">
                      <span className="d-flex align-items-center" style={{ opacity: 0.9 }}>
                        <i className="bi bi-file-earmark me-1"></i>
                        {document.original_filename}
                      </span>
                      {document.file_size && (
                        <span className="d-flex align-items-center" style={{ opacity: 0.75, fontSize: 'var(--font-size-sm)' }}>
                          <i className="bi bi-hdd me-1"></i>
                          {(document.file_size / 1024).toFixed(1)} KB
                        </span>
                      )}
                      <span className="d-flex align-items-center" style={{ opacity: 0.75, fontSize: 'var(--font-size-sm)' }}>
                        <i className="bi bi-calendar3 me-1"></i>
                        {document.created_at ? new Date(document.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  )}
                </div>
                {document && (
                  <span 
                    className={`badge ${getStatusBadgeClass(document.status)} fs-6`}
                    style={{ padding: 'var(--spacing-3) var(--spacing-5)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: 'var(--letter-spacing-wider)' }}
                  >
                    <i className={`bi ${document.status?.toUpperCase() === 'VALIDATED' ? 'bi-check-circle-fill' : 'bi-clock-history'} me-1`}></i>
                    {document.status}
                  </span>
                )}
              </div>
            </div>

            <div className="card-body p-4 p-lg-5">
              {/* Success Message */}
              {successMessage && (
                <div className="mb-4">
                  <SuccessAlert 
                    message={successMessage} 
                    title="Validation Successful" 
                  />
                </div>
              )}

              {/* Business Validation Warnings */}
              {businessWarnings.length > 0 && (
                <div className="mb-4">
                  <WarningAlert 
                    warnings={businessWarnings}
                    title="Business Validation Warnings" 
                  />
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-4">
                  <ErrorAlert message={error} />
                </div>
              )}

              {/* Warnings Panel */}
              {warnings.length > 0 && (
                <div 
                  className="alert mb-4 p-4" 
                  role="alert"
                  style={styles.warningPanel}
                >
                  <div className="d-flex align-items-start">
                    <div 
                      className="d-flex align-items-center justify-content-center rounded-circle me-3 flex-shrink-0"
                      style={{ 
                        width: '48px', 
                        height: '48px', 
                        backgroundColor: 'rgba(253, 126, 20, 0.2)' 
                      }}
                    >
                      <i className="bi bi-exclamation-triangle-fill fs-4" style={{ color: '#fd7e14' }}></i>
                    </div>
                    <div className="flex-grow-1">
                      <h6 className="fw-bold mb-2" style={{ color: '#b45309' }}>
                        AI Extraction Warnings
                      </h6>
                      <p className="text-muted small mb-2">The following issues were detected during extraction:</p>
                      <ul className="mb-0 ps-3" style={{ color: '#92400e' }}>
                        {warnings.map((warning, index) => (
                          <li key={index} className="mb-1">{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* No Extraction Data Message */}
              {!hasExtraction && (
                <InfoAlert 
                  message="No extraction data available for this document. Please wait for processing to complete."
                  title="Processing In Progress" 
                />
              )}

              {/* Section Divider */}
              {hasExtraction && (
                <SectionDivider label="Extracted Fields" icon="table" />
              )}

              {/* Editable Fields Table */}
              {hasExtraction && (
                <>
                  <div className="table-responsive mb-4">
                    <table 
                      className="table table-hover align-middle mb-0"
                      style={{ borderCollapse: 'separate', borderSpacing: 0 }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                          <th 
                            style={{ 
                              width: '25%', 
                              padding: 'var(--table-cell-padding-y) var(--table-cell-padding-x)',
                              borderBottom: '2px solid var(--color-gray-200)',
                              fontSize: 'var(--font-size-xs)',
                              textTransform: 'uppercase',
                              letterSpacing: 'var(--letter-spacing-widest)',
                              color: 'var(--table-header-color)',
                              fontWeight: 'var(--font-weight-semibold)'
                            }}
                          >
                            Field Name
                          </th>
                          <th 
                            style={{ 
                              width: '40%', 
                              padding: 'var(--table-cell-padding-y) var(--table-cell-padding-x)',
                              borderBottom: '2px solid var(--color-gray-200)',
                              fontSize: 'var(--font-size-xs)',
                              textTransform: 'uppercase',
                              letterSpacing: 'var(--letter-spacing-widest)',
                              color: 'var(--table-header-color)',
                              fontWeight: 'var(--font-weight-semibold)'
                            }}
                          >
                            Value
                          </th>
                          <th 
                            className="text-center"
                            style={{ 
                              width: '20%', 
                              padding: 'var(--table-cell-padding-y) var(--table-cell-padding-x)',
                              borderBottom: '2px solid var(--color-gray-200)',
                              fontSize: 'var(--font-size-xs)',
                              textTransform: 'uppercase',
                              letterSpacing: 'var(--letter-spacing-widest)',
                              color: 'var(--table-header-color)',
                              fontWeight: 'var(--font-weight-semibold)'
                            }}
                          >
                            Confidence
                          </th>
                          <th 
                            className="text-center"
                            style={{ 
                              width: '15%', 
                              padding: 'var(--table-cell-padding-y) var(--table-cell-padding-x)',
                              borderBottom: '2px solid var(--color-gray-200)',
                              fontSize: 'var(--font-size-xs)',
                              textTransform: 'uppercase',
                              letterSpacing: 'var(--letter-spacing-widest)',
                              color: 'var(--table-header-color)',
                              fontWeight: 'var(--font-weight-semibold)'
                            }}
                          >
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(FIELD_LABELS).map(fieldKey => {
                          const lowConfidence = isLowConfidence(fieldKey);
                          const fieldType = FIELD_TYPES[fieldKey];
                          const fieldValue = editedFields[fieldKey];

                          return (
                            <tr 
                              key={fieldKey}
                              style={lowConfidence ? styles.lowConfidenceRow : { borderLeft: '4px solid transparent' }}
                            >
                              <td 
                                className="fw-semibold"
                                style={{ 
                                  padding: 'var(--spacing-5)',
                                  fontSize: 'var(--font-size-md)',
                                  color: lowConfidence ? 'var(--color-warning-text)' : 'var(--color-gray-700)',
                                  borderBottom: 'var(--table-border)'
                                }}
                              >
                                <i className={`bi ${fieldKey === 'invoice_date' ? 'bi-calendar3' : fieldKey === 'provider_name' ? 'bi-building' : 'bi-currency-euro'} me-2 text-primary`}></i>
                                {FIELD_LABELS[fieldKey]}
                              </td>
                              <td style={{ padding: 'var(--spacing-4) var(--spacing-5)', borderBottom: 'var(--table-border)' }}>
                                <input
                                  type={fieldType}
                                  className="form-control form-control-lg"
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
                                  style={{
                                    ...styles.tableInput,
                                    backgroundColor: isValidated ? 'var(--color-gray-50)' : 'var(--color-white)',
                                    border: lowConfidence ? '2px solid var(--color-warning)' : '1px solid var(--color-gray-300)'
                                  }}
                                />
                              </td>
                              <td className="text-center" style={{ padding: 'var(--spacing-4) var(--spacing-5)', borderBottom: 'var(--table-border)' }}>
                                <ConfidenceBadge score={confidenceScores[fieldKey]} />
                              </td>
                              <td className="text-center" style={{ padding: 'var(--spacing-4) var(--spacing-5)', borderBottom: 'var(--table-border)' }}>
                                {lowConfidence ? (
                                  <i 
                                    className="bi bi-exclamation-diamond-fill" 
                                    title="Low confidence - please review"
                                    style={{ ...styles.statusIcon, color: 'var(--color-warning)' }}
                                  ></i>
                                ) : (
                                  <i 
                                    className="bi bi-patch-check-fill text-success"
                                    title="High confidence"
                                    style={styles.statusIcon}
                                  ></i>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Extraction Version Info */}
                  {document?.latest_extraction?.version && (
                    <div className="d-flex align-items-center justify-content-between text-muted small mb-4 p-3 rounded" style={{ backgroundColor: 'var(--color-gray-50)' }}>
                      <span>
                        <i className="bi bi-layers me-2"></i>
                        Extraction Version: <strong>{document.latest_extraction.version}</strong>
                      </span>
                      {document?.latest_extraction?.meta?.processed_at && (
                        <span>
                          <i className="bi bi-clock me-1"></i>
                          Processed: {new Date(document.latest_extraction.meta.processed_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Section Divider */}
                  <hr className="my-4" style={{ borderColor: 'var(--color-gray-200)' }} />

                  {/* Validate Button */}
                  <div className="d-grid">
                    <button
                      type="button"
                      className={`btn btn-lg ${isValidated ? 'btn-success' : 'btn-primary'}`}
                      onClick={handleValidate}
                      disabled={isSubmitting || isValidated}
                      style={{
                        ...styles.validateButton,
                        ...(isValidated ? { boxShadow: 'var(--shadow-success)' } : {})
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <span 
                            className="spinner-border spinner-border-sm me-2" 
                            role="status" 
                            aria-hidden="true"
                            style={{ width: '1.25rem', height: '1.25rem' }}
                          ></span>
                          Validating Document...
                        </>
                      ) : isValidated ? (
                        <>
                          <i className="bi bi-shield-check me-2 fs-5"></i>
                          Document Validated
                        </>
                      ) : (
                        <>
                          <i className="bi bi-clipboard-check me-2 fs-5"></i>
                          Validate Document & Submit
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Card Footer with Timestamps */}
            {document && (
              <div 
                className="card-footer py-3 px-4"
                style={{ 
                  backgroundColor: 'var(--color-gray-50)', 
                  borderTop: '1px solid var(--color-gray-200)' 
                }}
              >
                <div className="row text-muted small align-items-center">
                  <div className="col-sm-6 d-flex align-items-center">
                    <i className="bi bi-clock-history me-2" style={{ fontSize: '1rem' }}></i>
                    <span>
                      <strong>Created:</strong> {document.created_at ? new Date(document.created_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="col-sm-6 d-flex align-items-center justify-content-sm-end mt-2 mt-sm-0 flex-wrap gap-2">
                    {document.validated_at && (
                      <span className="d-flex align-items-center">
                        <i className="bi bi-shield-check me-2" style={{ fontSize: '1rem' }}></i>
                        <strong>Validated:</strong> {new Date(document.validated_at).toLocaleString()}
                      </span>
                    )}
                    <span className="d-flex align-items-center">
                      <i className="bi bi-arrow-repeat me-2" style={{ fontSize: '1rem' }}></i>
                      <strong>Updated:</strong> {document.updated_at ? new Date(document.updated_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="text-center mt-4">
            <p className="text-muted small mb-0">
              <i className="bi bi-shield-lock me-1"></i>
              All data is securely processed and validated in compliance with medical data regulations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentValidation;
