# Division finale des sprints du projet PFE

## Introduction

Dans le cadre du pilotage Scrum adopté pour ce projet de fin d’études, le produit a été structuré en **quatre sprints** successifs. Ce découpage ne cherche pas à reproduire mécaniquement l’ordre chronologique de chaque commit, mais à proposer une **lecture académique cohérente, équilibrée et défendable** de la construction du prototype final.

La répartition retenue respecte :

- le périmètre réellement implémenté ;
- l’architecture effectivement stabilisée du système (**React + Vite / Laravel / FastAPI / MySQL**) ;
- la progression naturelle d’un projet agile, allant du socle technique vers la gouvernance métier avancée ;
- la nécessité d’obtenir, dans le mémoire, des chapitres de réalisation relativement équilibrés en charge fonctionnelle.

Le prototype final s’appuie sur quatre rôles métier :

- **Agent** ;
- **Gestionnaire** ;
- **Superviseur hiérarchique** ;
- **Administrateur**.

En revanche, les **tableaux de bord analytiques**, les **exports avancés** et les fonctionnalités de reporting décisionnel ne sont pas retenus dans cette planification finale, car ils ne font pas partie du périmètre effectivement livré.

---

## 1. Principes de découpage retenus

Le découpage final a été construit autour de quatre incréments fonctionnels majeurs :

1. **le socle technique et le pipeline documentaire intelligent** ;
2. **la validation humaine, la sécurisation des accès et l’administration des comptes** ;
3. **le workflow métier de remboursement centré sur le dossier** ;
4. **la supervision hiérarchique, la traçabilité avancée et la finalisation de l’expérience utilisateur**.

Ce choix permet de présenter une montée en maturité progressive du système :

- d’abord la **preuve technique** du traitement documentaire ;
- ensuite la **preuve de fiabilité et de sécurité** ;
- puis la **preuve métier** à travers le cycle complet du dossier ;
- enfin la **preuve de gouvernance, de traçabilité et de finition** du prototype.

---

## 2. Tableau synthétique des sprints

| Sprint | Intitulé | Objectif principal | Livrable principal |
|---|---|---|---|
| Sprint 1 | Socle technique et pipeline documentaire intelligent | Mettre en place l’architecture générale et le flux de traitement automatique des documents médicaux | Pipeline documentaire asynchrone opérationnel |
| Sprint 2 | Validation humaine, sécurité et administration des accès | Rendre la plateforme exploitable dans un cadre sécurisé, traçable et administrable | Système sécurisé avec validation HITL et gestion complète des comptes |
| Sprint 3 | Workflow métier des dossiers de remboursement | Introduire le cœur métier du projet à travers les dossiers, rubriques, décisions et traitement final | Workflow métier complet du dossier de remboursement |
| Sprint 4 | Supervision hiérarchique, traçabilité avancée et finalisation | Finaliser la gouvernance métier, les notifications, l’historique de workflow et la qualité d’usage globale | Prototype final gouverné, traçable, bilingue et stabilisé |

---

## 3. Description détaillée des sprints

## Sprint 1 : Socle technique et pipeline documentaire intelligent

### Objectif du sprint

Le premier sprint a pour objectif de mettre en place l’ossature technique du système et de construire un pipeline documentaire capable de recevoir un document médical, de l’envoyer vers le service IA, puis d’enregistrer les résultats d’extraction dans un cadre asynchrone et traçable.

### Fonctionnalités retenues

#### 1. Mise en place de l’architecture de la solution
- initialisation du frontend avec **React + Vite** ;
- initialisation du backend avec **Laravel** ;
- mise en place du microservice IA avec **FastAPI** ;
- configuration de la base de données **MySQL** ;
- définition du contrat d’échange entre Laravel et FastAPI ;
- séparation des responsabilités entre interface, orchestration métier, persistance et traitement IA.

#### 2. Gestion initiale des documents
- téléversement des documents médicaux ;
- contrôle du type et de la taille des fichiers ;
- stockage local sécurisé ;
- création de l’entité `Document` ;
- mise en place des statuts techniques du document :
  - `UPLOADED`
  - `PROCESSING`
  - `PROCESSED`
  - `FAILED`.

#### 3. Traitement asynchrone et audit technique
- utilisation d’une file d’attente basée sur la base de données ;
- mise en place du `ProcessDocumentJob` ;
- déclenchement du traitement après validation de l’upload ;
- traçabilité des appels IA dans la table `ai_requests` ;
- persistance versionnée des résultats d’extraction dans la table `extractions`.

#### 4. Extraction initiale et consolidation du moteur OCR
- extraction des champs métier principaux d’un document :
  - date du document ;
  - nom du prestataire ;
  - montant total TTC ;
- persistance du résultat brut retourné par le service IA ;
- amélioration progressive du moteur OCR avec **PaddleOCR** comme moteur principal ;
- maintien de **Tesseract** comme solution de secours ;
- amélioration du post-traitement des extractions et de la robustesse des réponses IA.

#### 5. Robustesse du pipeline documentaire
- garanties d’idempotence sur les traitements asynchrones ;
- prévention des traitements concurrents d’un même document ;
- amélioration de la gestion des erreurs techniques ;
- mécanisme de reprise des traitements échoués ;
- commande de réinitialisation des documents bloqués en traitement.

#### 6. Suivi opérateur du traitement documentaire
- consultation de la liste des documents ;
- affichage de l’état courant du traitement ;
- visibilité sur les échecs et les relances possibles ;
- premier niveau de monitoring du pipeline documentaire.

### Livrable du sprint

Un **pipeline documentaire intelligent fonctionnel**, capable de téléverser, stocker, traiter et extraire automatiquement les principales informations d’un document médical dans un cadre asynchrone, robuste et traçable.

---

## Sprint 2 : Validation humaine, sécurité et administration des accès

### Objectif du sprint

Le deuxième sprint vise à fiabiliser le résultat documentaire obtenu par l’IA, à sécuriser l’accès à la plateforme et à mettre en place une véritable gouvernance des comptes utilisateurs.

### Fonctionnalités retenues

#### 1. Validation humaine des extractions
- mise en place de l’interface **Human-in-the-Loop** ;
- affichage des champs extraits avec leur niveau de confiance ;
- correction manuelle des valeurs proposées par l’IA ;
- création d’une nouvelle version d’extraction après validation ;
- passage du document à l’état `VALIDATED`.

#### 2. Traçabilité des corrections et de la validation
- historisation des corrections au niveau des champs ;
- conservation des métadonnées de validation :
  - `validated_by`
  - `validated_at` ;
- distinction explicite entre extraction brute IA et extraction validée par l’utilisateur ;
- renforcement de la fiabilité du cycle documentaire.

#### 3. Contrôles métier sur les données documentaires
- validation de la cohérence des dates et des montants ;
- détection des dates futures ;
- signalement des montants atypiques ;
- blocage des montants négatifs ;
- prévention des régressions de statut sur le document.

#### 4. Authentification et protection des accès
- intégration de **Laravel Sanctum** ;
- implémentation de la connexion et de la déconnexion ;
- récupération de l’utilisateur courant ;
- protection des routes frontend et backend ;
- sécurisation de l’accès aux écrans selon l’état de la session.

#### 5. Contrôle d’accès par rôles
- introduction du contrôle d’accès par rôles :
  - `AGENT`
  - `CLAIMS_MANAGER`
  - `SUPERVISOR`
  - `ADMIN` ;
- adaptation des écrans et des actions selon le rôle connecté ;
- alignement entre autorisations backend et visibilité frontend ;
- stabilisation des règles de navigation selon le profil utilisateur.

#### 6. Gestion du cycle de compte utilisateur
- changement de mot de passe après connexion ;
- oubli du mot de passe ;
- envoi d’un email de réinitialisation ;
- redéfinition sécurisée du mot de passe via lien/token ;
- durcissement global du cycle de vie du compte.

#### 7. Administration des utilisateurs
- création de comptes par l’administrateur ;
- mise à jour des rôles ;
- activation et désactivation des comptes ;
- sécurisation du dernier administrateur actif ;
- contrôle centralisé du cycle de vie des utilisateurs.

### Livrable du sprint

Une **plateforme sécurisée, authentifiée et administrable**, intégrant la validation humaine, la traçabilité des corrections, le contrôle d’accès par rôles et une gestion complète des comptes utilisateurs.

---

## Sprint 3 : Workflow métier des dossiers de remboursement

### Objectif du sprint

Le troisième sprint a pour objectif d’introduire le cœur métier du projet à travers la structuration des dossiers de remboursement, l’organisation en rubriques, l’attachement contrôlé des documents validés et la mise en place du cycle complet de soumission, de révision et de traitement final.

### Fonctionnalités retenues

#### 1. Gestion des dossiers de remboursement
- création de l’entité `Dossier` ;
- génération automatique du `numero_dossier` ;
- ajout des attributs métier principaux :
  - identifiant assuré ;
  - description de l’épisode ;
  - notes ;
  - statut ;
  - montant demandé / montant courant / montant traité ;
- consultation de la liste et du détail des dossiers ;
- mise à jour et suppression contrôlée des dossiers selon leur état.

#### 2. Structuration en rubriques
- introduction de l’entité `Rubrique` ;
- organisation métier selon la hiérarchie :
  - **Dossier → Rubrique → Document** ;
- création, modification et suppression des rubriques vides ;
- organisation des pièces justificatives par rubrique métier.

#### 3. Préparation métier du dossier
- rattachement des documents techniquement `VALIDATED` aux rubriques ;
- interdiction d’attacher des documents non validés ;
- détachement contrôlé des documents dans les états autorisés ;
- calcul des montants à partir des documents rattachés ;
- préparation progressive du dossier avant soumission.

#### 4. Workflow de soumission et de révision
- soumission du dossier par l’acteur de préparation ;
- passage du dossier par les états :
  - `RECEIVED`
  - `IN_PROGRESS`
  - `UNDER_REVIEW`
  - `PROCESSED` ;
- décisions document par document :
  - `PENDING`
  - `ACCEPTED`
  - `REJECTED` ;
- rejet global d’une rubrique lorsque nécessaire ;
- recalcul automatique du statut de la rubrique selon les décisions prises.

#### 5. Traitement final du dossier
- calcul du montant courant et du montant final retenu ;
- finalisation du dossier ;
- gel des modifications structurelles après traitement ;
- lecture sécurisée des dossiers finalisés.

#### 6. Vérification métier à partir du document source
- prévisualisation du document source ;
- téléchargement sécurisé des pièces ;
- contrôle d’accès sur la consultation des justificatifs ;
- alignement entre décision métier et preuve documentaire d’origine.

#### 7. Consolidation de l’expérience opérateur autour du dossier
- amélioration de l’écran de détail du dossier ;
- utilisation de modales dédiées pour les actions de préparation et de décision ;
- cohérence ergonomique entre documents, rubriques et dossiers ;
- meilleure lisibilité des totaux, statuts et actions disponibles.

### Livrable du sprint

Un **workflow métier complet de remboursement**, structuré autour du triplet **dossier – rubrique – document**, permettant la préparation, la soumission, la décision et le traitement final d’un dossier.

---

## Sprint 4 : Supervision hiérarchique, traçabilité avancée et finalisation

### Objectif du sprint

Le quatrième sprint a pour objectif de finaliser la gouvernance métier de la plateforme en introduisant la supervision hiérarchique, la notification applicative persistante, l’historique complet du workflow et les raffinements finaux de l’expérience utilisateur.

### Fonctionnalités retenues

#### 1. Workflow d’escalade hiérarchique
- escalade d’un dossier par le gestionnaire ;
- introduction du cycle hiérarchique avec les états :
  - `IN_ESCALATION`
  - `AWAITING_COMPLEMENT` ;
- approbation hiérarchique ;
- retour du dossier vers le gestionnaire ;
- demande de complément depuis la supervision.

#### 2. Réouverture maîtrisée du dossier
- retour à la préparation par le gestionnaire sans escalade ;
- distinction claire entre :
  - retour à la préparation ;
  - demande de complément du superviseur ;
- conservation d’un contexte canonique de réouverture ;
- support du cycle de resoumission après correction.

#### 3. Extension du périmètre opérationnel du superviseur
- accès cohérent du superviseur aux écrans nécessaires ;
- validation documentaire dans le périmètre autorisé ;
- gestion des rubriques et attachements dans les états compatibles ;
- alignement définitif des permissions frontend/backend ;
- visibilité métier stabilisée sur les dossiers escaladés.

#### 4. Notifications applicatives persistantes
- création de la table `app_notifications` ;
- centralisation de la génération des notifications côté backend ;
- notification des acteurs concernés lors des transitions critiques du dossier ;
- centre de notifications avec lecture unitaire, lecture globale et compteur de non-lues ;
- adaptation du contenu des notifications à la langue active de l’interface.

#### 5. Traçabilité avancée du workflow
- création de la table `dossier_workflow_events` ;
- journal append-only des événements métier ;
- historisation des créations, soumissions, retours, escalades, demandes de complément et reprises ;
- mise à disposition d’un endpoint dédié de lecture de l’historique ;
- affichage d’une timeline complète et chronologique dans le détail du dossier.

#### 6. Internationalisation et homogénéisation du vocabulaire
- mise en place de l’infrastructure i18n ;
- dictionnaires **anglais / français** ;
- commutateur de langue dans la barre de navigation et l’écran de connexion ;
- traduction des écrans métier, badges, actions, notifications et surfaces de workflow ;
- stabilisation d’un vocabulaire métier cohérent et défendable dans le mémoire.

#### 7. Raffinement UX et stabilisation finale
- amélioration du branding et de la cohérence visuelle ;
- toasts sémantiques selon le sens métier de l’action ;
- pagination avec accès direct à une page ;
- alignement final des cartes de contexte, de l’historique et des surfaces de travail ;
- correction des anomalies bloquantes et validation finale des scénarios critiques.

### Livrable du sprint

Un **prototype final gouverné, traçable et stabilisé**, intégrant la supervision hiérarchique, les notifications persistantes, l’historique complet du workflow, l’internationalisation EN/FR et un niveau de finition suffisant pour une démonstration académique crédible.

---

## 4. Justification du découpage retenu

Le découpage final retenu est pertinent pour quatre raisons principales.

### 4.1 Progression fonctionnelle logique
Le projet progresse du **traitement documentaire technique** vers la **sécurisation des accès**, puis vers le **cœur métier du dossier**, avant de se conclure par la **gouvernance avancée**, la **traçabilité** et la **stabilisation**.

### 4.2 Équilibre entre les sprints
Chaque sprint porte un incrément suffisamment dense pour constituer un chapitre de réalisation crédible, tout en évitant de concentrer toutes les fonctionnalités avancées dans une seule itération.

### 4.3 Cohérence avec le prototype réellement livré
Le contenu retenu reflète le périmètre effectivement implémenté : pipeline OCR, validation humaine, contrôle d’accès, administration des utilisateurs, workflow dossier, supervision hiérarchique, notifications persistantes, historique de workflow et interface bilingue.

### 4.4 Défendabilité académique
Cette planification permet d’expliquer le projet comme une montée en maturité progressive :
- d’abord la **preuve technique** ;
- ensuite la **preuve de sécurité et de traçabilité documentaire** ;
- puis la **preuve métier** ;
- enfin la **preuve de gouvernance, de supervision et de finition**.

---

## Conclusion

La division finale proposée organise le projet en quatre sprints cohérents, équilibrés et complémentaires. Elle reflète la version réellement implémentée du prototype, tout en restant adaptée à une présentation académique dans un mémoire de PFE.
