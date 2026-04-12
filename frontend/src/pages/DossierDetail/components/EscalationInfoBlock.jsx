import { AuditTimeline } from '../../../ui';

function EscalationInfoBlock({ dossier, formatDateTime }) {
  return <AuditTimeline dossier={dossier} formatDateTime={formatDateTime} />;
}

export default EscalationInfoBlock;
