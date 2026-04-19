import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import WorkspaceModalShell from './WorkspaceModalShell';
import DocumentUploadForm from './DocumentUploadForm';

function DocumentUploadModal({ isOpen, onClose, onUploaded }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  return (
    <WorkspaceModalShell
      isOpen={isOpen}
      title={t('documentUpload.title')}
      iconClass="bi-cloud-upload"
      onClose={onClose}
      isBusy={busy}
      size="upload"
      bodyClassName="workspace-modal-body--upload"
    >
      <DocumentUploadForm
        onBusyChange={setBusy}
        onCompleteSuccess={() => {
          onUploaded?.();
          onClose();
        }}
      />
    </WorkspaceModalShell>
  );
}

export default DocumentUploadModal;
