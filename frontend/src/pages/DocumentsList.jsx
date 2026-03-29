import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getStoredRole, getStoredUser } from '../services/auth';
import { StatusBadge, Loader, ErrorAlert, EmptyState } from '../ui';
import './DocumentsList/DocumentsList.css';

function DocumentsList() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentRole = getStoredRole();
  const currentUser = getStoredUser();
  const canUpload = currentRole === 'AGENT' || currentRole === 'ADMIN';

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [retryingIds, setRetryingIds] = useState([]);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState(null);

  const currentPageRef = useRef(currentPage);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const needsPolling = useCallback((docs) => {
    return docs.some((doc) => doc.status === 'UPLOADED' || doc.status === 'PROCESSING');
  }, []);

  const formatDocumentError = (message) => {
    if (!message) {
      return 'Processing failed.';
    }

    let cleaned = message.trim();

    cleaned = cleaned.replace(/^FastAPI rejected the document \(HTTP \d+\):\s*/i, '');
    cleaned = cleaned.replace(/^FastAPI service error \(HTTP \d+\):\s*/i, '');
    cleaned = cleaned.replace(/^FastAPI service unavailable:\s*/i, '');
    cleaned = cleaned.replace(/^Pipeline failed:\s*/i, '');
    cleaned = cleaned.replace(/^[A-Za-z]+Error:\s*/i, '');

    return cleaned || 'Processing failed.';
  };

  const fetchDocuments = useCallback(async (page = 1) => {
    try {
      setError(null);

      const response = await api.get(`/documents?page=${page}`);
      const data = response.data;

      setDocuments(data.data || []);
      setCurrentPage(data.current_page ?? 1);
      setLastPage(data.last_page ?? 1);
      setTotal(data.total ?? 0);

      return data.data || [];
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load documents. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const setupPolling = useCallback(
    (docs) => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      if (needsPolling(docs)) {
        pollingIntervalRef.current = setInterval(async () => {
          const newDocs = await fetchDocuments(currentPageRef.current);

          if (!needsPolling(newDocs) && pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }, 3000);
      }
    },
    [fetchDocuments, needsPolling]
  );

  useEffect(() => {
    const loadDocuments = async () => {
      const docs = await fetchDocuments(1);
      setupPolling(docs);
    };

    loadDocuments();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [fetchDocuments, setupPolling]);

  useEffect(() => {
    const redirectedMessage = location.state?.accessDeniedMessage;
    if (!redirectedMessage) {
      return;
    }

    setAccessDeniedMessage(redirectedMessage);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const handlePageChange = async (page) => {
    if (page < 1 || page > lastPage) return;

    setLoading(true);
    const docs = await fetchDocuments(page);
    setupPolling(docs);
  };

  const handleRetry = async (documentId) => {
    try {
      setError(null);
      setRetryingIds((prev) => [...prev, documentId]);

      await api.post(`/documents/${documentId}/retry`);

      const docs = await fetchDocuments(currentPageRef.current);
      setupPolling(docs);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retry document.');
    } finally {
      setRetryingIds((prev) => prev.filter((id) => id !== documentId));
    }
  };

  const renderStatusBadge = (status) => <StatusBadge status={status} />;

  const renderActionButton = (doc) => {
    const isRetrying = retryingIds.includes(doc.id);
    const canRetry = Number(doc.user_id) === Number(currentUser?.id);

    switch (doc.status) {
      case 'PROCESSED':
        return (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/documents/${doc.id}/validate`)}
          >
            Validate
          </button>
        );

      case 'VALIDATED':
        return (
          <button
            className="btn btn-success btn-sm"
            onClick={() => navigate(`/documents/${doc.id}/validate`)}
          >
            View
          </button>
        );

      case 'FAILED':
        if (!canRetry) {
          return <span className="text-muted small">-</span>;
        }

        return (
          <button
            className="btn btn-warning btn-sm"
            onClick={() => handleRetry(doc.id)}
            disabled={isRetrying}
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
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

  if (loading) {
    return (
      <div className="container py-5">
        {accessDeniedMessage && (
          <div className="alert alert-warning d-flex align-items-center mb-3" role="alert">
            <i className="bi bi-shield-lock me-2"></i>
            <span>{accessDeniedMessage}</span>
          </div>
        )}
        <Loader message="Loading documents..." size="md" />
      </div>
    );
  }

  if (error && documents.length === 0) {
    return (
      <div className="container py-5">
        {accessDeniedMessage && (
          <div className="alert alert-warning d-flex align-items-center mb-3" role="alert">
            <i className="bi bi-shield-lock me-2"></i>
            <span>{accessDeniedMessage}</span>
          </div>
        )}
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <ErrorAlert message={error} title="" showIcon={true} />
          </div>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="container py-5">
        {accessDeniedMessage && (
          <div className="alert alert-warning d-flex align-items-center mb-3" role="alert">
            <i className="bi bi-shield-lock me-2"></i>
            <span>{accessDeniedMessage}</span>
          </div>
        )}
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow-sm">
              <div className="card-body">
                <EmptyState
                  icon="folder2-open"
                  title="No Documents Found"
                  description={
                    canUpload
                      ? 'Upload documents to get started.'
                      : 'No documents are available for your role right now.'
                  }
                  action={canUpload ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate('/documents/upload')}
                    >
                      <i className="bi bi-cloud-upload me-2"></i>
                      Upload Documents
                    </button>
                  ) : null}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 documents-list">
      {accessDeniedMessage && (
        <div className="alert alert-warning d-flex align-items-center mb-3" role="alert">
          <i className="bi bi-shield-lock me-2"></i>
          <span>{accessDeniedMessage}</span>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0 page-title">
          <i className="bi bi-files me-2 opacity-75"></i>
          Documents
        </h2>

        {canUpload && (
          <button
            className="btn btn-primary"
            onClick={() => navigate('/documents/upload')}
          >
            <i className="bi bi-cloud-upload me-2"></i>
            Upload Documents
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3">
          <ErrorAlert message={error} title="" showIcon={true} />
        </div>
      )}

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover table-striped mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Filename</th>
                <th scope="col">Status</th>
                <th scope="col">Date</th>
                <th scope="col">Error</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {documents.map((doc) => {
                const formattedError = formatDocumentError(doc.error_message);

                return (
                  <tr key={doc.id}>
                    <td>{doc.id}</td>

                    <td>
                      <i className="bi bi-file-earmark me-2 text-muted"></i>
                      {doc.original_filename}
                    </td>

                    <td>{renderStatusBadge(doc.status)}</td>

                    <td>{new Date(doc.created_at).toLocaleString()}</td>

                    <td
                      className="text-danger small"
                      style={{ maxWidth: '320px', whiteSpace: 'normal' }}
                    >
                      {doc.status === 'FAILED' ? (
                        <span title={formattedError}>{formattedError}</span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td>{renderActionButton(doc)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card-footer bg-white d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <span className="pagination-info d-inline-flex align-items-center gap-2">
            <i className="bi bi-grid-3x3-gap"></i>
            Page {currentPage} of {lastPage} ({total} total documents)
          </span>

          <div className="btn-group pagination-controls">
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
