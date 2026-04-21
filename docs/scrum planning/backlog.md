# Backlog final du projet PFE

## Introduction

Dans le cadre du pilotage Scrum retenu pour ce projet, le backlog du produit est organisé autour de **quatre sprints** alignés sur la version finale du prototype. Ce backlog ne conserve que les fonctionnalités réellement implémentées et exclut les éléments restés hors périmètre, notamment les tableaux de bord analytiques et les exports avancés.

Les rôles métier mobilisés dans ce backlog sont :

- **Agent** ;
- **Gestionnaire** ;
- **Superviseur hiérarchique** ;
- **Administrateur**.

Le backlog final a été restructuré de manière à :

- refléter fidèlement le périmètre livré ;
- maintenir une progression logique entre les sprints ;
- fournir une base crédible pour la rédaction des chapitres de réalisation du mémoire.

---

# Backlog du Sprint 1 : Socle technique et pipeline documentaire intelligent

## Objectif du sprint

Mettre en place l’architecture générale de la solution et construire un pipeline documentaire intelligent capable de téléverser, traiter et persister les informations extraites à partir d’un document médical.

| ID | User Story | Priorité | Résultat attendu |
|---|---|---|---|
| US01 | En tant qu’utilisateur, je veux téléverser un document médical afin de l’envoyer au système pour traitement. | Haute | Téléversement fonctionnel |
| US02 | En tant que système, je veux contrôler le type et la taille du fichier afin d’accepter uniquement les formats autorisés. | Haute | Validation des fichiers en entrée |
| US03 | En tant que système, je veux stocker le document localement de manière sécurisée afin de préserver son intégrité. | Haute | Stockage local sécurisé |
| US04 | En tant que système, je veux créer un enregistrement `Document` dès l’upload afin de suivre le cycle de traitement. | Haute | Persistance initiale du document |
| US05 | En tant que système, je veux déclencher un traitement asynchrone après l’upload afin de ne pas bloquer l’utilisateur. | Haute | Job de traitement et file d’attente opérationnels |
| US06 | En tant que système, je veux appeler le service IA FastAPI afin d’exécuter l’OCR et l’extraction. | Haute | Communication Laravel/FastAPI opérationnelle |
| US07 | En tant que système, je veux tracer chaque appel IA afin de disposer d’un audit technique du traitement. | Moyenne | Table `ai_requests` exploitée |
| US08 | En tant que système, je veux enregistrer les résultats d’extraction avec versionnement afin d’assurer leur persistance. | Haute | Table `extractions` opérationnelle |
| US09 | En tant que système, je veux extraire les champs métier principaux d’un document afin de les rendre exploitables. | Haute | Date, prestataire et montant extraits |
| US10 | En tant que système, je veux gérer les statuts `UPLOADED`, `PROCESSING`, `PROCESSED` et `FAILED` afin de suivre techniquement le document. | Haute | Cycle documentaire technique initial disponible |
| US11 | En tant que système, je veux éviter les traitements concurrents d’un même document afin de préserver la cohérence des résultats. | Moyenne | Traitement idempotent et sécurisé |
| US12 | En tant que système, je veux consolider le moteur OCR avec PaddleOCR et maintenir Tesseract en secours afin d’améliorer la qualité globale des extractions. | Moyenne | Qualité OCR consolidée |
| US13 | En tant qu’utilisateur, je veux consulter la liste de mes documents et leur statut afin de suivre l’avancement du traitement. | Haute | Liste des documents disponible |
| US14 | En tant que système, je veux permettre la reprise des traitements échoués et la réinitialisation des documents bloqués afin de stabiliser le pipeline. | Moyenne | Mécanismes de retry et de reset opérationnels |

### Livrables du sprint
- architecture technique initiale ;
- pipeline documentaire asynchrone ;
- audit technique des appels IA ;
- persistance versionnée des extractions ;
- consolidation du moteur OCR ;
- suivi opérateur du traitement documentaire.

---

# Backlog du Sprint 2 : Validation humaine, sécurité et administration des accès

## Objectif du sprint

Rendre la plateforme exploitable dans un contexte sécurisé, en introduisant la validation humaine des extractions, la protection des accès, l’administration des comptes et la gestion complète du cycle d’authentification.

| ID | User Story | Priorité | Résultat attendu |
|---|---|---|---|
| US15 | En tant qu’agent, je veux voir les champs extraits avec leur niveau de confiance afin d’identifier rapidement les valeurs à vérifier. | Haute | Interface HITL opérationnelle |
| US16 | En tant qu’agent, je veux corriger manuellement les champs extraits afin d’améliorer la qualité du résultat final. | Haute | Correction manuelle des champs |
| US17 | En tant que système, je veux enregistrer les corrections apportées afin d’assurer la traçabilité des modifications. | Haute | Historisation dans `field_corrections` |
| US18 | En tant qu’utilisateur autorisé, je veux valider techniquement un document traité afin de produire une version humaine fiable. | Haute | Passage du document à `VALIDATED` |
| US19 | En tant que système, je veux conserver les informations de validation afin de savoir qui a validé et quand. | Haute | `validated_by` et `validated_at` exploités |
| US20 | En tant que système, je veux appliquer des règles métier simples sur les montants et les dates afin de détecter les incohérences évidentes. | Moyenne | Contrôles métier intégrés à la validation |
| US21 | En tant qu’utilisateur, je veux m’authentifier afin d’accéder à mon espace de travail de manière sécurisée. | Haute | Authentification Sanctum opérationnelle |
| US22 | En tant que système, je veux protéger les routes sensibles afin d’empêcher les accès non autorisés. | Haute | Protection des routes frontend/backend |
| US23 | En tant que système, je veux distinguer les rôles `AGENT`, `CLAIMS_MANAGER`, `SUPERVISOR` et `ADMIN` afin d’appliquer un contrôle d’accès adapté. | Haute | RBAC fonctionnel |
| US24 | En tant qu’utilisateur, je veux voir uniquement les écrans et actions autorisés selon mon rôle afin de simplifier l’usage de la plateforme. | Haute | Interface adaptée au rôle connecté |
| US25 | En tant qu’utilisateur, je veux pouvoir changer mon mot de passe après connexion afin de sécuriser mon compte. | Moyenne | Changement de mot de passe disponible |
| US26 | En tant qu’utilisateur, je veux demander un lien de réinitialisation par email lorsque j’oublie mon mot de passe afin de récupérer mon accès. | Haute | Flux forgot password fonctionnel |
| US27 | En tant que système, je veux envoyer un email de réinitialisation contenant un lien sécurisé afin de protéger la procédure de récupération. | Haute | Email de reset envoyé correctement |
| US28 | En tant qu’utilisateur, je veux définir un nouveau mot de passe à partir du lien reçu afin de rétablir l’accès à mon compte. | Haute | Réinitialisation du mot de passe opérationnelle |
| US29 | En tant qu’administrateur, je veux créer, activer, désactiver et reconfigurer les comptes utilisateurs afin d’administrer centralement les accès à la plateforme. | Haute | Interface d’administration des utilisateurs disponible |

### Livrables du sprint
- interface de validation humaine ;
- audit des corrections et validations ;
- authentification et protection des accès ;
- contrôle d’accès par rôles ;
- cycle complet de récupération du mot de passe ;
- administration des comptes utilisateurs.

---

# Backlog du Sprint 3 : Workflow métier des dossiers de remboursement

## Objectif du sprint

Introduire le cœur métier de la solution à travers la gestion des dossiers de remboursement, leur structuration en rubriques, l’attachement contrôlé des documents validés et la mise en place du cycle complet de préparation, de soumission, de révision et de traitement.

| ID | User Story | Priorité | Résultat attendu |
|---|---|---|---|
| US30 | En tant qu’agent, je veux créer un dossier de remboursement afin de regrouper les pièces d’un même épisode médical. | Haute | Entité `Dossier` opérationnelle |
| US31 | En tant que système, je veux générer automatiquement un numéro de dossier afin d’identifier chaque dossier de manière unique. | Moyenne | `numero_dossier` généré |
| US32 | En tant qu’utilisateur autorisé, je veux consulter la liste des dossiers afin de suivre leur état d’avancement. | Haute | Liste des dossiers disponible |
| US33 | En tant qu’utilisateur autorisé, je veux ouvrir le détail d’un dossier afin de gérer son contenu métier. | Haute | Vue détail dossier disponible |
| US34 | En tant qu’agent, je veux créer une rubrique dans un dossier afin d’organiser les documents selon la logique métier. | Haute | Création de rubriques opérationnelle |
| US35 | En tant qu’agent, je veux modifier ou supprimer une rubrique vide afin de garder une structure de dossier cohérente. | Moyenne | Gestion contrôlée des rubriques |
| US36 | En tant qu’agent, je veux rattacher des documents `VALIDATED` à une rubrique afin de préparer le dossier. | Haute | Relation `Rubrique -> Documents` opérationnelle |
| US37 | En tant que système, je veux empêcher l’attachement de documents non validés afin de garantir la cohérence métier. | Haute | Contrôle métier sur l’attachement |
| US38 | En tant que système, je veux calculer les montants d’un dossier à partir des documents rattachés afin de fiabiliser le traitement. | Moyenne | Totaux calculés correctement |
| US39 | En tant qu’agent, je veux soumettre un dossier prêt afin qu’il soit examiné en révision métier. | Haute | Passage à `UNDER_REVIEW` |
| US40 | En tant que gestionnaire, je veux accepter ou rejeter un document d’une rubrique afin de prendre une décision métier fine. | Haute | Décision document par document disponible |
| US41 | En tant que gestionnaire, je veux rejeter une rubrique entière lorsque toutes les pièces associées sont non conformes. | Moyenne | Rejet global de rubrique disponible |
| US42 | En tant que système, je veux recalculer automatiquement le statut de la rubrique selon les décisions prises afin de garder un état métier cohérent. | Moyenne | Statuts de rubriques mis à jour automatiquement |
| US43 | En tant que gestionnaire, je veux traiter définitivement un dossier révisé afin de figer le montant retenu. | Haute | Dossier `PROCESSED` et gel des données |
| US44 | En tant qu’utilisateur autorisé, je veux consulter le document source par aperçu ou téléchargement afin de vérifier la décision métier. | Haute | Prévisualisation et téléchargement sécurisés |
| US45 | En tant que système, je veux empêcher les modifications structurelles sur un dossier traité afin de préserver l’intégrité du résultat final. | Haute | Gel des dossiers finalisés |

### Livrables du sprint
- gestion complète des dossiers et rubriques ;
- attachement contrôlé des documents validés ;
- soumission et révision métier ;
- traitement final et gel du dossier ;
- accès sécurisé au document source.

---

# Backlog du Sprint 4 : Supervision hiérarchique, traçabilité avancée et finalisation

## Objectif du sprint

Finaliser la gouvernance du système en ajoutant la supervision hiérarchique, les mécanismes de notification persistante, l’historique complet du workflow et la stabilisation finale de l’interface utilisateur.

| ID | User Story | Priorité | Résultat attendu |
|---|---|---|---|
| US46 | En tant que gestionnaire, je veux escalader un dossier afin de le soumettre à une révision hiérarchique. | Haute | Passage à `IN_ESCALATION` |
| US47 | En tant que superviseur, je veux approuver un dossier escaladé afin de clôturer une situation exceptionnelle. | Haute | Validation hiérarchique disponible |
| US48 | En tant que superviseur, je veux retourner un dossier au gestionnaire afin de conserver la continuité du cycle de révision. | Haute | Retour vers `UNDER_REVIEW` disponible |
| US49 | En tant que superviseur, je veux demander un complément afin de rouvrir la préparation lorsque des pièces supplémentaires sont nécessaires. | Haute | Passage à `AWAITING_COMPLEMENT` |
| US50 | En tant que gestionnaire, je veux retourner un dossier à la préparation sans escalade afin de faire corriger le contenu avant poursuite. | Haute | Retour à la préparation disponible |
| US51 | En tant que système, je veux conserver un contexte canonique de réouverture afin d’expliquer correctement pourquoi un dossier a été rouvert. | Haute | Contexte courant de réouverture disponible |
| US52 | En tant que superviseur, je veux pouvoir agir sur les dossiers et documents du périmètre autorisé afin d’assurer un traitement hiérarchique cohérent. | Moyenne | Permissions superviseur alignées frontend/backend |
| US53 | En tant que système, je veux enregistrer les notifications du workflow dans une table dédiée afin d’assurer une persistance des événements importants. | Haute | Table `app_notifications` créée |
| US54 | En tant que système, je veux notifier les acteurs concernés lors des transitions critiques du dossier afin d’améliorer la réactivité métier. | Haute | Notifications créées par le backend |
| US55 | En tant qu’utilisateur concerné, je veux consulter mes notifications, les marquer comme lues et visualiser le nombre de notifications non lues afin de suivre les événements importants. | Haute | Centre de notifications avec badge et lecture disponible |
| US56 | En tant que système, je veux conserver un journal append-only du cycle de vie du dossier afin d’assurer une traçabilité métier complète. | Haute | Table `dossier_workflow_events` opérationnelle |
| US57 | En tant qu’utilisateur autorisé, je veux visualiser l’historique chronologique d’un dossier afin de comprendre comment il est arrivé à son état courant. | Haute | Timeline complète du workflow disponible |
| US58 | En tant qu’utilisateur, je veux pouvoir basculer entre l’anglais et le français afin d’exploiter l’application dans la langue souhaitée. | Moyenne | Interface bilingue EN/FR opérationnelle |
| US59 | En tant qu’utilisateur, je veux bénéficier d’une interface plus cohérente et plus professionnelle afin de mieux exploiter la plateforme au quotidien. | Moyenne | Branding, pagination, toasts et surfaces de workflow raffinés |
| US60 | En tant que développeur, je veux tester les scénarios critiques et corriger les anomalies bloquantes afin de stabiliser le prototype final. | Haute | Version stable et démontrable du système |

### Livrables du sprint
- workflow d’escalade hiérarchique ;
- retour à la préparation et gestion des compléments ;
- périmètre opérationnel cohérent du superviseur ;
- notifications applicatives persistantes ;
- historique complet du workflow ;
- interface bilingue EN/FR ;
- stabilisation finale du prototype.

---

## Priorisation globale du backlog

### Priorité 1 — Incontournable
- pipeline documentaire stable ;
- validation humaine ;
- authentification et protection des accès ;
- administration des comptes ;
- workflow complet des dossiers de remboursement ;
- supervision hiérarchique ;
- notifications persistantes ;
- traçabilité complète du workflow ;
- stabilisation du prototype.

### Priorité 2 — Importante
- consolidation OCR avec PaddleOCR ;
- amélioration ergonomique des écrans ;
- enrichissement de la traçabilité des réouvertures ;
- internationalisation EN/FR ;
- élargissement du périmètre du superviseur.

### Priorité 3 — Optimisation
- raffinement visuel avancé ;
- homogénéisation supplémentaire des libellés et messages ;
- améliorations complémentaires non bloquantes de confort d’usage.

---

## Conclusion

Le backlog final présenté ci-dessus reflète le **périmètre effectivement réalisé** du projet. Il met en évidence une progression incrémentale allant du socle technique vers la gouvernance avancée, tout en restant cohérent avec la version finale du prototype, avec le workflow métier réellement implémenté et avec les exigences académiques d’un mémoire de PFE.
