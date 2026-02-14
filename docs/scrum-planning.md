# Planification Scrum – Système de Traitement des Documents Médicaux
 
**Date :** 2026-02-14  
**Auteur :** Chiheb Selmi  
**Projet :** Traitement Automatisé des Documents Médicaux (PFE)  
**Encadrant :** Yessine Kasmi

---

## Résumé Exécutif

### Présentation du Projet

Le **Système de Traitement des Documents Médicaux** est une plateforme web interne destinée aux compagnies d'assurance, permettant d'automatiser le traitement des documents médicaux (factures de pharmacie, rapports de laboratoire, radiologies) via OCR et intelligence artificielle, tout en maintenant une validation humaine dans la boucle (Human-in-the-Loop).

### Approche Méthodologique

| Élément | Détail |
|---------|--------|
| **Méthodologie** | Scrum (adapté au contexte solo/académique) |
| **Durée totale** | 14 semaines (7 sprints de 2 semaines) |
| **Équipe** | 1 développeur + 1 encadrant (proxy Product Owner) |
| **Stack technique** | Laravel + FastAPI + React + MySQL |

Scrum a été choisi pour permettre des itérations rapides sur les composants IA et un feedback continu avec l’encadrant.

### État d'Avancement Actuel

| Indicateur | Valeur |
|------------|--------|
| **Sprints terminés** | 3 sur 6 (Sprints 0, 1, 2) |
| **Story Points livrés** | 51 SP sur 124 SP (41%) |
| **Vélocité moyenne** | 17 SP/sprint |
| **Sprint en cours** | Sprint 3 (IA Réelle + HITL) |
| **Statut global** | 🟢 Conforme au planning |

**Vélocité cumulée (SP)**

| Sprint | SP du sprint | Cumul |
|-------|-------------:|------:|
| Sprint 0 | 16 | 16 |
| Sprint 1 | 16 | 32 |
| Sprint 2 | 19 | 51 |
| Sprint 3 | 22 | 73 |

### Jalons Clés

| Release | Date Cible | Contenu |
|---------|------------|---------|
| **MVP (Alpha)** | ✅ Terminé | Upload, traitement async, audit |
| **Beta** | Semaine 10 | OCR réel, HITL, authentification |
| **v1.0 (Finale)** | Semaine 14 | Analytics, hardening, soutenance |

### Clarification MVP

- **MVP Technique (Sprint 2)** : Pipeline end-to-end fonctionnel (upload → queue → extraction mock → stockage). Prouve la faisabilité technique.
- **MVP Utilisateur (Sprint 4)** : Système utilisable par les agents d'assurance avec OCR réel, validation HITL et authentification.

Le MVP technique prouve la faisabilité tandis que le MVP utilisateur assure une interface utilisable pour les agents.

### Objectif Principal

> **Réduire le temps de traitement manuel des documents médicaux de 60%** tout en garantissant une traçabilité à 100% et une capacité de validation humaine pour toutes les extractions.

---

## Table des Matières

1. [Contexte du Projet](#1-contexte-du-projet)
2. [Vision Produit](#2-vision-produit)
3. [Objectif Produit et KPIs](#3-objectif-produit-et-kpis)
4. [Parties Prenantes](#4-parties-prenantes)
5. [Backlog Produit](#5-backlog-produit)
6. [Roadmap des Sprints](#6-roadmap-des-sprints)
7. [Sprint Backlog Détaillé](#7-sprint-backlog-détaillé)
8. [Définition de Terminé](#8-définition-de-terminé)
9. [Registre des Risques](#9-registre-des-risques)
10. [Vélocité et Planification de Release](#10-vélocité-et-planification-de-release)
11. [Stratégie de Livraison Incrémentale](#11-stratégie-de-livraison-incrémentale)
12. [Cérémonies Scrum](#12-cérémonies-scrum)
13. [Dette Technique](#13-dette-technique)
14. [Annexes](#14-annexes)

---

## 1. Contexte du Projet

### 1.1 Informations Générales

| Élément | Détail |
|---------|--------|
| **Type de projet** | Projet de Fin d'Études (PFE) |
| **Contexte client** | Système interne d'une compagnie d'assurance |
| **Équipe** | 1 développeur (étudiant) + 1 encadrant (proxy Product Owner) |
| **Durée totale** | ~14 semaines (3,5 mois) |
| **Durée du Sprint** | 2 semaines |
| **Stack technique** | Laravel (Backend) + FastAPI (IA) + React (Frontend) + MySQL |

### 1.2 Justification du Choix de Scrum

Le choix de Scrum est cohérent avec la **nature exploratoire des systèmes IA** et l'**incertitude sur la qualité d'extraction initiale**. Cette méthodologie permet d'itérer rapidement sur les composants IA tout en livrant de la valeur de manière incrémentale.

#### Pourquoi Scrum est Adapté à ce Projet

La précision de l'OCR et de l'extraction IA est imprévisible avant les tests réels — Scrum permet d'ajuster les paramètres et algorithmes à chaque sprint. Le composant HITL (Human-in-the-Loop) nécessite des retours utilisateurs fréquents pour affiner l'interface de correction. Les incréments bi-hebdomadaires offrent des points de validation réguliers avec l'encadrant, réduisant le risque d'écart par rapport aux attentes. Enfin, la livraison progressive (MVP → Beta → v1.0) garantit qu'une version fonctionnelle existe même si le projet rencontre des obstacles imprévus.

| Critère | Justification |
|---------|---------------|
| **Incertitude IA** | La précision OCR/extraction est imprévisible → nécessite des itérations et ajustements |
| **Feedback continu** | L'encadrant peut valider les incréments régulièrement |
| **Livraison incrémentale** | MVP fonctionnel dès Sprint 2, puis améliorations progressives |
| **Gestion des risques** | Détection précoce des problèmes (performance, qualité IA) |
| **Adaptation** | Possibilité de réajuster les priorités selon les découvertes |
| **Contexte académique** | Sprints courts permettent des points de contrôle fréquents avec l'encadrant |

### 1.3 Adaptation Scrum au Contexte Solo/Académique

Ce projet étant réalisé par un développeur unique dans un cadre académique, Scrum a été adapté tout en conservant ses principes fondamentaux :

| Élément Scrum | Adaptation |
|---------------|------------|
| **Équipe de développement** | 1 développeur (étudiant) |
| **Product Owner** | Encadrant PFE (proxy PO) — valide les priorités et incréments |
| **Scrum Master** | Auto-organisation — l'étudiant gère le processus |
| **Daily Standup** | Auto-évaluation quotidienne (5 min) — revue progression/blocages |
| **Sprint Review** | Démo bi-hebdomadaire à l'encadrant |
| **Sprint Retrospective** | Réflexion personnelle documentée dans le devlog |
| **Backlog Refinement** | Session hebdomadaire solo — clarification des stories à venir |

**Justification :** Cette adaptation maintient les bénéfices de Scrum (itérations, feedback, amélioration continue) tout en étant réaliste pour un contexte de projet individuel.

---

## 2. Vision Produit

> **Pour** les agents de traitement des sinistres **qui** traitent manuellement les documents médicaux (factures de pharmacie, rapports de laboratoire, radiologies),  
> **le** Système de Traitement des Documents Médicaux **est une** plateforme web assistée par IA  
> **qui** automatise la réception des documents, extrait les données structurées via OCR/IA, et permet une validation humaine avant soumission finale.  
> **Contrairement aux** systèmes de saisie entièrement manuels ou aux systèmes IA "boîte noire",  
> **notre produit** combine l'automatisation avec une validation humaine dans la boucle (HITL), garantissant précision, auditabilité et conformité réglementaire.

### 2.1 Workflow Global du Système

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        FLUX DE TRAITEMENT DES DOCUMENTS                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
     │          │      │          │      │          │      │          │      │          │
     │  UPLOAD  │─────▶│  QUEUE   │─────▶│    IA    │─────▶│   HITL   │─────▶│ VALIDATED│
     │          │      │          │      │   (OCR)  │      │          │      │          │
     └──────────┘      └──────────┘      └──────────┘      └──────────┘      └──────────┘
          │                 │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼                 ▼
     ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
     │ Document │      │   Job    │      │Extraction│      │Correction│      │  Dossier │
     │  stocké  │      │ dispatché│      │  stockée │      │ auditée  │      │  finalisé│
     └──────────┘      └──────────┘      └──────────┘      └──────────┘      └──────────┘
          │                 │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼                 ▼
       UPLOADED         PROCESSING        PROCESSED         VALIDATED          READY
```

### 2.2 Architecture Technique

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              ARCHITECTURE DU SYSTÈME                                │
└─────────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐         ┌─────────────────────────────────────┐
    │             │         │           LARAVEL API               │
    │   REACT     │◀──────▶│  • Orchestration workflow           │
    │  Frontend   │   REST  │  • Persistance (MySQL)              │
    │             │   API   │  • Authentification (Sanctum)       │
    │  :5173      │         │  • Queue management                 │
    └─────────────┘         │                                     │
                            │  :8000                              │
                            └──────────────┬──────────────────────┘
                                           │
                                           │ HTTP (interne)
                                           ▼
                            ┌─────────────────────────────────────┐
                            │          FASTAPI (IA)               │
                            │  • OCR (Tesseract/PaddleOCR)        │
                            │  • Extraction de champs             │
                            │  • Calcul de confiance              │
                            │  • Stateless (pas de DB)            │
                            │                                     │
                            │  :8001                              │
                            └─────────────────────────────────────┘
```

---

## 3. Objectif Produit et KPIs

### 3.1 Objectif Principal

> **Livrer un système MVP interne qui réduit le temps de traitement manuel des documents de 60%** tout en maintenant une traçabilité à 100% et une capacité de validation humaine pour toutes les données extraites.

### 3.2 Indicateurs de Performance (KPIs)

| Métrique | Objectif | Source de Mesure | Fréquence |
|----------|----------|------------------|-----------|
| Temps de traitement moyen | < 30 secondes/document | `ai_requests.processing_time_ms` | Par sprint |
| Taux d'auditabilité | 100% | Tables `ai_requests` + `extractions` | Continue |
| Taux de correction humaine | < 30% | `field_corrections` / total documents | Par sprint |
| Disponibilité du système | > 95% | Monitoring (Phase 2) | Continue |
| Couverture de tests | > 60% | PHPUnit + pytest | Par sprint |

### 3.3 Critères de Succès du Projet

| Critère | Description | Validation |
|---------|-------------|------------|
| **Fonctionnel** | Flux complet upload → extraction → validation opérationnel | Démo |
| **Performance** | Temps de traitement < 30s | Mesure |
| **Qualité** | Taux d'extraction exploitable > 70% | Statistiques |
| **Auditabilité** | 100% des actions tracées | Inspection DB |
| **Maintenabilité** | Code documenté, testé, architecturé | Revue code |

---

## 4. Parties Prenantes

| Partie Prenante | Rôle | Responsabilité | Implication |
|-----------------|------|----------------|-------------|
| **Agent de sinistres** | Utilisateur principal | Téléverse les documents, valide/corrige les extractions | Quotidienne |
| **Superviseur sinistres** | Utilisateur secondaire | Examine les dossiers traités, supervise la performance | Hebdomadaire |
| **Département IT** | Partie prenante technique | Déploiement, sécurité, infrastructure | Ponctuelle |
| **Responsable conformité** | Partie prenante réglementaire | Assure la piste d'audit, rétention des données | Mensuelle |
| **Encadrant PFE** | Proxy PO / Académique | Valide les livrables, guide les priorités | Bi-hebdomadaire |
| **Étudiant développeur** | Équipe de développement | Implémente toutes les fonctionnalités | Quotidienne |

---

## 5. Backlog Produit

### 5.1 Vue d'Ensemble des Epics

| ID | Nom de l'Epic | Valeur Métier | Sprints | Points |
|----|---------------|---------------|---------|--------|
| E1 | Infrastructure & Architecture | Fondation technique | 0 | 14 SP |
| E2 | Pipeline de Réception | Upload et stockage | 1 | 16 SP |
| E3 | Pipeline de Traitement IA | Extraction automatisée | 2-3 | 21 SP |
| E4 | Validation Humaine (HITL) | Assurance qualité | 3-4 | 18 SP |
| E5 | Authentification & Autorisation | Sécurité | 4 | 12 SP |
| E6 | Reporting & Analytiques | Visibilité | 5 | 10 SP |
| E7 | Durcissement & Optimisation | Production-ready | 5-6 | 9 SP |
| E8 | Excellence Technique | Qualité code | Continu | 9 SP |
| | **TOTAL BACKLOG** | | | **109 SP** |
| | *+ Travaux transverses (docs, présentation, bugs)* | | | *+15 SP* |
| | **TOTAL PROJET** | | | **124 SP** |

### 5.2 Backlog Complet par Epic

#### Epic E1 : Infrastructure & Architecture (14 SP)

| ID | User Story | Priorité | Points | Sprint |
|----|------------|----------|--------|--------|
| US-001 | En tant que développeur, je veux un monorepo structuré (backend/frontend/ai/docs) afin que tous les composants soient organisés et versionnés. | P0 | 3 | 0 |
| US-002 | En tant que développeur, je veux un schéma de base de données normalisé (documents, extractions, ai_requests) afin de maintenir l'intégrité des données. | P0 | 5 | 0 |
| US-003 | En tant que développeur, je veux un contrat d'API figé entre Laravel et FastAPI afin que les deux services puissent être développés indépendamment. | P0 | 3 | 0 |
| TS-004 | En tant que système, je veux un système de queue basé sur la base de données afin que le traitement des documents se fasse de manière asynchrone. | P0 | 3 | 2 |

#### Epic E2 : Pipeline de Réception des Documents (16 SP)

| ID | User Story | Priorité | Points | Sprint |
|----|------------|----------|--------|--------|
| US-005 | En tant qu'agent de sinistres, je veux téléverser un document médical (PDF/image) afin qu'il entre dans le pipeline de traitement. | P0 | 5 | 1 |
| US-006 | En tant que système, je veux valider le type, la taille et le format du fichier afin que seuls les documents supportés soient acceptés. | P0 | 3 | 1 |
| US-007 | En tant que système, je veux stocker les fichiers avec un nommage UUID dans des dossiers structurés par date afin que les fichiers soient organisés et sécurisés. | P0 | 3 | 1 |
| US-008 | En tant qu'agent de sinistres, je veux voir une liste paginée de mes documents téléversés afin de suivre leur statut. | P1 | 3 | 1 |
| US-009 | En tant qu'agent de sinistres, je veux voir les détails d'un document (statut, métadonnées, résultats d'extraction) afin de le consulter. | P1 | 2 | 1 |

#### Epic E3 : Pipeline de Traitement IA (21 SP)

| ID | User Story | Priorité | Points | Sprint |
|----|------------|----------|--------|--------|
| US-010 | En tant que système, je veux dispatcher un job de traitement immédiatement après l'upload afin que l'extraction démarre automatiquement. | P0 | 3 | 2 |
| US-011 | En tant que système, je veux appeler l'endpoint FastAPI `/process` avec le document afin que l'OCR/extraction soit effectué. | P0 | 5 | 2-3 |
| US-012 | En tant que système, je veux stocker la réponse IA (result_json) dans la table extractions afin que les résultats soient persistés et auditables. | P0 | 3 | 2 |
| US-013 | En tant que système, je veux mettre à jour le statut du document (UPLOADED → PROCESSING → PROCESSED/FAILED) afin que l'état du workflow soit toujours précis. | P0 | 3 | 2 |
| US-014 | En tant que système, je veux que les jobs échoués réessaient 3 fois avec backoff afin que les erreurs transitoires ne causent pas d'échecs permanents. | P1 | 2 | 2 |
| US-015 | En tant que système, je veux enregistrer les tentatives de traitement échouées dans ai_requests afin que les échecs soient traçables. | P1 | 2 | 3 |
| US-016 | En tant que système, je veux empêcher le traitement en double du même document afin que les extractions ne soient pas dupliquées. | P1 | 3 | 3 |

#### Epic E4 : Validation Humaine — HITL (18 SP)

| ID | User Story | Priorité | Points | Sprint |
|----|------------|----------|--------|--------|
| US-017 | En tant qu'agent de sinistres, je veux voir les champs extraits avec leurs scores de confiance afin de savoir quels champs nécessitent une révision. | P1 | 5 | 3 |
| US-018 | En tant qu'agent de sinistres, je veux corriger les valeurs des champs extraits afin que les erreurs soient corrigées avant soumission. | P1 | 5 | 3 |
| US-019 | En tant que responsable conformité, je veux que toutes les corrections soient journalisées (table field_corrections) afin que les changements soient auditables. | P1 | 3 | 4 |
| US-020 | En tant qu'agent de sinistres, je veux soumettre les données validées afin que le statut du document passe à VALIDATED. | P1 | 3 | 4 |
| US-021 | En tant qu'agent de sinistres, je veux que les champs avec une confiance < 70% soient mis en évidence afin de concentrer ma révision sur les extractions incertaines. | P2 | 2 | 4 |

#### Epic E5 : Authentification & Autorisation (12 SP)

| ID | User Story | Priorité | Points | Sprint |
|----|------------|----------|--------|--------|
| US-022 | En tant qu'administrateur, je veux créer des comptes utilisateurs afin que les agents puissent accéder au système. | P1 | 3 | 4 |
| US-023 | En tant qu'utilisateur, je veux me connecter avec email/mot de passe afin d'accéder à mes documents. | P1 | 3 | 4 |
| US-024 | En tant que système, je veux protéger les endpoints API avec des tokens Sanctum afin que seuls les utilisateurs authentifiés puissent accéder aux données. | P1 | 3 | 4 |
| US-025 | En tant qu'administrateur, je veux assigner des rôles (agent, superviseur, admin) afin que les permissions soient contrôlées. | P2 | 3 | 5 |

#### Epic E6 : Reporting & Analytiques (10 SP)

| ID | User Story | Priorité | Points | Sprint |
|----|------------|----------|--------|--------|
| US-026 | En tant que superviseur, je veux voir le total des documents traités par jour/semaine afin de monitorer le débit du système. | P2 | 3 | 5 |
| US-027 | En tant que superviseur, je veux voir les scores de confiance moyens par type de document afin d'évaluer la qualité de l'IA. | P2 | 3 | 5 |
| US-028 | En tant que responsable conformité, je veux voir le pourcentage de documents nécessitant une correction humaine afin d'évaluer la précision de l'IA. | P2 | 2 | 5 |
| US-029 | En tant que superviseur, je veux voir les documents traités par agent afin d'équilibrer les charges de travail. | P3 | 2 | 6 |

#### Epic E7 : Durcissement & Optimisation (9 SP)

| ID | User Story | Priorité | Points | Sprint |
|----|------------|----------|--------|--------|
| US-030 | En tant que système, je veux des réponses d'erreur cohérentes (format JSON) afin que le frontend puisse afficher des messages significatifs. | P2 | 2 | 5 |
| US-031 | En tant que système, je veux limiter le débit des requêtes API afin que le système soit protégé contre les abus. | P2 | 2 | 6 |
| US-032 | En tant que système, je veux des index sur les colonnes fréquemment requêtées afin que les temps de réponse soient rapides. | P2 | 2 | 5 |
| US-033 | En tant que développeur, je veux des scripts Docker/déploiement afin que le système puisse être déployé de manière cohérente. | P3 | 3 | 6 |

#### Epic E8 : Excellence Technique (9 SP)

| ID | User Story | Priorité | Points | Sprint |
|----|------------|----------|--------|--------|
| TS-034 | En tant que développeur, je veux une couverture de tests > 60% pour le backend afin d'assurer la qualité et faciliter les refactorings. | P2 | 5 | 5 |
| TS-035 | En tant que développeur, je veux des logs structurés (JSON) pour le debugging afin de diagnostiquer les problèmes en production. | P2 | 2 | 6 |
| TS-036 | En tant que développeur, je veux extraire l'interface AIService pour faciliter le switch mock/réel afin de respecter le principe Open/Closed. | P2 | 2 | 3 |

### 5.3 Synthèse de Priorisation

| Priorité | Description | Nb Stories | Points | % Total |
|----------|-------------|------------|--------|---------|
| **P0** | Indispensable pour le MVP | 11 | 39 SP | 36% |
| **P1** | Nécessaire pour un système utilisable | 13 | 42 SP | 39% |
| **P2** | Améliore significativement le produit | 11 | 23 SP | 21% |
| **P3** | Nice-to-have | 3 | 5 SP | 4% |
| **Total** | | **38** | **109 SP** | **100%** |

### 5.4 Critères d'Acceptation (Exemples Clés)

#### US-005 : Upload de Document

```gherkin
Scénario: Upload d'un document valide
  Étant donné que je suis un agent authentifié
  Quand j'envoie un fichier PDF valide via POST /api/documents
  Alors le fichier est stocké avec un nom UUID
  Et le statut du document est UPLOADED
  Et je reçois une réponse 201 avec l'ID du document
  Et le document apparaît dans ma liste

Scénario: Upload d'un fichier invalide
  Étant donné que je suis un agent authentifié
  Quand j'envoie un fichier .exe via POST /api/documents
  Alors je reçois une erreur 422
  Et le message indique "Type de fichier non supporté"
```

#### US-013 : Cycle de Vie des Statuts

```gherkin
Scénario: Transition vers PROCESSING
  Étant donné qu'un document est UPLOADED
  Quand le job démarre
  Alors le statut passe immédiatement à PROCESSING

Scénario: Transition vers PROCESSED (succès)
  Étant donné qu'un traitement IA réussit
  Quand les résultats sont enregistrés
  Alors le statut passe à PROCESSED

Scénario: Transition vers FAILED (échec)
  Étant donné qu'un traitement IA échoue après 3 retries
  Quand le job est marqué failed
  Alors le statut passe à FAILED
  Et error_message contient le détail de l'erreur
```

#### US-017 : Affichage des Extractions

```gherkin
Scénario: Affichage des champs extraits
  Étant donné qu'un document est PROCESSED
  Quand j'affiche la page de validation
  Alors je vois tous les champs extraits (invoice_date, provider_name, total_ttc)
  Et chaque champ affiche son score de confiance (0-100%)
  Et les champs avec confiance < 70% sont visuellement mis en évidence
  Et je peux voir le document original à côté des champs
```

---

## 6. Roadmap des Sprints

### 6.1 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ROADMAP DES SPRINTS                                      │
├─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────────┤
│         │ Sprint 0│ Sprint 1│ Sprint 2│ Sprint 3│ Sprint 4│ Sprint 5│ Sprint 6│             │
│         │ Sem 1-2 │ Sem 3-4 │ Sem 5-6 │ Sem 7-8 │ Sem 9-10│ Sem11-12│ Sem13-14│             │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────────┤
│ Objectif│Fondation│ Upload  │  Async  │IA+HITL  │  Auth   │Analytics│ Polish  │             │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────────┤
│ Points  │  16 SP  │  16 SP  │  19 SP  │  22 SP  │  17 SP  │  20 SP  │  14 SP  │ Total:124SP │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────────┤
│ Statut  │   ✅    │   ✅   │   ✅    │   🔄   │   ⏳    │   ⏳   │   ⏳    │             │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────────┤
│ Release │         │         │   MVP   │         │  BETA   │         │  v1.0   │             │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────────┘
```

### 6.2 Détail par Sprint

#### Sprint 0 (Semaine 1-2) — Fondation ✅ TERMINÉ

**Objectif :** Établir l'infrastructure du projet et la documentation d'architecture.

| ID | Élément | Points | Statut |
|----|---------|--------|--------|
| US-001 | Configuration monorepo | 3 | ✅ |
| US-002 | Conception base de données | 5 | ✅ |
| US-003 | Définition contrat API | 3 | ✅ |
| - | Documentation d'architecture | 3 | ✅ |
| - | Création diagramme de flux | 2 | ✅ |
| **Total** | | **16** | |

**Incrément livré :**
- ✅ Environnement de développement fonctionnel (Laravel + FastAPI + React)
- ✅ Documentation d'architecture figée
- ✅ Schéma de base de données conçu
- ✅ Diagramme de flux documenté
- ✅ Contrat API v1 défini et gelé

**Vélocité réelle :** 16 SP

---

#### Sprint 1 (Semaine 3-4) — Réception des Documents ✅ TERMINÉ

**Objectif :** Livrer un pipeline d'upload de documents fonctionnel avec validation et stockage sécurisé.

| ID | Élément | Points | Statut |
|----|---------|--------|--------|
| US-005 | API d'upload de documents | 5 | ✅ |
| US-006 | Validation des fichiers | 3 | ✅ |
| US-007 | Stockage sécurisé | 3 | ✅ |
| US-008 | Liste des documents | 3 | ✅ |
| US-009 | Détails du document | 2 | ✅ |
| **Total** | | **16** | |

**Incrément livré :**
- ✅ API REST complète (POST, GET, GET list)
- ✅ Validation fichiers (type, taille)
- ✅ Stockage UUID + structure par date
- ✅ Pagination fonctionnelle

**Vélocité réelle :** 16 SP

---

#### Sprint 2 (Semaine 5-6) — Pipeline de Traitement Asynchrone ✅ TERMINÉ

**Objectif :** Implémenter le traitement IA asynchrone avec système de queue et piste d'audit.

| ID | Élément | Points | Statut |
|----|---------|--------|--------|
| TS-004 | Infrastructure de queue | 3 | ✅ |
| US-010 | Dispatch de job asynchrone | 3 | ✅ |
| US-011 | Intégration service IA (mock) | 5 | ✅ |
| US-012 | Stockage des extractions | 3 | ✅ |
| US-013 | Cycle de vie des statuts | 3 | ✅ |
| US-014 | Mécanisme de retry | 2 | ✅ |
| **Total** | | **19** | |

**Incrément livré :**
- ✅ Queue database fonctionnelle
- ✅ Job asynchrone avec ShouldBeUnique
- ✅ Service IA mock (contrat v1)
- ✅ Tables ai_requests + extractions
- ✅ Workflow UPLOADED → PROCESSING → PROCESSED/FAILED
- ✅ Retry avec backoff + failed()

**Vélocité réelle :** 19 SP

---

#### Sprint 3 (Semaine 7-8) — Intégration IA Réelle + Base HITL 🔄 EN COURS

**Objectif :** Remplacer le mock par le vrai OCR FastAPI et construire l'interface de validation.

| ID | Élément | Points | Statut |
|----|---------|--------|--------|
| US-011 | Intégration HTTP réelle FastAPI | 5 | 🔄 |
| US-015 | Audit des échecs | 2 | ⏳ |
| US-016 | Gardes d'idempotence | 3 | ⏳ |
| TS-036 | Refactoring AIService | 2 | ⏳ |
| US-017 | Affichage des extractions (React) | 5 | ⏳ |
| US-018 | UI de correction des champs | 5 | ⏳ |
| **Total** | | **22** | |

**Incrément attendu :**
- Extractions OCR réelles via FastAPI
- Interface de validation fonctionnelle
- Audit complet même en cas d'échec

---

#### Sprint 4 (Semaine 9-10) — Finalisation HITL + Auth ⏳ PLANIFIÉ

**Objectif :** Compléter le flux de validation et ajouter l'authentification.

| ID | Élément | Points |
|----|---------|--------|
| US-019 | Historique des corrections | 3 |
| US-020 | Soumission de validation | 3 |
| US-021 | Alerte confiance faible | 2 |
| US-022 | Inscription utilisateur | 3 |
| US-023 | Connexion/déconnexion | 3 |
| US-024 | Auth par token API | 3 |
| **Total** | | **17** |

**Incrément attendu :**
- Flux HITL complet (correction + validation + audit)
- Accès authentifié via Sanctum
- Workflow complet jusqu'à VALIDATED

---

#### Sprint 5 (Semaine 11-12) — Analytiques + Durcissement ⏳ PLANIFIÉ

**Objectif :** Ajouter les fonctionnalités de reporting et améliorer la robustesse.

| ID | Élément | Points |
|----|---------|--------|
| US-025 | Accès par rôles | 3 |
| US-026 | Statistiques de traitement | 3 |
| US-027 | Analytique de confiance | 3 |
| US-028 | Rapport taux de correction | 2 |
| US-030 | Gestion des erreurs | 2 |
| US-032 | Optimisation performance | 2 |
| TS-034 | Couverture de tests > 60% | 5 |
| **Total** | | **20** |

**Incrément attendu :**
- Tableau de bord avec métriques clés
- Rôles appliqués (agent, superviseur, admin)
- Système optimisé et testé

---

#### Sprint 6 (Semaine 13-14) — Polish + Livraison ⏳ PLANIFIÉ

**Objectif :** Finitions, documentation complète et préparation de la soutenance.

| ID | Élément | Points |
|----|---------|--------|
| US-029 | Rapport performance agents | 2 |
| US-031 | Limitation de débit | 2 |
| US-033 | Configuration déploiement | 3 |
| TS-035 | Logging structuré | 2 |
| - | Documentation finale | 2 |
| - | Préparation présentation | 2 |
| - | Corrections de bugs | 1 |
| **Total** | | **14** |

**Incrément attendu :**
- Système prêt pour la production
- Documentation complète
- Prêt pour la soutenance

---

## 7. Sprint Backlog Détaillé

### Exemple : Sprint 2 (Terminé)

#### 7.1 Objectif du Sprint
> Implémenter le traitement IA asynchrone avec système de queue et piste d'audit.

#### 7.2 Découpage des Tâches

| User Story | Tâche | Est. | Dépendances |
|------------|-------|------|-------------|
| **TS-004** | Créer migration table `jobs` | 1h | - |
| | Créer migration table `failed_jobs` | 0.5h | - |
| | Configurer QUEUE_CONNECTION=database | 0.5h | Migrations |
| | Tester le worker de queue | 1h | Config |
| **US-010** | Créer classe `ProcessDocumentJob` | 2h | TS-004 |
| | Implémenter `ShouldQueue` + `ShouldBeUnique` | 1h | Job |
| | Ajouter dispatch `afterCommit()` | 1h | Job |
| | Tester dispatch du job | 1h | Intégration |
| **US-011** | Créer classe `AIService` (mock) | 2h | - |
| | Définir réponse mock contrat API v1 | 1h | Doc |
| | Intégrer appel AIService dans Job | 2h | US-010 |
| | Tester flux d'extraction | 1h | Intégration |
| **US-012** | Créer migrations ai_requests + extractions | 2h | - |
| | Créer modèles avec relations | 2h | Migrations |
| | Persister dans handle() | 1.5h | US-011 |
| | Tester stockage | 1h | Persistance |
| **US-013** | Mettre à jour statuts dans le job | 2h | US-010 |
| | Tester cycle de vie complet | 1h | Tout |
| **US-014** | Configurer retries + failed() | 2h | US-010 |
| | Tester comportement de retry | 1h | Config |

#### 7.3 Burndown Sprint 2

```
Points restants
     │
  19 ┤████████████████████
  17 ┤████████████████░░░░  Jour 2
  15 ┤██████████████░░░░░░  Jour 3
  12 ┤███████████░░░░░░░░░  Jour 5
   8 ┤███████░░░░░░░░░░░░░  Jour 7
   4 ┤███░░░░░░░░░░░░░░░░░  Jour 9
   0 ┤░░░░░░░░░░░░░░░░░░░░  Jour 10 ✅
     └────────────────────────────────
       1  2  3  4  5  6  7  8  9  10  Jours
```

---

## 8. Définition de Terminé (DoD)

### 8.1 Niveau User Story

| Critère | Description |
|---------|-------------|
| ✅ Code | Implémenté selon les conventions Laravel/Python |
| ✅ Acceptation | Critères d'acceptation vérifiés (Gherkin) |
| ✅ Tests | Tests unitaires/fonctionnels écrits et passent |
| ✅ Revue | Code auto-revu (checklist qualité) |
| ✅ Documentation | Endpoints API documentés (Postman) |
| ✅ Migrations | Committées et exécutées |
| ✅ Frontend | Aucune erreur console |
| ✅ Manuel | Tests manuels effectués |
| ✅ Performance | Aucune requête N+1 détectée |
| ✅ Devlog | Mis à jour avec détails d'implémentation |

### 8.2 Niveau Sprint

| Critère | Description |
|---------|-------------|
| ✅ Stories | Toutes respectent la DoD story |
| ✅ Déploiement | Incrément déployé en environnement local |
| ✅ Devlog | Sprint devlog complété et pushé |
| ✅ Bugs | Aucun bug critique restant |
| ✅ Tests | Couverture maintenue ou améliorée |
| ✅ Review | Démo superviseur effectuée |
| ✅ Retro | Rétrospective documentée |

### 8.3 Niveau Release

| Critère | MVP | Beta | v1.0 |
|---------|-----|------|------|
| Stories P0 | 100% | 100% | 100% |
| Stories P1 | 50% | 100% | 100% |
| Stories P2 | 0% | 50% | 100% |
| Couverture tests | > 40% | > 60% | > 70% |
| Temps traitement | < 60s | < 45s | < 30s |
| Bugs critiques | 0 | 0 | 0 |
| Documentation | README | + Archi | + Guide |

---

## 9. Registre des Risques

### 9.1 Tableau des Risques

| ID | Risque | Prob. | Impact | Score | Mitigation | Statut |
|----|--------|-------|--------|-------|------------|--------|
| R1 | Précision IA/OCR trop faible | Moyenne | Élevé | 🔴 | HITL pour rattraper ; suivre confiance ; itérer OCR | 🟡 Surveillance |
| R2 | Échecs de queue | Faible | Élevé | 🟡 | Retry logic ; audit dans ai_requests ; monitorer failed_jobs | ✅ Mitigé |
| R3 | FastAPI indisponible | Moyenne | Élevé | 🔴 | Circuit breaker ; fallback mock ; retry backoff | ✅ Mitigé |
| R4 | Cohérence des données | Faible | Élevé | 🟡 | Transactions DB ; idempotence ; contraintes unique | ✅ Mitigé |
| R5 | Dégradation performance | Moyenne | Moyen | 🟡 | Index ; optimiser requêtes ; monitorer processing_time | 🟡 Surveillance |
| R6 | Dérive du périmètre | Élevée | Moyen | 🟡 | MVP strict ; reporter P2/P3 ; suivre sprint plan | ✅ Contrôlé |
| R7 | Dépassement délai | Moyenne | Critique | 🔴 | Sprint tampon ; prioriser core ; suivi quotidien | 🟡 Surveillance |
| R8 | Vulnérabilités sécurité | Faible | Élevé | 🟡 | Validation entrées ; auth endpoints ; pas de data sensible | ⏳ Sprint 4 |

### 9.2 Matrice Probabilité × Impact

```
              │   Faible      Moyen       Élevé      Critique
──────────────┼─────────────────────────────────────────────────
   Élevée     │    🟢          🟡          🔴          🔴
   Moyenne    │    🟢          🟡          🔴          🔴
   Faible     │    🟢          🟢          🟡          🟡
```

### 9.3 Plan de Réponse aux Risques

| Risque | Déclencheur | Action | Responsable |
|--------|-------------|--------|-------------|
| R1 | Taux correction > 30% | Ajuster paramètres OCR ; ajouter prétraitement | Dev |
| R3 | Timeout FastAPI > 3× | Activer mode mock ; investiguer | Dev |
| R6 | Vélocité < 15 SP | Reporter P2/P3 ; focus P0/P1 | Dev/PO |
| R7 | Retard > 1 sprint | Mode "essentiel uniquement" | Dev/PO |

---

## 10. Vélocité et Planification de Release

### 10.1 Vélocité Observée vs Prévue

| Sprint | Prévue | Réelle | Écart | Commentaire |
|--------|--------|--------|-------|-------------|
| Sprint 0 | 16 SP | 16 SP | 0% | ✅ Conforme |
| Sprint 1 | 16 SP | 16 SP | 0% | ✅ Conforme |
| Sprint 2 | 19 SP | 19 SP | 0% | ✅ Conforme |
| Sprint 3 | 20 SP | - | - | 🔄 En cours |
| Sprint 4 | 17 SP | - | - | ⏳ Planifié |
| Sprint 5 | 20 SP | - | - | ⏳ Planifié |
| Sprint 6 | 17 SP | - | - | ⏳ Planifié |

### 10.2 Analyse de Vélocité

```
Vélocité moyenne (Sprints 0-2) = (16 + 16 + 19) / 3 = 17 SP/sprint
```

**Constat :** La vélocité est stabilisée après 3 sprints et reste cohérente avec la capacité estimée de 20 SP/sprint. L'écart de 3 SP constitue une marge de sécurité raisonnable.

### 10.3 Calcul de Capacité

```
Capacité du Sprint :
├─ Jours ouvrés par sprint          : 10 jours
├─ Heures de développement par jour : 6 heures
├─ Vélocité estimée                 : 2-3 SP/jour
├─ Capacité brute                   : 20-25 SP
├─ Buffer (réunions, blocages)      : -5 SP
└─ Capacité finale                  : 20 SP/sprint
```

### 10.4 Plan de Release

| Release | Sprints | Points | Date Cible | Contenu |
|---------|---------|--------|------------|---------|
| **MVP (Alpha)** | 0-2 | 51 SP | ✅ Terminé | Upload, traitement async, audit |
| **Beta** | 3-4 | 39 SP | Semaine 10 | OCR réel, HITL complet, auth |
| **v1.0 (Finale)** | 5-6 | 34 SP | Semaine 14 | Analytics, hardening, soutenance |
| **Total** | 0-6 | **124 SP** | | |

### 10.5 Burnup Chart Projet

```
Points cumulés
     │
 124 ┤                                        ┌──── v1.0
  90 ┤                              ┌─────────┘ Beta
  73 ┤                    ┌─────────┘
  51 ┤          ┌─────────┘
  51 ┤──────────┘ MVP ✅
  32 ┤────┐
  16 ┤────┘
   0 ┤
     └────────────────────────────────────────────
       S0   S1   S2   S3   S4   S5   S6   Sprints
       ──── Réalisé     ---- Prévu
```

---

## 11. Stratégie de Livraison Incrémentale

### Phase 1 — MVP (Sprints 0-2) ✅ TERMINÉ

**Objectif :** Pipeline core fonctionnel de bout en bout

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Upload  │──▶│   Queue  │───▶│ AI Mock │───▶│Extraction│───▶│  Status │
│   API    │    │   Job    │    │          │    │  Stored  │    │ Tracked  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

**Valeur livrée :**
- API REST complète
- Traitement asynchrone
- Piste d'audit
- Workflow de statuts

---

### Phase 2 — Beta (Sprints 3-4) 🔄 EN COURS

**Objectif :** Système utilisable avec OCR réel et validation humaine

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      ┌──────────┐
│  Upload  │──▶│ OCR Réel  │──▶│Extraction│──▶│   HITL   │─────▶│VALIDATED │
│   API    │    │ FastAPI  │    │ Affichée │    │Correction│      │  Status  │
└──────────┘    └──────────┘    └─────────┘     └──────────┘      └──────────┘
                                                      │
                                                      ▼
                                               ┌──────────┐
                                               │  Audit   │
                                               │ History  │
                                               └──────────┘
```

**Valeur livrée :**
- OCR/extraction réelle
- Interface de validation
- Corrections auditées
- Authentification

---

### Phase 3 — v1.0 (Sprints 5-6) ⏳ PLANIFIÉ

**Objectif :** Production-ready avec dashboard et documentation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SYSTÈME COMPLET                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Upload → OCR → Extraction → HITL → Validation → Analytics → Reporting  │
├─────────────────────────────────────────────────────────────────────────┤
│  + Rôles     + Dashboard     + Performance     + Documentation          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Valeur livrée :**
- Dashboard analytique
- Gestion des rôles
- Optimisation performance
- Documentation complète
- Prêt pour soutenance

---

## 12. Cérémonies Scrum

### 12.1 Adaptation au Contexte Solo

| Cérémonie | Fréquence | Durée | Adaptation |
|-----------|-----------|-------|------------|
| **Sprint Planning** | Bi-hebdomadaire | 1h | Sélection stories + découpage tâches (solo) |
| **Daily Standup** | Quotidien | 5 min | Auto-évaluation écrite (progression/blocages) |
| **Sprint Review** | Fin de sprint | 30 min | Démo à l'encadrant + feedback |
| **Rétrospective** | Fin de sprint | 15 min | Réflexion personnelle documentée dans devlog |
| **Backlog Refinement** | Hebdomadaire | 30 min | Clarification stories à venir (solo) |

---

## 13. Dette Technique

### 13.1 Registre de Dette

| ID | Description | Origine | Impact | Résolution Prévue |
|----|-------------|---------|--------|-------------------|
| TD-001 | Remplacer mock AIService par HTTP réel | Sprint 2 | Élevé | Sprint 3 |
| TD-002 | Ajouter API Resources pour formatage | Sprint 1 | Faible | Phase 2 |
| TD-003 | Implémenter couche de cache | - | Moyen | Post-MVP |
| TD-004 | Supprimer temp_path de la réponse FastAPI | Sprint 1 | Moyen | Sprint 3 |
| TD-005 | Validation stricte MIME (mimetypes) | Sprint 1 | Faible | Sprint 5 |
| TD-006 | Ajouter index supplémentaires si >1000 docs | Sprint 2 | Moyen | Sprint 5 |

### 13.2 Politique de Gestion

- **Identification :** Lors des revues de code et rétrospectives
- **Priorisation :** Intégrée au backlog refinement
- **Budget :** ~10% de chaque sprint réservé à la dette
- **Suivi :** Mis à jour dans chaque devlog

---

## 14. Annexes

### 14.1 Mapping Progression Actuelle

| Sprint | Jours PFE | Devlog | Statut |
|--------|-----------|--------|--------|
| Sprint 0 | Day 1-2 | `2026-02-07.md`, `2026-02-08.md` | ✅ Terminé |
| Sprint 1 | Day 3 | `2026-02-12.md` | ✅ Terminé |
| Sprint 2 | Day 4 | `2026-02-13.md` | ✅ Terminé |
| Sprint 3 | Day 5-6 | En cours | 🔄 En cours |

### 14.2 Artefacts du Projet

| Artefact | Emplacement | Description |
|----------|-------------|-------------|
| Code source | `backend/`, `frontend/`, `ai/` | Code applicatif |
| Documentation | `docs/` | Documentation technique |
| Architecture | `docs/architecture.md` | Décisions architecturales |
| Contrat API | `docs/api-contract.md` | Contrat Laravel ↔ FastAPI |
| Schéma DB | `docs/database-design.md` | Modèle de données |
| Devlogs | `docs/DEVLOG/` | Journal de développement |
| Diagrammes | `docs/DIAGRAMS/` | Schémas et flux |
| Scrum Planning | `docs/scrum-planning.md` | Ce document |

### 14.3 Stack Technique Détaillée

| Composant | Technologie | Version | Rôle |
|-----------|-------------|---------|------|
| Backend API | Laravel | 10.x | Orchestration, persistance, workflow |
| Base de données | MySQL | 8.x | Stockage données |
| Service IA | FastAPI | 0.100+ | OCR et extraction |
| OCR | Tesseract | 5.x | Reconnaissance de caractères |
| Frontend | React + Vite | 18.x | Interface utilisateur |
| Auth | Laravel Sanctum | 3.x | Authentification API |
| Queue | Laravel Queue (DB) | - | Traitement asynchrone |
| Stockage | Local filesystem | - | Fichiers documents |

### 14.4 Glossaire

| Terme | Définition |
|-------|------------|
| **HITL** | Human-in-the-Loop — Validation humaine des extractions IA |
| **OCR** | Optical Character Recognition — Reconnaissance de texte |
| **MVP** | Minimum Viable Product — Version minimale fonctionnelle |
| **SP** | Story Points — Unité d'estimation de complexité |
| **DoD** | Definition of Done — Critères de terminaison |
| **PO** | Product Owner — Responsable du backlog produit |

---

**Document préparé pour :** Encadrant PFE  
**Prochaine mise à jour :** Fin Sprint 3  
**Contact :** chihebddine.selmi@etudiant-fst.utm.tn

---

*Ce document est un artefact vivant, mis à jour à chaque sprint pour refléter l'état réel du projet.*