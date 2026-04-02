import { useEffect, useId, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

const getFocusableElements = (container) => {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    return !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true';
  });
};

function WorkspaceModalShell({
  isOpen,
  title,
  iconClass = '',
  children,
  onClose,
  isBusy = false,
  size = 'lg',
  bodyClassName = ''
}) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousActiveElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const dialogElement = dialogRef.current;

    document.body.style.overflow = 'hidden';

    const focusableElements = getFocusableElements(dialogElement);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      dialogElement?.focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (!isBusy) {
          event.preventDefault();
          onClose?.();
        }
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const elements = getFocusableElements(dialogElement);
      if (elements.length === 0) {
        event.preventDefault();
        dialogElement?.focus();
        return;
      }

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];
      const activeElement = document.activeElement;
      const activeInsideDialog = dialogElement?.contains(activeElement);

      if (!activeInsideDialog) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousActiveElement instanceof HTMLElement && document.contains(previousActiveElement)) {
        previousActiveElement.focus();
      }
    };
  }, [isBusy, isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !isBusy) {
      onClose?.();
    }
  };

  const sizeClass =
    size === 'xl'
      ? 'workspace-modal-dialog--xl'
      : size === 'upload'
        ? 'workspace-modal-dialog--upload'
        : size === 'md'
          ? ''
          : 'workspace-modal-dialog--lg';

  return (
    <div className="workspace-modal-backdrop" onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        className={`workspace-modal-dialog ${sizeClass}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="workspace-modal-header">
          <h2 id={titleId}>
            {iconClass ? <i className={`bi ${iconClass}`} aria-hidden="true"></i> : null}
            {title}
          </h2>
          <button
            type="button"
            className="workspace-modal-close"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Close"
          >
            <i className="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>
        <div
          className={['workspace-modal-body', bodyClassName].filter(Boolean).join(' ')}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default WorkspaceModalShell;
