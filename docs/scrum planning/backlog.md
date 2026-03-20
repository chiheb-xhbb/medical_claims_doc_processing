## Backlogs des sprints

Dans le cadre de la planification Scrum adoptée pour ce projet, chaque sprint a été associé à un backlog spécifique regroupant les fonctionnalités à réaliser durant l’itération concernée. Cette organisation permet de structurer le travail de manière progressive, en partant du socle technique vers les fonctionnalités métier, puis vers la phase de stabilisation et de valorisation du système.

Les backlogs suivants ont été définis en cohérence avec les objectifs du projet et avec le découpage retenu en quatre sprints.

---

## Backlog du Sprint 1 : Mise en place du socle technique et du pipeline documentaire

### Objectif du sprint
Mettre en place l’architecture technique du système et construire un premier pipeline documentaire fonctionnel, depuis le téléversement du document jusqu’au stockage du résultat d’extraction.

| ID | User Story | Priorité | Résultat attendu |
|----|------------|----------|------------------|
| US1 | En tant qu’utilisateur, je veux téléverser un document médical afin de l’envoyer au système pour traitement. | Haute | Upload des documents fonctionnel |
| US2 | En tant que système, je veux valider le type et la taille du fichier afin d’accepter uniquement les documents autorisés. | Haute | Contrôle des fichiers en entrée |
| US3 | En tant que système, je veux stocker localement les documents de manière sécurisée afin de préserver leur intégrité. | Haute | Stockage local sécurisé |
| US4 | En tant que système, je veux déclencher un traitement asynchrone après l’upload afin de ne pas bloquer l’utilisateur. | Haute | File d’attente et job de traitement actifs |
| US5 | En tant que système, je veux communiquer avec le service IA FastAPI afin de lancer l’OCR et l’extraction. | Haute | Communication Laravel/FastAPI opérationnelle |
| US6 | En tant que système, je veux extraire les informations principales d’un document afin de les rendre exploitables. | Haute | Extraction initiale des champs prioritaires |
| US7 | En tant que système, je veux enregistrer les résultats d’extraction dans la base afin d’assurer leur persistance. | Haute | Données enregistrées dans `extractions` |
| US8 | En tant que système, je veux journaliser les appels envoyés au service IA afin d’assurer une première traçabilité. | Moyenne | Enregistrement dans `ai_requests` |
| US9 | En tant qu’utilisateur, je veux consulter les données extraites afin de vérifier le résultat du traitement automatique. | Haute | Affichage des extractions dans l’interface |
| US10 | En tant que système, je veux gérer les statuts techniques du document afin de suivre son cycle de traitement. | Haute | Gestion des statuts `UPLOADED`, `PROCESSING`, `PROCESSED`, `FAILED` |

### Livrables du sprint
- architecture technique fonctionnelle
- pipeline documentaire opérationnel
- traitement OCR asynchrone
- persistance des extractions et des appels IA

---

## Backlog du Sprint 2 : Validation humaine, authentification et sécurisation du workflow

### Objectif du sprint
Rendre le système exploitable en ajoutant la validation humaine, la traçabilité des corrections, l’authentification et la sécurisation du pipeline de traitement.

| ID | User Story | Priorité | Résultat attendu |
|----|------------|----------|------------------|
| US11 | En tant qu’utilisateur, je veux m’authentifier afin d’accéder à mes documents de manière sécurisée. | Haute | Authentification fonctionnelle avec Sanctum |
| US12 | En tant qu’utilisateur authentifié, je veux consulter uniquement mes propres documents afin de protéger la confidentialité des données. | Haute | Isolation des documents par utilisateur |
| US13 | En tant qu’agent, je veux voir les champs extraits avec leur score de confiance afin d’identifier rapidement les données à vérifier. | Haute | Interface HITL fonctionnelle |
| US14 | En tant qu’agent, je veux corriger manuellement les données extraites afin d’améliorer la qualité du résultat final. | Haute | Correction manuelle des champs |
| US15 | En tant que système, je veux enregistrer les corrections apportées afin d’assurer la traçabilité des modifications. | Haute | Historisation dans `field_corrections` |
| US16 | En tant qu’agent, je veux valider les données corrigées afin de confirmer la version finale de l’extraction. | Haute | Passage du document à `VALIDATED` |
| US17 | En tant que système, je veux conserver les informations de validation afin de savoir qui a validé et quand. | Haute | Champs `validated_by` et `validated_at` exploités |
| US18 | En tant que système, je veux empêcher les accès non autorisés aux routes sensibles afin de renforcer la sécurité. | Haute | Routes backend protégées |
| US19 | En tant que système, je veux empêcher les doublons d’extraction et les régressions de statut afin d’améliorer la robustesse. | Moyenne | Workflow plus stable |
| US20 | En tant que système, je veux permettre la reprise des documents en échec ou bloqués afin de limiter les erreurs de traitement. | Moyenne | Retry et réinitialisation disponibles |
| US21 | En tant que système, je veux appliquer des règles métier simples sur les données extraites afin de signaler les incohérences. | Moyenne | Contrôles métier de base sur montants et dates |

### Livrables du sprint
- interface HITL complète
- authentification opérationnelle
- audit trail des corrections et validations
- sécurisation des routes et des données
- robustesse renforcée du workflow

---

## Backlog du Sprint 3 : Extension métier et gestion des rôles

### Objectif du sprint
Ajouter la dimension métier du projet à travers la gestion des dossiers de remboursement, le workflow métier global et la séparation des rôles.

| ID | User Story | Priorité | Résultat attendu |
|----|------------|----------|------------------|
| US22 | En tant qu’agent, je veux créer un dossier de remboursement afin d’y regrouper plusieurs documents liés à une même demande. | Haute | Création de l’entité `Dossier` |
| US23 | En tant qu’agent, je veux rattacher plusieurs documents à un dossier afin de structurer le traitement métier. | Haute | Relation dossier-documents opérationnelle |
| US24 | En tant que système, je veux générer automatiquement un numéro de dossier afin d’identifier chaque dossier de manière unique. | Moyenne | Génération du `numero_dossier` |
| US25 | En tant qu’agent, je veux consulter la liste de mes dossiers afin de suivre leur état d’avancement. | Haute | Liste des dossiers disponible |
| US26 | En tant que système, je veux calculer le montant total d’un dossier afin de faciliter sa vérification globale. | Moyenne | Total du dossier calculé automatiquement |
| US27 | En tant qu’agent, je veux soumettre un dossier prêt afin qu’il soit examiné par le gestionnaire. | Haute | Passage du dossier à `A_VALIDER` |
| US28 | En tant que gestionnaire, je veux valider ou rejeter un dossier soumis afin de prendre la décision métier finale. | Haute | Décision finale sur le dossier |
| US29 | En tant qu’administrateur, je veux gérer les comptes utilisateurs afin d’assurer le pilotage global de la plateforme. | Moyenne | Gestion des utilisateurs disponible |
| US30 | En tant que système, je veux distinguer les rôles `AGENT`, `GESTIONNAIRE` et `ADMIN` afin d’appliquer un contrôle d’accès adapté. | Haute | RBAC opérationnel |
| US31 | En tant qu’utilisateur, je veux voir uniquement les actions autorisées selon mon rôle afin de simplifier l’usage du système. | Haute | Interface adaptée selon le rôle |
| US32 | En tant que système, je veux intégrer PaddleOCR comme amélioration principale du moteur OCR afin d’augmenter la qualité d’extraction. | Haute | PaddleOCR intégré dans le service IA |
| US33 | En tant que système, je veux conserver Tesseract comme alternative si nécessaire afin de garder une certaine flexibilité technique. | Basse | Fallback possible selon les cas |
| US34 | En tant que système, je veux éventuellement explorer spaCy comme extension complémentaire afin d’enrichir l’extraction d’entités. | Basse | Bonus expérimental si le temps le permet |

### Livrables du sprint
- gestion des dossiers de remboursement
- workflow métier dossier/document
- RBAC minimal fonctionnel
- logique Maker–Checker appliquée
- amélioration OCR avec PaddleOCR

---

## Backlog du Sprint 4 : Valorisation, stabilisation finale et préparation académique

### Objectif du sprint
Finaliser les fonctionnalités de sortie, stabiliser la plateforme, préparer la documentation académique et sécuriser la démonstration finale.

| ID | User Story | Priorité | Résultat attendu |
|----|------------|----------|------------------|
| US35 | En tant qu’utilisateur, je veux exporter les données extraites au format CSV afin de les exploiter dans un tableur ou un outil externe. | Haute | Export CSV fonctionnel |
| US36 | En tant qu’utilisateur, je veux exporter les données d’un document ou d’un dossier afin de disposer d’un résultat exploitable hors plateforme. | Haute | Export par document ou dossier |
| US37 | En tant qu’agent, je veux consulter un tableau de bord personnel afin de suivre mes documents et mes dossiers. | Moyenne | Dashboard agent disponible |
| US38 | En tant que gestionnaire, je veux consulter les dossiers à valider et leur répartition afin de piloter la charge métier. | Moyenne | Dashboard gestionnaire disponible |
| US39 | En tant qu’administrateur, je veux consulter une vue globale sur les utilisateurs et l’activité afin d’assurer le suivi global du système. | Moyenne | Dashboard administrateur disponible |
| US40 | En tant que développeur, je veux exécuter des tests manuels et automatisés afin de vérifier le bon fonctionnement du système. | Haute | Scénarios critiques testés |
| US41 | En tant que système, je veux sécuriser les routes, les fichiers téléversés et les accès afin de réduire les risques d’erreurs et d’abus. | Haute | Vérifications de sécurité finales |
| US42 | En tant que développeur, je veux corriger les bugs critiques afin d’assurer une démonstration stable. | Haute | Version stable du prototype |
| US43 | En tant qu’étudiant, je veux préparer les captures d’écran, le rapport et les diagrammes afin de documenter correctement le projet. | Haute | Rapport final prêt |
| US44 | En tant qu’étudiant, je veux préparer les slides et les scénarios de démonstration afin de soutenir le projet dans de bonnes conditions. | Haute | Soutenance préparée |
| US45 | En tant que système, je veux éventuellement intégrer spaCy comme amélioration exploratoire si le temps le permet. | Basse | Bonus non bloquant |

### Livrables du sprint
- export CSV
- dashboards opérationnels
- prototype stabilisé
- rapport final rédigé
- soutenance préparée

---

## Remarque de priorisation

Afin de garantir la réussite du projet même en cas de contrainte de temps, les fonctionnalités ont été hiérarchisées comme suit :

### Priorité 1
- pipeline documentaire stable
- RBAC minimal
- gestion des dossiers
- workflow de validation
- PaddleOCR

### Priorité 2
- export CSV
- dashboards essentiels

### Priorité 3
- bonus spaCy
- améliorations ergonomiques avancées

---

## Conclusion

Le découpage du backlog par sprint permet de structurer le projet de manière progressive et cohérente. Chaque sprint produit un incrément ayant une valeur fonctionnelle réelle, tout en respectant les priorités techniques, métier et académiques du projet.

Cette organisation est adaptée à un projet individuel de fin d’études, car elle permet à la fois de maîtriser le périmètre, d’avancer de manière réaliste et de disposer d’une vision claire des objectifs à atteindre à chaque étape.