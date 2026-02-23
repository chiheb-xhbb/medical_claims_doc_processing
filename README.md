# Plateforme intelligente de traitement des documents médicaux

[![Status](https://img.shields.io/badge/status-MVP%20Beta-blue)](./)
[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Bootstrap-brightgreen)](./)
[![Backend](https://img.shields.io/badge/backend-Laravel%20API-orange)](./)
[![AI](https://img.shields.io/badge/AI-FastAPI%20%2B%20Tesseract%20OCR-red)](./)
[![Database](https://img.shields.io/badge/database-MySQL-lightgrey)](./)

Plateforme MVP d’automatisation du traitement des documents médicaux (factures, notes d’honoraires, etc.) pour l’assurance santé, combinant **OCR**, **règles métiers**, **Human-in-the-Loop**, **versioning** et **audit trail**.

---

## Table des matières

1. [Présentation du projet](#présentation-du-projet)  
2. [Architecture du système](#architecture-du-système)  
   - [Vue d’ensemble](#vue-densemble)  
   - [Diagramme d’architecture](#diagramme-darchitecture)  
3. [Workflow fonctionnel](#workflow-fonctionnel)  
4. [Fonctionnalités principales](#fonctionnalités-principales)  
5. [Exemple d’API REST](#exemple-dapi-rest)  
6. [Prérequis et environnement](#prérequis-et-environnement)  
7. [Installation et lancement](#installation-et-lancement)  
8. [Structure du projet](#structure-du-projet)  
9. [Limitations du MVP](#limitations-du-mvp)  
10. [Améliorations prévues](#améliorations-prévues)  
11. [Contexte académique](#contexte-académique)  
12. [Auteur](#auteur)  
13. [Licence](#licence)

---

## Présentation du projet

Ce projet s’inscrit dans le cadre d’un **Projet de Fin d’Études (PFE)** et porte sur la conception et l’implémentation d’une plateforme intelligente dédiée à l’**automatisation du traitement des documents médicaux** dans le domaine de l’assurance santé.

**Objectifs principaux :**

- Réduire le **temps de traitement manuel** des documents
- Améliorer la **fiabilité des données extraites** (OCR + règles métiers)
- Mettre en place un système **sécurisé**, avec **traçabilité complète** (audit trail)
- Intégrer un mécanisme **Human-in-the-Loop** pour la validation des extractions
- Assurer le **versioning** des extractions et des corrections

La plateforme combine **OCR**, **extraction structurée**, **règles métiers**, **validation humaine**, **versioning** et **journalisation des actions** au sein d’une architecture distribuée.

---

## Architecture du système

### Vue d’ensemble

L’application repose sur une **architecture distribuée multi-couches** :

| Couche          | Technologie                        | Rôle principal                                              |
| --------------- | ---------------------------------- | ----------------------------------------------------------- |
| Frontend        | React + Bootstrap                  | Interface utilisateur, visualisation, validation/correction |
| Backend         | Laravel (API REST, Sanctum)        | Logique métier, sécurité, orchestration, audit, versioning  |
| Service IA      | FastAPI (Python, Tesseract, OpenCV)| OCR, prétraitement d’images, extraction de champs           |
| Base de données | MySQL                              | Persistance, cohérence, audit trail, historique des versions|

**Principes architecturaux :**

- **Séparation claire des responsabilités** : UI, logique métier et traitement d’image sont découplés.
- **Service IA stateless** : FastAPI gère le prétraitement et l’OCR, puis renvoie les données extraites au backend.
- **Backend comme source de vérité** : statuts, versioning, audit trail, règles métiers et transactions atomiques.
- **Communication REST** entre les composants (frontend ↔ backend ↔ service IA).


---

## Workflow fonctionnel

### Cycle de traitement d’un document

1. **Upload du document** (image ou PDF) via l’interface React  
2. **Appel du service IA FastAPI** pour :
   - Prétraitement d’image (OpenCV – niveau MVP)
   - Reconnaissance optique de caractères (**Tesseract OCR**)
   - Extraction structurée des champs :
     - Date de facture
     - Prestataire / fournisseur
     - Montant total TTC
3. **Calcul d’un score de confiance** par champ (OCR / extraction)
4. **Application des règles métiers** dans le backend Laravel
5. **Intervention Human-in-the-Loop** :
   - Visualisation du document et des champs extraits
   - Correction des champs à faible confiance ou incohérents
6. **Validation** et **enregistrement** :
   - Création d’une nouvelle **version** d’extraction
   - Mise à jour du **statut** du document
   - Enregistrement d’une entrée dans le **journal d’audit**

### Cycle des statuts

Le document suit typiquement le cycle :

`UPLOADED → PROCESSING → PROCESSED → VALIDATED / FAILED`

Ces statuts sont gérés côté backend et exposés au frontend via l’API REST.

---

## Fonctionnalités principales

### 1. Upload et gestion des documents

- Support des formats **image** et **PDF** (niveau MVP)
- Suivi du **statut de traitement** (UPLOADED, PROCESSING, PROCESSED, VALIDATED, FAILED)
- Association des extractions successives à un même document (versioning)

### 2. OCR et extraction automatique

- Utilisation de **Tesseract OCR** via un service **FastAPI**
- Prétraitement basique avec **OpenCV** (redressement simple, nettoyage léger – selon implémentation)
- Extraction des champs clés :
  - Date de facture
  - Nom du prestataire / fournisseur
  - Montant total TTC
- Calcul d’un **score de confiance** par champ
- Détection des champs à **faible confiance** pour revue humaine

### 3. Validation Human-in-the-Loop

- Interface React dédiée à la **correction** des champs extraits
- Possibilité de modifier et valider chaque champ individuellement
- Validation finale de l’extraction par un utilisateur habilité
- Marquage des champs comme **validés** pour une version donnée

### 4. Versioning et traçabilité (audit trail)

- **Version 1** : extraction IA initiale (OCR)
- **Versions suivantes** : corrections et validations humaines successives
- Journalisation fine des corrections :

  - Champ modifié
  - Ancienne valeur
  - Nouvelle valeur
  - Utilisateur
  - Date et heure

- Conservation de l’historique complet des versions pour **audit** et **traçabilité**

### 5. Règles métiers intégrées

- Avertissement si **date de facture dans le futur**
- Rejet des **montants nuls ou négatifs**
- Signalement des **montants élevés** (seuil configurable dans la configuration / code)
- Vérifications basiques d’intégrité (champs obligatoires, formats, etc.)

### 6. Sécurité et cohérence des données

- **Authentification** basée sur **Laravel Sanctum**
- Protection des **routes API** et des vues critiques du frontend
- **Transactions atomiques** pour les opérations critiques (validation, versioning, audit)  
  → soit toutes les opérations réussissent, soit aucune n’est appliquée
- Gestion des **sessions expirées** et redirection côté frontend

---

## Exemple d’API REST

*(Les endpoints exacts peuvent varier selon l’implémentation réelle.)*

| Méthode | Endpoint                          | Description                                      |
| ------- | --------------------------------- | ------------------------------------------------ |
| POST    | `/api/auth/login`                | Authentification de l’utilisateur                |
| POST    | `/api/documents`                 | Upload d’un document et démarrage du traitement  |
| GET     | `/api/documents`                 | Liste paginée des documents                      |
| GET     | `/api/documents/{id}`            | Détails d’un document et dernière extraction     |
| POST    | `/api/documents/{id}/validate`   | Validation/correction Human-in-the-Loop          |
| GET     | `/api/documents/{id}/versions`   | Historique des versions d’extraction             |
| GET     | `/api/audit`                     | Consultation du journal d’audit (selon droits)   |

Le backend Laravel orchestre les appels au service FastAPI (par ex. `/ocr/extract`) et persiste les données dans MySQL.

---

## Prérequis et environnement

Pour exécuter le projet en environnement de développement :

- **Système** : Windows / Linux / macOS
- **Node.js** : v18+  
- **npm** : v9+ (ou Yarn équivalent)
- **PHP** : v8.1+  
- **Composer** : v2+
- **Python** : v3.10+  
- **MySQL** : v8+ (ou MariaDB compatible)
- **Tesseract OCR** : installé sur le système et accessible dans le PATH
- **Outils Python** : `pip`, `virtualenv` (recommandé)

---

## Installation et lancement

### 1. Clonage du dépôt

```bash
git clone https://github.com/votre-utilisateur/votre-repo.git
cd votre-repo
```

### 2. Backend (Laravel)

```bash
cd backend
composer install
cp .env.example .env

# Configurer la connexion MySQL dans .env, puis :
php artisan key:generate
php artisan migrate

# Lancer le serveur Laravel (par défaut sur http://127.0.0.1:8000)
php artisan serve
```

### 3. Service IA (FastAPI)

```bash
cd ai
# (optionnel) python -m venv venv && source venv/bin/activate  # ou .\venv\Scripts\activate sous Windows
pip install -r requirements.txt

# Lancer le service FastAPI (par défaut sur http://127.0.0.1:8000 ou 8001 selon config)
uvicorn main:app --reload
```

### 4. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Le frontend (React + Vite) consomme l’API Laravel (URL configurable via les fichiers `.env` du frontend) ; Laravel consomme à son tour le service FastAPI pour la partie OCR / extraction.

---

## Structure du projet

```text
/backend         API Laravel (règles métiers, sécurité, versioning, audit, migrations dans backend/database)
/frontend        Application React + Vite + Bootstrap (UI, Human-in-the-Loop)
/ai              Service FastAPI (OCR, Tesseract, OpenCV, PyMuPDF)
/docs            Documentation projet (journal DEVLOG, conception BDD, diagrammes)
README.md        Documentation racine du monorepo
```

---

## Limitations du MVP

Afin de rester réaliste et aligné avec un périmètre MVP :

- L’interface de validation est **fonctionnelle mais simple** (UX et design perfectibles).
- Le prétraitement d’images via OpenCV est **basique** (optimisations possibles).
- Les **règles métiers** sont limitées à un ensemble restreint mais représentatif de cas réels.
- La détection avancée de type de document et les modèles NLP ne sont **pas encore** généralisés.

Ces limitations sont assumées et documentées dans le cadre du PFE.

---

## Améliorations prévues

Les évolutions suivantes sont envisagées pour renforcer la robustesse et la précision du système :

- Optimisation du **prétraitement OCR** :
  - Deskew (redressement)
  - Réduction du bruit
  - Binarisation adaptative
- Extraction hybride basée sur **regex** et **analyse contextuelle**
- Détection automatique du **type de document**
- Tableau de bord **KPI** :
  - Taux d’automatisation
  - Taux de correction humaine
  - Temps moyen de traitement
- Intégration avancée de **PaddleOCR** (amélioration de la précision OCR)
- Intégration de **spaCy (NER)** pour enrichir l’extraction d’entités

> Ces points sont planifiés ou en cours d’étude et ne sont pas tous inclus dans la version MVP actuelle.

---

## Contexte académique

- **Type** : Projet de Fin d’Études (PFE)  
- **Filière** : Licence en Computer Science : Génie Logiciel et Système d’Information
- **Domaine** : Assurance

Le projet met en œuvre :

- Une **architecture distribuée** (frontend, backend, service IA, base de données)
- Un système **Human-in-the-Loop** pour assurer la qualité des données
- Un mécanisme de **versioning** et de **traçabilité** (audit trail complet)
- Des **règles métiers** appliquées aux documents médicaux
- Une intégration **OCR** avec extraction structurée et **scoring de confiance**


