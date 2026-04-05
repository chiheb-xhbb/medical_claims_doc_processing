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

function DossierModalShell({
  isOpen,
  title,
  description,
  children,
  footer,
  onClose,
  isBusy = false,
  initialFocus = 'primary',
  initialFocusRef,
  primaryActionRef,
  secondaryActionRef,
  className = ''
}) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const isBusyRef = useRef(isBusy);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    isBusyRef.current = isBusy;
  }, [isBusy]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousActiveElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const dialogElement = dialogRef.current;

    document.body.style.overflow = 'hidden';

    const preferredElement = initialFocusRef?.current || (
      initialFocus === 'secondary'
        ? secondaryActionRef?.current
        : initialFocus === 'primary'
          ? primaryActionRef?.current
          : null
    );

    if (preferredElement && !preferredElement.disabled) {
      preferredElement.focus();
    } else {
      const focusableElements = getFocusableElements(dialogElement);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        dialogElement?.focus();
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (!isBusyRef.current) {
          event.preventDefault();
          onCloseRef.current?.();
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
  }, [
    isOpen,
    initialFocus,
    initialFocusRef,
    primaryActionRef,
    secondaryActionRef
  ]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !isBusy) {
      onClose?.();
    }
  };

  return (
    <div className="dossier-modal-backdrop" onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        className={`dossier-modal-card dossier-workflow-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <div className="dossier-modal-shell-header">
          <h5 id={titleId} className="mb-0">{title}</h5>
        </div>

        <div className="dossier-modal-shell-body">
          {description && (
            <p id={descriptionId} className="text-muted mb-0">
              {description}
            </p>
          )}
          {children}
        </div>

        {footer && (
          <div className="dossier-modal-shell-footer d-flex justify-content-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default DossierModalShell;
