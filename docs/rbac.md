# RBAC - Matrice de Permissions

## Vue d'ensemble

Ce document définit le contrôle d'accès par rôles pour la plateforme de traitement des documents médicaux. Le modèle est conçu pour un système interne d'assurance santé avec une équipe restreinte (10-20 utilisateurs).


---

## Définition des Rôles

| Rôle | Description | Répartition |
|------|-------------|-------------|
| **Agent** | Opérateur principal. Téléverse et valide ses propres documents. | ~80% (8-15 personnes) |
| **Gestionnaire** | Chef d'équipe. Supervise, valide les documents de son équipe, accède aux analytics. | ~15% (2-3 personnes) |
| **Admin** | Administrateur IT. Gère les utilisateurs et la configuration système. | ~5% (1 personne) |

---

## Matrice des Permissions

### 1. Authentification

| Action | Agent | Gestionnaire | Admin |
|--------|:-----:|:------------:|:-----:|
| Login / Logout | ✅ | ✅ | ✅ |
| Voir son profil | ✅ | ✅ | ✅ |
| Changer mot de passe | ✅ | ✅ | ✅ |

---

### 2. Documents

| Action | Agent | Gestionnaire | Admin |
|--------|:-----:|:------------:|:-----:|
| Upload document | ✅ | ✅ | ❌ |
| Lister ses documents | ✅ | ✅ | ✅ |
| Lister tous les documents | ❌ | ✅ | ✅ |
| Voir document (propriétaire) | ✅ | ✅ | ✅ |
| Voir document (autre user) | ❌ | ✅ | ✅ |
| Supprimer document | ❌ | ❌ | ✅ |

**Note :** 
- Admin ne téléverse pas (rôle non opérationnel).
- Suppression Admin : uniquement si statut ≠ VALIDATED.

---

### 3. Traitement OCR

| Action | Agent | Gestionnaire | Admin |
|--------|:-----:|:------------:|:-----:|
| OCR automatique (upload) | ✅ | ✅ | N/A |
| Retry document FAILED (proprio) | ✅ | ✅ | ✅ |
| Retry document FAILED (autre) | ❌ | ✅ | ✅ |
| Voir logs ai_requests | ❌ | ✅ | ✅ |

---

### 4. Validation HITL

| Action | Agent | Gestionnaire | Admin |
|--------|:-----:|:------------:|:-----:|
| Voir extraction (proprio) | ✅ | ✅ | ✅ |
| Voir extraction (autre) | ❌ | ✅ | ✅ |
| Corriger champs (proprio) | ✅ | ✅ | ❌ |
| Corriger champs (autre) | ❌ | ✅ | ❌ |
| Valider document (proprio) | ✅ | ✅ | ❌ |
| Valider document (autre) | ❌ | ✅ | ❌ |
| Modifier document VALIDATED | ❌ | ❌ | ❌ |

**Note :** Le Gestionnaire peut corriger et valider les documents de son équipe pour assurer la continuité opérationnelle (agent en congé, supervision de cas complexes). L'Admin n'intervient pas dans le workflow opérationnel.

---

### 5. Audit et Analytics

| Action | Agent | Gestionnaire | Admin |
|--------|:-----:|:------------:|:-----:|
| Voir ses corrections | ✅ | ✅ | ✅ |
| Voir toutes les corrections | ❌ | ✅ | ✅ |
| Voir versions extractions (ses docs) | ✅ | ✅ | ✅ |
| Voir versions extractions (tous docs) | ❌ | ✅ | ✅ |
| Dashboard analytics (personnel) | ✅ | ✅ | ✅ |
| Dashboard analytics (global/équipe) | ❌ | ✅ | ✅ |
| Export données validées (CSV/JSON) | ❌ | ✅ | ✅ |

**Note :** Export limité aux documents VALIDATED uniquement.

---

### 6. Administration

| Action | Agent | Gestionnaire | Admin |
|--------|:-----:|:------------:|:-----:|
| Lister utilisateurs | ❌ | ❌ | ✅ |
| Créer utilisateur | ❌ | ❌ | ✅ |
| Modifier utilisateur | ❌ | ❌ | ✅ |
| Assigner rôle | ❌ | ❌ | ✅ |
| Désactiver compte | ❌ | ❌ | ✅ |
| Configuration système | ❌ | ❌ | ✅ |
| Voir logs système | ❌ | ❌ | ✅ |
| Gérer queue jobs | ❌ | ❌ | ✅ |

---

## Permissions par Statut Document

| Statut | Lecture | Modification | Validation | Suppression |
|--------|:-------:|:------------:|:----------:|:-----------:|
| UPLOADED | Proprio + Gest + Admin | Proprio | ❌ | Admin |
| PROCESSING | Proprio + Gest + Admin | ❌ | ❌ | ❌ |
| PROCESSED | Proprio + Gest + Admin | Proprio + Gest | Proprio + Gest | Admin |
| VALIDATED | Proprio + Gest + Admin | ❌ | ❌ | ❌ |
| FAILED | Proprio + Gest + Admin | Retry only | ❌ | Admin |

**Règles clés :**
- **PROCESSING** : Verrouillé (traitement OCR en cours)
- **VALIDATED** : **Immuable** (aucune modification possible par quiconque)
- **FAILED** : Retry autorisé (relance du traitement)

---

## Implémentation Laravel

### Migration
```php
Schema::table('users', function (Blueprint $table) {
    $table->enum('role', ['agent', 'gestionnaire', 'admin'])
          ->default('agent')
          ->after('email');
    $table->index('role');
});
```

### Modèle User
```php
public function isAgent(): bool
{
    return $this->role === 'agent';
}

public function isGestionnaire(): bool
{
    return $this->role === 'gestionnaire';
}

public function isAdmin(): bool
{
    return $this->role === 'admin';
}

public function canModifyDocument(Document $document): bool
{
    if ($document->status === DocumentStatus::VALIDATED) {
        return false; // Immuable
    }
    
    if ($document->status !== DocumentStatus::PROCESSED) {
        return false; // Seulement PROCESSED
    }
    
    return $this->isGestionnaire() || $document->user_id === $this->id;
}
```

### Middleware
```php
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::apiResource('users', UserController::class);
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'role:gestionnaire,admin'])->group(function () {
    Route::get('/analytics/dashboard', [AnalyticsController::class, 'dashboard']);
    Route::get('/analytics/export', [AnalyticsController::class, 'export']);
});
```

### Filtre Documents (Agent)
```php
public function index(Request $request)
{
    $query = Document::query();
    
    if ($request->user()->isAgent()) {
        $query->where('user_id', $request->user()->id);
    }
    
    return $query->latest()->paginate(15);
}
```

### Policy Validation
```php
public function validate(User $user, Document $document): bool
{
    if ($document->status !== DocumentStatus::PROCESSED) {
        return false;
    }
    
    return $user->isGestionnaire() || $document->user_id === $user->id;
}
```

---

## Légende

| Symbole | Signification |
|---------|---------------|
| ✅ | Autorisé |
| ❌ | Interdit |
| N/A | Non applicable |

