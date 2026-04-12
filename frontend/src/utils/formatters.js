const MISSING_VALUE = '-';

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const AMOUNT_FORMATTER = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

export const formatShortDate = (value, fallback = MISSING_VALUE) => {
  const parsed = parseDate(value);
  return parsed ? SHORT_DATE_FORMATTER.format(parsed) : fallback;
};

export const formatDateTime = (value, fallback = MISSING_VALUE) => {
  const parsed = parseDate(value);
  return parsed ? DATE_TIME_FORMATTER.format(parsed) : fallback;
};

export const formatAmountTnd = (value, fallback = MISSING_VALUE) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return fallback;
  }

  return `${AMOUNT_FORMATTER.format(amount)} TND`;
};

export const formatDisplayAmountTnd = (value, fallback = MISSING_VALUE) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const numericValue = Number(value);

  if (Number.isFinite(numericValue)) {
    return formatAmountTnd(numericValue, fallback);
  }

  const textValue = String(value).trim();
  return textValue || fallback;
};

export const formatFileSize = (value, fallback = MISSING_VALUE) => {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes < 0) {
    return fallback;
  }

  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const normalizeDateInput = (value) => {
  if (!value) {
    return null;
  }

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
