# Plan final du PFE sur 12 semaines

## Objectif général

Réaliser un prototype académique robuste d’une plateforme intelligente de traitement des documents médicaux dans un contexte d’assurance santé, avec :

- traitement documentaire intelligent ;
- validation humaine (HITL) ;
- gestion de dossiers de remboursement ;
- structuration métier par rubriques ;
- séparation des rôles ;
- logique Maker–Checker ;
- amélioration OCR avec PaddleOCR ;
- export CSV ;
- tableaux de bord ;
- rapport final ;
- préparation de la soutenance.

---

## Vue d’ensemble des phases

### Phase 1 — Construction du cœur du système  
**Semaines 1 à 6**

- Stabilisation du pipeline documentaire ;
- Validation humaine et sécurisation ;
- Contrôle d’accès par rôles ;
- Gestion des dossiers ;
- Workflow métier du remboursement ;
- Amélioration OCR avec PaddleOCR.

### Phase 2 — Consolidation  
**Semaine 7**

- Tests, sécurité, correction des bugs et finalisation du workflow complet.

### Phase 3 — Rédaction du rapport  
**Semaines 8 à 10**

- Introduction et étude du besoin ;
- Conception ;
- Réalisation, tests et finalisation.

### Phase 4 — Préparation de la soutenance  
**Semaines 11 à 12**

- Slides, démonstration et préparation des questions ;
- Répétition finale et marge de sécurité.

---

## SEMAINE 1 — Stabilisation du pipeline documentaire

### Objectif

Rendre le workflow documentaire stable, cohérent et démontrable avant d’ajouter les fonctionnalités métier avancées.

### À faire

#### Backend
Vérifier le cycle complet :

- upload ;
- stockage ;
- lancement du job ;
- traitement OCR ;
- sauvegarde du résultat ;
- affichage de l’extraction ;
- correction ;
- validation.

#### Vérifications clés
- statuts corrects de bout en bout ;
- gestion claire des erreurs ;
- documents en `FAILED` bien identifiés ;
- retry fonctionnel ;
- éviter les documents bloqués en `PROCESSING` ;
- cohérence entre extraction initiale, extraction corrigée et version finale ;
- séparation claire entre données IA et données validées humainement.

#### Frontend
- loading states ;
- messages d’erreur clairs ;
- messages de succès ;
- empty states ;
- meilleure lisibilité du workflow documentaire.

### Livrable de la semaine

Un pipeline stable :

`upload → OCR → correction → validation`

---

## SEMAINE 2 — Validation humaine, authentification et contrôle d’accès (RBAC)

### Objectif

Mettre en place une séparation crédible des responsabilités, tout en sécurisant l’accès à la plateforme.

### Base de données
Ajouter le champ `role` dans `users`.

### Rôles
- `AGENT`
- `GESTIONNAIRE`
- `ADMIN`

### Logique de séparation des tâches (SoD)
Clarifier dès maintenant :

- l’agent prépare les données ;
- l’agent ne décide pas de la validation métier finale ;
- le gestionnaire valide ou rejette ;
- l’administrateur gère les comptes et supervise le système.

### Matrice des permissions par profil

#### Agent
- téléverser ses documents ;
- consulter ses documents ;
- corriger les extractions ;
- valider techniquement les extractions corrigées ;
- préparer les éléments avant décision métier.

#### Gestionnaire
- consulter les éléments à traiter ;
- valider ou rejeter selon les règles métier ;
- préparer la transition vers le workflow dossier.

#### Admin
- gérer les utilisateurs ;
- superviser les rôles ;
- disposer d’une visibilité globale minimale.

### Frontend
- masquer les boutons non autorisés ;
- adapter les menus selon le rôle ;
- sécuriser les routes protégées.

### Livrable de la semaine

Sécurité des accès opérationnelle avec une première séparation fonctionnelle des rôles.

---

## SEMAINE 3 — Gestion des dossiers et structure métier

### Objectif

Ajouter la vraie entité métier du projet : le dossier de remboursement, en dépassant la simple logique document par document.

### Base de données
Créer les entités et relations suivantes :

- `dossiers` ;
- `rubriques` ;
- enrichissement de `documents`.

### Structure métier retenue

```text
Dossier
  └── Rubriques
        └── Documents
```

### Éléments à mettre en place

#### Dossier
- création de la table `dossiers` ;
- génération automatique du `numero_dossier` ;
- ajout des champs principaux :
  - `numero_dossier`
  - `assured_identifier`
  - `status`
  - `montant_total`
  - `episode_description`
  - `notes`
  - `created_by`
  - `submitted_at`

#### Rubrique
- création de la table `rubriques` ;
- rattachement des rubriques au dossier ;
- gestion du titre, des notes et du statut.

#### Document
- ajout de `rubrique_id` ;
- ajout des champs de décision métier :
  - `decision_status`
  - `decision_by`
  - `decision_at`
  - `decision_note`

### Frontend
- liste des dossiers ;
- création d’un dossier ;
- détail d’un dossier ;
- création d’une rubrique dans un dossier ;
- affichage des rubriques et de leurs documents.

### Livrable de la semaine

Gestion métier des dossiers avec la nouvelle structure :

`Dossier -> Rubriques -> Documents`

---

## SEMAINE 4 — Workflow dossier et logique Maker–Checker

### Objectif

Transformer le dossier en véritable objet métier, avec un workflow réaliste de préparation, soumission, décision et clôture.

### Statuts métier du dossier
- `RECEIVED`
- `IN_PROGRESS`
- `TO_VALIDATE`
- `PROCESSED`
- `EXPORTED`

### Statuts métier de la rubrique
- `PENDING`
- `ACCEPTED`
- `REJECTED`
- `PARTIAL`

### Statuts de décision du document
- `PENDING`
- `ACCEPTED`
- `REJECTED`

### Workflow retenu
- l’agent crée le dossier ;
- l’agent crée une ou plusieurs rubriques ;
- l’agent rattache des documents techniquement `VALIDATED` ;
- le dossier passe à `IN_PROGRESS` ;
- l’agent soumet le dossier ;
- le dossier passe à `TO_VALIDATE` ;
- le gestionnaire accepte ou rejette les documents ;
- le statut de chaque rubrique est recalculé automatiquement ;
- le dossier est finalisé en `PROCESSED` ;
- le montant final est figé.

### Vérifications métier
- un document non `VALIDATED` ne peut pas être attaché ;
- un dossier ne peut être soumis que s’il contient au moins une rubrique et au moins un document ;
- un dossier ne peut être traité que si plus aucun document n’est `PENDING` ;
- un dossier `PROCESSED` devient non modifiable.

### Répartition des rôles métier

#### Agent
- créer un dossier ;
- créer des rubriques ;
- attacher des documents validés ;
- consulter ses dossiers ;
- soumettre le dossier.

#### Gestionnaire
- consulter les dossiers à traiter ;
- accepter ou rejeter les documents ;
- rejeter une rubrique entière ;
- traiter/finaliser le dossier.

#### Admin
- gérer les utilisateurs ;
- superviser les rôles ;
- assurer une visibilité transversale sur la plateforme.

### Frontend
- bouton **Créer une rubrique** ;
- bouton **Attacher des documents** ;
- bouton **Soumettre** ;
- bouton **Accepter / Rejeter document** ;
- bouton **Rejeter rubrique** ;
- bouton **Traiter dossier** ;
- badges de statut ;
- bannière de dossier gelé si `PROCESSED`.

### Livrable de la semaine

Workflow métier complet et démontrable du remboursement.

---

## SEMAINE 5 — Amélioration IA principale : PaddleOCR

### Objectif

Ajouter une amélioration IA forte, visible et facile à défendre devant le jury.

### Travaux à faire
- intégrer PaddleOCR dans le service FastAPI ;
- le définir comme OCR principal ou prioritaire ;
- garder Tesseract comme alternative ou fallback si utile ;
- normaliser la sortie OCR ;
- gérer proprement les erreurs ;
- conserver le service IA stateless ;
- ne pas coupler FastAPI à la logique métier des dossiers.

### Évaluation simple et mesurable
Prévoir une petite évaluation sur :

- **5 à 10 documents de test** ;
- comparaison qualitative :
  - qualité du texte extrait ;
  - erreurs visibles ;
  - lisibilité ;
- temps moyen de traitement.

### Positionnement
Le but n’est pas de faire une étude scientifique lourde, mais de montrer qu’une amélioration OCR raisonnable et observable a été intégrée au prototype.

### Livrable de la semaine

PaddleOCR intégré avec une évaluation crédible.

---

## SEMAINE 6 — Export et tableaux de bord par rôle

### Objectif

Ajouter des fonctionnalités utiles pour la démonstration et la valorisation métier de la plateforme.

### Export
#### Format
- CSV

#### Portée
- export d’un document ;
- export d’un dossier.

#### Règle métier
- export de préférence après traitement final du dossier.

### Tableaux de bord

#### Dashboard Agent
- documents traités ;
- documents validés ;
- dossiers en cours ;
- dossiers soumis.

#### Dashboard Gestionnaire
- dossiers à traiter ;
- dossiers traités ;
- dossiers rejetés partiellement ou totalement ;
- répartition par statut.

#### Dashboard Admin
- utilisateurs par rôle ;
- activité globale simple ;
- supervision transversale.

### Frontend
- affichage de tableaux de bord selon le rôle connecté ;
- visibilité adaptée au profil ;
- indicateurs simples mais défendables.

### Livrable de la semaine

Fonctionnalités de sortie et de visualisation prêtes pour la démonstration.

---

## SEMAINE 7 — Tests, sécurité, correction des bugs et stabilisation

### Objectif

Fiabiliser le système avant de passer à la rédaction finale.

### 1. Tests
#### Minimum attendu
- tests manuels complets ;
- quelques tests automatisés de workflow.

#### Scénarios minimaux à tester
- upload document ;
- traitement OCR ;
- correction et validation ;
- contrôle des rôles ;
- création dossier ;
- création rubrique ;
- attachement document ;
- soumission dossier ;
- acceptation / rejet document ;
- traitement du dossier ;
- vérification du gel après `PROCESSED`.

### 2. Sécurité
- vérifier les permissions sur toutes les routes sensibles ;
- vérifier l’ownership des données ;
- sécuriser l’upload des fichiers ;
- vérifier types MIME et taille ;
- vérifier les réponses `401`, `403`, `422`.

### 3. Bug fixing
- corriger les bugs critiques ;
- stabiliser les scénarios principaux ;
- préparer des données de démonstration propres ;
- améliorer la lisibilité UI sur les cas importants.

### 4. Bonus éventuel
Si le temps le permet :
- petite exploration de spaCy comme extension complémentaire ;
- sans le rendre bloquant pour le projet.

### Livrable de la semaine

Projet stabilisé, testable et prêt à être documenté.

---

## SEMAINE 8 — Rapport : introduction et étude du besoin

### Chapitre 1
- contexte ;
- problématique ;
- objectifs ;
- valeur ajoutée ;
- organisation du rapport.

### Chapitre 2
- contexte assurance santé ;
- traitement manuel et ses limites ;
- besoin d’automatisation ;
- rôle du HITL ;
- nécessité de la traçabilité ;
- logique Maker–Checker ;
- justification du prototype retenu.

### Livrable
Chapitres d’introduction et d’étude du besoin terminés.

---

## SEMAINE 9 — Rapport : méthodologie, planification et conception

### À rédiger
- méthodologie Scrum ;
- adaptation Scrum au contexte individuel ;
- équipe Scrum ;
- backlog produit ;
- planification des sprints ;
- architecture générale ;
- choix technologiques ;
- langage UML ;
- modèle de données ;
- workflow document ;
- workflow dossier ;
- structure `Dossier -> Rubriques -> Documents` ;
- séparation des rôles ;
- logique Maker–Checker.

### Livrable
Partie conception et planification complète.

---

## SEMAINE 10 — Rapport : réalisation, tests et finalisation

### Chapitres à finaliser
- réalisation backend ;
- réalisation frontend ;
- service IA ;
- contrôle d’accès par rôles ;
- workflow dossier ;
- export ;
- tableaux de bord ;
- tests ;
- difficultés rencontrées ;
- solutions retenues ;
- limites et perspectives.

### Finalisation
- conclusion ;
- résumé en français ;
- abstract en anglais ;
- annexes ;
- bibliographie ;
- relecture ;
- mise en page finale.

### Livrable
Rapport complet finalisé.

---

## SEMAINE 11 — Préparation de la soutenance

### À préparer
- slides simples, propres et professionnelles ;
- démonstration stable ;
- réponses aux questions probables.

### Scénarios de démonstration
1. Upload document  
2. OCR + correction + validation  
3. Création dossier + création rubrique  
4. Attachement de documents  
5. Soumission par agent  
6. Décision document par document  
7. Traitement final du dossier  
8. Export + dashboard  

### Questions probables
- pourquoi une approche hybride OCR + validation humaine ?
- pourquoi Scrum ?
- pourquoi PaddleOCR ?
- pourquoi la séparation Agent / Gestionnaire / Admin ?
- pourquoi une structure par rubriques ?
- pourquoi FastAPI reste séparé de la logique métier ?
- quelles sont les limites du prototype ?
- quelles améliorations futures sont possibles ?

### Livrable
Démo et présentation prêtes.

---

## SEMAINE 12 — Répétition finale et buffer

### À faire
- répétition chronométrée ;
- simulation des questions ;
- dernières corrections ;
- préparation des backups ;
- vérification machine, base de démo, comptes de test, slides et PDF.

### Livrable
Projet prêt pour le jour J.

---

## Minimum non négociable avant le rapport

1. **Pipeline stable**  
2. **Validation humaine opérationnelle**  
3. **Contrôle d’accès complet et logique Maker–Checker**  
4. **Workflow dossier complet**  
5. **PaddleOCR**  
6. **Tests + démo stable**

---

## Priorités si retard

### Priorité 1
- pipeline documentaire stable ;
- validation humaine ;
- contrôle d’accès par rôles ;
- workflow dossier complet ;
- séparation Agent / Gestionnaire.

### Priorité 2
- PaddleOCR.

### Priorité 3
- export ;
- tableaux de bord.

### Priorité 4
- bonus IA complémentaires.

---

## Conclusion finale

Ce plan est adapté au projet car il est :

- progressif ;
- réaliste ;
- techniquement défendable ;
- cohérent avec le contexte assurance santé ;
- aligné avec les exigences métier et académiques.

Le point le plus important est que le projet ne se limite pas à un simple pipeline OCR. Il évolue progressivement vers une plateforme intelligente complète, intégrant traitement documentaire, validation humaine, gestion des dossiers de remboursement, séparation des rôles, logique métier et préparation académique rigoureuse.
