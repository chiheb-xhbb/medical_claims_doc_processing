import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { SuccessAlert, ErrorAlert } from '../ui';
import '../pages/DocumentUpload/DocumentUpload.css';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const FILE_STATUS = {
  READY: 'READY',
  UPLOADING: 'UPLOADING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  INVALID: 'INVALID'
};
const FILE_PICKER_MODE = {
  REPLACE: 'replace',
  APPEND: 'append'
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

function DocumentUploadForm({ onCompleteSuccess, onBusyChange }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const pickerModeRef = useRef(FILE_PICKER_MODE.REPLACE);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [batchSummary, setBatchSummary] = useState(null);

  useEffect(() => {
    onBusyChange?.(uploading);
  }, [uploading, onBusyChange]);

  const validateFile = (selectedFile) => {
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      return t('documentUpload.invalidFileType');
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      return t('documentUpload.fileTooLarge');
    }
    return null;
  };

  const extractUploadError = (err) => {
    if (err.response?.status === 422) {
      const validationErrors = err.response.data.errors;
      if (validationErrors) {
        const firstError = Object.values(validationErrors)[0];
        return Array.isArray(firstError) ? firstError[0] : firstError;
      }

      return err.response.data.message || t('documentUpload.validationFailed');
    }

    return err.response?.data?.message || t('documentUpload.uploadFailed');
  };

  const toFileEntry = (selectedFile) => {
    const validationError = validateFile(selectedFile);

    return {
      id: `${selectedFile.name}-${selectedFile.size}-${selectedFile.lastModified}-${selectedFile.type}`,
      file: selectedFile,
      status: validationError ? FILE_STATUS.INVALID : FILE_STATUS.READY,
      error: validationError
    };
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    const pickerMode = pickerModeRef.current;
    pickerModeRef.current = FILE_PICKER_MODE.REPLACE;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (files.length === 0) {
      return;
    }

    setError(null);
    setBatchSummary(null);

    const baseSelection = pickerMode === FILE_PICKER_MODE.APPEND ? selectedFiles : [];
    const existingIds = new Set(baseSelection.map((item) => item.id));
    const incomingEntries = files
      .map((selectedFile) => toFileEntry(selectedFile))
      .filter((entry) => {
        if (existingIds.has(entry.id)) {
          return false;
        }

        existingIds.add(entry.id);
        return true;
      });

    const hasInvalidSelection = incomingEntries.some((item) => item.status === FILE_STATUS.INVALID);
    if (hasInvalidSelection) {
      setError(t('documentUpload.invalidSelection'));
    }

    setSelectedFiles([...baseSelection, ...incomingEntries]);
  };

  const uploadSingleFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    await api.post('/documents', formData);
  };

  const handleUpload = async () => {
    const uploadQueue = selectedFiles.filter(
      (item) => item.status === FILE_STATUS.READY || item.status === FILE_STATUS.ERROR
    );

    if (uploadQueue.length === 0) {
      setError(t('documentUpload.noValidFiles'));
      return;
    }

    let successCount = 0;
    let failedCount = 0;

    try {
      setUploading(true);
      setError(null);
      setBatchSummary(null);

      for (const item of uploadQueue) {
        setSelectedFiles((previous) =>
          previous.map((entry) =>
            entry.id === item.id
              ? { ...entry, status: FILE_STATUS.UPLOADING, error: null }
              : entry
          )
        );

        try {
          await uploadSingleFile(item.file);
          successCount += 1;

          setSelectedFiles((previous) =>
            previous.map((entry) =>
              entry.id === item.id
                ? { ...entry, status: FILE_STATUS.SUCCESS, error: null }
                : entry
            )
          );
        } catch (err) {
          failedCount += 1;
          const uploadError = extractUploadError(err);

          setSelectedFiles((previous) =>
            previous.map((entry) =>
              entry.id === item.id
                ? { ...entry, status: FILE_STATUS.ERROR, error: uploadError }
                : entry
            )
          );
        }
      }

      setBatchSummary({
        successCount,
        failedCount
      });

      if (successCount > 0 && failedCount === 0) {
        setTimeout(() => {
          onCompleteSuccess?.({ successCount });
        }, 1500);
      }
    } catch (err) {
      setError(extractUploadError(err));
    } finally {
      setUploading(false);
    }
  };

  const openFilePicker = (mode = FILE_PICKER_MODE.REPLACE) => {
    if (uploading) {
      return;
    }

    pickerModeRef.current = mode;
    fileInputRef.current?.click();
  };

  const handleRemoveSelectedFile = (fileId) => {
    setBatchSummary(null);
    setError(null);
    setSelectedFiles((previous) => previous.filter((item) => item.id !== fileId));
  };

  const getFileStatusLabel = (status) => {
    if (status === FILE_STATUS.UPLOADING) return t('documentUpload.statusUploading');
    if (status === FILE_STATUS.SUCCESS) return t('documentUpload.statusUploaded');
    if (status === FILE_STATUS.ERROR) return t('documentUpload.statusFailed');
    if (status === FILE_STATUS.INVALID) return t('documentUpload.statusInvalid');
    return t('documentUpload.statusReady');
  };

  const getFileStatusClass = (status) => {
    if (status === FILE_STATUS.UPLOADING) return 'bg-primary-subtle text-primary-emphasis';
    if (status === FILE_STATUS.SUCCESS) return 'bg-success-subtle text-success-emphasis';
    if (status === FILE_STATUS.ERROR || status === FILE_STATUS.INVALID) return 'bg-danger-subtle text-danger-emphasis';
    return 'bg-secondary-subtle text-secondary-emphasis';
  };

  const isUploadDisabled = uploading || !selectedFiles.some((item) =>
    item.status === FILE_STATUS.READY || item.status === FILE_STATUS.ERROR
  );

  return (
    <div className="document-upload-form">
      {batchSummary && batchSummary.failedCount === 0 && batchSummary.successCount > 0 && (
        <div className="mb-3">
          <SuccessAlert
            message={t('documentUpload.uploadCompleted', { count: batchSummary.successCount })}
            title=""
          />
        </div>
      )}

      {batchSummary && batchSummary.failedCount > 0 && (
        <div className="mb-3">
          <ErrorAlert
            message={t('documentUpload.uploadCompletedWithIssues', { successCount: batchSummary.successCount, failedCount: batchSummary.failedCount })}
            title=""
          />
        </div>
      )}

      {error && (
        <div className="mb-3">
          <ErrorAlert message={error} title="" />
        </div>
      )}

      <div className="mb-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".png,.jpg,.jpeg,.pdf"
          multiple
          className="d-none"
        />

        <div
          className={`drop-zone ${selectedFiles.length > 0 ? 'has-file' : ''} ${uploading ? 'is-disabled' : ''}`}
          onClick={() => openFilePicker(FILE_PICKER_MODE.REPLACE)}
        >
          {selectedFiles.length > 0 ? (
            <div>
              <i className="bi bi-files upload-icon"></i>
              <p className="mt-2 mb-1 fw-semibold">{t('documentUpload.filesSelected', { count: selectedFiles.length })}</p>
              <p className="text-muted mb-0 small">{t('documentUpload.filesSelectedHelper')}</p>
            </div>
          ) : (
            <div>
              <i className="bi bi-cloud-arrow-up upload-icon"></i>
              <p className="mt-2 mb-1">{t('documentUpload.clickToSelect')}</p>
              <p className="text-muted mb-0 small">{t('documentUpload.supportedFormatsHelper')}</p>
            </div>
          )}
        </div>

        <div className="d-flex flex-wrap gap-2 mt-3 choose-files-actions">
          <button
            type="button"
            className="btn btn-outline-secondary flex-grow-1 choose-file-btn"
            onClick={() => openFilePicker(FILE_PICKER_MODE.REPLACE)}
            disabled={uploading}
          >
            <i className="bi bi-folder2-open me-2"></i>
            {selectedFiles.length > 0 ? t('documentUpload.replaceSelection') : t('documentUpload.chooseFiles')}
          </button>

          {selectedFiles.length > 0 && (
            <button
              type="button"
              className="btn btn-outline-primary add-files-btn"
              onClick={() => openFilePicker(FILE_PICKER_MODE.APPEND)}
              disabled={uploading}
            >
              <i className="bi bi-plus-circle me-2"></i>
              {t('documentUpload.addFiles')}
            </button>
          )}
        </div>

        {selectedFiles.length > 0 && (
          <div className="upload-selection-list mt-3">
            {selectedFiles.map((item) => (
              <div key={item.id} className="upload-selection-item">
                <div className="upload-selection-item-info">
                  <p className="mb-1 fw-semibold">{item.file.name}</p>
                  <p className="mb-0 text-muted small">{formatFileSize(item.file.size)}</p>
                  {item.error && <p className="mb-0 text-danger small mt-1">{item.error}</p>}
                </div>
                <div className="upload-selection-item-actions">
                  <span className={`badge ${getFileStatusClass(item.status)}`}>
                    {getFileStatusLabel(item.status)}
                  </span>
                  {!uploading && item.status !== FILE_STATUS.SUCCESS && (
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-muted p-0 remove-file-btn"
                      onClick={() => handleRemoveSelectedFile(item.id)}
                      aria-label={t('documentUpload.removeFile', { filename: item.file.name })}
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn btn-primary w-100 py-2 upload-btn"
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
            {t('documentUpload.uploadingBatch')}
          </>
        ) : (
          <>
            <i className="bi bi-upload me-2"></i>
            {t('documentUpload.uploadSelectedFiles')}
          </>
        )}
      </button>

      <div className="mt-4 text-center help-text">
        <small className="text-muted" style={{ whiteSpace: 'pre-line' }}>
          {t('documentUpload.supportedFormatsFooter')}
        </small>
      </div>
    </div>
  );
}

export default DocumentUploadForm;
