import { CaseFileStatusBadge } from '../../../ui';

function DossierSummaryCard({ dossier, dossierData, formatAmount, formatDateTime, formatDisplayTotal }) {
  return (
    <div className="card mb-4 dossier-summary-card">
      <div className="card-header bg-primary text-white">
        <div className="dossier-summary-card__hero">
          <div className="dossier-summary-card__hero-id">
            <i className="bi bi-briefcase me-2" aria-hidden="true" />
            <span className="dossier-summary-card__case-number">
              {dossier.numero_dossier || 'Case File'}
            </span>
          </div>
          <div className="dossier-summary-card__status-block" aria-label="Case file status">
            <CaseFileStatusBadge status={dossier.status} variant="hero" />
          </div>
        </div>

        {dossier.assured_identifier && (
          <div className="dossier-summary-card__assured">
            <i className="bi bi-person-badge me-2 opacity-75" aria-hidden="true" />
            Assured: {dossier.assured_identifier}
          </div>
        )}
      </div>

      <div className="card-body">
        <div className="row g-2 mb-3 dossier-summary-card__totals-row">
          <div className="col-sm-6 col-lg-3">
            <div className="summary-detail-item summary-detail-item--total">
              <p className="summary-detail-label">Requested Total</p>
              <p className="summary-detail-value summary-detail-value--total">{formatAmount(dossierData?.requested_total)}</p>
            </div>
          </div>
          <div className="col-sm-6 col-lg-3">
            <div className="summary-detail-item summary-detail-item--total">
              <p className="summary-detail-label">Current Total</p>
              <p className="summary-detail-value summary-detail-value--total">{formatAmount(dossierData?.current_total)}</p>
            </div>
          </div>
          <div className="col-sm-6 col-lg-3">
            <div className="summary-detail-item summary-detail-item--total">
              <p className="summary-detail-label">Display Total</p>
              <p className="summary-detail-value summary-detail-value--total">{formatDisplayTotal(dossierData?.display_total)}</p>
            </div>
          </div>
          <div className="col-sm-6 col-lg-3">
            <div className="summary-detail-item summary-detail-item--total">
              <p className="summary-detail-label">Stored Total</p>
              <p className="summary-detail-value summary-detail-value--total">{formatAmount(dossier.montant_total)}</p>
            </div>
          </div>
        </div>

        <div className="row g-3">
          {dossier.episode_description && (
            <div className="col-md-6">
              <div className="summary-detail-item summary-detail-item--secondary">
                <p className="summary-detail-label">Episode Description</p>
                <p className="summary-detail-value">{dossier.episode_description}</p>
              </div>
            </div>
          )}
          {dossier.notes && (
            <div className="col-md-6">
              <div className="summary-detail-item summary-detail-item--secondary">
                <p className="summary-detail-label">Notes</p>
                <p className="summary-detail-value">{dossier.notes}</p>
              </div>
            </div>
          )}

          <div className="col-12">
            <div className="summary-meta-strip">
              <div className="summary-meta-item">
                <span className="summary-meta-item__label">Created</span>
                <span className="summary-meta-item__value">{formatDateTime(dossier.created_at)}</span>
              </div>
              <div className="summary-meta-item">
                <span className="summary-meta-item__label">Updated</span>
                <span className="summary-meta-item__value">{formatDateTime(dossier.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DossierSummaryCard;
