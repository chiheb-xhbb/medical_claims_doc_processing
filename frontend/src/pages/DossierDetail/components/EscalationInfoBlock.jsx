const DECISION_TYPE_LABELS = {
  APPROVED: 'Approved',
  RETURNED: 'Returned to Claims Manager',
  COMPLEMENT_REQUESTED: 'Complement Requested',
};

function EscalationInfoBlock({ dossier, formatDateTime }) {
  const hasEscalation = Boolean(dossier?.escalated_at);
  const hasSupervisorDecision = Boolean(dossier?.chef_decision_type);
  const escalatorName = dossier?.escalator?.name || dossier?.escalated_by;
  const supervisorDecisionMakerName = dossier?.chef_decision_maker?.name || dossier?.chef_decision_by;

  if (!hasEscalation && !hasSupervisorDecision) {
    return null;
  }

  return (
    <div className="card mb-4">
      <div className="card-header d-flex align-items-center gap-2">
        <i className="bi bi-diagram-3 text-muted" aria-hidden="true"></i>
        <h6 className="mb-0">Escalation &amp; Supervisor Review</h6>
      </div>
      <div className="card-body">
        <div className="row g-4">
          {hasEscalation && (
            <>
              {dossier.escalation_reason && (
                <div className="col-md-12">
                  <div className="detail-item">
                    <p className="detail-label mb-1">Escalation Reason</p>
                    <p className="detail-value mb-0">{dossier.escalation_reason}</p>
                  </div>
                </div>
              )}
              {escalatorName && (
                <div className="col-md-6 col-lg-4">
                  <div className="detail-item">
                    <p className="detail-label mb-1">Escalated By</p>
                    <p className="detail-value mb-0">{escalatorName}</p>
                  </div>
                </div>
              )}
              {dossier.escalated_at && (
                <div className="col-md-6 col-lg-4">
                  <div className="detail-item">
                    <p className="detail-label mb-1">Escalated At</p>
                    <p className="detail-value mb-0">{formatDateTime(dossier.escalated_at)}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {hasSupervisorDecision && (
            <>
              <div className="col-md-6 col-lg-4">
                <div className="detail-item">
                  <p className="detail-label mb-1">Supervisor Decision</p>
                  <p className="detail-value mb-0">
                    {DECISION_TYPE_LABELS[dossier.chef_decision_type] || dossier.chef_decision_type}
                  </p>
                </div>
              </div>
              {supervisorDecisionMakerName && (
                <div className="col-md-6 col-lg-4">
                  <div className="detail-item">
                    <p className="detail-label mb-1">Decision By</p>
                    <p className="detail-value mb-0">{supervisorDecisionMakerName}</p>
                  </div>
                </div>
              )}
              {dossier.chef_decision_at && (
                <div className="col-md-6 col-lg-4">
                  <div className="detail-item">
                    <p className="detail-label mb-1">Decision At</p>
                    <p className="detail-value mb-0">{formatDateTime(dossier.chef_decision_at)}</p>
                  </div>
                </div>
              )}
              {dossier.chef_decision_note && (
                <div className="col-md-12">
                  <div className="detail-item">
                    <p className="detail-label mb-1">Supervisor Note</p>
                    <p className="detail-value mb-0">{dossier.chef_decision_note}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default EscalationInfoBlock;
