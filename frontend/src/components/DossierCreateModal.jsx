import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import WorkspaceModalShell from './WorkspaceModalShell';
import DossierCreateForm from './DossierCreateForm';

function DossierCreateModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  return (
    <WorkspaceModalShell
      isOpen={isOpen}
      title={t('dossierCreate.createCaseFile')}
      iconClass="bi-folder-plus"
      onClose={onClose}
      isBusy={busy}
      size="lg"
    >
      <DossierCreateForm
        onCancel={onClose}
        onBusyChange={setBusy}
        onSuccess={(id) => {
          onClose();
          if (id) {
            navigate(`/dossiers/${id}`);
          }
        }}
      />
    </WorkspaceModalShell>
  );
}

export default DossierCreateModal;
