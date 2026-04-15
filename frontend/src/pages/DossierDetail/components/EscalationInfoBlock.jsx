import { AuditTimeline } from '../../../ui';

function EscalationInfoBlock({ dossier, formatDateTime }) {
  const returnNote = dossier?.returned_to_preparation_note;
  const returnAt = dossier?.returned_to_preparation_at;

  const renderTimestamp = (value) => {
    if (!value) return null;
    return typeof formatDateTime === 'function' ? formatDateTime(value) : value;
  };

  return (
    <>
      <AuditTimeline dossier={dossier} formatDateTime={formatDateTime} />
      {returnNote && (
        <div className="card mb-4">
          <div className="card-header d-flex align-items-center gap-2">
            <i className="bi bi-arrow-return-left text-muted" aria-hidden="true" />
            <h6 className="mb-0">Return to Preparation</h6>
            {returnAt && (
              <span className="ms-auto text-muted small">{renderTimestamp(returnAt)}</span>
            )}
          </div>
          <div className="card-body py-3">
            <p className="mb-0 text-muted">{returnNote}</p>
          </div>
        </div>
      )}
    </>
  );
}

export default EscalationInfoBlock;
