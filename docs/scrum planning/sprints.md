## Pilotage du projet avec Scrum

Dans le cadre de ce projet de fin d’études, nous avons adopté la méthodologie **Agile Scrum** afin d’organiser le développement du système de manière itérative, incrémentale et progressive. Ce choix nous a permis de structurer le travail en plusieurs sprints, chacun produisant un incrément fonctionnel, testable et directement exploitable.

Le projet étant réalisé dans un contexte académique avec une équipe réduite, Scrum a été adapté à une organisation individuelle tout en conservant ses principes essentiels : planification, priorisation, amélioration continue, validation progressive et adaptation en fonction des contraintes rencontrées.

Cette approche a permis de construire le projet de façon cohérente, en mettant d’abord en place le socle technique et le pipeline documentaire intelligent, puis en introduisant la validation humaine, la sécurité, la séparation des rôles, la logique métier des dossiers de remboursement, et enfin la stabilisation finale et la préparation académique.

### Équipe Scrum

Dans notre projet, les rôles Scrum ont été adaptés comme suit :

| Rôle Scrum | Affectation |
|------------|-------------|
| Product Owner | Encadrant académique / encadrant professionnel |
| Scrum Master | Étudiant développeur |
| Équipe de développement | Étudiant développeur |

---

## Répartition globale des sprints

Afin de garantir une progression réaliste, lisible et académiquement défendable, le projet a été réparti en **quatre sprints principaux**, d’une durée moyenne de **trois semaines** chacun.

| Sprint | Intitulé | Objectif principal | Durée estimée |
|--------|----------|-------------------|---------------|
| Sprint 1 | Mise en place du socle technique et du pipeline documentaire | Construire l’architecture de base et implémenter le flux documentaire intelligent initial | 3 semaines |
| Sprint 2 | Validation humaine, authentification et contrôle d’accès (RBAC) | Ajouter la validation HITL, sécuriser l’accès et introduire la séparation fonctionnelle des rôles | 3 semaines |
| Sprint 3 | Extension métier, dossiers de remboursement et RBAC métier complet | Ajouter la structure dossier-rubrique-document, le workflow métier et la séparation Agent / Gestionnaire / Admin | 3 semaines |
| Sprint 4 | Valorisation, stabilisation finale et préparation académique | Finaliser les fonctionnalités de sortie, les vues par rôle, les tests, le rapport et la soutenance | 3 semaines |

### Tableau de synthèse des sprints

| Sprint | Période | Fonctionnalités prévues | Livrables attendus |
|--------|---------|--------------------------|--------------------|
| Sprint 1 | Semaines 1 à 3 | Setup, architecture, upload, stockage, traitement asynchrone, OCR initial, persistance des extractions, audit technique de base | Pipeline documentaire opérationnel |
| Sprint 2 | Semaines 4 à 6 | Validation humaine, versionnement des extractions, authentification Sanctum, protection des routes, contrôle d’accès par rôles, sécurisation du workflow | Système sécurisé, traçable et différencié par rôle |
| Sprint 3 | Semaines 7 à 9 | Gestion des dossiers, rubriques, décisions documentaires, workflow métier, Maker–Checker, séparation complète des rôles métier | Workflow métier de remboursement complet |
| Sprint 4 | Semaines 10 à 12 | Export CSV, dashboards par rôle, tests, corrections, finalisation UI, rapport, soutenance | Prototype final stable et livrables académiques prêts |

---

## Sprint 1 : Mise en place du socle technique et du pipeline documentaire

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
- séparation claire des responsabilités entre Laravel, FastAPI et React.

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
- stockage des résultats d’extraction ;
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
Ce sprint valide la faisabilité technique du projet et pose les fondations du système intelligent de traitement documentaire.

---

## Sprint 2 : Validation humaine, authentification et contrôle d’accès (RBAC)

### Objectif du sprint

Le deuxième sprint vise à rendre le système réellement exploitable en ajoutant la validation humaine des données extraites, la traçabilité complète des corrections, l’authentification des utilisateurs et une première séparation des responsabilités à travers un contrôle d’accès par rôles.

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
- différenciation entre extraction brute IA et extraction validée humainement ;
- conservation de l’historique des modifications.

#### Authentification et protection
- intégration de l’authentification avec Laravel Sanctum ;
- implémentation des endpoints :
  - connexion ;
  - déconnexion ;
  - utilisateur courant ;
- intégration côté frontend ;
- protection des routes frontend et backend ;
- isolation stricte des documents par utilisateur.

#### Introduction du contrôle d’accès par rôles
- ajout du champ `role` dans la table `users` ;
- définition des rôles :
  - `AGENT`
  - `GESTIONNAIRE`
  - `ADMIN`
- première protection des accès selon le rôle ;
- adaptation des menus et des vues selon l’utilisateur connecté ;
- masquage des actions non autorisées.

#### Répartition fonctionnelle des rôles
##### Agent
- téléverser ses documents ;
- consulter ses documents ;
- corriger les champs extraits ;
- préparer les éléments avant décision métier.

##### Gestionnaire
- consulter les éléments à valider ;
- valider ou rejeter selon les règles métier prévues.

##### Administrateur
- disposer d’une visibilité globale minimale ;
- préparer la future gestion des utilisateurs et du pilotage.

#### Robustesse et contrôles métier
- gestion claire des documents en échec ;
- mécanisme de retry ;
- prévention des doublons d’extraction ;
- prévention des régressions de statut ;
- sécurisation des traitements concurrents ;
- ajout de règles métier simples :
  - montant négatif bloquant ;
  - montant élevé signalé ;
  - date future signalée.

### Livrables du sprint
- interface HITL complète ;
- audit trail des corrections et validations ;
- authentification opérationnelle ;
- contrôle d’accès par rôles fonctionnel ;
- workflow sécurisé et traçable.

### Critères d’acceptation
- un utilisateur authentifié peut se connecter et accéder uniquement à ses données ;
- un document traité peut être corrigé puis validé ;
- les corrections sont historisées ;
- les accès non autorisés sont bloqués ;
- les menus et actions affichés s’adaptent au rôle connecté ;
- les erreurs OCR et les cas d’échec sont correctement gérés.

### Valeur apportée
Ce sprint transforme le prototype technique en un système sécurisé, traçable et exploitable dans un cadre métier réel.

---

## Sprint 3 : Extension métier, dossiers de remboursement et RBAC métier complet

### Objectif du sprint

Le troisième sprint a pour objectif d’ajouter la véritable dimension métier du projet à travers la gestion des dossiers de remboursement, l’introduction d’une structure plus fine basée sur les rubriques, et la mise en œuvre d’une séparation claire des responsabilités entre agent, gestionnaire et administrateur.

### Fonctionnalités prévues

#### Gestion des dossiers de remboursement
- création de l’entité `Dossier` ;
- génération automatique du numéro de dossier ;
- ajout des attributs métier principaux :
  - `numero_dossier`
  - `assured_identifier`
  - `status`
  - `montant_total`
  - `notes`
  - `episode_description`
  - `created_by`
- consultation, création, modification et suppression contrôlée des dossiers.

#### Nouvelle structure métier
- passage d’une logique simplifiée `Dossier -> Documents` à une structure métier plus précise :
  - `Dossier -> Rubriques -> Documents`
- création de l’entité `Rubrique` ;
- rattachement d’un ou plusieurs documents à une rubrique ;
- possibilité de rejeter une rubrique entière ;
- possibilité d’accepter ou rejeter un seul document à l’intérieur d’une rubrique.

#### Workflow métier du remboursement
- mise en place des statuts métier du dossier :
  - `RECEIVED`
  - `IN_PROGRESS`
  - `TO_VALIDATE`
  - `PROCESSED`
  - `EXPORTED`
- création manuelle des rubriques ;
- attachement uniquement des documents techniquement `VALIDATED` ;
- soumission du dossier pour révision ;
- décision métier document par document :
  - `PENDING`
  - `ACCEPTED`
  - `REJECTED`
- recalcul du statut des rubriques :
  - `PENDING`
  - `ACCEPTED`
  - `REJECTED`
  - `PARTIAL`
- finalisation du dossier en `PROCESSED` ;
- gel des modifications après finalisation.

#### Calcul métier des montants
- calcul du montant demandé à partir des documents validés attachés ;
- calcul du montant courant à partir des seuls documents acceptés ;
- figement du montant final à la clôture du dossier.

#### RBAC métier complet
Le contrôle d’accès n’est plus seulement technique, il devient réellement métier.

##### Agent
- créer un dossier ;
- créer des rubriques ;
- rattacher des documents validés ;
- consulter ses dossiers ;
- préparer le dossier avant soumission ;
- soumettre le dossier pour révision.

##### Gestionnaire
- consulter les dossiers à traiter ;
- accepter ou rejeter des documents ;
- rejeter une rubrique entière ;
- clôturer / traiter un dossier une fois toutes les décisions prises ;
- appliquer la logique Maker–Checker.

##### Administrateur
- gérer les comptes utilisateurs ;
- assurer une visibilité transversale sur la plateforme ;
- superviser l’application globale des permissions ;
- préparer les fonctionnalités d’administration plus avancées.

#### Amélioration IA
- intégration de PaddleOCR comme amélioration principale du moteur OCR ;
- conservation éventuelle de Tesseract comme alternative ;
- possibilité d’explorer spaCy comme amélioration complémentaire si le temps le permet.

### Livrables du sprint
- gestion complète des dossiers de remboursement ;
- structure métier dossier-rubrique-document ;
- workflow complet de soumission et de traitement ;
- séparation claire des rôles métier ;
- amélioration du moteur OCR.

### Critères d’acceptation
- un agent peut créer un dossier, ajouter des rubriques et y rattacher des documents validés ;
- un dossier suit un cycle de vie métier clair ;
- un gestionnaire peut décider document par document ;
- une rubrique peut être partiellement ou totalement rejetée ;
- un administrateur dispose des premières capacités de supervision et de gestion ;
- les rôles contrôlent correctement les accès et les actions disponibles.

### Valeur apportée
Ce sprint donne au projet sa véritable valeur métier dans le contexte de l’assurance santé, en allant au-delà du simple traitement documentaire pour modéliser un vrai workflow de remboursement.

---

## Sprint 4 : Valorisation, stabilisation finale et préparation académique

### Objectif du sprint

Le dernier sprint est consacré à la valorisation du système, à sa stabilisation finale, à l’enrichissement des vues par rôle et à la préparation complète du livrable académique et de la soutenance.

### Fonctionnalités prévues

#### Fonctionnalités de valorisation
- export des données au format `CSV` ;
- export par document ou par dossier ;
- mise en place de dashboards adaptés aux rôles :
  - dashboard agent ;
  - dashboard gestionnaire ;
  - dashboard administrateur.

#### Finalisation des vues par rôle
##### Vue Agent
- suivi de ses documents ;
- suivi de ses dossiers ;
- visibilité sur les dossiers préparés et soumis.

##### Vue Gestionnaire
- visualisation des dossiers à traiter ;
- suivi des décisions en attente ;
- pilotage du volume métier à valider.

##### Vue Administrateur
- vue globale sur l’activité de la plateforme ;
- suivi des utilisateurs ;
- contrôle transversal du système.

#### Stabilisation et qualité
- tests manuels des scénarios critiques ;
- quelques tests automatisés de workflow ;
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

### Minimum non négociable du sprint
Les éléments suivants doivent impérativement être finalisés :
- stabilité du workflow principal ;
- séparation des rôles fonctionnelle ;
- tests des scénarios critiques ;
- rapport finalisé ;
- démonstration prête ;
- présentation prête.

### Éléments optionnels
Les éléments suivants peuvent être simplifiés en cas de contrainte de temps :
- dashboards avancés ;
- amélioration UI poussée ;
- amélioration OCR complémentaire avancée ;
- analytiques secondaires.

### Livrables du sprint
- export CSV ;
- dashboards adaptés aux rôles ;
- prototype final stable ;
- rapport final ;
- soutenance préparée.

### Critères d’acceptation
- les scénarios principaux sont démontrables sans bug bloquant ;
- les vues et actions diffèrent correctement selon le rôle connecté ;
- le rapport est complet, relu et structuré ;
- les fonctionnalités à forte valeur métier sont opérationnelles ;
- la démonstration est claire, stable et défendable.

### Valeur apportée
Ce sprint garantit que le projet n’est pas seulement développé, mais aussi stabilisé, valorisé, documenté et prêt pour une présentation académique réussie.

---

## Conclusion

La planification Scrum adoptée pour ce projet a permis d’organiser le développement de manière progressive, cohérente et réaliste. Le découpage en quatre sprints facilite la construction incrémentale de la plateforme, en commençant par le socle technique et le pipeline documentaire, puis en introduisant la validation humaine, l’authentification, la séparation des rôles, la logique métier liée aux dossiers de remboursement et enfin la finalisation académique du projet.

Cette organisation permet de mieux maîtriser le périmètre, de prioriser les fonctionnalités essentielles et de produire à chaque sprint un incrément ayant une réelle valeur fonctionnelle. Ainsi, la méthodologie Scrum se révèle particulièrement adaptée à la conduite de ce projet de fin d’études dans un cadre individuel.
