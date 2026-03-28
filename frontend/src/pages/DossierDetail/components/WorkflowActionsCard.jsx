function WorkflowActionsCard({
  canCreateRubrique,
  isFrozen,
  handleCreateRubrique,
  rubriqueTitle,
  rubriqueNotes,
  setRubriqueTitle,
  setRubriqueNotes,
  isCreatingRubrique,
  canSubmitDossier,
  isSubmittingDossier,
  requestSubmitDossier,
  canProcessDossier,
  isProcessingDossier,
  requestProcessDossier
}) {
  return (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0 d-flex align-items-center">
          <i className="bi bi-gear me-2"></i>
          Workflow Actions
        </h6>
      </div>
      <div className="card-body">
        {(canCreateRubrique && !isFrozen) && (
          <form className="mb-4" onSubmit={handleCreateRubrique}>
            <div className="row g-2 align-items-end">
              <div className="col-lg-4">
                <label htmlFor="rubriqueTitle" className="form-label mb-1">Rubrique Title</label>
                <input
                  id="rubriqueTitle"
                  type="text"
                  className="form-control"
                  value={rubriqueTitle}
                  onChange={(event) => setRubriqueTitle(event.target.value)}
                  disabled={isCreatingRubrique}
                  placeholder="Ex: Pharmacy invoices"
                />
              </div>
              <div className="col-lg-5">
                <label htmlFor="rubriqueNotes" className="form-label mb-1">Notes (optional)</label>
                <input
                  id="rubriqueNotes"
                  type="text"
                  className="form-control"
                  value={rubriqueNotes}
                  onChange={(event) => setRubriqueNotes(event.target.value)}
                  disabled={isCreatingRubrique}
                  placeholder="Short internal note"
                />
              </div>
              <div className="col-lg-3">
                <button type="submit" className="btn btn-primary w-100" disabled={isCreatingRubrique || !rubriqueTitle.trim()}>
                  {isCreatingRubrique ? 'Creating...' : 'Create Rubrique'}
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="d-flex flex-wrap gap-2">
          {canSubmitDossier && !isFrozen && (
            <button
              className="btn btn-outline-primary"
              onClick={requestSubmitDossier}
              disabled={isSubmittingDossier}
            >
              {isSubmittingDossier ? 'Submitting...' : 'Submit Dossier'}
            </button>
          )}

          {canProcessDossier && !isFrozen && (
            <button
              className="btn btn-outline-success"
              onClick={requestProcessDossier}
              disabled={isProcessingDossier}
            >
              {isProcessingDossier ? 'Processing...' : 'Process Dossier'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default WorkflowActionsCard;
