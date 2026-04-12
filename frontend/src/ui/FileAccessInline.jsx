import './FileAccessInline.css';

const getFileIcon = (filename, mimeType) => {
  const mime = (mimeType || '').toLowerCase();
  const ext = (filename || '').split('.').pop().toLowerCase();

  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'bi-file-earmark-pdf';
  }

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return 'bi-file-earmark-image';
  }

  return 'bi-file-earmark';
};

function FileAccessInline({
  filename,
  mimeType,
  meta,
  onPreview,
  onDownload,
  isPreviewing = false,
  isDownloading = false,
  previewDisabled = false,
  downloadDisabled = false,
  className = '',
  title,
  inverted = false,
}) {
  const displayName = filename || 'Unnamed document';
  const iconClass = getFileIcon(filename, mimeType);
  const canPreview = typeof onPreview === 'function';
  const canDownload = typeof onDownload === 'function';
  const isPreviewBusy = isPreviewing || previewDisabled || !canPreview;
  const isDownloadBusy = isDownloading || downloadDisabled || !canDownload;

  const handlePreviewClick = (e) => {
    e.stopPropagation();

    if (!isPreviewBusy && onPreview) {
      onPreview();
    }
  };

  const handleDownloadClick = (e) => {
    e.stopPropagation();
    if (!isDownloadBusy && onDownload) {
      onDownload();
    }
  };

  const containerClass = [
    'file-access-inline',
    inverted ? 'file-access-inline--inverted' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={containerClass}>
      <button
        type="button"
        className="file-access-inline__preview"
        onClick={handlePreviewClick}
        disabled={isPreviewBusy}
        title={title || displayName}
        aria-label={`Preview ${displayName}`}
      >
        {isPreviewing ? (
          <span
            className="spinner-border spinner-border-sm file-access-inline__icon"
            role="status"
            aria-hidden="true"
          />
        ) : (
          <i className={`bi ${iconClass} file-access-inline__icon`} aria-hidden="true" />
        )}

        <span className="file-access-inline__body">
          <span className="file-access-inline__name">{displayName}</span>
          {meta && <span className="file-access-inline__meta">{meta}</span>}
        </span>
      </button>

      <button
        type="button"
        className="file-access-inline__download"
        onClick={handleDownloadClick}
        disabled={isDownloadBusy}
        title="Download original document"
        aria-label={`Download ${displayName}`}
      >
        {isDownloading ? (
          <span className="spinner-border" role="status" aria-hidden="true" />
        ) : (
          <i className="bi bi-download" aria-hidden="true" />
        )}
      </button>
    </span>
  );
}

export default FileAccessInline;
