## Pilotage du projet avec Scrum

Dans le cadre de ce projet de fin d’études, nous avons adopté la méthodologie **Agile Scrum** afin d’organiser le développement de la plateforme de manière itérative, incrémentale et progressive. Ce choix nous a permis de structurer le travail en sprints cohérents, chacun produisant un incrément fonctionnel, testable et directement exploitable.

Le projet étant réalisé dans un contexte académique avec une équipe réduite, Scrum a été adapté à une organisation individuelle tout en conservant ses principes essentiels : planification, priorisation, amélioration continue, validation progressive et adaptation en fonction des contraintes rencontrées.

Cette organisation a permis de faire évoluer le système de façon structurée, en commençant par le socle technique et le pipeline documentaire, puis en introduisant la validation humaine et la sécurité, ensuite la logique métier des dossiers de remboursement, et enfin la gouvernance par rôles, la consolidation IA et la finalisation académique.

## Équipe Scrum

Dans ce projet, les rôles Scrum ont été adaptés comme suit :

| Rôle Scrum | Affectation |
|---|---|
| Product Owner | Encadrant académique / encadrant professionnel |
| Scrum Master | Étudiant développeur |
| Équipe de développement | Étudiant développeur |

## Acteurs métier pris en compte dans la planification

Afin de refléter correctement la réalité fonctionnelle de la plateforme, la planification prend en compte les acteurs métier suivants :

| Acteur métier | Rôle principal dans le système |
|---|---|
| Agent | Téléverser, corriger, valider techniquement et préparer les dossiers |
| Gestionnaire | Examiner les dossiers soumis, accepter ou rejeter les pièces et traiter les dossiers |
| Chef hiérarchique | Superviser l’activité métier, suivre les dossiers sensibles, arbitrer les situations particulières et disposer d’une vue synthétique de pilotage |
| Administrateur | Gérer les utilisateurs, les rôles, les activations de comptes et la supervision transversale de la plateforme |

---

## Répartition globale des sprints

Afin d’obtenir un découpage plus équilibré, plus réaliste et plus défendable académiquement, le projet a été réparti en **quatre sprints principaux**, d’une durée moyenne de **trois semaines** chacun.

| Sprint | Intitulé | Objectif principal | Durée estimée |
|---|---|---|---|
| Sprint 1 | Socle technique et pipeline documentaire | Mettre en place l’architecture du système et le premier flux documentaire intelligent | 3 semaines |
| Sprint 2 | Validation humaine, sécurité et contrôle d’accès initial | Rendre le système exploitable par des utilisateurs authentifiés et introduire la traçabilité humaine | 3 semaines |
| Sprint 3 | Workflow métier de remboursement | Structurer la gestion métier autour des dossiers, rubriques et décisions de remboursement | 3 semaines |
| Sprint 4 | Gouvernance, supervision hiérarchique et finalisation | Finaliser la gouvernance par rôles, la supervision, la consolidation IA, les exports, les tests et la préparation académique | 3 semaines |

## Tableau de synthèse des sprints

| Sprint | Période | Fonctionnalités prévues | Livrables attendus |
|---|---|---|---|
| Sprint 1 | Semaines 1 à 3 | Setup, architecture, upload, stockage, traitement asynchrone, OCR initial, persistance et statuts techniques | Pipeline documentaire opérationnel |
| Sprint 2 | Semaines 4 à 6 | HITL, versionnement, audit des corrections, authentification, protection des routes, base du contrôle d’accès | Système sécurisé, traçable et validable |
| Sprint 3 | Semaines 7 à 9 | Dossiers, rubriques, attachement des documents validés, décisions métier, calculs de montants, traitement du dossier | Workflow métier de remboursement complet |
| Sprint 4 | Semaines 10 à 12 | Supervision hiérarchique, administration des utilisateurs, consolidation OCR, export, dashboards, tests, rapport et soutenance | Prototype final stable et livrables académiques prêts |

---

## Sprint 1 : Socle technique et pipeline documentaire

### Objectif du sprint

Le premier sprint a pour objectif de mettre en place l’environnement de développement, de définir l’architecture générale de la solution et de construire un premier pipeline documentaire fonctionnel, depuis le téléversement du document jusqu’au stockage du résultat d’extraction.

### Fonctionnalités prévues

#### Mise en place de l’architecture
- mise en place du backend Laravel ;
- mise en place du frontend React ;
- mise en place du service IA FastAPI ;
- configuration de la base de données MySQL ;
- structuration du projet en monorepo ;
- définition du flux global de traitement documentaire ;
- séparation claire des responsabilités entre React, Laravel et FastAPI.

#### Pipeline documentaire initial
- téléversement des documents médicaux ;
- validation du type et de la taille des fichiers ;
- stockage local sécurisé des documents ;
- mise en place du traitement asynchrone via file d’attente ;
- création du job de traitement ;
- premier contrat d’échange entre Laravel et FastAPI ;
- intégration d’un premier moteur OCR ;
- extraction initiale des champs prioritaires :
  - date du document ;
  - prestataire ;
  - montant total TTC.

#### Traçabilité technique
- journalisation des appels vers le service IA ;
- persistance des résultats d’extraction ;
- gestion des statuts techniques des documents :
  - `UPLOADED`
  - `PROCESSING`
  - `PROCESSED`
  - `FAILED`

### Livrables du sprint
- architecture technique fonctionnelle ;
- pipeline documentaire opérationnel ;
- traitement OCR asynchrone ;
- persistance des extractions et des appels IA.

### Critères d’acceptation
- un document peut être téléversé, stocké et traité de manière asynchrone ;
- le statut du document évolue correctement dans le pipeline ;
- le service IA retourne un JSON exploitable par Laravel ;
- les résultats d’extraction sont enregistrés en base.

### Valeur apportée
Ce sprint valide la faisabilité technique du projet et pose les fondations de la plateforme intelligente de traitement documentaire.

---

## Sprint 2 : Validation humaine, sécurité et contrôle d’accès initial

### Objectif du sprint

Le deuxième sprint vise à rendre le système réellement exploitable en ajoutant la validation humaine des données extraites, la traçabilité des corrections, l’authentification des utilisateurs et un premier niveau de contrôle d’accès.

### Fonctionnalités prévues

#### Validation humaine (HITL)
- mise en place de l’interface de validation humaine ;
- affichage des champs extraits avec score de confiance ;
- correction manuelle des données extraites ;
- historisation des corrections ;
- création d’une nouvelle version d’extraction après validation humaine ;
- passage du document de `PROCESSED` à `VALIDATED`.

#### Audit et traçabilité
- ajout des informations de validation :
  - `validated_by`
  - `validated_at`
- distinction entre extraction brute IA et extraction validée humainement ;
- conservation de l’historique des modifications.

#### Authentification et protection
- intégration de l’authentification avec Laravel Sanctum ;
- implémentation des endpoints de connexion, déconnexion et utilisateur courant ;
- intégration côté frontend ;
- protection des routes frontend et backend ;
- isolation stricte des documents par utilisateur.

#### Contrôle d’accès initial
- ajout du champ `role` dans la table `users` ;
- préparation d’un modèle d’accès extensible pour les rôles :
  - `AGENT`
  - `GESTIONNAIRE`
  - `CHEF_HIERARCHIQUE`
  - `ADMIN`
- premier filtrage des actions selon le rôle connecté ;
- adaptation des menus et des accès de base selon le profil.

#### Robustesse technique
- gestion des documents en échec ;
- mécanisme de retry ;
- prévention des doublons d’extraction ;
- prévention des régressions de statut ;
- sécurisation des traitements concurrents ;
- ajout de premiers contrôles métier simples sur dates et montants.

### Livrables du sprint
- interface HITL complète ;
- audit trail des corrections et validations ;
- authentification opérationnelle ;
- protection des accès de base ;
- workflow documentaire sécurisé et traçable.

### Critères d’acceptation
- un utilisateur authentifié peut se connecter et accéder à son espace ;
- un document traité peut être corrigé puis validé ;
- les corrections sont historisées ;
- les accès non autorisés sont bloqués ;
- les erreurs OCR et les cas d’échec sont correctement gérés.

### Valeur apportée
Ce sprint transforme le socle technique en un système exploitable, sécurisé et contrôlé, prêt à supporter un véritable workflow métier.

---

## Sprint 3 : Workflow métier de remboursement

### Objectif du sprint

Le troisième sprint a pour objectif d’ajouter la véritable dimension métier du projet à travers la gestion des dossiers de remboursement, l’introduction d’une structure plus fine basée sur les rubriques et la mise en œuvre du workflow de décision.

### Fonctionnalités prévues

#### Gestion des dossiers de remboursement
- création de l’entité `Dossier` ;
- génération automatique du numéro de dossier ;
- ajout des attributs métier principaux :
  - `numero_dossier`
  - `assured_identifier`
  - `status`
  - `montant_total`
  - `episode_description`
  - `notes`
  - `created_by`
- consultation, création, modification et suppression contrôlée des dossiers.

#### Nouvelle structure métier
- passage d’une logique simplifiée `Dossier -> Documents` à une structure métier plus précise :
  - `Dossier -> Rubriques -> Documents`
- création de l’entité `Rubrique` ;
- rattachement d’un ou plusieurs documents validés à une rubrique ;
- possibilité de rejeter une rubrique entière ;
- possibilité d’accepter ou rejeter un seul document à l’intérieur d’une rubrique.

#### Workflow métier du remboursement
- mise en place des statuts métier du dossier :
  - `RECEIVED`
  - `IN_PROGRESS`
  - `TO_VALIDATE`
  - `PROCESSED`
- soumission du dossier pour révision ;
- décision métier document par document :
  - `PENDING`
  - `ACCEPTED`
  - `REJECTED`
- recalcul automatique du statut des rubriques :
  - `PENDING`
  - `ACCEPTED`
  - `REJECTED`
  - `PARTIAL`
- finalisation du dossier ;
- gel des modifications après traitement.

#### Calcul métier des montants
- calcul du montant demandé à partir des documents validés rattachés ;
- calcul du montant courant à partir des seuls documents acceptés ;
- figement du montant final à la clôture du dossier.

#### Répartition fonctionnelle des rôles métier
##### Agent
- créer un dossier ;
- créer des rubriques ;
- rattacher des documents validés ;
- préparer le dossier avant soumission ;
- soumettre le dossier pour révision.

##### Gestionnaire
- consulter les dossiers à traiter ;
- accepter ou rejeter des documents ;
- rejeter une rubrique entière ;
- traiter le dossier une fois toutes les décisions prises.

##### Chef hiérarchique
- consulter les dossiers déjà instruits ou sensibles ;
- suivre l’avancement global des dossiers de son périmètre ;
- arbitrer les cas nécessitant une supervision supérieure ;
- disposer d’une vue synthétique sur les décisions prises.

### Livrables du sprint
- gestion complète des dossiers de remboursement ;
- structure métier dossier-rubrique-document ;
- workflow complet de soumission et de traitement ;
- séparation claire entre préparation, décision et supervision métier.

### Critères d’acceptation
- un agent peut créer un dossier, ajouter des rubriques et y rattacher des documents validés ;
- un dossier suit un cycle de vie métier clair ;
- un gestionnaire peut décider document par document ;
- une rubrique peut être partiellement ou totalement rejetée ;
- le chef hiérarchique peut superviser l’état d’avancement et les décisions critiques.

### Valeur apportée
Ce sprint donne au projet sa véritable valeur métier dans le contexte de l’assurance santé, en allant au-delà du simple traitement documentaire pour modéliser un vrai workflow de remboursement.

---

## Sprint 4 : Gouvernance, supervision hiérarchique et finalisation

### Objectif du sprint

Le dernier sprint est consacré à la gouvernance avancée de la plateforme, à l’opérationnalisation des rôles de supervision, à la consolidation de la couche IA, à la valorisation du système et à la préparation complète du livrable académique.

### Fonctionnalités prévues

#### Gouvernance et administration
- mise en place de la gestion des utilisateurs par l’administrateur ;
- création de comptes depuis l’interface d’administration ;
- mise à jour des rôles ;
- activation et désactivation des comptes ;
- sécurisation du cycle de vie des sessions ;
- supervision transversale des accès et des permissions.

#### Supervision hiérarchique
- mise en place d’une vue dédiée au chef hiérarchique ;
- consultation synthétique des dossiers traités, en attente ou sensibles ;
- suivi des performances globales de traitement ;
- visibilité sur l’activité des gestionnaires ;
- possibilité d’appuyer le pilotage métier sans intervenir dans les opérations techniques de base.

#### Consolidation IA
- intégration de PaddleOCR comme moteur OCR principal ;
- conservation de Tesseract comme fallback ;
- ajout d’un post-traitement amélioré pour l’extraction du prestataire ;
- amélioration du calcul des scores de confiance ;
- durcissement de la validation des fichiers et de la robustesse du service IA.

#### Fonctionnalités de valorisation
- export des données au format `CSV` ;
- export par document ou par dossier ;
- mise en place de dashboards adaptés aux rôles :
  - dashboard agent ;
  - dashboard gestionnaire ;
  - dashboard chef hiérarchique ;
  - dashboard administrateur.

#### Stabilisation et qualité
- tests manuels des scénarios critiques ;
- quelques tests automatisés ciblés ;
- correction des bugs restants ;
- amélioration ergonomique de l’interface ;
- vérification finale de la sécurité et des autorisations ;
- stabilisation de la démonstration.

#### Finalisation académique
- préparation des captures d’écran ;
- rédaction du rapport final ;
- intégration des diagrammes UML ;
- préparation des slides ;
- élaboration des scénarios de démonstration ;
- préparation des réponses aux questions probables du jury.

### Livrables du sprint
- gestion opérationnelle des utilisateurs ;
- vue de supervision hiérarchique ;
- couche IA consolidée ;
- export CSV ;
- dashboards adaptés aux rôles ;
- prototype final stable ;
- rapport final ;
- soutenance préparée.

### Critères d’acceptation
- les scénarios principaux sont démontrables sans bug bloquant ;
- les vues et actions diffèrent correctement selon le rôle connecté ;
- l’administrateur peut gérer les comptes et les rôles ;
- le chef hiérarchique dispose d’une vue claire de supervision ;
- la couche IA reste compatible avec le workflow global ;
- le rapport est complet, relu et structuré ;
- la démonstration est stable et défendable.

### Valeur apportée
Ce sprint garantit que le projet n’est pas seulement développé, mais aussi gouverné, consolidé, valorisé, documenté et prêt pour une présentation académique réussie.

---

## Conclusion

La planification Scrum adoptée pour ce projet a permis d’organiser le développement de manière progressive, cohérente et réaliste. Le découpage proposé en quatre sprints équilibre mieux les charges entre fondation technique, sécurisation, métier et gouvernance finale.

Cette organisation permet de mieux maîtriser le périmètre, de prioriser les fonctionnalités essentielles et de produire à chaque sprint un incrément ayant une réelle valeur fonctionnelle. Elle reflète également plus fidèlement la montée en maturité du projet, tout en intégrant explicitement le **chef hiérarchique** comme acteur de supervision dans la logique globale de la plateforme.
