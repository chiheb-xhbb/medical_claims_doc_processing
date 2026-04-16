# Division finale des sprints du projet PFE

## Introduction

Après révision de votre ancien découpage et des rapports tunisiens fournis comme modèles, la version la plus crédible pour le mémoire consiste à conserver **quatre sprints maximum**, avec un **chapitre de planification séparé**, puis un **chapitre par sprint**.  
Cette organisation est la plus proche du style observé dans les rapports de référence : une planification générale dans le chapitre d’analyse, suivie de sprints présentés chacun avec backlog, analyse, conception et réalisation.

Le découpage proposé ci-dessous tient compte :

- de votre **projet réellement développé** ;
- du **style académique tunisien** de présentation ;
- de la nécessité d’avoir des **sprints équilibrés** ;
- de l’exclusion des éléments retirés du périmètre final, notamment **les dashboards** et **les exports** ;
- de l’intégration explicite de fonctionnalités à ne pas oublier dans le mémoire, en particulier :
  - **la réinitialisation du mot de passe par email** ;
  - **la table des notifications** et la base de la notification applicative.

---

# 1. Logique de découpage retenue

Le projet est organisé en **quatre sprints principaux**, chacun correspondant à un incrément fonctionnel cohérent :

1. **socle technique et pipeline documentaire** ;
2. **validation humaine, sécurité et cycle d’accès complet** ;
3. **workflow métier des dossiers de remboursement** ;
4. **gouvernance, supervision hiérarchique et consolidation finale**.

Ce découpage est volontairement compact et progressif :

- le **Sprint 1** pose le socle ;
- le **Sprint 2** rend la plateforme exploitable et sécurisée ;
- le **Sprint 3** introduit le cœur métier ;
- le **Sprint 4** finalise la gouvernance, la traçabilité avancée et la stabilisation.

---

# 2. Tableau de synthèse des sprints

| Sprint | Intitulé | Objectif principal | Livrable |
|---|---|---|---|
| Sprint 1 | Socle technique et pipeline documentaire intelligent | Mettre en place l’architecture du système et le premier cycle de traitement documentaire | Pipeline documentaire opérationnel |
| Sprint 2 | Validation humaine, sécurité et cycle d’accès complet | Rendre la plateforme exploitable, sécurisée, traçable et complète sur le plan de l’authentification | Système sécurisé avec HITL, authentification et réinitialisation par email |
| Sprint 3 | Workflow métier des dossiers de remboursement | Structurer la logique métier autour des dossiers, rubriques, documents et décisions | Workflow métier complet du remboursement |
| Sprint 4 | Gouvernance, supervision hiérarchique et consolidation finale | Finaliser l’administration, l’escalade hiérarchique, la traçabilité avancée, les notifications et la robustesse globale | Prototype final stable, gouverné et prêt pour la soutenance |

---

# 3. Division détaillée des sprints

## Sprint 1 : Socle technique et pipeline documentaire intelligent

### Objectif du sprint
Mettre en place l’environnement de développement, définir l’architecture générale de la solution et construire un premier pipeline documentaire fonctionnel, depuis le téléversement du document jusqu’au stockage du résultat d’extraction.

### Travaux inclus

#### 1. Mise en place de l’architecture
- initialisation du frontend React ;
- initialisation du backend Laravel ;
- mise en place du service IA avec FastAPI ;
- configuration de la base de données MySQL ;
- structuration générale du projet ;
- définition des échanges entre React, Laravel et FastAPI ;
- séparation claire des responsabilités entre les trois couches.

#### 2. Pipeline documentaire initial
- téléversement des documents médicaux ;
- validation du type et de la taille des fichiers ;
- stockage local sécurisé ;
- traitement asynchrone via file d’attente ;
- création du job de traitement ;
- premier contrat d’échange Laravel–FastAPI ;
- intégration d’un premier moteur OCR ;
- extraction initiale des champs prioritaires :
  - date du document ;
  - prestataire ;
  - montant total TTC.

#### 3. Traçabilité technique
- journalisation des appels vers le service IA ;
- persistance des résultats d’extraction ;
- gestion des statuts techniques du document :
  - `UPLOADED`
  - `PROCESSING`
  - `PROCESSED`
  - `FAILED`

### Livrable du sprint
Un **pipeline documentaire intelligent opérationnel**, capable de téléverser, stocker, traiter et extraire automatiquement les informations principales d’un document médical.

---

## Sprint 2 : Validation humaine, sécurité et cycle d’accès complet

### Objectif du sprint
Rendre la plateforme réellement exploitable par des utilisateurs authentifiés, tout en intégrant la validation humaine, la traçabilité des corrections, le contrôle d’accès et la complétude du cycle de sécurité des comptes.

### Travaux inclus

#### 1. Validation humaine des extractions
- mise en place de l’interface HITL ;
- affichage des champs extraits avec score de confiance ;
- correction manuelle des champs extraits ;
- historisation des corrections ;
- création d’une nouvelle version d’extraction après validation ;
- passage du document à l’état `VALIDATED`.

#### 2. Audit et traçabilité
- ajout des métadonnées de validation :
  - `validated_by`
  - `validated_at`
- distinction entre extraction brute et extraction validée ;
- conservation de l’historique des modifications.

#### 3. Authentification et protection
- intégration de Laravel Sanctum ;
- implémentation de la connexion ;
- déconnexion ;
- récupération de l’utilisateur courant ;
- protection des routes frontend et backend ;
- isolation stricte des documents par utilisateur.

#### 4. Contrôle d’accès initial
- ajout du champ `role` dans la table `users` ;
- préparation de la structure d’accès pour les rôles :
  - `AGENT`
  - `CLAIMS_MANAGER`
  - `SUPERVISOR`
  - `ADMIN`
- filtrage initial des actions selon le rôle ;
- adaptation des menus, des pages et des accès de base selon le profil connecté.

#### 5. Cycle d’accès complet
- implémentation de la fonctionnalité **forget password** ;
- génération du lien ou jeton de réinitialisation ;
- envoi de l’email de réinitialisation du mot de passe ;
- page ou flux de redéfinition du mot de passe ;
- validation sécurisée du changement de mot de passe ;
- consolidation du cycle de vie du compte utilisateur.

#### 6. Robustesse technique
- gestion des documents en échec ;
- mécanisme de retry ;
- prévention des doublons d’extraction ;
- prévention des régressions de statut ;
- sécurisation des traitements concurrents ;
- premiers contrôles métier simples sur les dates et les montants.

### Livrable du sprint
Un **système documentaire sécurisé, traçable et validable**, incluant la validation humaine, l’authentification, le contrôle d’accès initial et la **réinitialisation du mot de passe par email**.

---

## Sprint 3 : Workflow métier des dossiers de remboursement

### Objectif du sprint
Ajouter la véritable dimension métier du projet à travers la gestion des dossiers de remboursement, l’introduction des rubriques et la mise en œuvre du workflow de décision documentaire.

### Travaux inclus

#### 1. Gestion des dossiers de remboursement
- création de l’entité `Dossier` ;
- génération automatique du numéro de dossier ;
- ajout des attributs métier principaux ;
- création, consultation, modification et suppression contrôlée des dossiers ;
- enrichissement de l’identité métier du dossier.

#### 2. Structuration métier
- passage d’une logique simplifiée vers la structure :
  - `Dossier -> Rubriques -> Documents`
- création de l’entité `Rubrique` ;
- rattachement d’un ou plusieurs documents validés à une rubrique ;
- gestion des rubriques dans le cycle de préparation.

#### 3. Workflow métier du remboursement
- mise en place des statuts métier du dossier ;
- soumission du dossier pour révision ;
- décisions documentaires :
  - `PENDING`
  - `ACCEPTED`
  - `REJECTED`
- possibilité de rejeter une rubrique entière ;
- recalcul automatique du statut des rubriques ;
- traitement final du dossier ;
- gel des modifications après finalisation.

#### 4. Calcul métier des montants
- calcul du montant demandé ;
- calcul du montant courant ;
- figement du montant final à la clôture ;
- cohérence entre montants documentaires, rubriques et dossier.

#### 5. Répartition fonctionnelle des rôles métier
##### Agent
- créer un dossier ;
- créer des rubriques ;
- rattacher des documents validés ;
- préparer le dossier ;
- soumettre le dossier pour révision.

##### Gestionnaire
- consulter les dossiers soumis ;
- accepter ou rejeter les documents ;
- rejeter une rubrique entière ;
- traiter le dossier une fois les décisions terminées.

##### Chef hiérarchique
- disposer d’une visibilité sur les dossiers sensibles ou instruits ;
- suivre l’avancement global ;
- intervenir dans les cas nécessitant supervision ou arbitrage.

### Livrable du sprint
Un **workflow métier complet de remboursement**, structuré autour du triplet dossier–rubrique–document, avec règles de calcul et séparation claire entre préparation et décision.

---

## Sprint 4 : Gouvernance, supervision hiérarchique et consolidation finale

### Objectif du sprint
Finaliser la gouvernance avancée de la plateforme, stabiliser le cycle de traitement métier, introduire la traçabilité avancée des événements système et consolider le prototype pour la démonstration académique.

### Travaux inclus

#### 1. Administration et gouvernance
- mise en place de la gestion des utilisateurs par l’administrateur ;
- création des comptes via l’interface ;
- mise à jour des rôles ;
- activation et désactivation des comptes ;
- supervision transversale des accès et des permissions ;
- sécurisation du cycle de vie administratif des comptes.

#### 2. Supervision hiérarchique et escalade
- mise en place de la vue dédiée au chef hiérarchique ;
- consultation des dossiers escaladés ;
- implémentation du workflow d’escalade ;
- retour au gestionnaire ;
- demande de complément ;
- validation hiérarchique selon le scénario métier ;
- distinction entre revue normale, revue escaladée et reprise de préparation.

#### 3. Retour à la préparation et traçabilité avancée
- retour du dossier à la préparation par le gestionnaire ;
- ajout des informations de retour à la préparation ;
- clarification de l’état de réouverture ;
- ajout du **contexte canonique de réouverture** ;
- cohérence entre trace métier et affichage utilisateur.

#### 4. Notifications et suivi applicatif
- ajout de la **table `notifications`** ;
- mise en place de la base de la notification applicative ;
- enregistrement des événements importants du workflow ;
- préparation d’un canal de notification interne pour les acteurs métier ;
- meilleure visibilité sur les actions importantes et les transitions du dossier.

#### 5. Consolidation IA
- intégration de PaddleOCR comme moteur principal ;
- maintien de Tesseract comme fallback ;
- amélioration du post-traitement de l’extraction ;
- amélioration des scores de confiance ;
- durcissement de la robustesse du service IA.

#### 6. Stabilisation et qualité
- tests manuels des scénarios critiques ;
- correction des bugs restants ;
- amélioration ergonomique de l’interface ;
- vérification finale de la sécurité et des autorisations ;
- stabilisation de la démonstration.

#### 7. Finalisation académique
- préparation des captures d’écran ;
- intégration des diagrammes UML ;
- rédaction du rapport final ;
- préparation des slides ;
- construction des scénarios de démonstration ;
- préparation des réponses aux questions probables du jury.

### Livrable du sprint
Un **prototype final stable**, intégrant l’administration, la supervision hiérarchique, le workflow d’escalade, la **table des notifications**, la consolidation IA et un niveau de maturité suffisant pour le mémoire et la soutenance.

---

# 4. Pourquoi cette division est la meilleure

## 4.1 Elle est équilibrée
La charge est répartie selon une progression naturelle :

- **Sprint 1** : fondations techniques ;
- **Sprint 2** : exploitabilité, sécurité et complétude du cycle d’accès ;
- **Sprint 3** : cœur métier ;
- **Sprint 4** : gouvernance, supervision, notifications et stabilisation.

Ainsi, les fonctionnalités ne sont ni dispersées artificiellement, ni compressées dans un sprint final surchargé.

## 4.2 Elle correspond bien au style des rapports tunisiens
Les rapports de référence montrent généralement :

- un **chapitre de planification** séparé ;
- puis **3 ou 4 sprints** ;
- et pour chaque sprint, une logique du type :
  - backlog ;
  - analyse ;
  - conception ;
  - réalisation ;
  - parfois tests et conclusion.

Le présent découpage respecte exactement cette logique académique.

## 4.3 Elle est plus fidèle à votre projet réel
Cette version reflète mieux votre vrai projet, car elle intègre explicitement :

- la **réinitialisation du mot de passe par email** ;
- la **table des notifications** ;
- le **workflow de retour à la préparation** ;
- la **supervision hiérarchique** ;
- la **consolidation OCR/IA**.

Elle évite donc de reléguer ces éléments en “perspectives” alors qu’ils font partie du périmètre que vous souhaitez assumer dans le mémoire.

---

# 5. Recommandation finale à conserver

La version à retenir officiellement dans le rapport est donc :

1. **Socle technique et pipeline documentaire intelligent**  
2. **Validation humaine, sécurité et cycle d’accès complet**  
3. **Workflow métier des dossiers de remboursement**  
4. **Gouvernance, supervision hiérarchique et consolidation finale**

---

# 6. Formulation courte prête à intégrer dans le rapport

Le projet a été planifié selon une approche Agile Scrum adaptée à un contexte académique individuel. Afin d’obtenir un découpage réaliste, équilibré et défendable, le développement a été structuré en quatre sprints principaux. Le premier sprint a porté sur la mise en place du socle technique et du pipeline documentaire intelligent. Le deuxième sprint a été consacré à la validation humaine, à la sécurité, au contrôle d’accès et à la réinitialisation du mot de passe par email. Le troisième sprint a introduit le workflow métier des dossiers de remboursement, fondé sur les dossiers, les rubriques et les décisions documentaires. Enfin, le quatrième sprint a permis de finaliser la gouvernance du système, la supervision hiérarchique, l’escalade métier, la traçabilité avancée, l’ajout de la table des notifications, la consolidation de la couche IA et la stabilisation du prototype final.

---

# 7. Structure conseillée dans le mémoire

Pour garder un style proche des rapports tunisiens les plus crédibles, il est conseillé d’utiliser la structure suivante :

## Dans le chapitre de planification
- équipe Scrum ;
- backlog produit ;
- planification des sprints ;
- diagrammes globaux.

## Puis, pour chaque sprint
- objectif du sprint ;
- backlog du sprint ;
- analyse ;
- conception ;
- réalisation ;
- tests si nécessaire ;
- conclusion du sprint.

Cette structure est plus lisible, plus académique et plus facile à défendre devant le jury.
