import { useState } from 'react';
import WorkspaceModalShell from './WorkspaceModalShell';
import DocumentUploadForm from './DocumentUploadForm';

function DocumentUploadModal({ isOpen, onClose, onUploaded }) {
  const [busy, setBusy] = useState(false);

  return (
    <WorkspaceModalShell
      isOpen={isOpen}
      title="Upload Documents"
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
