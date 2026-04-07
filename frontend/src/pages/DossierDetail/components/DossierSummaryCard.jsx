function getDossierStatusClass(status) {
  switch ((status || '').toUpperCase()) {
    case 'EN_DEROGATION': return 'badge dossier-status dossier-status--en-derogation';
    case 'COMPLEMENT_ATTENDU': return 'badge dossier-status dossier-status--complement-attendu';
    case 'PROCESSED': return 'badge dossier-status dossier-status--processed';
    case 'TO_VALIDATE': return 'badge dossier-status dossier-status--to-validate';
    default: return 'badge bg-primary-subtle text-primary-emphasis dossier-status';
  }
}

function DossierSummaryCard({ dossier, dossierData, formatAmount, formatDateTime, formatDisplayTotal }) {
  return (
    <div className="card mb-4">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0 d-flex align-items-center">
          <i className="bi bi-briefcase me-2"></i>
          {dossier.numero_dossier || 'Dossier'}
        </h5>
      </div>
      <div className="card-body">
        <div className="row g-4">
          <div className="col-md-6 col-lg-4">
            <div className="detail-item">
              <p className="detail-label mb-1">Assured Identifier</p>
              <p className="detail-value mb-0">{dossier.assured_identifier || '-'}</p>
            </div>
          </div>
          <div className="col-md-6 col-lg-4">
            <div className="detail-item">
              <p className="detail-label mb-1">Status</p>
              <p className="detail-value mb-0">
                <span className={getDossierStatusClass(dossier.status)}>{dossier.status || '-'}</span>
              </p>
            </div>
          </div>
          <div className="col-md-6 col-lg-4">
            <div className="detail-item">
              <p className="detail-label mb-1">Stored Total</p>
              <p className="detail-value mb-0">{formatAmount(dossier.montant_total)}</p>
            </div>
          </div>
          <div className="col-md-6">
            <div className="detail-item">
              <p className="detail-label mb-1">Episode Description</p>
              <p className="detail-value mb-0">{dossier.episode_description || '-'}</p>
            </div>
          </div>
          <div className="col-md-6">
            <div className="detail-item">
              <p className="detail-label mb-1">Notes</p>
              <p className="detail-value mb-0">{dossier.notes || '-'}</p>
            </div>
          </div>
          <div className="col-md-6 col-lg-4">
            <div className="detail-item">
              <p className="detail-label mb-1">Created At</p>
              <p className="detail-value mb-0">{formatDateTime(dossier.created_at)}</p>
            </div>
          </div>
          <div className="col-md-6 col-lg-4">
            <div className="detail-item">
              <p className="detail-label mb-1">Updated At</p>
              <p className="detail-value mb-0">{formatDateTime(dossier.updated_at)}</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="detail-item">
              <p className="detail-label mb-1">Requested Total</p>
              <p className="detail-value mb-0">{formatAmount(dossierData?.requested_total)}</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="detail-item">
              <p className="detail-label mb-1">Current Total</p>
              <p className="detail-value mb-0">{formatAmount(dossierData?.current_total)}</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="detail-item">
              <p className="detail-label mb-1">Display Total</p>
              <p className="detail-value mb-0">{formatDisplayTotal(dossierData?.display_total)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DossierSummaryCard;
