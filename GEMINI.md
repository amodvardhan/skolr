# CLAUDE.md — Skolr Platform

> **AI Coding Agent Reference Document**
> This file is the primary guide for Claude Code (or any AI coding agent) working on the Skolr platform.
> Read this fully before writing any code. All architectural and design decisions flow from here.

---

## Project Overview

**Skolr** is a School ERP + CMS SaaS platform built for Indian schools (Tier 1–3).
It combines a full school management system with a modern, drag-and-drop public website builder.

**Core Philosophy:** Feature-rich ERP backend + Squarespace-quality public website builder, all in one admin panel.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend API | Python + FastAPI | 3.12+ / 0.111+ |
| Database | PostgreSQL | 16+ |
| ORM | SQLAlchemy (async) | 2.0+ |
| Migrations | Alembic | Latest |
| Auth | JWT + OAuth2 (FastAPI Security) | — |
| Cache | Redis | 7+ |
| Task Queue | Celery + Redis broker | 5+ |
| File Storage | AWS S3 / MinIO (self-hosted) | — |
| Search | PostgreSQL FTS (Phase 1), Elasticsearch (Phase 3) | — |
| Frontend | React + TypeScript | 18+ / 5+ |
| Build Tool | Vite | 5+ |
| State Management | Zustand | 4+ |
| Data Fetching | TanStack Query (React Query) | 5+ |
| UI Components | shadcn/ui + Radix UI | Latest |
| Styling | Tailwind CSS | 3.4+ |
| Forms | React Hook Form + Zod | Latest |
| Charts | Recharts | 2+ |
| Rich Text | TipTap | 2+ |
| Drag & Drop | dnd-kit | 6+ |
| PDF Generation | WeasyPrint (Python) | Latest |
| WhatsApp | Meta Business API | — |
| Containerization | Docker + Docker Compose | — |
| Reverse Proxy | Nginx | Latest |

---

## Repository Structure

```
skolr/
├── Skolr_Product_Document.docx  ← Product Overview, Requirements and more. Read it first.
├── GEMINI.md                    ← You are here
├── .agents/
    ├── backend/
        ├── SKILL.md
    ├── frontend/
        ├── SKILL.md
    ├── database/
        ├── SKILL.md
    ├── cms/
        ├── SKILL.md

├── backend/
│   ├── app/
│   │   ├── main.py              ← FastAPI app entry point
│   │   ├── core/
│   │   │   ├── config.py        ← Settings via pydantic-settings
│   │   │   ├── security.py      ← JWT, password hashing
│   │   │   ├── database.py      ← Async SQLAlchemy engine
│   │   │   └── redis.py         ← Redis client
│   │   ├── models/              ← SQLAlchemy ORM models
│   │   ├── schemas/             ← Pydantic v2 request/response schemas
│   │   ├── routers/             ← FastAPI routers (one per domain)
│   │   ├── services/            ← Business logic layer
│   │   ├── repositories/        ← DB query layer (Repository pattern)
│   │   ├── tasks/               ← Celery async tasks
│   │   ├── middleware/          ← Auth, tenant, logging middleware
│   │   └── utils/               ← Helpers, constants
│   ├── migrations/              ← Alembic migrations
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                 ← Root, providers, routing
│   │   ├── modules/             ← Feature modules (one folder per domain)
│   │   │   ├── auth/
│   │   │   ├── students/
│   │   │   ├── fees/
│   │   │   ├── attendance/
│   │   │   ├── cms/             ← Website builder
│   │   │   └── ...
│   │   ├── components/          ← Shared UI components
│   │   ├── hooks/               ← Shared custom hooks
│   │   ├── stores/              ← Zustand stores
│   │   ├── lib/                 ← API client, utilities
│   │   └── types/               ← Shared TypeScript types
│   ├── public/
│   └── vite.config.ts
├── cms-templates/               ← School website templates (HTML/CSS/JS)
│   ├── template-001-prestige/
│   ├── template-002-modern/
│   └── ...
├── infrastructure/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── nginx/
└── docs/
    ├── SRS.md
    ├── FRS.md
    ├── HLD.md
    └── LLD.md
```

---

## Multi-Tenancy Architecture

Skolr is a **multi-tenant SaaS** platform.

**Tenancy Model:** Schema-per-tenant in PostgreSQL.

- Each school gets its own PostgreSQL schema: `school_<uuid>`
- A shared `public` schema holds: `tenants`, `plans`, `feature_flags`, `billing`
- All backend requests carry a `X-School-ID` header (resolved to schema by middleware)
- Alembic migrations run per-tenant schema on onboarding

```python
# Every model inherits from TenantBase
class TenantBase(Base):
    __abstract__ = True
    # SQLAlchemy sets search_path per-request via middleware
```

**Row-level security** is also applied as an additional safety layer.

---

## Authentication & Authorization

- **JWT Access Token:** 15-minute expiry
- **Refresh Token:** 7-day expiry, stored in HttpOnly cookie
- **Roles (RBAC):**
  - `super_admin` — Skolr platform admin
  - `school_admin` — School owner / principal
  - `teacher` — Class/subject teacher
  - `parent` — Parent/guardian (read-only, notifications)
  - `student` — Student portal (Phase 2)
  - `accountant` — Fees and finance only

```python
# Use FastAPI dependency injection for role checks
from app.core.security import require_roles

@router.get("/fees")
async def get_fees(user = Depends(require_roles(["school_admin", "accountant"]))):
    ...
```

---

## API Design Rules

- All APIs are REST + JSON
- Base URL: `/api/v1/`
- Versioning: URL-based (`/v1/`, `/v2/`)
- Response envelope:
```json
{
  "success": true,
  "data": { ... },
  "message": "OK",
  "pagination": { "page": 1, "per_page": 20, "total": 450 }
}
```
- Errors:
```json
{
  "success": false,
  "error": { "code": "STUDENT_NOT_FOUND", "message": "Student with ID xyz not found" }
}
```
- Always paginate list endpoints: `?page=1&per_page=20`
- Filter via query params: `?class_id=5&section=A&status=active`
- Soft delete: never hard-delete; use `deleted_at` timestamp

---

## Database Rules

- All tables have: `id` (UUID), `created_at`, `updated_at`, `deleted_at`
- Always use UUID primary keys (no sequential integers exposed externally)
- Use `ENUM` types sparingly; prefer short `VARCHAR` with DB-level check constraints
- Index foreign keys and frequently-filtered columns
- Never write raw SQL in routers; always use repository layer
- Migrations: one migration per feature, never modify existing migrations

```python
# Standard model pattern
import uuid
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime

class Student(TenantBase):
    __tablename__ = "students"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admission_number = Column(String(20), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
```

---

## Frontend Rules

- **TypeScript strict mode** — no `any`, ever
- All API calls go through `src/lib/api.ts` (Axios instance with interceptors)
- Use **TanStack Query** for all server state; no `useEffect` for data fetching
- Use **Zustand** for client-side UI state only (modals, drawer state, etc.)
- All forms use **React Hook Form + Zod schema validation**
- Never inline styles; always use Tailwind utility classes
- Components: one component per file, named exports
- Page components live in `modules/<domain>/pages/`
- Shared components live in `components/`

```typescript
// Standard API query pattern
export const useStudents = (filters: StudentFilters) => {
  return useQuery({
    queryKey: ['students', filters],
    queryFn: () => studentApi.list(filters),
  });
};
```

---

## Design System

**Brand Colors:**
```css
--primary:        #1E40AF;   /* Deep Blue — trust, education */
--primary-light:  #3B82F6;
--accent:         #F59E0B;   /* Amber — energy, attention */
--success:        #10B981;
--danger:         #EF4444;
--warning:        #F97316;
--neutral-50:     #F8FAFC;
--neutral-900:    #0F172A;
```

**Typography:**
- Display/Headings: `Plus Jakarta Sans` (Google Fonts)
- Body: `Inter`
- Monospace/data: `JetBrains Mono`

**Design Principles:**
- Cards with subtle shadows (`shadow-sm`) and `rounded-xl`
- Sidebar navigation: collapsible, 64px collapsed / 240px expanded
- Data tables: sortable columns, row selection, bulk actions toolbar
- Empty states: always include an illustration + CTA, never blank
- Loading states: skeleton screens, not spinners
- Mobile-first but admin panel optimized for desktop 1280px+

---

## CMS / Website Builder Rules

The website builder is the **key differentiator**. Treat it with extra care.

- Templates stored as HTML/CSS/JS in `cms-templates/` directory
- Each template has a `template.json` manifest:
```json
{
  "id": "template-001-prestige",
  "name": "Prestige",
  "thumbnail": "thumb.png",
  "sections": ["hero", "about", "features", "gallery", "testimonials", "contact"],
  "color_scheme": ["#1E3A5F", "#F5A623", "#FFFFFF"]
}
```
- The CMS editor renders the live template in an iframe
- Content blocks are JSON stored in `cms_pages` table
- Admin edits content via a right-side panel (not inline editing)
- Published website is statically rendered via SSR/SSG and served from CDN
- School domain: `schoolname.skolr.in` (subdomain) or custom domain via CNAME

---

## Environment Variables

```bash
# backend/.env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/skolr
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=<256-bit-random>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
AWS_BUCKET_NAME=skolr-media
AWS_REGION=ap-south-1
WHATSAPP_API_TOKEN=<meta-token>
WHATSAPP_PHONE_ID=<phone-id>
RAZORPAY_KEY_ID=<key>
RAZORPAY_KEY_SECRET=<secret>
ENVIRONMENT=development  # development | staging | production

# frontend/.env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_ENV=development
```

---

## Coding Conventions

- Python: follow PEP8, use `ruff` linter, `black` formatter
- TypeScript: ESLint + Prettier, strict mode
- Git commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- PR naming: `[PHASE-1] feat: student admission module`
- Test coverage target: 80% for services, 60% for routers
- Never commit secrets; use `.env` files and `python-dotenv`
- No hardcoding, No TODOs and no future implementations
- Always find the root cause to fix the bug, no workarounds
- Don't break the existing functionalities when working on new feauture or bugs.
- Don't use any external libraries without my permission
- Prefer simplicity and ease of maintenance over clever one-liners
- If you are unsure about anything, always ask me
- No shortcuts, no quick fixes, no hacky solutions
- Don't make the code more complex than it needs to be
- Don't assume anything, always ask if you are unsure
- Readability over performance (unless performance is critical)
- Don't fix one bug and introduce 2 more bugs.
- Always follow the project structure.
- Always follow the coding conventions.
- Always follow the database rules.
- Always follow the api rules.
- Always follow the frontend rules.
- Don't change the design/architecture/file structure unless explicitly asked.
- Always write code which are optimised, modular, performant and production ready.
- Avoid adding new .env variables. If required, ask me first.
- Don't commit any logs, console.logs, debugging statements, commented code.
- Always run linting, formatting, and type-checking before committing.
- Don't use unnecessary comments, variable.
- Always add comments for complicated logics, explaination of code.
- Don't change the file structure unless explicitly asked.
- Don't unnecessary generate the code until it's required.
- Don't create unnecessary files until it's required.

---

## Phase Tags

| Phase | Focus | Target Timeline |
|---|---|---|
| **Phase 1** | Core ERP (Students, Fees, Attendance, Academics, Staff, Notifications, Admin) | Month 1–4 |
| **Phase 2** | CMS + Website Builder, Parent App, Exam Module | Month 5–8 |
| **Phase 3** | AI Insights, Admission CRM, WhatsApp-first, Integrations (Tally, DigiLocker) | Month 9–14 |
| **Phase 4** | LMS, Alumni, Canteen, Library, Advanced Analytics | Month 15–20 |

All code files should carry a comment: `# Phase: 1` at the top of service files.

---

## Key Commands

```bash
# Backend
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Run migrations
alembic upgrade head

# Run tests
pytest tests/ -v --cov=app

# Frontend
cd frontend
npm run dev

# Docker (full stack)
docker-compose up -d

# Celery worker
celery -A app.tasks worker --loglevel=info
```
