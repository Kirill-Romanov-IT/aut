# Architecture Document — CRM + AI Voice-Calling Bot

> Auto-generated from repository inspection on 2026-02-13.
> Sections marked **TODO** indicate areas where information was not found in the codebase.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Component Diagram](#2-component-diagram)
3. [Repository Structure](#3-repository-structure)
4. [Runtime Components](#4-runtime-components)
5. [Data Model](#5-data-model)
6. [API Surface](#6-api-surface)
7. [Main Flows](#7-main-flows)
8. [AI / Bot Integration](#8-ai--bot-integration)
9. [Non-functional Concerns](#9-non-functional-concerns)
10. [Observability & Error Handling](#10-observability--error-handling)
11. [Security Considerations](#11-security-considerations)
12. [Local Dev & Troubleshooting](#12-local-dev--troubleshooting)
13. [Deployment](#13-deployment)
14. [Roadmap / Next Steps](#14-roadmap--next-steps)

---

## 1. System Overview

The system is a CRM platform designed for managing outbound sales pipelines with AI-assisted enrichment and (planned) voice-calling automation. It consists of:

| Layer | Technology | Location |
|-------|-----------|----------|
| Frontend | Next.js 16.1 / React 19.2 / TypeScript | `frontend/` |
| Backend API | FastAPI (Python) | `backend/` |
| Database | PostgreSQL (psycopg) | External service |
| AI Service | Google Gemini (`gemini-3-flash-preview`) | External API |
| Queue/Worker | **Not yet implemented** (Redis URL defined but unused) | — |
| Bot/Telephony | **Not yet implemented** (UI placeholder exists) | — |

**Current state:** The CRM core (company management, kanban pipeline, CSV import, AI enrichment) is functional. The voice-calling bot integration is scaffolded in the UI (`voice-ai-queue.tsx`) but has no backend telephony or webhook endpoints yet.

---

## 2. Component Diagram

```mermaid
flowchart LR
    subgraph Browser["Browser (Port 3000)"]
        UI["Next.js App<br/>(React 19, Tailwind, Shadcn UI)"]
    end

    subgraph Backend["Backend (Port 8000)"]
        API["FastAPI<br/>REST API"]
        Auth["Auth Module<br/>(JWT + bcrypt)"]
        AISvc["AI Service<br/>(Gemini Client)"]
    end

    subgraph Data["Data Layer"]
        PG[("PostgreSQL<br/>app_db")]
    end

    subgraph External["External Services"]
        Gemini["Google Gemini API<br/>gemini-3-flash-preview"]
    end

    subgraph Planned["Planned (Not Implemented)"]
        Redis[("Redis<br/>(URL defined, unused)")]
        Bot["Voice Bot /<br/>Telephony Provider"]
    end

    UI -- "REST (JSON) + Bearer Token" --> API
    API --> Auth
    API --> AISvc
    API -- "psycopg" --> PG
    AISvc -- "google-genai SDK" --> Gemini

    API -. "planned" .-> Redis
    API -. "planned webhooks" .-> Bot
    Bot -. "planned callbacks" .-> API

    style Planned fill:#f9f9f9,stroke:#ccc,stroke-dasharray: 5
```

---

## 3. Repository Structure

```
app/
├── backend/
│   ├── main.py              # All API endpoints (~770 lines)
│   ├── db.py                # DB init, connection pool, schema creation
│   ├── models.py            # Pydantic request/response schemas
│   ├── auth.py              # JWT creation, password hashing (bcrypt)
│   ├── ai_service.py        # Google Gemini wrapper (headcount, decision-maker)
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Environment variables (DATABASE_URL, GEMINI_API_KEY, REDIS_URL)
├── frontend/
│   ├── app/
│   │   ├── layout.js        # Root layout (LanguageProvider, Toaster)
│   │   ├── page.js          # Login page (entry point)
│   │   ├── register/        # Registration page
│   │   └── dashboard/
│   │       ├── page.tsx              # Dashboard home (metrics, charts)
│   │       ├── lifecycle/page.tsx    # Kanban board
│   │       ├── companies/page.tsx    # Companies hub (All + Ready tabs)
│   │       ├── data-library/page.tsx # Archived companies
│   │       ├── analytics/           # Stub
│   │       ├── team/                # Voice AI queue placeholder
│   │       ├── settings/            # Stub
│   │       ├── help/                # Stub
│   │       ├── search/              # Stub
│   │       ├── reports/             # Stub
│   │       └── word-assistant/      # Stub
│   ├── components/
│   │   ├── companies-table.tsx          # All-companies table
│   │   ├── ready-companies-table.tsx    # Ready-companies table
│   │   ├── archived-companies-table.tsx # Archive table
│   │   ├── lifecycle-kanban.tsx         # Drag-and-drop kanban (dnd-kit)
│   │   ├── voice-ai-queue.tsx           # Call queue display (localStorage-based)
│   │   ├── app-sidebar.tsx              # Navigation sidebar
│   │   ├── site-header.tsx              # Top header
│   │   ├── section-cards.tsx            # Metric cards
│   │   ├── chart-area-interactive.tsx   # Recharts area chart
│   │   ├── company-sheet.tsx            # Company detail side sheet
│   │   ├── ready-company-dialog.tsx     # Ready company edit dialog
│   │   ├── archived-company-dialog.tsx  # Archive detail dialog
│   │   ├── login-form.jsx              # Login form
│   │   ├── register-form.jsx           # Registration form
│   │   ├── language-provider.tsx        # i18n context provider
│   │   └── ui/                          # Shadcn UI primitives
│   ├── lib/
│   │   ├── api.ts            # Auth API helpers (login, register)
│   │   └── translations.ts   # i18n strings (RU / EN)
│   └── package.json
├── tests/
│   ├── test_auth.py
│   ├── test_main.py
│   ├── test_db.py
│   ├── test_ai_endpoint.py
│   ├── test_bulk_ai_endpoint.py
│   └── test_models.py
├── Makefile                  # Dev commands (make dev, make backend, make frontend)
├── CLAUDE.md                 # Project instructions
├── CHANGELOG.md              # Version history
└── text.csv                  # Sample CSV data
```

---

## 4. Runtime Components

### 4.1 Frontend (Next.js)

- **Framework:** Next.js 16.1.6 with App Router, React 19.2.3, TypeScript
- **Entry point:** `app/layout.js` (root layout) -> `app/page.js` (login)
- **Routing:** File-based (App Router). All authenticated pages under `/dashboard/*`
- **UI Kit:** Shadcn UI (Radix primitives) + Tailwind CSS
- **Drag & Drop:** `@dnd-kit/core` + `@dnd-kit/sortable`
- **Charts:** Recharts
- **Notifications:** Sonner (toast)
- **i18n:** Custom context (`LanguageProvider`) with `lib/translations.ts`
- **State:** React local state + `localStorage` for auth token and queue data
- **Cross-component sync:** `window.dispatchEvent(new Event('companies-updated'))`

### 4.2 Backend API (FastAPI)

- **Framework:** FastAPI (Python 3.10+)
- **Entry point:** `backend/main.py` — all routes registered inline (no router modules)
- **Auth:** OAuth2 Password flow, JWT tokens (python-jose), bcrypt password hashing (passlib)
- **DB driver:** `psycopg` (v3, binary mode, `dict_row` factory)
- **CORS:** Allows `http://localhost:3000` and `http://127.0.0.1:3000`

### 4.3 Database (PostgreSQL)

- **Connection string:** `postgresql://aut_user:0185@localhost:5432/app_db`
- **Schema management:** `CREATE TABLE IF NOT EXISTS` in `db.init_db()` (no migration tool)
- **Tables:** `users`, `companies`, `archived_companies`, `company_column_mappings`

### 4.4 AI Service (Google Gemini)

- **Library:** `google-genai` SDK
- **Model:** `gemini-3-flash-preview`
- **Capabilities:** Headcount estimation (single + bulk), decision-maker lookup via Google Search tool
- **Wrapper:** `backend/ai_service.py`

### 4.5 Queue / Worker

**Not implemented.** `REDIS_URL` is defined in `.env` but not referenced in application code. The voice-AI queue in the frontend (`voice-ai-queue.tsx`) is a UI mock that reads from `localStorage`.

### 4.6 Bot / Telephony

**Not implemented.** No webhook endpoints, no telephony provider integration, no call scheduling backend logic. The `scheduled_at` field exists on `companies` but is only used for frontend display/sorting.

---

## 5. Data Model

### 5.1 Entity-Relationship Summary

```
users (auth only, no FK to companies)

companies (master table — single source of truth)
  ├── is_ready=FALSE, is_in_kanban=FALSE  →  "All Companies" view
  ├── is_ready=TRUE,  is_in_kanban=FALSE  →  "Ready Companies" view
  └── is_ready=TRUE,  is_in_kanban=TRUE   →  "Kanban / Lifecycle" view

archived_companies (separate table, soft-delete destination)

company_column_mappings (CSV header → DB field mapping)
```

### 5.2 Table Schemas

#### `users`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | SERIAL | PRIMARY KEY |
| `username` | VARCHAR(255) | UNIQUE, NOT NULL |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL |
| `hashed_password` | VARCHAR(255) | NOT NULL |
| `is_active` | BOOLEAN | DEFAULT TRUE |

Source: `backend/db.py`

#### `companies`

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| `id` | SERIAL | PRIMARY KEY |
| `name` | VARCHAR(255) | NOT NULL |
| `employees` | INT | DEFAULT 0 |
| `location` | VARCHAR(255) | — |
| `limit_val` | VARCHAR(255) | — |
| `description` | TEXT | — |
| `status` | VARCHAR(50) | Values: `new`, `not-responding`, `ivr`, `hang-up`, `dm-found-call-time` |
| `scheduled_at` | TIMESTAMP | For call scheduling |
| `contact_name` | VARCHAR(255) | — |
| `contact_surname` | VARCHAR(255) | — |
| `contact_phone` | VARCHAR(255) | — |
| `is_ready` | BOOLEAN | DEFAULT FALSE — gates "Ready" view |
| `is_in_kanban` | BOOLEAN | DEFAULT FALSE — gates "Kanban" view |
| `created_at` | TIMESTAMP | DEFAULT NOW() |

Source: `backend/db.py`

#### `archived_companies`

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| `id` | SERIAL | PRIMARY KEY |
| `company_name` | VARCHAR(255) | NOT NULL |
| `location` | VARCHAR(255) | — |
| `name` | VARCHAR(255) | Contact first name |
| `sur_name` | VARCHAR(255) | Contact surname |
| `phone_number` | VARCHAR(255) | — |
| `archived_at` | TIMESTAMP | DEFAULT NOW() |

Source: `backend/db.py`

#### `company_column_mappings`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | SERIAL | PRIMARY KEY |
| `csv_header` | VARCHAR(255) | UNIQUE, NOT NULL |
| `db_field` | VARCHAR(255) | NOT NULL |

Source: `backend/db.py`

### 5.3 Key Design Decisions

- **Single `companies` table with boolean flags** (`is_ready`, `is_in_kanban`) instead of separate tables per pipeline stage. This avoids data duplication but requires careful flag management.
- **Archive is a separate table** (`archived_companies`) — archiving copies data and deletes from `companies`.
- **No foreign keys between users and companies** — multi-tenancy / ownership is not implemented.
- **No migration tool** — schema is created via `CREATE TABLE IF NOT EXISTS` at startup. Schema changes require manual ALTER statements or table recreation.

---

## 6. API Surface

Base URL: `http://localhost:8000`

### 6.1 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Create user account |
| POST | `/token` | OAuth2 login, returns JWT |
| GET | `/users/me` | Current user profile (protected) |

### 6.2 Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Root / welcome |
| GET | `/health` | Service health |
| GET | `/health/db` | Database connectivity check |

### 6.3 Companies (All / Lifecycle)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/companies` | List companies (`is_in_kanban=F`, `is_ready=F`) |
| GET | `/companies/kanban` | List kanban companies (`is_in_kanban=T`) |
| POST | `/companies/upload` | CSV import with duplicate prevention |
| PUT | `/companies/{id}` | Update company fields |
| PATCH | `/companies/{id}/status` | Update kanban status |
| POST | `/companies/bulk-delete` | Bulk delete by IDs |
| PATCH | `/companies/bulk-enrich` | Bulk update employee count |
| PATCH | `/companies/bulk-ready` | Mark companies as ready (`is_ready=T`) |
| POST | `/companies/{id}/archive` | Move to archive table |
| POST | `/companies/ai-estimate-headcount` | AI: single headcount estimate |
| POST | `/companies/ai-bulk-estimate-headcount` | AI: bulk headcount estimate |

### 6.4 Ready Companies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ready-companies` | List companies with `is_ready=T` |
| PUT | `/ready-companies/{id}` | Update ready company details |
| POST | `/ready-companies/bulk-delete` | Bulk delete |
| PATCH | `/ready-companies/bulk-enrich` | Bulk update contact info |
| POST | `/ready-companies/{id}/move-to-kanban` | Move to kanban (`is_in_kanban=T`) |
| POST | `/ready-companies/bulk-move-to-kanban` | Bulk move to kanban |
| POST | `/ready-companies/{id}/archive` | Archive a ready company |
| POST | `/ready-companies/ai-bulk-find-decision-maker` | AI: find decision makers (OSINT) |

### 6.5 Archived Companies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/archived-companies` | List all archived |
| POST | `/archived-companies/bulk-delete` | Permanent delete |
| POST | `/archived-companies/bulk-restore` | Restore to kanban |

### 6.6 Authentication Model

- Token type: Bearer (JWT)
- Algorithm: HS256
- Token lifetime: 15 minutes (hardcoded in `auth.py`)
- Protected endpoints require `Authorization: Bearer <token>` header

---

## 7. Main Flows

### 7.1 Flow A — Company Creation to Kanban (No Duplication)

A company progresses through views via boolean flags on a single `companies` row, ensuring no data duplication.

```mermaid
sequenceDiagram
    actor User
    participant UI as Next.js Frontend
    participant API as FastAPI Backend
    participant DB as PostgreSQL

    User->>UI: Upload CSV file
    UI->>API: POST /companies/upload (FormData)
    API->>DB: Check for duplicates (by name)
    API->>DB: INSERT INTO companies (is_ready=F, is_in_kanban=F)
    API-->>UI: 200 OK (imported count, skipped duplicates)
    UI-->>User: Toast: "X imported, Y skipped"

    Note over User,DB: Company visible in "All Companies" tab

    User->>UI: Select companies → "Mark as Ready"
    UI->>API: PATCH /companies/bulk-ready (ids)
    API->>DB: UPDATE companies SET is_ready=TRUE WHERE id IN (...)
    API-->>UI: 200 OK
    UI-->>User: Companies move to "Ready" tab

    Note over User,DB: Same rows, now visible in "Ready Companies" tab

    User->>UI: Select ready companies → "Move to Kanban"
    UI->>API: POST /ready-companies/bulk-move-to-kanban (ids)
    API->>DB: Validate is_ready=TRUE
    API->>DB: UPDATE companies SET is_in_kanban=TRUE WHERE id IN (...)
    API-->>UI: 200 OK
    UI-->>User: Companies appear on Kanban board

    Note over User,DB: Same rows, now visible on Kanban (status='new')
```

### 7.2 Flow B — AI Enrichment + Decision Maker Discovery

```mermaid
sequenceDiagram
    actor User
    participant UI as Next.js Frontend
    participant API as FastAPI Backend
    participant AI as Google Gemini API
    participant DB as PostgreSQL

    User->>UI: Select companies → "AI Estimate Headcount"
    UI->>API: POST /companies/ai-bulk-estimate-headcount
    Note right of UI: { companies: [{id, name, location}, ...] }

    API->>AI: Gemini request (company list + Google Search tool)
    AI-->>API: JSON { results: [{id, min, max, confidence}, ...] }
    API-->>UI: Headcount estimates per company
    UI-->>User: Display estimates in table

    User->>UI: Confirm → "Apply headcount"
    UI->>API: PATCH /companies/bulk-enrich (ids + employee counts)
    API->>DB: UPDATE companies SET employees=... WHERE id=...
    API-->>UI: 200 OK

    Note over User,DB: Companies now have enriched employee data

    User->>UI: Move to Ready → Select → "Find Decision Maker"
    UI->>API: POST /ready-companies/ai-bulk-find-decision-maker
    Note right of UI: { companies: [{id, company_name, location}, ...] }

    API->>AI: Gemini request (OSINT-style lookup)
    AI-->>API: JSON [{id, name, sur_name, phone_number, confidence}, ...]
    API-->>UI: Decision maker info per company

    User->>UI: Confirm → "Apply contacts"
    UI->>API: PATCH /ready-companies/bulk-enrich (ids + contact data)
    API->>DB: UPDATE companies SET contact_name=..., contact_phone=... WHERE id=...
    API-->>UI: 200 OK
    UI-->>User: Contact fields populated
```

### 7.3 Flow C — Call Scheduling (Planned, Not Implemented)

**TODO:** No backend call scheduling, telephony integration, or webhook callback endpoints exist yet. Current state:

- The `scheduled_at` column exists on `companies` but is only set/read via manual updates.
- `voice-ai-queue.tsx` reads a queue from `localStorage` (populated client-side from kanban data).
- No bot execution, no callback handler, no activity log for call outcomes.

When implemented, the expected flow would be:
1. Operator schedules a call (sets `scheduled_at`) or auto-scheduler picks next lead.
2. Background worker (Redis queue) dispatches call job to telephony/bot provider.
3. Bot executes call, records outcome.
4. Bot sends webhook/callback to `POST /calls/callback` (does not exist yet).
5. Backend updates company status, logs activity, schedules next action.

---

## 8. AI / Bot Integration

### 8.1 Current Implementation

**File:** `backend/ai_service.py` (244 lines)

| Function | Purpose | Gemini Tools Used |
|----------|---------|-------------------|
| `estimate_headcount(prompt)` | Single company headcount estimate | Google Search |
| `estimate_headcount_bulk(companies)` | Bulk headcount with min/max ranges | Google Search |
| `find_decision_maker_bulk(companies)` | OSINT-style CEO/founder lookup | Google Search |

**Configuration:**
- Model: `gemini-3-flash-preview`
- API Key: `GEMINI_API_KEY` environment variable
- Response format: Structured JSON with schema validation (`response_schema` parameter)
- Error handling: try/except with HTTP 500 on failure

### 8.2 Not Yet Implemented

- Telephony provider integration (no provider selected)
- Voice bot execution engine
- Call recording storage
- Transcript processing
- Webhook endpoints for bot callbacks
- Correlation IDs / `bot_run_id` tracking

---

## 9. Non-functional Concerns

### 9.1 Idempotency

| Area | Status | Details |
|------|--------|---------|
| CSV import | Implemented | Duplicate detection by company name during upload |
| Company flag transitions | Partial | `move-to-kanban` validates `is_ready=TRUE` before setting `is_in_kanban=TRUE` |
| Bot callbacks | **TODO** | No bot_run_id or idempotency key exists |
| API endpoints | Not implemented | No idempotency keys on POST/PATCH requests |

### 9.2 Retries & Timeouts

| Area | Status | Details |
|------|--------|---------|
| Gemini API calls | No retries | Single attempt, failure returns HTTP 500 |
| Database connections | Connection per request | `psycopg.connect()` per call, no pool |
| Frontend API calls | No retries | Single fetch, error displayed via toast |

### 9.3 Logging & Correlation

- **Backend:** No structured logging framework. FastAPI default stdout logging only.
- **Correlation IDs:** Not implemented. No request-id propagation.
- **AI call logging:** No prompt version, model name, or token/cost tracking in persistent storage.

### 9.4 Rate Limits

- **API:** No rate limiting on any endpoint.
- **Gemini:** Subject to Google API quotas; no client-side rate limiting.
- **Auth:** No brute-force protection on `/token` endpoint.

---

## 10. Observability & Error Handling

### 10.1 Current State

| Aspect | Implementation |
|--------|---------------|
| Health checks | `GET /health` (service) + `GET /health/db` (database) |
| Logging | FastAPI default (stdout, unstructured) |
| Metrics | None |
| Tracing | None |
| Error responses | FastAPI `HTTPException` with status codes |
| Frontend errors | Try/catch → Sonner toast notifications |
| AI errors | Caught in `ai_service.py`, returned as HTTP 500 |

### 10.2 Gaps

- No centralized error handling middleware
- No structured JSON logging
- No request/response logging for audit
- No monitoring or alerting
- No Sentry or equivalent error tracking
- No database query performance monitoring

---

## 11. Security Considerations

### 11.1 Authentication & Authorization

| Aspect | Status | Notes |
|--------|--------|-------|
| Password hashing | bcrypt (passlib) | Secure |
| JWT tokens | HS256, 15-min expiry | `SECRET_KEY` should be in env (has fallback default) |
| Token storage | `localStorage` | Vulnerable to XSS (standard SPA trade-off) |
| Authorization | Token-only | No role-based access control (RBAC) |
| Multi-tenancy | Not implemented | All users see all companies |

### 11.2 Input Validation

| Aspect | Status |
|--------|--------|
| Request bodies | Pydantic models (validated) |
| SQL injection | Parameterized queries via psycopg |
| CSV upload | Column mapping with validation |
| XSS | React escapes by default; no dangerouslySetInnerHTML found |

### 11.3 Concerns

- `SECRET_KEY` has a hardcoded fallback in `auth.py` — should be required from env.
- CORS restricted to localhost only — needs update for production.
- No HTTPS enforcement at application level.
- No audit log for who changed what.
- PII (phone numbers, contact names) stored in plaintext without encryption at rest.
- API keys present in `.env` committed to repo (should be in `.gitignore` or secrets manager).

---

## 12. Local Dev & Troubleshooting

### 12.1 Prerequisites

- Python 3.10+
- Node.js (compatible with Next.js 16)
- PostgreSQL running locally on port 5432
- Database `app_db` created with user `aut_user`

### 12.2 Quick Start

```bash
# Using Makefile (recommended)
make dev          # Starts both backend and frontend concurrently

# Or manually:

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev       # http://localhost:3000
```

### 12.3 Environment Variables

**Backend** (`backend/.env`):

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GEMINI_API_KEY` | Yes (for AI features) | Google Gemini API key |
| `REDIS_URL` | No | Defined but unused |
| `SECRET_KEY` | Recommended | JWT signing key (has insecure fallback) |

**Frontend**:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | Backend URL (defaults to `http://localhost:8000`) |

### 12.4 Database Setup

The schema is auto-created on first backend startup via `db.init_db()` (`CREATE TABLE IF NOT EXISTS`). No separate migration step is needed.

To reset the database:
```bash
psql -U aut_user -d app_db -c "DROP TABLE IF EXISTS companies, archived_companies, users, company_column_mappings CASCADE;"
# Restart backend — tables will be recreated
```

### 12.5 Sample Data

A `text.csv` file exists in the repo root and can be imported via the UI's CSV upload feature (`/dashboard/companies` -> Upload).

### 12.6 Troubleshooting

| Problem | Solution |
|---------|----------|
| CORS errors | Ensure frontend runs on `localhost:3000` (not `0.0.0.0`) |
| JWT expired | Token lifetime is 15 minutes; re-login |
| AI endpoints fail | Check `GEMINI_API_KEY` is valid and has quota |
| DB connection refused | Ensure PostgreSQL is running on port 5432 |
| CSV import skips all | Duplicates detected by name; check existing data |

---

## 13. Deployment

**TODO:** No production deployment configuration found in the repository.

**What exists:**
- `Makefile` with local dev commands only
- No `Dockerfile`, `docker-compose.yml`, or container configuration
- No CI/CD pipeline configuration (no `.github/workflows/`, no `.gitlab-ci.yml`)
- No infrastructure-as-code (Terraform, Pulumi, etc.)
- Next.js is Vercel-compatible by default but no `vercel.json` found

**What would be needed for production:**
1. Dockerfiles for backend and frontend
2. `docker-compose.yml` for local multi-service orchestration
3. Environment variable management (secrets manager, not `.env` files)
4. HTTPS termination (reverse proxy / load balancer)
5. Database connection pooling (PgBouncer or psycopg pool)
6. CI/CD pipeline for testing and deployment

---

## 14. Roadmap / Next Steps

Based on gaps observed in the codebase, ordered by impact:

1. **Add database connection pooling** — Currently opens a new connection per request (`psycopg.connect()`). Use `psycopg_pool.ConnectionPool` or `psycopg_pool.AsyncConnectionPool` to avoid connection exhaustion under load.

2. **Implement database migrations** — Replace `CREATE TABLE IF NOT EXISTS` with Alembic. Schema changes currently require manual DDL or table drops.

3. **Add structured logging** — Replace default stdout with JSON-structured logging (e.g., `structlog` or `python-json-logger`). Include request IDs for correlation.

4. **Implement activity/audit log** — No record of who changed what or when. Add an `activity_log` table tracking status changes, enrichments, and user actions.

5. **Build call scheduling backend** — Implement Redis-backed job queue (e.g., `arq`, `celery`, or `rq`) to process scheduled calls. Add webhook endpoint for bot callbacks.

6. **Add role-based access control** — Currently all authenticated users have full access. Add roles (admin, operator, viewer) and enforce per-endpoint.

7. **Secure `SECRET_KEY` handling** — Remove hardcoded fallback, require it from environment. Add `.env` to `.gitignore` if not already present.

8. **Add API rate limiting** — Protect `/token` from brute-force and AI endpoints from abuse. Use `slowapi` or similar middleware.

9. **Containerize the application** — Add Dockerfiles and `docker-compose.yml` for reproducible local dev and production deployment.

10. **Add frontend tests** — Jest and React Testing Library are configured but no tests exist. Prioritize kanban drag-and-drop and CSV import flows.

---

## Appendix: Files Referenced

| File | Purpose |
|------|---------|
| `backend/main.py` | All API endpoints, business logic |
| `backend/db.py` | Database schema, connection management |
| `backend/models.py` | Pydantic request/response models |
| `backend/auth.py` | JWT + bcrypt auth utilities |
| `backend/ai_service.py` | Google Gemini AI integration |
| `backend/requirements.txt` | Python dependencies |
| `backend/.env` | Environment variables |
| `frontend/app/layout.js` | Root layout |
| `frontend/app/page.js` | Login entry point |
| `frontend/app/dashboard/lifecycle/page.tsx` | Kanban page |
| `frontend/app/dashboard/companies/page.tsx` | Companies hub |
| `frontend/components/lifecycle-kanban.tsx` | Kanban board component |
| `frontend/components/companies-table.tsx` | All-companies table |
| `frontend/components/ready-companies-table.tsx` | Ready-companies table |
| `frontend/components/voice-ai-queue.tsx` | Call queue UI (localStorage mock) |
| `frontend/components/app-sidebar.tsx` | Navigation sidebar |
| `frontend/lib/api.ts` | Auth API helpers |
| `frontend/lib/translations.ts` | i18n strings |
| `frontend/package.json` | Frontend dependencies |
| `Makefile` | Dev commands |
| `CHANGELOG.md` | Version history |
| `text.csv` | Sample import data |
