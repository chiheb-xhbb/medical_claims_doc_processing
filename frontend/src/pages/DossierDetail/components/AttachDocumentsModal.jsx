import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, Loader } from '../../../ui';
import DossierModalShell from './DossierModalShell';

function AttachDocumentsModal({
  isOpen,
  attachTargetRubrique,
  isLoadingValidatedDocuments,
  attachableDocuments,
  selectedDocumentIds,
  handleToggleDocument,
  isAttachingByRubriqueId,
  handleAttachDocuments,
  closeAttachModal
}) {
  const { t } = useTranslation();
  const cancelButtonRef = useRef(null);
  const attachButtonRef = useRef(null);

  if (!isOpen) {
    return null;
  }

  const isAttaching = Boolean(isAttachingByRubriqueId[attachTargetRubrique?.id] || false);

  return (
    <DossierModalShell
      isOpen={isOpen}
      title={t('workflow.attachValidatedDocuments')}
      description={
        <>
          {t('workflow.targetSectionLabel')}: <strong>{attachTargetRubrique?.title || '-'}</strong>
        </>
      }
      onClose={closeAttachModal}
      isBusy={isAttaching}
      initialFocus="primary"
      primaryActionRef={attachButtonRef}
      secondaryActionRef={cancelButtonRef}
      footer={(
        <>
          <button
            ref={cancelButtonRef}
            className="btn btn-outline-secondary"
            onClick={closeAttachModal}
            disabled={isAttaching}
          >
            {t('actions.cancel')}
          </button>
          <button
            ref={attachButtonRef}
            className="btn btn-primary"
            onClick={handleAttachDocuments}
            disabled={
              !attachTargetRubrique?.id ||
              isAttaching ||
              selectedDocumentIds.length === 0
            }
          >
            {isAttaching
              ? t('workflow.attachingDocuments')
              : t('workflow.attachSelected', { count: selectedDocumentIds.length })}
          </button>
        </>
      )}
    >
      {isLoadingValidatedDocuments ? (
        <Loader message={t('workflow.loadingValidatedDocuments')} size="sm" />
      ) : attachableDocuments.length === 0 ? (
        <EmptyState
          icon="check2-square"
          title={t('workflow.noAttachableDocumentsTitle')}
          description={t('workflow.noAttachableDocumentsDescription')}
        />
      ) : (
        <div className="attach-docs-list">
          {attachableDocuments.map((doc) => (
            <label key={doc.id} className="attach-doc-item">
              <input
                type="checkbox"
                className="form-check-input me-3"
                checked={selectedDocumentIds.includes(doc.id)}
                onChange={() => handleToggleDocument(doc.id)}
                disabled={isAttaching}
              />
              <span className="fw-medium">{doc.original_filename || `${t('domain.document')} #${doc.id}`}</span>
              <span className="text-muted small ms-2">#{doc.id}</span>
            </label>
          ))}
        </div>
      )}
    </DossierModalShell>
  );
}

export default AttachDocumentsModal;
