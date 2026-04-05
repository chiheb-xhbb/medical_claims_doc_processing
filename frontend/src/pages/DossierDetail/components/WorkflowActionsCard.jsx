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
          <form className="mb-0" onSubmit={handleCreateRubrique}>
            <div className="row g-2 align-items-start">
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
              <div className="col-lg-3 d-flex justify-content-lg-end">
                <div className="d-flex flex-column align-items-stretch gap-2 workflow-actions-stack">
                  <div className="text-muted small fw-semibold text-uppercase mb-0 workflow-actions-label">Workflow</div>
                  <button type="submit" className="btn btn-primary w-100" disabled={isCreatingRubrique || !rubriqueTitle.trim()}>
                    {isCreatingRubrique ? 'Creating...' : 'Create Rubrique'}
                  </button>

                  {canSubmitDossier && !isFrozen && (
                    <div>
                      <button
                        type="button"
                        className="btn btn-outline-primary w-100"
                        onClick={requestSubmitDossier}
                        disabled={isSubmittingDossier}
                      >
                        {isSubmittingDossier ? 'Submitting...' : 'Submit Dossier'}
                      </button>
                      <div className="text-muted small lh-sm mt-1 workflow-actions-helper">
                        Submits the dossier for review and locks preparation edits.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        )}

        <div className="d-flex flex-wrap gap-2 justify-content-end">
          {(!canCreateRubrique || isFrozen) && canSubmitDossier && !isFrozen && (
            <div className="d-flex flex-column align-items-stretch gap-2 workflow-actions-stack">
              <div className="text-muted small fw-semibold text-uppercase mb-0 workflow-actions-label">Workflow</div>
              <div>
                <button
                  className="btn btn-outline-primary w-100"
                  onClick={requestSubmitDossier}
                  disabled={isSubmittingDossier}
                >
                  {isSubmittingDossier ? 'Submitting...' : 'Submit Dossier'}
                </button>
                <div className="text-muted small lh-sm mt-1 workflow-actions-helper">
                  Submits the dossier for review and locks preparation edits.
                </div>
              </div>
            </div>
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
