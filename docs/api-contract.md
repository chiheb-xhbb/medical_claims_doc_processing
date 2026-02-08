# API Contract v1 – Service IA (FastAPI)

## Objectif
Définir le contrat de l’API POST `/process` pour le traitement des documents médicaux (pharmacie, laboratoire, radiologie) afin de produire des données structurées.  
Cette version v1 est **figée** pour garantir l’intégration avec le backend Laravel et éviter toute rupture côté frontend.

---

## Endpoint
`POST /process`

### Requête

**Type** : `multipart/form-data`

| Champ | Type | Obligatoire | Description |
|-------|------|------------|------------|
| `file` | fichier (PDF, PNG, JPG) | Oui | Document médical à traiter |
| `doc_type` | string | Non | Type de document (ex: `pharmacy_invoice`, `lab_report`, `unknown`) |

---
### Types des champs
- invoice_date: string|null (format YYYY-MM-DD)
- provider_name: string|null
- total_ttc: number|null
- confidence: nombre entre 0.0 et 1.0
---
### Codes HTTP
- 200 OK : succès
- 400 Bad Request : fichier manquant ou format non supporté
- 500 Internal Server Error : erreur interne du pipeline IA
---

### Réponse JSON (v1)

```json
{
  "fields": {
    "invoice_date": "2026-02-08",
    "provider_name": "Pharmacie Centrale",
    "total_ttc": 180.50
  },
  "confidence": {
    "invoice_date": 0.95,
    "provider_name": 0.98,
    "total_ttc": 0.92
  },
  "warnings": [
    "OCR/extraction non implémenté – réponse factice"
  ],
  "errors": [],
  "meta": {
    "request_id": "uuid-v4",
    "doc_type": "pharmacy_invoice",
    "processing_time_ms": 1234,
    "ocr_engine": "PaddleOCR"
  }
}
