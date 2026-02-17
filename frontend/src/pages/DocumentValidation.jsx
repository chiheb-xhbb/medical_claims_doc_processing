import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ConfidenceBadge from '../components/ConfidenceBadge';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

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

// Custom styles for professional medical system aesthetic
const styles = {
  pageContainer: {
    maxWidth: '1200px',
    animation: 'fadeIn 0.3s ease-in-out'
  },
  card: {
    borderRadius: '12px',
    border: 'none'
  },
  cardHeader: {
    background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)',
    borderBottom: 'none'
  },
  warningPanel: {
    borderLeft: '4px solid #fd7e14',
    borderRadius: '0 8px 8px 0',
    backgroundColor: 'rgba(253, 126, 20, 0.1)'
  },
  lowConfidenceRow: {
    backgroundColor: 'rgba(253, 126, 20, 0.15)',
    borderLeft: '4px solid #fd7e14'
  },
  tableInput: {
    transition: 'all 0.2s ease',
    borderRadius: '6px'
  },
  validateButton: {
    padding: '1rem 2rem',
    fontSize: '1.1rem',
    fontWeight: '600',
    letterSpacing: '0.025em',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 6px rgba(13, 110, 253, 0.25)'
  },
  statusIcon: {
    fontSize: '1.5rem',
    transition: 'transform 0.2s ease'
  }
};

function DocumentValidation() {
  const { id } = useParams();

  // State management
  const [document, setDocument] = useState(null);
  const [editedFields, setEditedFields] = useState({});
  const [confidenceScores, setConfidenceScores] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch document data from API
  const fetchDocument = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/documents/${id}`);
      const doc = response.data;

      setDocument(doc);

      // Extract fields, confidence, and warnings from latest_extraction
      if (doc.latest_extraction) {
        const extraction = doc.latest_extraction;
        setEditedFields(extraction.fields || {});
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

      await axios.post(`${API_BASE_URL}/documents/${id}/validate`, {
        fields: editedFields
      });

      setSuccessMessage('Document validated successfully! The extraction has been confirmed.');

      // Refetch document to get updated status
      await fetchDocument();
    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'Validation failed. Please check the field values.');
      } else if (err.response?.status === 404) {
        setError('Document not found.');
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
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '500px' }}>
          <div 
            className="spinner-border text-primary mb-3" 
            role="status" 
            style={{ width: '4rem', height: '4rem', borderWidth: '0.3rem' }}
          >
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted fs-5">Loading document...</p>
        </div>
      </div>
    );
  }

  // Render error state for document not found or critical errors
  if (error && !document) {
    return (
      <div className="container py-5" style={styles.pageContainer}>
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div 
              className="alert alert-danger d-flex align-items-start p-4 shadow-sm" 
              role="alert"
              style={{ borderRadius: '12px', borderLeft: '4px solid #dc3545' }}
            >
              <i className="bi bi-exclamation-triangle-fill me-3 fs-4"></i>
              <div>
                <h5 className="alert-heading mb-2">Error Loading Document</h5>
                <p className="mb-0">{error}</p>
              </div>
            </div>
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
                        <span className="d-flex align-items-center" style={{ opacity: 0.75, fontSize: '0.875rem' }}>
                          <i className="bi bi-hdd me-1"></i>
                          {(document.file_size / 1024).toFixed(1)} KB
                        </span>
                      )}
                      <span className="d-flex align-items-center" style={{ opacity: 0.75, fontSize: '0.875rem' }}>
                        <i className="bi bi-calendar3 me-1"></i>
                        {document.created_at ? new Date(document.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  )}
                </div>
                {document && (
                  <span 
                    className={`badge ${getStatusBadgeClass(document.status)} fs-6`}
                    style={{ padding: '0.6rem 1.2rem', fontWeight: '600', letterSpacing: '0.05em' }}
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
                <div 
                  className="alert alert-success d-flex align-items-start p-4 mb-4 shadow-sm" 
                  role="alert"
                  style={{ borderRadius: '10px', borderLeft: '4px solid #198754' }}
                >
                  <i className="bi bi-check-circle-fill me-3 fs-4 text-success"></i>
                  <div>
                    <h6 className="alert-heading mb-1 fw-semibold">Validation Successful</h6>
                    <p className="mb-0">{successMessage}</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div 
                  className="alert alert-danger d-flex align-items-start p-4 mb-4 shadow-sm" 
                  role="alert"
                  style={{ borderRadius: '10px', borderLeft: '4px solid #dc3545' }}
                >
                  <i className="bi bi-exclamation-triangle-fill me-3 fs-4 text-danger"></i>
                  <div>
                    <h6 className="alert-heading mb-1 fw-semibold">Error</h6>
                    <p className="mb-0">{error}</p>
                  </div>
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
                <div 
                  className="alert alert-info d-flex align-items-start p-4" 
                  role="alert"
                  style={{ borderRadius: '10px', borderLeft: '4px solid #0dcaf0' }}
                >
                  <i className="bi bi-info-circle-fill me-3 fs-4 text-info"></i>
                  <div>
                    <h6 className="alert-heading mb-1 fw-semibold">Processing In Progress</h6>
                    <p className="mb-0">No extraction data available for this document. Please wait for processing to complete.</p>
                  </div>
                </div>
              )}

              {/* Section Divider */}
              {hasExtraction && (
                <div className="d-flex align-items-center mb-4">
                  <hr className="flex-grow-1" style={{ borderColor: '#dee2e6' }} />
                  <span className="px-3 text-muted fw-medium small text-uppercase" style={{ letterSpacing: '0.1em' }}>
                    <i className="bi bi-table me-2"></i>Extracted Fields
                  </span>
                  <hr className="flex-grow-1" style={{ borderColor: '#dee2e6' }} />
                </div>
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
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                          <th 
                            style={{ 
                              width: '25%', 
                              padding: '1rem 1.25rem',
                              borderBottom: '2px solid #e2e8f0',
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: '#64748b',
                              fontWeight: '600'
                            }}
                          >
                            Field Name
                          </th>
                          <th 
                            style={{ 
                              width: '40%', 
                              padding: '1rem 1.25rem',
                              borderBottom: '2px solid #e2e8f0',
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: '#64748b',
                              fontWeight: '600'
                            }}
                          >
                            Value
                          </th>
                          <th 
                            className="text-center"
                            style={{ 
                              width: '20%', 
                              padding: '1rem 1.25rem',
                              borderBottom: '2px solid #e2e8f0',
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: '#64748b',
                              fontWeight: '600'
                            }}
                          >
                            Confidence
                          </th>
                          <th 
                            className="text-center"
                            style={{ 
                              width: '15%', 
                              padding: '1rem 1.25rem',
                              borderBottom: '2px solid #e2e8f0',
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: '#64748b',
                              fontWeight: '600'
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
                                  padding: '1.25rem 1.25rem',
                                  fontSize: '0.95rem',
                                  color: lowConfidence ? '#92400e' : '#334155',
                                  borderBottom: '1px solid #e2e8f0'
                                }}
                              >
                                <i className={`bi ${fieldKey === 'invoice_date' ? 'bi-calendar3' : fieldKey === 'provider_name' ? 'bi-building' : 'bi-currency-euro'} me-2 text-primary`}></i>
                                {FIELD_LABELS[fieldKey]}
                              </td>
                              <td style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
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
                                    backgroundColor: isValidated ? '#f8fafc' : '#fff',
                                    border: lowConfidence ? '2px solid #fd7e14' : '1px solid #d1d5db'
                                  }}
                                />
                              </td>
                              <td className="text-center" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
                                <ConfidenceBadge score={confidenceScores[fieldKey]} />
                              </td>
                              <td className="text-center" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
                                {lowConfidence ? (
                                  <i 
                                    className="bi bi-exclamation-diamond-fill" 
                                    title="Low confidence - please review"
                                    style={{ ...styles.statusIcon, color: '#fd7e14' }}
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
                    <div className="d-flex align-items-center justify-content-between text-muted small mb-4 p-3 rounded" style={{ backgroundColor: '#f8fafc' }}>
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
                  <hr className="my-4" style={{ borderColor: '#e2e8f0' }} />

                  {/* Validate Button */}
                  <div className="d-grid">
                    <button
                      type="button"
                      className={`btn btn-lg ${isValidated ? 'btn-success' : 'btn-primary'}`}
                      onClick={handleValidate}
                      disabled={isSubmitting || isValidated}
                      style={{
                        ...styles.validateButton,
                        ...(isValidated ? { boxShadow: '0 4px 6px rgba(25, 135, 84, 0.25)' } : {})
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
                  backgroundColor: '#f8fafc', 
                  borderTop: '1px solid #e2e8f0' 
                }}
              >
                <div className="row text-muted small align-items-center">
                  <div className="col-sm-6 d-flex align-items-center">
                    <i className="bi bi-clock-history me-2" style={{ fontSize: '1rem' }}></i>
                    <span>
                      <strong>Created:</strong> {document.created_at ? new Date(document.created_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="col-sm-6 d-flex align-items-center justify-content-sm-end mt-2 mt-sm-0">
                    <i className="bi bi-arrow-repeat me-2" style={{ fontSize: '1rem' }}></i>
                    <span>
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
