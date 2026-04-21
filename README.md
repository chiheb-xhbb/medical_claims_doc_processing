# Medical Claims Document Processing Platform

[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite%20%2B%20Bootstrap-61dafb)](#architecture)
[![Backend](https://img.shields.io/badge/backend-Laravel%2010-red)](#architecture)
[![AI](https://img.shields.io/badge/ai-FastAPI%20%2B%20PaddleOCR-orange)](#architecture)
[![Database](https://img.shields.io/badge/database-MySQL-blue)](#architecture)
[![Auth](https://img.shields.io/badge/auth-Laravel%20Sanctum-success)](#security-and-access-control)
[![Languages](https://img.shields.io/badge/ui-EN%20%2F%20FR-6f42c1)](#internationalization)

A production-like academic web platform for **medical claims document processing and reimbursement workflow management**.

The system combines:
- secure document upload and protected file access,
- OCR and structured extraction,
- human-in-the-loop validation,
- dossier-based reimbursement workflow,
- hierarchical supervisor review for exceptional cases,
- persistent in-app notifications,
- immutable workflow traceability,
- and a bilingual **English / French** user interface.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Core Capabilities](#core-capabilities)
- [Architecture](#architecture)
- [Business Model](#business-model)
- [Workflows](#workflows)
- [Security and Access Control](#security-and-access-control)
- [Internationalization](#internationalization)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Notes](#environment-notes)
- [API Overview](#api-overview)
- [Current Scope](#current-scope)
- [Academic Context](#academic-context)

---

## Project Overview

This project was developed as a **PFE (Projet de Fin d’Études)** in Software Engineering / Information Systems.

It addresses a real operational problem: medical reimbursement workflows often depend on slow manual review of invoice-like documents, repeated data entry, weak traceability, and fragmented coordination between preparation, review, and hierarchical supervision.

The platform solves this by combining three complementary layers:

1. **Document processing**
   - upload of medical invoices and similar supporting documents,
   - asynchronous OCR and structured field extraction,
   - confidence-aware review,
   - human validation and correction history.

2. **Business workflow management**
   - grouping validated documents into **rubriques** inside a **dossier**,
   - document-level reimbursement decisions,
   - rubrique-level aggregation,
   - dossier submission, review, final processing, escalation, and reopen cycles.

3. **Operational governance**
   - role-based access control,
   - persistent notifications,
   - protected source-document access,
   - immutable workflow history,
   - bilingual UI.

The result is not a generic OCR demo. It is a **role-based internal workflow application** centered on the domain model:

**Dossier → Rubriques → Documents**

---

## Core Capabilities

### Document processing
- Secure upload of medical documents
- Asynchronous OCR processing through Laravel queue workers
- FastAPI extraction service with **PaddleOCR as the main OCR engine** and **Tesseract as fallback**
- Structured extraction of key fields such as:
  - invoice date
  - provider name
  - total TTC amount
- Extraction versioning
- Confidence and warning generation
- Human validation and correction audit trail

### Dossier workflow
- Case file creation and management
- Rubrique-based organization of supporting documents
- Attachment of **validated** documents only
- Document-level business decisions:
  - `PENDING`
  - `ACCEPTED`
  - `REJECTED`
- Rubrique-level status aggregation
- Dossier submission and final processing

### Hierarchical review
- Escalation from normal review to supervisor review
- Supervisor approval, return, or complement request
- Reopened preparation flow after complement request
- Current-context cards in dossier detail for active review states
- Full immutable workflow history timeline

### Operational polish
- Protected file preview/download through Laravel
- Persistent workflow notifications in the navbar
- EN/FR language switcher
- Enterprise-style operational UI for documents, dossiers, review, and administration

---

## Architecture

The platform uses a **three-part architecture** with strict responsibility boundaries.

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React + Vite + Bootstrap | User interface, lists, forms, review surfaces, localization |
| Backend | Laravel 10 + Sanctum + MySQL | Business workflow, RBAC, persistence, orchestration, protected file access |
| AI Service | FastAPI + PaddleOCR + Tesseract + spaCy | OCR, extraction, preprocessing, structured AI response |

### Key architectural rules

- **React communicates only with Laravel**
- **Laravel is the source of truth** for workflow, RBAC, notifications, persistence, and protected access
- **FastAPI is stateless** and limited to OCR / extraction concerns
- No direct React → FastAPI communication
- Business workflow remains fully outside the AI service

This separation keeps the project easier to reason about, safer to evolve, and more defensible academically.

---

## Business Model

The application is built around four core roles:

- `AGENT`
- `CLAIMS_MANAGER`
- `SUPERVISOR`
- `ADMIN`

`ADMIN` acts as the super-role.

### Core hierarchy

```text
Dossier
  └── Rubriques
        └── Documents
```

### Design principle

The project deliberately separates:

- the **technical document lifecycle**,
- the **business reimbursement decisions**,
- and the **dossier workflow state machine**.

This avoids mixing OCR pipeline state with reimbursement review state.

---

## Workflows

### 1) Technical document lifecycle

```text
UPLOADED → PROCESSING → PROCESSED → VALIDATED
```

- `UPLOADED`: file stored successfully
- `PROCESSING`: OCR job running through the queue
- `PROCESSED`: extraction result available
- `VALIDATED`: human-reviewed version accepted

### 2) Document reimbursement decision lifecycle

```text
PENDING → ACCEPTED / REJECTED
```

This decision layer is separate from OCR status.

### 3) Dossier business workflow

```text
RECEIVED → IN_PROGRESS → UNDER_REVIEW → PROCESSED
```

### 4) Hierarchical exception workflow

```text
UNDER_REVIEW → IN_ESCALATION
```

From `IN_ESCALATION`, the supervisor can:
- approve the dossier → `PROCESSED`
- return it to the claims manager → `UNDER_REVIEW`
- request complement → `AWAITING_COMPLEMENT`

Then:

```text
AWAITING_COMPLEMENT → UNDER_REVIEW
```

after the preparation owner updates the required elements and resubmits the dossier.

---

## Security and Access Control

The platform includes a real access-control layer, not just a demo login.

### Implemented security elements
- API authentication with **Laravel Sanctum**
- Protected routes on both backend and frontend
- Role-based action visibility and controller-level authorization
- Protected source-document preview and download through Laravel streaming
- Safe account management:
  - activation / deactivation
  - role updates
  - self password change
  - admin password reset
- Best-effort notification emission after successful workflow transitions

### Protected file access model

Source files are **not** exposed publicly.

```text
React → Laravel API → private storage
```

This keeps RBAC enforced at the backend and avoids direct storage leakage.

---

## Internationalization

The frontend supports two real UI languages:

- **English** (default)
- **French**

The i18n layer was implemented at the **presentation level only**:
- internal backend values remain stable,
- enums and workflow constants stay canonical,
- the UI renders translated labels, badges, notifications, and workflow surfaces.

This keeps the business model clean while making the application usable in both languages.

---

## Repository Structure

```text
backend/   Laravel API, business logic, migrations, queue jobs, notifications
frontend/  React + Vite application, workflow UI, i18n, admin screens
ai/        FastAPI OCR/extraction service
README.md  Root project documentation
```

### Backend highlights
- API controllers for documents, dossiers, rubriques, escalation, notifications, and admin users
- Queue-based document processing
- MySQL-backed persistence
- Workflow events and notification services

### Frontend highlights
- Documents list and validation workspace
- Dossiers list and dossier detail workspace
- Workflow actions, supervisor panel, and timeline surfaces
- Admin user management
- Notification bell
- Language switcher and localized dictionaries

### AI service highlights
- OCR pipeline with PaddleOCR primary engine
- Tesseract fallback strategy
- spaCy-assisted provider extraction
- stable JSON response contract consumed by Laravel

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** 9+
- **PHP** 8.1+
- **Composer** 2+
- **Python** 3.10+
- **MySQL** 8+
- **Tesseract OCR** installed and available in `PATH`
- Optional but recommended: GPU-ready environment for PaddleOCR acceleration

### 1. Clone the repository

```bash
git clone https://github.com/chiheb-xhbb/medical_claims_doc_processing.git
cd medical_claims_doc_processing
```

### 2. Backend setup

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
```

Configure your `.env` for:
- MySQL connection
- Sanctum / app URL
- `FASTAPI_URL`

Start the Laravel API:

```bash
php artisan serve
```

Start a queue worker in a second terminal:

```bash
php artisan queue:work
```

### 3. AI service setup

```bash
cd ai
python -m venv venv
```

Activate the environment:

**Windows**
```bash
venv\Scripts\activate
```

**Linux / macOS**
```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run FastAPI:

```bash
uvicorn main:app --reload --port 8001
```

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Notes

### Queue worker required
Document processing is asynchronous. Uploads will not move from `UPLOADED` / `PROCESSING` to extracted results unless a Laravel queue worker is running.

### FastAPI contract stability
The AI service returns a structured JSON payload consumed by Laravel. The project keeps this contract stable so OCR improvements do not break the application workflow.

### Local development URLs
The codebase is currently oriented toward local development defaults. Review environment variables before deployment.

### PDF handling
The OCR service is designed for invoice-like document processing. Multi-page PDF handling is not the main focus of the current academic prototype.

---

## API Overview

The exact route set is defined in the Laravel application, but the platform currently includes protected endpoints for:

### Authentication and account control
- login / logout
- current user
- self password change
- forgot/reset password flows
- admin user management

### Documents
- upload
- list / filters / pagination
- detail
- validation
- protected preview / download

### Dossiers and rubriques
- dossier CRUD
- dossier submit / process
- rubrique CRUD
- attach / detach validated documents
- document accept / reject
- rubrique reject-all

### Hierarchical review
- escalate dossier
- supervisor approve
- supervisor return
- supervisor request complement
- claims manager return to preparation

### Notifications and traceability
- notifications list
- unread count
- mark one as read
- mark all as read
- workflow history per dossier

---

## Current Scope

### Included in the final implemented scope
- secure upload pipeline
- OCR + extraction + confidence/warnings
- human validation and correction history
- dossier / rubrique / document workflow
- hierarchical supervisor review
- protected source-document access
- persistent notifications
- immutable workflow history
- EN/FR interface localization
- admin user management

### Explicitly out of scope
- dashboard analytics
- advanced reporting exports
- WebSocket-based real-time notifications
- direct public file URLs
- generic CMS features unrelated to the claims domain

---

## Academic Context

This repository contains the implementation of a **PFE (Projet de Fin d’Études)** focused on building a serious, production-like academic prototype rather than a superficial demo.

The main engineering themes covered by the project are:
- OCR and structured extraction,
- human-in-the-loop validation,
- role-based workflow design,
- hierarchical exception review,
- secure document handling,
- notification and traceability patterns,
- and bilingual presentation-layer stabilization.

---

## Author

**Chihebddine Selmi**  
PFE – Medical Claims Document Processing Platform

