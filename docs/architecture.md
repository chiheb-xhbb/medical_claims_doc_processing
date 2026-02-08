    # Architecture du projet PFE – Plateforme de traitement de documents médicaux (MVP)

    ## Objectif
    Décrire l’architecture globale du prototype (Proof of Concept) et clarifier les responsabilités de chaque composant avant l’implémentation. L’objectif est d’obtenir un système compréhensible, traçable et intégrable, avec un service IA découplé.

    ---

    ## Vue d’ensemble (composants)

    | Composant | Rôle | Responsabilités principales |
    |---|---|---|
    | **React Frontend** | Interface utilisateur | Upload de documents, affichage des champs extraits, correction Human-in-the-Loop (HITL), validation finale. |
    | **Laravel Backend (API)** | Orchestrateur + persistance | **Auth API (Laravel Sanctum) + contrôle d’accès**, validation fichiers (type MIME, taille), stockage local des documents, orchestration du workflow (statuts), persistance MySQL, historisation des résultats et corrections, appel du service IA. |
    | **FastAPI AI Service** | Traitement IA (OCR + extraction) | Prétraitement, OCR, extraction de champs, calcul de scores de confiance, retour d’un résultat structuré **sans persistance**. |
    | **MySQL** | Base de données | Stockage des métadonnées (documents, statuts, résultats, historique). |
    | **File Storage (local)** | Stockage fichiers | Conservation des documents originaux (prototype local). |

    ---

    ## Ports (en local)
    - **React (Vite)** : `http://localhost:5173`
    - **Laravel (artisan serve)** : `http://127.0.0.1:8000`
    - **FastAPI (uvicorn)** : `http://127.0.0.1:8001`

    ---

    ## Communication (protocoles et formats)

    ### Règle clé
    **React communique uniquement avec Laravel. FastAPI est appelé uniquement par Laravel.**

    ### 1) React → Laravel (Frontend → Backend)
    - **Protocole** : HTTP
    - **Style** : REST API
    - **Formats** :
    - **multipart/form-data** pour l’upload (fichier + métadonnées)
    - **application/json** pour les réponses (données extraites, statuts, erreurs)

    ### 2) Laravel → FastAPI (Backend → AI Service)
    - **Protocole** : HTTP
    - **Style** : REST API
    - **Requête** : `POST /process` en **multipart/form-data** (envoi du fichier + `doc_type` optionnel)
    - **Réponse** : `application/json` (champs extraits + confidence + warnings + meta)

    ### 3) Laravel → MySQL / Storage
    - Laravel est l’unique composant autorisé à :
    - écrire/lire dans MySQL
    - écrire/lire les fichiers sur le stockage local

    ---

    ## Responsabilités et règles d’ownership (décisions clés)

    ### Laravel = owner du workflow
    - Laravel possède l’état “source de vérité” :
    - stockage du fichier original (ex. `storage/app/documents/`)
    - statuts de traitement et orchestration
    - persistance des résultats IA
    - traçabilité des corrections

    ### FastAPI = stateless (découplé)
    - FastAPI ne stocke pas de fichiers
    - FastAPI n’accède pas à la base de données
    - FastAPI renvoie uniquement un résultat structuré (JSON)
    - Ce découplage réduit le risque et facilite l’évolution future (industrialisation possible)

    ---

    ## Workflow (statuts au niveau document – MVP)
    Statuts minimaux utilisés pour suivre l’avancement :
    - `UPLOADED` : fichier reçu, validé et stocké
    - `PROCESSING` : traitement IA en cours
    - `PROCESSED` : extraction IA terminée, résultat enregistré
    - `VALIDATED` : données revues/validées par l’utilisateur (HITL)
    - `FAILED` : erreur lors du traitement IA (message d’erreur enregistré)

    ---

    ## Données extraites (MVP)
    Champs ciblés dans la première version (contrat v1 figé) :
    - `invoice_date` : date du document / facture (format attendu : `YYYY-MM-DD` si possible)
    - `provider_name` : prestataire (pharmacie, laboratoire, clinique, etc.)
    - `total_ttc` : montant total

    Chaque champ est accompagné d’un score de confiance (0 à 1) afin d’assister la validation HITL.

    ---

    ## Typologie de documents (optionnel – MVP)
    Le champ `doc_type` peut être fourni (ou inféré plus tard) pour guider l’extraction, par exemple :
    - `pharmacy_invoice`
    - `lab_report`
    - `unknown`

    ---

    ## Traçabilité (MVP)
    - La réponse IA est enregistrée au format JSON et liée au document traité.
    - Les corrections humaines sont historisées (ancienne valeur, nouvelle valeur, utilisateur, date) afin d’assurer l’auditabilité.

    ---

    ## Remarque (cadre académique)
    La solution est développée comme **prototype académique (PoC)**, destinée à une exécution locale et des démonstrations. Le déploiement production (cloud, scalabilité avancée) est hors périmètre à ce stade.