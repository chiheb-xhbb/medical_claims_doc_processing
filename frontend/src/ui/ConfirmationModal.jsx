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

function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmingLabel = 'Processing...',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  initialFocus = 'confirm',
  isConfirming = false,
  onCancel,
  onConfirm
}) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousActiveElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const dialogElement = dialogRef.current;

    document.body.style.overflow = 'hidden';

    const preferredButton = initialFocus === 'cancel' ? cancelButtonRef.current : confirmButtonRef.current;
    if (preferredButton && !preferredButton.disabled) {
      preferredButton.focus();
    } else {
      dialogElement?.focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (!isConfirming) {
          event.preventDefault();
          onCancel?.();
        }
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements(dialogElement);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogElement?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
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
  }, [initialFocus, isConfirming, isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !isConfirming) {
      onCancel?.();
    }
  };

  return (
    <div
      className="dossier-modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="dossier-modal-card dossier-confirmation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? descriptionId : undefined}
        tabIndex={-1}
      >
        <div className="confirmation-modal-header mb-3">
          <h5 id={titleId} className="mb-0">{title}</h5>
        </div>

        {message && (
          <div className="confirmation-modal-body">
            <p id={descriptionId} className="text-muted mb-0">{message}</p>
          </div>
        )}

        <div className="confirmation-modal-footer d-flex justify-content-end gap-2 mt-4">
          <button
            ref={cancelButtonRef}
            className="btn btn-outline-secondary"
            onClick={onCancel}
            disabled={isConfirming}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            className={`btn btn-${confirmVariant}`}
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
