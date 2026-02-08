# Flux de traitement des documents médicaux (Day 2)

## Objectif
Décrire le flux minimal (MVP) de traitement d’un document médical (pharmacie, laboratoire, radiologie) afin de produire des données structurées, en garantissant que **Laravel est responsable du workflow et du stockage**, et que **FastAPI reste stateless**.

---

## Flux principal (MVP)

1. L’utilisateur téléverse un document médical (PDF ou image) via l’interface React.
2. React envoie le fichier au backend Laravel via une API REST (ex. `POST /api/documents`) en **multipart/form-data**.
3. Laravel valide le fichier (type MIME, taille, extension).
   - Si invalide : Laravel retourne une erreur au frontend.
4. Laravel stocke le fichier original localement (ex. `storage/app/documents/`) et crée un enregistrement dans `documents` avec :
   - `status = UPLOADED`
   - lien vers un dossier de remboursement (`dossier_id` ou `claim_id`, optionnel selon le périmètre MVP)
5. Laravel passe le document au statut `PROCESSING`.
6. Laravel envoie le fichier à FastAPI via `POST /process`.
7. FastAPI exécute le pipeline (logique détaillée implémentée plus tard) :
   - Prétraitement → OCR → extraction de champs
   - Retourne un JSON structuré contenant `fields`, `confidence`, `warnings`, `meta`
   - FastAPI ne persiste rien (stateless : pas de stockage fichier, pas de base de données)
8. Laravel enregistre la sortie IA en JSON lié au document (JSON brut + métadonnées) et met à jour le statut :
   - si succès : `PROCESSED`
   - si échec : `FAILED` (et enregistre le message d’erreur associé)
9. L’interface React affiche les champs extraits à l’utilisateur pour vérification (Human-in-the-Loop).
10. L’utilisateur corrige et valide les champs si nécessaire.
11. Laravel sauvegarde les valeurs finales et l’historique des corrections, puis met le statut à `VALIDATED`.

---

## Statuts des documents (MVP)
- `UPLOADED` : fichier reçu, validé et stocké
- `PROCESSING` : traitement IA en cours
- `PROCESSED` : extraction IA terminée, résultat enregistré
- `VALIDATED` : données revues/validées par l’utilisateur (HITL)
- `FAILED` : erreur lors du traitement IA (message d’erreur enregistré)

---

## Règles clés
- Laravel : stockage des fichiers, workflow/statuts, persistance base de données, orchestration des appels vers FastAPI
- FastAPI : pipeline OCR/extraction, stateless (aucune persistance)
- React : interface utilisateur (upload, affichage, correction, validation)
- Traçabilité : la réponse IA est stockée (JSON) dans `extractions` et les corrections sont historisées