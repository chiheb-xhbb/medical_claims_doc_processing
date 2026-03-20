## Pilotage du projet avec Scrum

Dans le cadre de ce projet de fin d’études, nous avons adopté la méthodologie **Agile Scrum** afin d’organiser le développement de manière itérative et incrémentale. Ce choix nous a permis de structurer la réalisation du système en plusieurs sprints, chacun produisant un incrément fonctionnel et vérifiable.

Le projet étant réalisé dans un contexte académique avec une équipe réduite, Scrum a été adapté à une organisation individuelle tout en conservant ses principes essentiels : planification, priorisation, amélioration continue et validation progressive du produit. Cette approche nous a permis d’avancer de manière réaliste, en construisant d’abord le socle technique, puis le pipeline documentaire intelligent, avant de renforcer progressivement la sécurité, la traçabilité et la robustesse de la plateforme.

### Équipe Scrum

Dans notre projet, les rôles Scrum ont été adaptés comme suit :

| Rôle Scrum | Affectation |
|------------|-------------|
| Product Owner | Encadrant académique / encadrant professionnel |
| Scrum Master | Étudiant développeur |
| Équipe de développement | Étudiant développeur |

---

## Répartition globale des sprints

Afin de garantir une progression cohérente, réaliste et défendable, le projet a été réparti en **quatre sprints principaux**, d’une durée moyenne de **trois semaines** chacun.

| Sprint | Intitulé | Objectif principal | Durée estimée |
|--------|----------|-------------------|---------------|
| Sprint 1 | Mise en place du socle technique et du pipeline documentaire | Construire l’architecture de base et implémenter le flux documentaire intelligent initial | 3 semaines |
| Sprint 2 | Validation humaine, authentification et sécurisation du workflow | Ajouter la validation HITL, l’authentification et sécuriser le pipeline complet | 3 semaines |
| Sprint 3 | Extension métier et gestion des rôles | Ajouter la gestion des dossiers de remboursement, le workflow métier et le RBAC | 3 semaines |
| Sprint 4 | Valorisation, stabilisation finale et préparation académique | Finaliser les fonctionnalités de sortie, tester, documenter et préparer la soutenance | 3 semaines |

### Tableau de planification des sprints

| Sprint | Période | Fonctionnalités prévues | Livrables attendus |
|--------|---------|--------------------------|--------------------|
| Sprint 1 | Semaines 1 à 3 | Setup, architecture, contrat API, upload, stockage, traitement asynchrone, extraction OCR, audit trail initial | Pipeline documentaire opérationnel |
| Sprint 2 | Semaines 4 à 6 | Validation humaine, versionnement des extractions, authentification Sanctum, protection des routes, règles métier, hardening | Workflow sécurisé et traçable |
| Sprint 3 | Semaines 7 à 9 | Gestion des dossiers, workflow dossier, rôles agent/gestionnaire/admin, logique Maker–Checker, amélioration OCR avec PaddleOCR | Extension métier complète |
| Sprint 4 | Semaines 10 à 12 | Export CSV, dashboards, tests, corrections, rapport final, soutenance | Prototype final stable, rapport et démonstration prêts |

---

## Sprint 1 : Mise en place du socle technique et du pipeline documentaire

### Objectif du sprint

Le premier sprint a pour objectif de mettre en place l’environnement de développement, de définir l’architecture générale de la solution et de construire un premier pipeline documentaire fonctionnel, depuis le téléversement du document jusqu’au stockage du résultat d’extraction.

### Fonctionnalités réalisées / prévues

- mise en place de l’architecture du projet :
  - backend Laravel
  - frontend React
  - service IA FastAPI
  - base de données MySQL
- structuration du projet en monorepo
- définition du flux de traitement documentaire
- gel du contrat d’échange entre Laravel et FastAPI
- conception initiale de la base de données
- implémentation de l’upload des documents médicaux
- validation des types de fichiers et de leur taille
- stockage local sécurisé des documents
- mise en place du traitement asynchrone via file d’attente
- création du job de traitement documentaire
- journalisation des appels IA dans `ai_requests`
- stockage des résultats d’extraction dans `extractions`
- intégration d’un premier moteur OCR réel avec FastAPI et Tesseract
- extraction initiale des champs prioritaires :
  - date
  - nom du prestataire
  - montant total TTC
- gestion des statuts documentaires :
  - `UPLOADED`
  - `PROCESSING`
  - `PROCESSED`
  - `FAILED`

### Livrables du sprint

- architecture technique fonctionnelle
- pipeline documentaire opérationnel
- traitement OCR asynchrone
- persistance des extractions et des traces d’appels IA

### Critères d’acceptation

- un document peut être téléversé, stocké et traité de manière asynchrone
- le statut du document évolue correctement dans le pipeline technique
- le service IA retourne un JSON exploitable par Laravel
- les résultats d’extraction et les appels IA sont enregistrés en base

### Valeur apportée

Ce sprint valide la faisabilité technique du projet et pose les fondations de la plateforme intelligente de traitement documentaire.

---

## Sprint 2 : Validation humaine, authentification et sécurisation du workflow

### Objectif du sprint

Le deuxième sprint vise à rendre le système réellement exploitable en ajoutant la validation humaine des données extraites, la traçabilité complète des corrections, l’authentification des utilisateurs et la sécurisation du workflow de bout en bout.

### Fonctionnalités réalisées / prévues

- mise en place de l’interface Human-in-the-Loop (HITL)
- affichage des champs extraits avec score de confiance
- correction manuelle des données extraites
- historisation des corrections dans `field_corrections`
- création d’une nouvelle version d’extraction après validation humaine
- passage du document de `PROCESSED` à `VALIDATED`
- ajout de la traçabilité de validation :
  - `validated_by`
  - `validated_at`
- intégration de l’authentification avec Laravel Sanctum
- implémentation des endpoints :
  - inscription
  - connexion
  - déconnexion
  - utilisateur courant
- intégration de la couche d’authentification côté frontend
- protection des routes frontend et backend
- protection complète des routes liées aux documents
- ajout de règles métier de validation :
  - montant négatif bloquant
  - montant élevé signalé
  - date future signalée
- amélioration de la robustesse :
  - isolation stricte des documents par utilisateur
  - prévention des doublons d’extraction
  - protection contre les régressions de statut
  - sécurisation des traitements en concurrence
  - retry des documents en échec
  - commande de réinitialisation des documents bloqués

### Livrables du sprint

- interface de validation humaine complète
- audit trail des corrections et des validations
- authentification opérationnelle
- API sécurisée
- workflow robuste et traçable

### Critères d’acceptation

- un utilisateur authentifié peut se connecter et accéder à ses documents
- un document traité peut être corrigé puis validé
- les corrections sont historisées
- une nouvelle extraction validée est générée
- un utilisateur ne peut pas accéder aux documents d’un autre utilisateur
- les erreurs OCR et les échecs de traitement sont correctement gérés

### Valeur apportée

Ce sprint transforme le prototype technique en un système sécurisé, traçable et exploitable dans un cadre métier réel.

---

## Sprint 3 : Extension métier et gestion des rôles

### Objectif du sprint

Le troisième sprint a pour objectif d’ajouter la véritable dimension métier du projet, à travers la gestion des dossiers de remboursement et la séparation des responsabilités entre les différents profils utilisateurs.

### Fonctionnalités prévues

#### Gestion des dossiers
- création de l’entité `Dossier`
- relation entre dossier et documents
- génération automatique du numéro de dossier
- ajout des attributs métier :
  - `numero_dossier`
  - `assure_name`
  - `status`
  - `created_by`
  - `notes`
- consultation, création, modification et suppression contrôlée des dossiers
- calcul du montant total par dossier

#### Workflow métier du dossier
- mise en place des statuts métier :
  - `RECU`
  - `EN_TRAITEMENT`
  - `A_VALIDER`
  - `VALIDE`
  - `REJETE`
  - `EXPORTE`
- soumission du dossier à validation par l’agent
- validation ou rejet final par le gestionnaire
- application de la logique Maker–Checker

#### Gestion des rôles
- ajout du champ `role` dans la table des utilisateurs
- définition des rôles :
  - `AGENT`
  - `GESTIONNAIRE`
  - `ADMIN`
- mise en place d’un contrôle d’accès basé sur les rôles (RBAC)
- adaptation des vues et des actions selon le profil connecté

#### Amélioration IA
- intégration de PaddleOCR comme amélioration principale du moteur OCR
- conservation éventuelle de Tesseract comme alternative
- possibilité d’explorer spaCy comme amélioration complémentaire si le temps le permet

### Livrables du sprint

- gestion complète des dossiers
- workflow métier dossier/document
- séparation claire des rôles
- amélioration du moteur OCR

### Critères d’acceptation

- un agent peut créer un dossier et lui associer plusieurs documents
- un dossier suit un cycle de vie métier clair
- un gestionnaire peut valider ou rejeter un dossier soumis
- les rôles contrôlent correctement les accès et les actions disponibles

### Valeur apportée

Ce sprint donne au projet sa véritable valeur métier dans le contexte de l’assurance santé, en allant au-delà du simple traitement documentaire.

---

## Sprint 4 : Valorisation, stabilisation finale et préparation académique

### Objectif du sprint

Le dernier sprint est consacré à la valorisation du système, à sa stabilisation finale et à la préparation complète du livrable académique et de la soutenance.

### Fonctionnalités prévues

#### Fonctionnalités de valorisation
- export des données au format `CSV`
- export par document ou par dossier
- mise en place de dashboards adaptés aux rôles :
  - dashboard agent
  - dashboard gestionnaire
  - dashboard administrateur

#### Stabilisation et qualité
- tests manuels des scénarios critiques
- quelques tests automatisés de workflow
- correction des bugs restants
- amélioration ergonomique de l’interface
- vérification finale de la sécurité et des autorisations
- stabilisation de la démonstration

#### Finalisation académique
- préparation des captures d’écran
- rédaction du rapport final
- intégration des diagrammes UML
- préparation des slides
- élaboration des scénarios de démonstration
- préparation des réponses aux questions probables du jury

### Minimum non négociable du sprint

Les éléments suivants doivent impérativement être finalisés :

- stabilité du workflow principal
- tests des scénarios critiques
- rapport finalisé
- démonstration prête
- présentation prête

### Éléments optionnels

Les éléments suivants peuvent être simplifiés en cas de contrainte de temps :

- dashboards avancés
- amélioration UI poussée
- intégration approfondie de spaCy
- visualisation avancée de l’audit trail

### Livrables du sprint

- export CSV
- dashboards opérationnels
- prototype final stable
- rapport final
- soutenance préparée

### Critères d’acceptation

- les scénarios principaux sont démontrables sans bug bloquant
- le rapport est complet, relu et structuré
- les fonctionnalités à forte valeur métier sont opérationnelles
- la démonstration est claire, stable et défendable

### Valeur apportée

Ce sprint garantit que le projet n’est pas seulement développé, mais aussi stabilisé, documenté et prêt pour une présentation académique réussie.

---

## Conclusion

La planification Scrum adoptée pour ce projet a permis d’organiser le développement de manière progressive, cohérente et réaliste. Le découpage en quatre sprints a facilité la construction incrémentale de la plateforme, en commençant par le socle technique et le pipeline documentaire, puis en introduisant la validation humaine, l’authentification, la sécurisation, la robustesse, la logique métier liée aux dossiers et enfin la finalisation académique du projet.

Cette organisation a permis de mieux maîtriser le périmètre, de prioriser les fonctionnalités essentielles et de produire à chaque sprint un incrément ayant une réelle valeur fonctionnelle. Ainsi, la méthodologie Scrum s’est révélée particulièrement adaptée à la conduite de ce projet de fin d’études dans un cadre individuel.