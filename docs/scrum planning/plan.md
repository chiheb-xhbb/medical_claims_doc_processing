# Plan final du PFE sur 12 semaines

## Objectif général

Réaliser un prototype académique robuste d’une plateforme intelligente de traitement des documents médicaux dans un contexte d’assurance santé, avec :

- traitement documentaire intelligent
- validation humaine (HITL)
- gestion de dossiers de remboursement
- séparation des rôles
- logique Maker–Checker
- amélioration OCR avec PaddleOCR
- export CSV
- dashboards
- rapport final
- préparation de la soutenance

---

## Vue d’ensemble des phases

### Phase 1 — Construction du cœur du système

**Semaines 1 à 6**

- Stabilisation du pipeline document
- RBAC minimal et soumission à validation
- Gestion des dossiers
- Workflow dossier
- PaddleOCR
- Export et dashboards

### Phase 2 — Consolidation

**Semaine 7**

- Tests, sécurité, correction des bugs, bonus spaCy si possible

### Phase 3 — Rédaction du rapport

**Semaines 8 à 10**

- Introduction et étude du besoin
- Conception
- Réalisation, tests et finalisation

### Phase 4 — Préparation de la soutenance

**Semaines 11 à 12**

- Slides, démonstration et préparation des questions
- Répétition finale et buffer

---

## SEMAINE 1 — Stabilisation du pipeline document

### Objectif

Rendre le workflow actuel stable, cohérent et démontrable avant d’ajouter les nouvelles fonctionnalités métier.

### À faire

#### Backend

Vérifier le cycle complet :

- upload
- stockage
- lancement du job
- traitement OCR
- sauvegarde du résultat
- affichage de l’extraction
- correction
- validation

#### Vérifications clés

- statuts corrects de bout en bout
- gestion claire des erreurs
- documents en `FAILED` bien identifiés
- retry fonctionnel
- éviter les documents bloqués en `PROCESSING`
- verrouillage logique après validation si nécessaire
- cohérence entre extraction initiale, extraction corrigée et version finale

#### Frontend

- loading states
- messages d’erreur clairs
- messages de succès
- empty states
- meilleure lisibilité du workflow

### Livrable de la semaine

Un pipeline stable :

`upload → OCR → correction → validation`

---

## SEMAINE 2 — RBAC minimal et soumission à validation

### Objectif

Mettre en place une séparation simple et crédible des responsabilités.

### Base de données

Ajouter le champ `role` dans `users`.

Rôles :

- `AGENT`
- `GESTIONNAIRE`
- `ADMIN`

### Logique métier

Clarifier dès maintenant :

- l’agent ne valide pas
- l’agent soumet à validation
- le gestionnaire valide ou rejette

### Statut à introduire

Le plus cohérent avec le cahier des charges est :

- `A_VALIDER`

### Permissions minimales

#### Agent

- créer et consulter ses documents
- corriger les extractions
- soumettre à validation

#### Gestionnaire

- voir les éléments à valider
- valider ou rejeter

#### Admin

- gérer les utilisateurs
- avoir une visibilité globale si besoin

### Frontend

- masquer les boutons non autorisés
- adapter les menus selon le rôle

### Livrable de la semaine

RBAC minimal opérationnel avec la logique :

`agent prépare → gestionnaire décide`

---

## SEMAINE 3 — Gestion des dossiers (CRUD métier)

### Objectif

Ajouter la vraie entité métier manquante : le dossier de remboursement.

### Base de données

- créer la table `dossiers`
- ajouter `dossier_id` dans `documents`

### Champs recommandés pour `dossiers`

**Champs essentiels :**
- `numero_dossier` : identifiant unique (généré automatiquement)
- `patient_identifier` : numéro CIN (Carte d'Identité Nationale) sur 8 chiffres
- `status` : statut métier du dossier (voir Semaine 4)
- `montant_total` : montant total calculé puis figé à la validation
- `created_by` : agent créateur (foreign key → users)

**Champs optionnels :**
- `episode_description` : description de l'épisode de soins (ex: "Grippe - Mars 2026")
- `notes` : remarques libres

**Champs de workflow :**
- `submitted_at` : date de soumission par l'agent
- `validated_by` : gestionnaire validateur (foreign key → users)
- `validated_at` : date de validation ou rejet

**Timestamps :**
- `created_at`, `updated_at`


### Clarification importante

- `created_by` = l’utilisateur agent qui crée le dossier

### Relations

- un dossier contient plusieurs documents
- un document peut appartenir à un dossier

### Backend

- CRUD dossier
- détail avec documents associés
- génération automatique du numéro de dossier
- calcul du total du dossier

### Frontend

- liste des dossiers
- création du dossier
- détail du dossier
- ajout de documents au dossier

### Livrable de la semaine

Une vraie gestion des dossiers, cohérente avec le métier assurance.

---

## SEMAINE 4 — Workflow dossier et validation métier

### Objectif

Transformer le dossier en vrai objet de workflow, sans rendre le système trop complexe.

### Statuts dossier

- `RECU`
- `EN_TRAITEMENT`
- `A_VALIDER`
- `VALIDE`
- `REJETE`
- `EXPORTE`

### Important

Ces statuts sont présentés comme un modèle simple de prototype. Certaines transitions pourront être davantage automatisées dans une version future.

### Workflow retenu

- l’agent crée le dossier
- l’agent ajoute les documents
- l’agent prépare le dossier
- l’agent soumet le dossier à validation
- le gestionnaire valide ou rejette
- l’export intervient après validation si nécessaire

### Vérifications simples avant soumission

- dossier non vide
- documents principaux présents
- pas de document critique encore en échec

### UI

- bouton **Soumettre à validation**
- bouton **Valider**
- bouton **Rejeter**
- badges de statut

### Livrable de la semaine

Workflow dossier simple, réaliste et démontrable.

---

## SEMAINE 5 — Amélioration IA principale : PaddleOCR

### Objectif

Ajouter une amélioration IA forte, visible et facile à défendre devant le jury.

### Travaux à faire

- intégrer PaddleOCR dans le service FastAPI
- le définir comme OCR principal ou prioritaire
- garder Tesseract comme alternative ou fallback si utile
- normaliser la sortie OCR
- gérer proprement les erreurs

### Évaluation simple et mesurable

Prévoir une petite évaluation concrète sur :

- **5 à 10 documents de test**
- comparaison qualitative :
  - qualité du texte extrait
  - erreurs visibles
  - lisibilité
- temps moyen de traitement

### Idée à défendre

Tu n’as pas besoin de faire une étude scientifique lourde. Tu dois simplement montrer que l’intégration de PaddleOCR apporte une amélioration raisonnable et observable.

### Livrable de la semaine

PaddleOCR intégré avec une petite évaluation crédible.

---

## SEMAINE 6 — Export et dashboards

### Objectif

Ajouter des fonctionnalités utiles pour la démonstration et la valeur métier.

### Export

#### Format

- CSV

#### Portée

- export d’un document
- export d’un dossier

#### Règle métier

- export après validation finale, de préférence

### Dashboards

#### Dashboard Agent

- documents traités
- dossiers en cours
- dossiers soumis
- échecs éventuels

#### Dashboard Gestionnaire

- dossiers à valider
- dossiers validés
- dossiers rejetés
- répartition par statut

#### Dashboard Admin

- utilisateurs par rôle
- activité globale simple

### Livrable de la semaine

Fonctionnalités de sortie et de visualisation prêtes pour la démonstration.

---

## SEMAINE 7 — Tests, sécurité, bug fixing, bonus spaCy

### Objectif

Fiabiliser le système avant le rapport.

### 1. Tests

Rendre les tests concrets.

#### Minimum attendu

- tests manuels complets
- quelques tests automatisés de workflow

Même **3 à 5 tests feature** suffisent déjà à être très défendables.

#### Scénarios minimaux à tester

- upload document
- traitement OCR
- correction et validation
- RBAC minimal
- création dossier
- soumission dossier
- validation/rejet
- export

### 2. Sécurité

- vérifier permissions sur toutes les routes sensibles
- vérifier ownership des données
- sécuriser upload fichiers
- vérifier types MIME et taille
- vérifier réponses `401` / `403` / `422`

### 3. Bug fixing

- corriger bugs critiques
- préparer des données de démonstration propres
- stabiliser les parcours importants

### 4. spaCy en bonus

Si tu as encore du temps, intégrer spaCy comme extension expérimentale.

#### Positionnement recommandé

- pas comme pilier principal
- pas comme dépendance critique
- comme amélioration complémentaire sur certaines entités

#### Dans le rapport

Présenter spaCy comme :

> une extension exploratoire visant à enrichir l’extraction d’entités nommées

### Livrable de la semaine

Projet stabilisé, testable et prêt à être documenté.

---

## SEMAINE 8 — Rapport : introduction et étude du besoin

### Chapitre 1

- contexte
- problématique
- objectifs
- valeur ajoutée
- organisation du rapport

### Chapitre 2

- contexte assurance santé
- traitement manuel et ses limites
- besoin d’automatisation
- rôle du HITL
- traçabilité
- périmètre retenu
- justification des choix du prototype

### Livrable

Chapitres 1 et 2 terminés.

---

## SEMAINE 9 — Rapport : conception

### Chapitre 3

- méthodologie Scrum
- architecture générale
- choix React / Laravel / FastAPI / MySQL
- diagrammes UML
- modèle de données
- workflow document
- workflow dossier
- RBAC
- logique Maker–Checker
- intégration PaddleOCR
- mention de spaCy si réalisé

### Livrable

Chapitre 3 complet.

---

## SEMAINE 10 — Rapport : réalisation, tests et finalisation

### Chapitre 4

- réalisation backend
- réalisation frontend
- service IA
- gestion des rôles
- gestion des dossiers
- export
- dashboards
- difficultés rencontrées
- solutions retenues

### Chapitre 5

- scénarios de tests
- résultats
- analyse fonctionnelle
- limites
- perspectives

### Finalisation

- conclusion
- résumé en français
- abstract en anglais
- annexes
- bibliographie
- mise en page
- relecture

### Livrable

Rapport complet finalisé.

---

## SEMAINE 11 — Préparation de la soutenance

### À préparer

- slides simples et professionnelles
- démonstration courte et stable
- réponses aux questions probables

### Scénarios de démo

1. Upload document  
2. OCR + correction  
3. Création dossier + ajout documents  
4. Soumission par agent / validation par gestionnaire  
5. Export + dashboard  

### Questions probables

- pourquoi approche hybride ?
- pourquoi validation humaine ?
- pourquoi PaddleOCR ?
- pourquoi séparation agent / gestionnaire ?
- pourquoi spaCy seulement en bonus ?
- quelles limites ?
- quelles améliorations futures ?

### Livrable

Démo et présentation prêtes.

---

## SEMAINE 12 — Répétition finale et buffer

### À faire

- répétition chronométrée
- simulation des questions
- dernières corrections
- préparation des backups
- vérification machine, comptes de test, base de démo, slides, PDF

### Livrable

Projet prêt pour le jour J.

---

## Minimum non négociable avant le rapport

1. **Pipeline stable**  
2. **RBAC minimal**  
3. **Dossier + workflow validation**  
4. **PaddleOCR**  
5. **Tests + démo stable**

---

## Priorités si tu prends du retard

### Priorité 1

- pipeline document stable
- rôles minimaux
- dossier
- validation finale

### Priorité 2

- PaddleOCR

### Priorité 3

- export
- dashboard

### Priorité 4

- spaCy

---

## Conclusion finale

Ce plan est adapté au projet parce qu’il est :

- ambitieux mais réaliste
- progressif
- techniquement défendable
- aligné avec le cahier des charges
- sûr pour la soutenance

Le point le plus important est que :

- **PaddleOCR** devient l’amélioration IA principale
- **spaCy** reste un bonus valorisant, sans mettre en danger la stabilité du projet