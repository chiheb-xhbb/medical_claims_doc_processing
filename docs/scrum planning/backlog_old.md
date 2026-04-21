# Backlog final du projet PFE

## Introduction

Dans le cadre du pilotage Scrum retenu pour ce projet, chaque sprint est associé à un backlog spécifique regroupant les fonctionnalités à réaliser durant l’itération concernée.  
Le présent backlog est aligné avec la division finale du projet en **quatre sprints**, avec une progression cohérente allant :

1. du **socle technique**,
2. à la **sécurisation et la validation humaine**,
3. puis au **workflow métier de remboursement**,
4. avant d’aboutir à la **gouvernance, la supervision hiérarchique et la consolidation finale**.

Ce backlog tient compte :

- du projet réel tel qu’il a été défini et affiné au cours du développement ;
- du style de présentation observé dans les rapports tunisiens de PFE ;
- des ajustements fonctionnels importants décidés ensuite, notamment :
  - la **réinitialisation du mot de passe par email** ;
  - l’**ajout de la table `notifications`** ;
  - la possibilité pour le **chef hiérarchique** de **téléverser des documents** et de **créer un dossier** lorsqu’il intervient directement sur un cas.

---

# Backlog du Sprint 1 : Socle technique et pipeline documentaire intelligent

## Objectif du sprint
Mettre en place l’architecture du système et construire un premier pipeline documentaire fonctionnel, depuis le téléversement du document jusqu’au stockage du résultat d’extraction.

| ID | User Story | Priorité | Résultat attendu |
|---|---|---|---|
| US1 | En tant qu’utilisateur, je veux téléverser un document médical afin de l’envoyer au système pour traitement. | Haute | Téléversement fonctionnel |
| US2 | En tant que système, je veux vérifier le type et la taille du fichier afin d’accepter uniquement les documents autorisés. | Haute | Contrôle des fichiers en entrée |
| US3 | En tant que système, je veux stocker localement les documents de manière sécurisée afin de préserver leur intégrité. | Haute | Stockage local sécurisé |
| US4 | En tant que système, je veux déclencher un traitement asynchrone après l’upload afin de ne pas bloquer l’utilisateur. | Haute | File d’attente et job de traitement actifs |
| US5 | En tant que système, je veux communiquer avec le service IA FastAPI afin de lancer l’OCR et l’extraction. | Haute | Communication Laravel/FastAPI opérationnelle |
| US6 | En tant que système, je veux extraire les informations principales d’un document afin de les rendre exploitables. | Haute | Extraction initiale des champs prioritaires |
| US7 | En tant que système, je veux enregistrer les résultats d’extraction dans la base afin d’assurer leur persistance. | Haute | Données enregistrées dans `extractions` |
| US8 | En tant que système, je veux journaliser les appels envoyés au service IA afin d’assurer une première traçabilité. | Moyenne | Enregistrement dans `ai_requests` |
| US9 | En tant qu’utilisateur, je veux consulter les données extraites afin de vérifier le résultat du traitement automatique. | Haute | Affichage des extractions dans l’interface |
| US10 | En tant que système, je veux gérer les statuts techniques du document afin de suivre son cycle de traitement. | Haute | Gestion des statuts `UPLOADED`, `PROCESSING`, `PROCESSED`, `FAILED` |
| US11 | En tant que système, je veux distinguer les erreurs temporaires et permanentes afin de mieux gérer les échecs de traitement. | Moyenne | Gestion plus propre des erreurs OCR |
| US12 | En tant que système, je veux prévoir un mécanisme de reprise pour les documents bloqués ou échoués afin d’assurer la continuité du workflow. | Moyenne | Base de retry et récupération disponible |

### Livrables du sprint
- architecture technique fonctionnelle ;
- pipeline documentaire opérationnel ;
- traitement OCR asynchrone ;
- persistance des extractions et des appels IA ;
- gestion initiale des statuts et des erreurs.

---

# Backlog du Sprint 2 : Validation humaine, sécurité et cycle d’accès complet

## Objectif du sprint
Rendre la plateforme exploitable, sécurisée et traçable, tout en intégrant la validation humaine, le contrôle d’accès par rôles et la complétude du cycle de gestion des comptes.

| ID | User Story | Priorité | Résultat attendu |
|---|---|---|---|
| US13 | En tant qu’utilisateur, je veux m’authentifier afin d’accéder à mon espace de manière sécurisée. | Haute | Authentification opérationnelle avec Sanctum |
| US14 | En tant qu’utilisateur authentifié, je veux consulter uniquement les données autorisées afin de respecter la confidentialité. | Haute | Isolement des données par utilisateur et par rôle |
| US15 | En tant qu’agent, je veux voir les champs extraits avec leur score de confiance afin d’identifier rapidement les données à vérifier. | Haute | Interface HITL opérationnelle |
| US16 | En tant qu’agent, je veux corriger manuellement les données extraites afin d’améliorer la qualité du résultat final. | Haute | Correction manuelle des champs |
| US17 | En tant que système, je veux enregistrer les corrections apportées afin d’assurer la traçabilité des modifications. | Haute | Historisation dans `field_corrections` |
| US18 | En tant qu’agent, je veux valider techniquement les données corrigées afin de confirmer la version finale de l’extraction. | Haute | Passage du document à `VALIDATED` |
| US19 | En tant que système, je veux conserver les informations de validation afin de savoir qui a validé et quand. | Haute | Champs `validated_by` et `validated_at` exploités |
| US20 | En tant que système, je veux protéger les routes sensibles afin d’empêcher les accès non autorisés. | Haute | Routes backend et frontend protégées |
| US21 | En tant que système, je veux distinguer les rôles `AGENT`, `CLAIMS_MANAGER`, `SUPERVISOR` et `ADMIN` afin d’appliquer un contrôle d’accès adapté. | Haute | RBAC initial fonctionnel |
| US22 | En tant qu’utilisateur, je veux voir uniquement les actions autorisées selon mon rôle afin de simplifier l’usage de la plateforme. | Haute | Interface adaptée au rôle connecté |
| US23 | En tant qu’utilisateur, je veux pouvoir changer mon mot de passe après connexion afin de sécuriser mon compte. | Moyenne | Changement de mot de passe disponible |
| US24 | En tant qu’administrateur, je veux réinitialiser le mot de passe d’un utilisateur afin de gérer les comptes de manière centralisée. | Moyenne | Réinitialisation admin fonctionnelle |
| US25 | En tant qu’utilisateur, je veux demander un lien de réinitialisation par email lorsque j’oublie mon mot de passe afin de récupérer l’accès à mon compte. | Haute | Flux **forget password by email** opérationnel |
| US26 | En tant que système, je veux envoyer un email de réinitialisation contenant un jeton sécurisé afin de protéger la procédure de récupération. | Haute | Email de réinitialisation envoyé correctement |
| US27 | En tant qu’utilisateur, je veux définir un nouveau mot de passe à partir du lien reçu par email afin de récupérer mon compte. | Haute | Redéfinition du mot de passe sécurisée |
| US28 | En tant que système, je veux empêcher les doublons d’extraction, les régressions de statut et les incohérences concurrentes afin d’améliorer la robustesse. | Moyenne | Workflow documentaire plus stable |
| US29 | En tant que système, je veux permettre la reprise des documents en échec afin de limiter les interruptions du traitement. | Moyenne | Retry et remise en traitement disponibles |

### Livrables du sprint
- interface HITL complète ;
- authentification et protection des accès ;
- contrôle d’accès par rôles ;
- traçabilité des corrections et validations ;
- changement de mot de passe ;
- **réinitialisation du mot de passe par email**.

---

# Backlog du Sprint 3 : Workflow métier des dossiers de remboursement

## Objectif du sprint
Introduire le cœur métier du projet à travers la gestion des dossiers de remboursement, la structuration en rubriques et la mise en place du cycle complet de préparation, de soumission, de décision et de traitement.

| ID | User Story | Priorité | Résultat attendu |
|---|---|---|---|
| US30 | En tant qu’agent, je veux créer un dossier de remboursement afin d’y regrouper les pièces d’un même épisode médical. | Haute | Création de l’entité `Dossier` |
| US31 | En tant que système, je veux générer automatiquement un numéro de dossier afin d’identifier chaque dossier de manière unique. | Moyenne | Génération du `numero_dossier` |
| US32 | En tant qu’agent, je veux consulter la liste de mes dossiers afin de suivre leur état d’avancement. | Haute | Liste des dossiers disponible |
| US33 | En tant qu’utilisateur autorisé, je veux ouvrir le détail d’un dossier afin de gérer son contenu métier. | Haute | Vue détail dossier disponible |
| US34 | En tant qu’agent, je veux créer une rubrique dans un dossier afin d’organiser les documents selon la logique métier. | Haute | Création de `Rubrique` opérationnelle |
| US35 | En tant qu’agent, je veux rattacher des documents validés à une rubrique afin de préparer le dossier de remboursement. | Haute | Relation `Rubrique -> Documents` fonctionnelle |
| US36 | En tant que système, je veux empêcher l’attachement de documents non `VALIDATED` afin de garantir la cohérence métier. | Haute | Contrôle métier sur les documents attachables |
| US37 | En tant que système, je veux calculer le montant demandé d’un dossier à partir des documents validés qui y sont rattachés. | Moyenne | `requested_total` calculé correctement |
| US38 | En tant qu’agent, je veux soumettre un dossier prêt afin qu’il soit examiné par le gestionnaire. | Haute | Passage du dossier à l’état de révision |
| US39 | En tant que gestionnaire, je veux accepter ou rejeter un document d’une rubrique afin de prendre une décision métier fine. | Haute | Décision document par document opérationnelle |
| US40 | En tant que gestionnaire, je veux rejeter une rubrique entière afin de traiter rapidement un ensemble de pièces non conforme. | Moyenne | Rejet global d’une rubrique |
| US41 | En tant que système, je veux recalculer automatiquement le statut de la rubrique selon les décisions prises sur ses documents. | Haute | Statuts `PENDING`, `ACCEPTED`, `REJECTED`, `PARTIAL` corrects |
| US42 | En tant que système, je veux calculer le montant courant du dossier à partir des seuls documents acceptés afin de refléter le montant réellement retenu. | Haute | `current_total` calculé correctement |
| US43 | En tant que gestionnaire, je veux finaliser le dossier une fois toutes les décisions prises afin de clôturer le traitement métier. | Haute | Passage du dossier à `PROCESSED` |
| US44 | En tant que système, je veux geler les modifications d’un dossier finalisé afin d’éviter toute incohérence après traitement. | Haute | Blocage des actions après traitement |
| US45 | En tant qu’utilisateur préparateur, je veux supprimer une rubrique vide avant soumission afin de corriger proprement la structure d’un dossier. | Moyenne | Suppression sécurisée d’une rubrique vide |
| US46 | En tant que système, je veux tracer les actions métier principales (`submitted_by`, `processed_by`, `rejected_by`) afin d’améliorer l’audit du workflow. | Moyenne | Traçabilité métier enrichie |

### Livrables du sprint
- gestion complète des dossiers de remboursement ;
- structure métier `Dossier -> Rubriques -> Documents` ;
- workflow complet de préparation, soumission, décision et traitement ;
- calculs métier cohérents ;
- premières métadonnées de traçabilité.

---

# Backlog du Sprint 4 : Gouvernance, supervision hiérarchique et consolidation finale

## Objectif du sprint
Finaliser la gouvernance de la plateforme en ajoutant l’administration des utilisateurs, la supervision hiérarchique, les notifications, la consolidation OCR/IA et la stabilisation générale du prototype.

| ID | User Story | Priorité | Résultat attendu |
|---|---|---|---|
| US47 | En tant qu’administrateur, je veux créer des comptes utilisateurs depuis l’interface afin de gérer la plateforme de manière centralisée. | Haute | Création d’utilisateurs via l’admin |
| US48 | En tant qu’administrateur, je veux modifier les rôles et l’état actif/inactif des comptes afin d’assurer la gouvernance des accès. | Haute | Gestion des rôles et statuts fonctionnelle |
| US49 | En tant que chef hiérarchique, je veux consulter les dossiers escaladés ou sensibles afin d’exercer une supervision métier. | Haute | Vue chef hiérarchique disponible |
| US50 | En tant que gestionnaire, je veux escalader un dossier au chef hiérarchique lorsque le cas nécessite un arbitrage supérieur. | Haute | Workflow d’escalade opérationnel |
| US51 | En tant que chef hiérarchique, je veux pouvoir approuver, retourner ou demander un complément sur un dossier escaladé afin de piloter les cas sensibles. | Haute | Décisions hiérarchiques opérationnelles |
| US52 | En tant que gestionnaire, je veux retourner un dossier à la préparation avec un motif clair afin de demander des corrections avant poursuite du traitement. | Haute | Retour à la préparation opérationnel |
| US53 | En tant que système, je veux conserver un contexte canonique de réouverture de préparation afin d’expliquer correctement pourquoi un dossier a été rouvert. | Moyenne | Traçabilité propre de la réouverture |
| US54 | En tant que système, je veux ajouter une table `notifications` afin d’enregistrer les événements importants du workflow. | Haute | Table `notifications` créée |
| US55 | En tant que système, je veux notifier les acteurs concernés lors des transitions critiques du dossier afin d’améliorer la réactivité métier. | Moyenne | Base de la notification applicative disponible |
| US56 | En tant que chef hiérarchique, je veux pouvoir téléverser des documents lorsque j’interviens directement sur un cas afin de ne pas être bloqué par le workflow. | Moyenne | Upload autorisé pour le chef hiérarchique selon le périmètre retenu |
| US57 | En tant que chef hiérarchique, je veux pouvoir créer un dossier lorsque je dois initier moi-même un traitement exceptionnel afin de couvrir les cas particuliers. | Moyenne | Création de dossier autorisée pour le chef hiérarchique |
| US58 | En tant que système, je veux intégrer PaddleOCR comme moteur OCR principal afin d’améliorer la qualité des extractions. | Haute | PaddleOCR intégré |
| US59 | En tant que système, je veux conserver Tesseract comme fallback afin de garder une flexibilité technique et une solution de secours. | Moyenne | Fallback Tesseract conservé |
| US60 | En tant que système, je veux améliorer le post-traitement de l’extraction et les scores de confiance afin de renforcer la qualité du résultat retourné. | Moyenne | Extraction plus robuste et plus précise |
| US61 | En tant que développeur, je veux tester les scénarios critiques du système afin de garantir une démonstration stable. | Haute | Tests manuels exécutés sur les scénarios principaux |
| US62 | En tant que développeur, je veux corriger les bugs bloquants et stabiliser l’interface afin de préparer une démonstration fiable. | Haute | Prototype stabilisé |
| US63 | En tant qu’étudiant, je veux préparer les captures, le rapport, les diagrammes UML et les slides afin de soutenir le projet dans de bonnes conditions. | Haute | Livrables académiques prêts |

### Livrables du sprint
- administration des utilisateurs ;
- supervision hiérarchique et escalade ;
- retour à la préparation ;
- **table `notifications` et base de notification applicative** ;
- extension des capacités du **chef hiérarchique** pour créer un dossier et téléverser des documents ;
- consolidation OCR avec PaddleOCR ;
- prototype stabilisé et prêt pour la soutenance.

---

# Priorisation globale du backlog

## Priorité 1
- pipeline documentaire stable ;
- validation humaine ;
- contrôle d’accès par rôles ;
- forget password par email ;
- workflow complet des dossiers ;
- décisions documentaires ;
- traitement final du dossier ;
- administration des comptes ;
- escalade hiérarchique ;
- notifications de base ;
- PaddleOCR.

## Priorité 2
- traçabilité enrichie ;
- retour à la préparation ;
- extension des capacités du chef hiérarchique ;
- amélioration de la précision OCR ;
- stabilisation avancée.

## Priorité 3
- raffinements ergonomiques supplémentaires ;
- optimisations non bloquantes ;
- extensions analytiques éventuelles si explicitement maintenues dans le périmètre final.

---

# Conclusion

Ce backlog final permet de présenter le projet de manière progressive, cohérente et académiquement défendable.  
Il suit la logique du projet réel : partir du traitement documentaire intelligent, introduire ensuite la validation humaine et la sécurité, puis structurer le workflow métier des remboursements, avant de finaliser la gouvernance, la supervision hiérarchique, les notifications et la stabilisation.

Il est également plus fidèle aux derniers choix fonctionnels du projet, puisqu’il intègre explicitement :

- la **réinitialisation du mot de passe par email** ;
- l’**ajout de la table `notifications`** ;
- la possibilité pour le **chef hiérarchique** de **téléverser des documents** et de **créer un dossier** ;
- la suppression des éléments retirés du périmètre final, notamment les **dashboards** et les **exports**.
