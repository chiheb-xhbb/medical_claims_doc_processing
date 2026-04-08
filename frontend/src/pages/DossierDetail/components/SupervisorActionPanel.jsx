import { useRef, useState } from 'react';

const ACTIONS = {
  approve: {
    label: 'Approve Escalation',
    icon: 'bi-check-circle',
    btnClass: 'btn-outline-success',
    noteRequired: false,
    notePlaceholder: 'Optional approval note...',
    noteLabel: 'Approval Note (optional)',
    confirmLabel: 'Approve',
    confirmingLabel: 'Approving...',
    confirmClass: 'btn-success',
  },
  return: {
    label: 'Return to Claims Manager',
    icon: 'bi-arrow-return-left',
    btnClass: 'btn-outline-warning',
    noteRequired: true,
    notePlaceholder: 'Required - explain the reason for returning this case file...',
    noteLabel: 'Return Note (required)',
    confirmLabel: 'Return',
    confirmingLabel: 'Returning...',
    confirmClass: 'btn-warning',
  },
  complement: {
    label: 'Request Complement',
    icon: 'bi-file-earmark-plus',
    btnClass: 'btn-outline-secondary',
    noteRequired: true,
    notePlaceholder: 'Required - describe what information is missing...',
    noteLabel: 'Complement Request (required)',
    confirmLabel: 'Request Complement',
    confirmingLabel: 'Sending...',
    confirmClass: 'btn-primary',
  },
};

function SupervisorActionPanel({ onApprove, onReturn, onComplement, isBusy }) {
  const [activeAction, setActiveAction] = useState(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const noteRef = useRef(null);

  const selectAction = (actionKey) => {
    setActiveAction(actionKey);
    setNote('');
    setNoteError('');
    setTimeout(() => noteRef.current?.focus(), 50);
  };

  const cancelAction = () => {
    setActiveAction(null);
    setNote('');
    setNoteError('');
  };

  const handleConfirm = async () => {
    const config = ACTIONS[activeAction];
    if (!config) return;

    const trimmedNote = note.trim();

    if (config.noteRequired && !trimmedNote) {
      setNoteError(`${config.noteLabel.replace(' (required)', '')} is required.`);
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

    cancelAction();
  };

  const config = activeAction ? ACTIONS[activeAction] : null;

  return (
    <div className="card mb-4 supervisor-action-panel">
      <div className="card-header d-flex align-items-center gap-2">
        <i className="bi bi-shield-check text-muted" aria-hidden="true"></i>
        <h6 className="mb-0">Supervisor Decision</h6>
      </div>
      <div className="card-body">
        {!activeAction ? (
          <div className="d-flex flex-wrap gap-2">
            {Object.entries(ACTIONS).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                className={`btn ${cfg.btnClass}`}
                onClick={() => selectAction(key)}
                disabled={isBusy}
              >
                <i className={`bi ${cfg.icon}`} aria-hidden="true"></i>
                {cfg.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="supervisor-action-form">
            <p className="fw-semibold mb-3">
              <i className={`bi ${config.icon} me-2`} aria-hidden="true"></i>
              {config.label}
            </p>

            <div className="mb-3">
              <label htmlFor="supervisor-action-note" className="form-label">
                {config.noteLabel}
              </label>
              <textarea
                id="supervisor-action-note"
                ref={noteRef}
                className={`form-control${noteError ? ' is-invalid' : ''}`}
                rows={3}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (noteError) setNoteError('');
                }}
                placeholder={config.notePlaceholder}
                disabled={isBusy}
              />
              {noteError && (
                <div className="invalid-feedback">{noteError}</div>
              )}
            </div>

            <div className="d-flex gap-2 justify-content-end">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={cancelAction}
                disabled={isBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${config.confirmClass}`}
                onClick={handleConfirm}
                disabled={isBusy}
              >
                {isBusy ? config.confirmingLabel : config.confirmLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SupervisorActionPanel;
