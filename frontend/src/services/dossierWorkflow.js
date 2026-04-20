import api from './api';
import { DOSSIER_STATUSES } from '../constants/domainLabels';

const extractPageItems = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
};

export async function getDossierDetail(id) {
  const response = await api.get(`/dossiers/${id}`);
  return response.data || {};
}

export async function getDossierWorkflowEvents(id) {
  const response = await api.get(`/dossiers/${id}/workflow-events`);
  const payload = response.data || {};

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.events)) {
    return payload.events;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}

export async function createRubrique(dossierId, payload) {
  const response = await api.post(`/dossiers/${dossierId}/rubriques`, payload);
  return response.data || {};
}

export async function attachDocuments(rubriqueId, documentIds) {
  const response = await api.post(`/rubriques/${rubriqueId}/attach-documents`, {
    document_ids: documentIds
  });
  return response.data || {};
}

export async function detachDocument(rubriqueId, documentId) {
  const response = await api.delete(`/rubriques/${rubriqueId}/documents/${documentId}`);
  return response.data || {};
}

export async function submitDossier(id) {
  const response = await api.post(`/dossiers/${id}/submit`);
  return response.data || {};
}

export async function processDossier(id) {
  const response = await api.post(`/dossiers/${id}/process`);
  return response.data || {};
}

export async function acceptDocument(id, note) {
  const payload = note ? { decision_note: note } : {};
  const response = await api.post(`/documents/${id}/accept`, payload);
  return response.data || {};
}

export async function rejectDocument(id, note) {
  const payload = note ? { decision_note: note } : {};
  const response = await api.post(`/documents/${id}/reject`, payload);
  return response.data || {};
}

export async function rejectRubrique(rubriqueId, note) {
  const payload = note ? { decision_note: note } : {};
  const response = await api.post(`/rubriques/${rubriqueId}/reject-all`, payload);
  return response.data || {};
}

export async function deleteRubrique(rubriqueId) {
  const response = await api.delete(`/rubriques/${rubriqueId}`);
  return response.data || {};
}

export async function getValidatedDocuments() {
  let page = 1;
  let lastPage = 1;
  const allDocuments = [];

  do {
    const response = await api.get(`/documents?page=${page}`);
    const payload = response.data || {};

    allDocuments.push(...extractPageItems(payload));

    lastPage = Array.isArray(payload) ? 1 : Number(payload.last_page || 1);
    page += 1;
  } while (page <= lastPage);

  // Filter to VALIDATED status only. rubrique_id === null filtering is intentionally
  // deferred to the attachableDocuments memo in DossierDetail.jsx, which combines it
  // with the allAttachedDocumentIds exclusion set. The backend enforces both constraints
  // independently in RubriqueController::attachDocuments(). Verified safe.
  return allDocuments.filter((document) => document?.status === 'VALIDATED');
}

export async function escalateDossier(id, reason) {
  const response = await api.post(`/dossiers/${id}/escalate`, { escalation_reason: reason });
  return response.data || {};
}

export async function approveEscalation(id, note) {
  const response = await api.post(`/dossiers/${id}/chef/approve`, { decision_note: note });
  return response.data || {};
}

export async function returnToClaimsManager(id, note) {
  const response = await api.post(`/dossiers/${id}/chef/return`, { decision_note: note });
  return response.data || {};
}

export async function requestComplement(id, note) {
  const response = await api.post(`/dossiers/${id}/chef/request-complement`, { decision_note: note });
  return response.data || {};
}

export async function getPendingEscalations() {
  const response = await api.get('/dossiers', {
    params: { status: DOSSIER_STATUSES.IN_ESCALATION, per_page: 50, page: 1 }
  });
  const payload = response.data || {};

  if (Array.isArray(payload)) {
    return { items: payload, total: payload.length };
  }

  const items = Array.isArray(payload.data) ? payload.data : [];
  return { items, total: Number(payload.total ?? items.length) };
}

export async function returnDossierToPreparation(id, returnNote) {
  const response = await api.post(`/dossiers/${id}/return-to-preparation`, {
    return_note: returnNote,
  });

  return response.data;
}
