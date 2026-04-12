import { useRef, useState } from 'react';
import DossierModalShell from './DossierModalShell';

const ACTIONS = {
  approve: {
    label: 'Approve Escalation',
    icon: 'bi-check-circle',
    btnClass: 'btn-outline-success',
    noteRequired: false,
    notePlaceholder: 'Optional approval note...',
    noteLabel: 'Approval Note',
    noteOptional: true,
    confirmLabel: 'Approve',
    confirmingLabel: 'Approving...',
    confirmClass: 'btn-success',
  },
  return: {
    label: 'Return to Claims Manager',
    icon: 'bi-arrow-return-left',
    btnClass: 'btn-outline-warning',
    noteRequired: true,
    notePlaceholder: 'Explain the reason for returning this case file...',
    noteLabel: 'Return Note',
    noteOptional: false,
    confirmLabel: 'Return',
    confirmingLabel: 'Returning...',
    confirmClass: 'btn-warning',
  },
  complement: {
    label: 'Request Complement',
    icon: 'bi-file-earmark-plus',
    btnClass: 'btn-outline-secondary',
    noteRequired: true,
    notePlaceholder: 'Describe what information is missing...',
    noteLabel: 'Complement Request',
    noteOptional: false,
    confirmLabel: 'Send Request',
    confirmingLabel: 'Sending...',
    confirmClass: 'btn-primary',
  },
};

function SupervisorActionPanel({ onApprove, onReturn, onComplement, isBusy }) {
  const [activeAction, setActiveAction] = useState(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const noteRef = useRef(null);
  const confirmRef = useRef(null);

  const openAction = (actionKey) => {
    setActiveAction(actionKey);
    setNote('');
    setNoteError('');
  };

  const closeAction = () => {
    setActiveAction(null);
    setNote('');
    setNoteError('');
  };

  const handleConfirm = async () => {
    const config = ACTIONS[activeAction];
    if (!config) return;

    const trimmedNote = note.trim();

    if (config.noteRequired && !trimmedNote) {
      setNoteError(`${config.noteLabel} is required.`);
      noteRef.current?.focus();
      return;
    }

    setNoteError('');

    if (activeAction === 'approve') {
      await onApprove(trimmedNote || null);
    } else if (activeAction === 'return') {
      await onReturn(trimmedNote);
    } else if (activeAction === 'complement') {
      await onComplement(trimmedNote);
    }

    closeAction();
  };

  const config = activeAction ? ACTIONS[activeAction] : null;

  return (
    <>
      <div className="card mb-4 supervisor-action-panel">
        <div className="workflow-action-toolbar">
          <h6 className="mb-0 d-flex align-items-center workflow-action-toolbar__title">
            <i className="bi bi-shield-check me-2" aria-hidden="true" />
            Supervisor Decision
          </h6>
          <div className="workflow-action-toolbar__controls">
            {Object.entries(ACTIONS).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                className={`btn ${cfg.btnClass} workflow-level-action-btn`}
                onClick={() => openAction(key)}
                disabled={isBusy}
              >
                <i className={`bi ${cfg.icon} me-2`} aria-hidden="true" />
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {config && (
        <DossierModalShell
          isOpen={Boolean(activeAction)}
          title={config.label}
          onClose={closeAction}
          isBusy={isBusy}
          initialFocus="secondary"
          initialFocusRef={noteRef}
          primaryActionRef={confirmRef}
          className="dossier-decision-modal"
          footer={
            <>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={closeAction}
                disabled={isBusy}
              >
                Cancel
              </button>
              <button
                ref={confirmRef}
                type="button"
                className={`btn ${config.confirmClass}`}
                onClick={handleConfirm}
                disabled={isBusy || (config.noteRequired && !note.trim())}
              >
                {isBusy ? config.confirmingLabel : config.confirmLabel}
              </button>
            </>
          }
        >
          <div>
            <label
              htmlFor="supervisor-action-note"
              className="form-label workflow-modal-label"
            >
              {config.noteLabel}
              {config.noteOptional
                ? <span className="text-muted fw-normal ms-1">(optional)</span>
                : <span className="text-danger ms-1">*</span>
              }
            </label>
            <textarea
              id="supervisor-action-note"
              ref={noteRef}
              className={`form-control workflow-modal-textarea${noteError ? ' is-invalid' : ''}`}
              rows={3}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (noteError) setNoteError('');
              }}
              placeholder={config.notePlaceholder}
              disabled={isBusy}
            />
            {noteError && <div className="invalid-feedback">{noteError}</div>}
          </div>
        </DossierModalShell>
      )}
    </>
  );
}

export default SupervisorActionPanel;
