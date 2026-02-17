import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Status badge configuration
const STATUS_CONFIG = {
  UPLOADED: { class: 'bg-secondary', label: 'Uploaded' },
  PROCESSING: { class: 'bg-primary', label: 'Processing', spinner: true },
  PROCESSED: { class: 'bg-warning text-dark', label: 'Processed' },
  VALIDATED: { class: 'bg-success', label: 'Validated' },
  FAILED: { class: 'bg-danger', label: 'Failed' }
};

function DocumentsList() {
  const navigate = useNavigate();

  // State management
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Ref for polling interval
  const pollingIntervalRef = useRef(null);

  // Fetch documents from API
  const fetchDocuments = async (page = currentPage) => {
    try {
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/documents?page=${page}`);
      const data = response.data;

      setDocuments(data.data || []);
      setCurrentPage(data.current_page);
      setLastPage(data.last_page);
      setTotal(data.total);

      return data.data || [];
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load documents. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Check if any document needs polling
  const needsPolling = (docs) => {
    return docs.some(doc => 
      doc.status === 'UPLOADED' || doc.status === 'PROCESSING'
    );
  };

  // Setup polling logic
  const setupPolling = (docs) => {
    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Start polling if needed
    if (needsPolling(docs)) {
      pollingIntervalRef.current = setInterval(async () => {
        const newDocs = await fetchDocuments(currentPage);
        // If no more documents need polling, the next call will clear the interval
        if (!needsPolling(newDocs) && pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }, 3000);
    }
  };

  // Initial load
  useEffect(() => {
    const loadDocuments = async () => {
      const docs = await fetchDocuments(1);
      setupPolling(docs);
    };
    loadDocuments();

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Handle page change
  const handlePageChange = async (page) => {
    if (page < 1 || page > lastPage) return;
    setLoading(true);
    const docs = await fetchDocuments(page);
    setupPolling(docs);
  };

  // Render status badge
  const renderStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.UPLOADED;
    return (
      <span className={`badge ${config.class} d-inline-flex align-items-center gap-1`}>
        {config.spinner && (
          <span 
            className="spinner-border spinner-border-sm" 
            role="status" 
            style={{ width: '0.75rem', height: '0.75rem' }}
          ></span>
        )}
        {config.label}
      </span>
    );
  };

  // Render action button based on status
  const renderActionButton = (doc) => {
    const { id, status } = doc;

    switch (status) {
      case 'PROCESSED':
        return (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/documents/${id}/validate`)}
          >
            Validate
          </button>
        );
      case 'VALIDATED':
        return (
          <button
            className="btn btn-success btn-sm"
            onClick={() => navigate(`/documents/${id}/validate`)}
          >
            View
          </button>
        );
      case 'FAILED':
        return (
          <button className="btn btn-danger btn-sm" disabled>
            Failed
          </button>
        );
      case 'PROCESSING':
        return (
          <button className="btn btn-secondary btn-sm" disabled>
            Processing...
          </button>
        );
      case 'UPLOADED':
      default:
        return (
          <button className="btn btn-secondary btn-sm" disabled>
            Pending...
          </button>
        );
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div 
              className="spinner-border text-primary mb-3" 
              role="status" 
              style={{ width: '3rem', height: '3rem' }}
            >
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Loading documents...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <div>{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (documents.length === 0) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow-sm">
              <div className="card-body text-center py-5">
                <i className="bi bi-folder2-open text-muted" style={{ fontSize: '4rem' }}></i>
                <h5 className="mt-3 text-muted">No Documents Found</h5>
                <p className="text-muted mb-4">Upload your first document to get started.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/documents/upload')}
                >
                  <i className="bi bi-cloud-upload me-2"></i>
                  Upload Document
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <i className="bi bi-files me-2"></i>
          Documents
        </h2>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/documents/upload')}
        >
          <i className="bi bi-cloud-upload me-2"></i>
          Upload
        </button>
      </div>

      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Filename</th>
                <th scope="col">Status</th>
                <th scope="col">Date</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.id}</td>
                  <td>
                    <i className="bi bi-file-earmark me-2 text-muted"></i>
                    {doc.original_filename}
                  </td>
                  <td>{renderStatusBadge(doc.status)}</td>
                  <td>{new Date(doc.created_at).toLocaleString()}</td>
                  <td>{renderActionButton(doc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="card-footer bg-white d-flex justify-content-between align-items-center">
          <span className="text-muted">
            Page {currentPage} of {lastPage} ({total} total documents)
          </span>
          <div className="btn-group">
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <i className="bi bi-chevron-left me-1"></i>
              Previous
            </button>
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === lastPage}
            >
              Next
              <i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentsList;
