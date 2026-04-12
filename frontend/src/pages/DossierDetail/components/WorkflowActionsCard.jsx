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
  const showCreateForm = canCreateRubrique && !isFrozen;
  const showSubmitAction = (!canCreateRubrique || isFrozen) && canSubmitDossier && !isFrozen;
  const showProcessAction = canProcessDossier && !isFrozen;

  if (showCreateForm) {
    return (
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0 d-flex align-items-center">
            <i className="bi bi-gear me-2" />
            Workflow Actions
          </h6>
        </div>
        <div className="card-body">
          <form className="mb-0" onSubmit={handleCreateRubrique}>
            <div className="row g-2 align-items-start">
              <div className="col-lg-4">
                <label htmlFor="rubriqueTitle" className="form-label mb-1">Section Title</label>
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
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={isCreatingRubrique || !rubriqueTitle.trim()}
                  >
                    {isCreatingRubrique ? 'Creating...' : 'Create Section'}
                  </button>
                  {canSubmitDossier && !isFrozen && (
                    <button
                      type="button"
                      className="btn btn-outline-primary w-100"
                      onClick={requestSubmitDossier}
                      disabled={isSubmittingDossier}
                    >
                      {isSubmittingDossier ? 'Submitting...' : 'Submit Case File'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-4">
      <div className="workflow-action-toolbar">
        <h6 className="mb-0 d-flex align-items-center workflow-action-toolbar__title">
          <i className="bi bi-gear me-2" />
          Workflow Actions
        </h6>
        <div className="workflow-action-toolbar__controls">
          {showSubmitAction && (
            <button
              className="btn btn-outline-primary workflow-level-action-btn"
              onClick={requestSubmitDossier}
              disabled={isSubmittingDossier}
            >
              {isSubmittingDossier ? 'Submitting...' : 'Submit Case File'}
            </button>
          )}
          {showProcessAction && (
            <button
              className="btn btn-outline-success workflow-level-action-btn"
              onClick={requestProcessDossier}
              disabled={isProcessingDossier}
            >
              {isProcessingDossier ? 'Processing...' : 'Process Case File'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default WorkflowActionsCard;
