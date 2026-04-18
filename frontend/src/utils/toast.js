import toast from 'react-hot-toast';

const BASE_OPTIONS = {
  duration: 3500,
};

const getCssVar = (name, fallback) => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  return value || fallback;
};

const buildVariant = ({ border, background, text, icon }) => ({
  style: {
    border: `1px solid ${getCssVar(border.name, border.fallback)}`,
    background: getCssVar(background.name, background.fallback),
    color: getCssVar(text.name, text.fallback),
  },
  iconTheme: {
    primary: getCssVar(icon.name, icon.fallback),
    secondary: '#ffffff',
  },
});

const successVariant = () =>
  buildVariant({
    border: { name: '--toast-success-border', fallback: '#bbf7d0' },
    background: { name: '--toast-success-bg', fallback: '#f0fdf4' },
    text: { name: '--toast-success-text', fallback: '#166534' },
    icon: { name: '--toast-success-icon', fallback: '#16a34a' },
  });

const dangerVariant = () =>
  buildVariant({
    border: { name: '--toast-danger-border', fallback: '#fecaca' },
    background: { name: '--toast-danger-bg', fallback: '#fff1f2' },
    text: { name: '--toast-danger-text', fallback: '#991b1b' },
    icon: { name: '--toast-danger-icon', fallback: '#dc2626' },
  });

const workflowVariant = () =>
  buildVariant({
    border: { name: '--toast-workflow-border', fallback: '#bfdbfe' },
    background: { name: '--toast-workflow-bg', fallback: '#eff6ff' },
    text: { name: '--toast-workflow-text', fallback: '#1d4ed8' },
    icon: { name: '--toast-workflow-icon', fallback: '#2563eb' },
  });

const errorVariant = () =>
  buildVariant({
    border: { name: '--toast-error-border', fallback: '#fecaca' },
    background: { name: '--toast-error-bg', fallback: '#fef2f2' },
    text: { name: '--toast-error-text', fallback: '#991b1b' },
    icon: { name: '--toast-error-icon', fallback: '#dc2626' },
  });

export const getToastMessage = (response, fallbackMessage) =>
  response?.message ||
  response?.data?.message ||
  fallbackMessage;

export const notifySuccess = (message, options = {}) =>
  toast.success(message, {
    ...BASE_OPTIONS,
    ...successVariant(),
    ...options,
  });

export const notifyDangerSuccess = (message, options = {}) =>
  toast.success(message, {
    ...BASE_OPTIONS,
    ...dangerVariant(),
    ...options,
  });

export const notifyWorkflowSuccess = (message, options = {}) =>
  toast.success(message, {
    ...BASE_OPTIONS,
    ...workflowVariant(),
    ...options,
  });

export const notifyError = (message, options = {}) =>
  toast.error(message, {
    ...BASE_OPTIONS,
    ...errorVariant(),
    ...options,
  });