# Database Design (Conceptual) – MVP

## Objectif
Définir une conception **conceptuelle** de la base de données (sans SQL ni migrations) pour supporter le MVP :
- upload et stockage de documents médicaux
- traitement IA via FastAPI (`/process`)
- persistance des résultats extraits (JSON)
- correction/validation Human-in-the-Loop (HITL)
- traçabilité (audit)

> Règle d’architecture : **Laravel** est responsable de la persistance (DB + fichiers). **FastAPI** est stateless.

---

## Vue d’ensemble (entités)
- **documents** : représente un document médical uploadé + son état (workflow).
- **ai_requests** : trace chaque appel du backend vers le service IA.
- **extractions** : stocke le résultat IA (JSON) lié à un document.
- **field_corrections** : historise les corrections humaines champ par champ.

---

## 1) Table `documents`
**But** : stocker les métadonnées du fichier et suivre le workflow du document.

Champs recommandés (MVP) :
- `id` (PK)
- `user_id` (FK, nullable si pas d’auth au début) : propriétaire du document
- `original_filename` : nom d’origine du fichier (ex. `scan_001.pdf`)
- `file_path` : chemin de stockage côté serveur (ex. `documents/uuid.pdf`)
- `mime_type` : type MIME (ex. `application/pdf`, `image/png`)
- `doc_type` : type métier (`pharmacy_invoice`, `lab_report`, `unknown`)
- `status` : `UPLOADED | PROCESSING | PROCESSED | VALIDATED | FAILED`
- `error_message` (nullable) : dernière erreur globale liée au document (si `FAILED`)
- `created_at`, `updated_at`

Notes :
- Le fichier **n’est jamais stocké en base**, uniquement son `file_path`.
- Le `status` est la “source de vérité” du workflow côté Laravel.

---

## 2) Table `ai_requests`
**But** : tracer chaque interaction Laravel → FastAPI (monitoring, debug, performance).

Champs recommandés (MVP) :
- `id` (PK)
- `document_id` (FK → documents.id)
- `request_id` : identifiant retourné par FastAPI (UUID)
- `doc_type_sent` (nullable) : valeur de `doc_type` envoyée à l’IA
- `http_status` (nullable) : code HTTP de réponse (200/400/500…)
- `status` : `SUCCESS | FAILED`
- `processing_time_ms` (nullable) : temps de traitement mesuré (si disponible)
- `error_message` (nullable) : erreur technique si échec
- `created_at`

Notes :
- Un document peut avoir plusieurs requêtes IA (retraitement).
- Utile pour ton rapport : métriques de temps moyen par document.

---

## 3) Table `extractions`
**But** : stocker les résultats structurés renvoyés par FastAPI, au format JSON, et les lier au document.

Champs recommandés (MVP) :
- `id` (PK)
- `document_id` (FK → documents.id)
- `ai_request_id` (FK → ai_requests.id, nullable) : lien vers l’appel IA correspondant
- `result_json` : JSON brut retourné par l’IA (fields + confidence + meta + warnings + errors)
- `version` (int, default 1) : versionnement simple des extractions
- `created_at`

Notes :
- `result_json` permet de garder l’output exact de l’IA (traçabilité).
- `version` permet de comparer plusieurs extractions si on relance le traitement.

---

## 4) Table `field_corrections`
**But** : historiser les corrections HITL (audit et traçabilité).

Champs recommandés (MVP) :
- `id` (PK)
- `document_id` (FK → documents.id)
- `field_name` : nom du champ corrigé (ex. `provider_name`, `total_ttc`)
- `old_value` (nullable) : valeur avant correction (souvent issue de l’IA)
- `new_value` (nullable) : valeur saisie/validée par l’utilisateur
- `corrected_by` (FK → users.id, nullable) : utilisateur ayant corrigé
- `corrected_at` (datetime)
- `comment` (nullable) : justification courte si nécessaire

Notes :
- Ne pas modifier silencieusement les valeurs : on garde l’historique.
- Permet d’évaluer les erreurs IA (utile pour analytics/rapport).

---

## Relations (résumé)
- `documents (1) → (N) ai_requests`
- `documents (1) → (N) extractions`
- `ai_requests (1) → (0..1) extractions` (optionnel selon implémentation)
- `documents (1) → (N) field_corrections`

---

## Règles de persistance (responsabilités)
- **Stockage fichier** : Laravel enregistre le fichier dans `storage/app/...` et sauvegarde `file_path` dans `documents`.
- **Résultat IA** : Laravel sauvegarde la réponse FastAPI en JSON (dans `extractions.result_json`).
- **Corrections** : Laravel sauvegarde les modifications HITL champ par champ dans `field_corrections`.
- **FastAPI** : aucun accès DB, aucune persistance.

---

## Évolution future (hors MVP, optionnel)
- Ajout d’une table `document_fields` pour stocker directement les valeurs finales structurées (si besoin de requêtes SQL avancées).
- Ajout d’une table `document_pages` si traitement page par page.
- Ajout d’analytics (taux d’erreur par champ, temps moyen, etc.).