import api from './api';

const DEFAULT_DOWNLOAD_FILENAME = 'document';
const OBJECT_URL_REVOKE_DELAY_MS = 60_000;
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*]/g;

const stripControlCharacters = (value) => {
  return Array.from(String(value)).filter((char) => char.charCodeAt(0) >= 32).join('');
};

const sanitizeFilename = (value) => {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    return '';
  }

  const sanitized = stripControlCharacters(normalized)
    .replace(INVALID_FILENAME_CHARS, '_')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/, '')
    .trim();

  return sanitized;
};

const decodeFilenameComponent = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const extractFilenameFromContentDisposition = (contentDisposition) => {
  if (!contentDisposition) {
    return '';
  }

  const utf8Match = contentDisposition.match(/filename\*=(?:UTF-8'')?([^;]+)/i);

  if (utf8Match?.[1]) {
    const raw = utf8Match[1].trim().replace(/^"|"$/g, '');
    const decoded = decodeFilenameComponent(raw);
    const sanitized = sanitizeFilename(decoded);

    if (sanitized) {
      return sanitized;
    }
  }

  const asciiMatch = contentDisposition.match(/filename=([^;]+)/i);

  if (asciiMatch?.[1]) {
    const raw = asciiMatch[1].trim().replace(/^"|"$/g, '');
    const sanitized = sanitizeFilename(raw);

    if (sanitized) {
      return sanitized;
    }
  }

  return '';
};

const resolveDownloadFilename = (providedFilename, headers) => {
  const safeProvided = sanitizeFilename(providedFilename);

  if (safeProvided) {
    return safeProvided;
  }

  const headerName = extractFilenameFromContentDisposition(headers?.['content-disposition']);

  if (headerName) {
    return headerName;
  }

  return DEFAULT_DOWNLOAD_FILENAME;
};

const revokeObjectUrlLater = (objectUrl) => {
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, OBJECT_URL_REVOKE_DELAY_MS);
};

export async function previewDocument(documentId) {
  if (!documentId) {
    throw new Error('Document ID is required for preview.');
  }

  let previewWindow = null;
  let objectUrl = null;

  try {
    previewWindow = window.open('', '_blank');

    const response = await api.get(`/documents/${documentId}/view`, {
      responseType: 'blob'
    });

    objectUrl = URL.createObjectURL(response.data);

    if (previewWindow && !previewWindow.closed) {
      previewWindow.location.href = objectUrl;
      revokeObjectUrlLater(objectUrl);
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.style.display = 'none';

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    revokeObjectUrlLater(objectUrl);
  } catch (error) {
    if (previewWindow && !previewWindow.closed) {
      previewWindow.close();
    }

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }

    throw error;
  }
}

export async function downloadDocument(documentId, originalFilename) {
  if (!documentId) {
    throw new Error('Document ID is required for download.');
  }

  const response = await api.get(`/documents/${documentId}/download`, {
    responseType: 'blob'
  });

  const resolvedFilename = resolveDownloadFilename(originalFilename, response.headers);
  const objectUrl = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = resolvedFilename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  revokeObjectUrlLater(objectUrl);
}