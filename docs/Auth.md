# Documentation – Système d’Authentification
**Date :** 2026-02-18  
**Méthode :** Laravel Sanctum (Token Bearer)

---

## 1. Vue d’ensemble

Le système utilise **Laravel Sanctum** pour une authentification basée sur des tokens.

L’utilisateur :
1. S’inscrit ou se connecte
2. Reçoit un token
3. Envoie le token dans le header `Authorization`
4. Accède aux routes protégées

Authentification stateless adaptée à une application interne.

---

## 2. Stack Technique

- Laravel Sanctum
- Bearer Token
- Table : `personal_access_tokens`
- Hachage mot de passe : bcrypt (par défaut Laravel)

---

## 3. Flux d’Authentification


Register / Login
↓
Génération Token
↓
Authorization: Bearer {token}
↓
Validation par Laravel
↓
Accès aux routes protégées



---

## 4. Endpoints API

### Routes Publiques

| Méthode | Endpoint | Description | Limite |
|----------|----------|-------------|--------|
| POST | /api/register | Créer un utilisateur | 5/min |
| POST | /api/login | Connexion | 5/min |

### Routes Protégées (auth:sanctum)

| Méthode | Endpoint | Description |
|----------|----------|-------------|
| GET | /api/me | Informations utilisateur |
| POST | /api/logout | Révoquer le token |

### Routes Documents (Non protégées – Jour 10)

- POST /api/documents  
- POST /api/documents/{id}/validate  

---

## 5. Règles de Validation

### Register
- name : requis
- email : requis, unique
- password : min 8 caractères, confirmé

### Login
- email : requis
- password : requis

---

## 6. Sécurité

- Limitation de débit : 5 tentatives/minute
- Mot de passe haché (bcrypt)
- Tokens stockés hachés en base
- Déconnexion = suppression du token courant
- Plusieurs tokens autorisés par utilisateur
- Pas d’expiration (usage interne)

---

## 7. Structure Table personal_access_tokens

- id
- tokenable_type
- tokenable_id
- name
- token (haché)
- abilities
- created_at
- last_used_at

---

## 8. Résultats Tests

- Inscription OK (201)
- Email dupliqué → 422
- Login correct → 200
- Mauvais mot de passe → 422
- Route protégée sans token → 401
- Logout → 200
- Token invalide après logout → 401
- Routes documents toujours accessibles

Tous les tests validés.

