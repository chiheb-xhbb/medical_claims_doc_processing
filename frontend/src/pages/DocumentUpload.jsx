import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';


// Allowed file types
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Format file size for display
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

function DocumentUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // State management
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Validate file before upload
  const validateFile = (selectedFile) => {
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      return 'Invalid file type. Please select a PNG, JPEG, or PDF file.';
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 10MB.';
    }
    return null;
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    setError(null);
    setSuccess(false);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setFile(selectedFile);
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) return;

    // Double-check validation before upload
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      await api.post('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/documents');
      }, 2000);

    } catch (err) {
      // Handle Laravel 422 validation errors
      if (err.response?.status === 422) {
        const validationErrors = err.response.data.errors;
        if (validationErrors) {
          // Get first error message
          const firstError = Object.values(validationErrors)[0];
          setError(Array.isArray(firstError) ? firstError[0] : firstError);
        } else {
          setError(err.response.data.message || 'Validation failed. Please check your file.');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to upload document. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  // Handle choose file button click
  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  // Check if upload button should be disabled
  const isUploadDisabled = !file || uploading || error;

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-6 col-md-8">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0 d-flex align-items-center">
                <i className="bi bi-cloud-upload me-2"></i>
                Upload Document
              </h5>
            </div>
            <div className="card-body p-4">
              {/* Success Alert */}
              {success && (
                <div className="alert alert-success d-flex align-items-center" role="alert">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  <div>Document uploaded successfully! Redirecting...</div>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="alert alert-danger d-flex align-items-center" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  <div>{error}</div>
                </div>
              )}

              {/* File Input Area */}
              <div className="mb-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".png,.jpg,.jpeg,.pdf"
                  className="d-none"
                />

                <div 
                  className="border rounded p-4 text-center"
                  style={{ 
                    borderStyle: 'dashed',
                    backgroundColor: '#f8f9fa',
                    cursor: 'pointer'
                  }}
                  onClick={handleChooseFile}
                >
                  {file ? (
                    <div>
                      <i className="bi bi-file-earmark-check text-success" style={{ fontSize: '3rem' }}></i>
                      <p className="mt-2 mb-1 fw-semibold">{file.name}</p>
                      <p className="text-muted mb-0">{formatFileSize(file.size)}</p>
                    </div>
                  ) : (
                    <div>
                      <i className="bi bi-cloud-arrow-up text-muted" style={{ fontSize: '3rem' }}></i>
                      <p className="mt-2 mb-1">Click to select a file</p>
                      <p className="text-muted mb-0 small">PNG, JPEG, or PDF (max 10MB)</p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-outline-secondary w-100 mt-3"
                  onClick={handleChooseFile}
                  disabled={uploading}
                >
                  <i className="bi bi-folder2-open me-2"></i>
                  Choose File
                </button>
              </div>

              {/* Upload Button */}
              <button
                type="button"
                className="btn btn-primary w-100 py-2"
                onClick={handleUpload}
                disabled={isUploadDisabled}
              >
                {uploading ? (
                  <>
                    <span 
                      className="spinner-border spinner-border-sm me-2" 
                      role="status" 
                      aria-hidden="true"
                    ></span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <i className="bi bi-upload me-2"></i>
                    Upload Document
                  </>
                )}
              </button>

              {/* Help Text */}
              <div className="mt-4 text-center">
                <small className="text-muted">
                  Supported formats: PNG, JPEG, PDF
                  <br />
                  Maximum file size: 10MB
                </small>
              </div>
            </div>
          </div>

          {/* Back Link */}
          <div className="text-center mt-3">
            <button
              className="btn btn-link text-decoration-none"
              onClick={() => navigate('/documents')}
            >
              <i className="bi bi-arrow-left me-1"></i>
              Back to Documents
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentUpload;
