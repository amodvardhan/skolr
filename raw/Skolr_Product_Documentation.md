


SKOLR

School ERP + CMS Platform


Product Documentation Suite

SRS  |  FRS  |  High-Level Design  |  Low-Level Design





# 1. Software Requirements Specification (SRS)



## 1.1 Introduction


### 1.1.1 Purpose

This document defines the software requirements for Skolr — a multi-tenant, cloud-based School ERP and CMS SaaS platform targeting private schools across India (Tier 1 to Tier 3). It serves as the primary reference for product, engineering, design, and QA teams.



### 1.1.2 Scope

Skolr provides schools with:

A complete school management system covering students, staff, fees, attendance, and academics

A drag-and-drop public website builder with 12 professionally designed templates

A parent-facing mobile experience for attendance, fees, and communication

A feature-flag-based SaaS pricing model allowing tiered feature access



### 1.1.3 Definitions



## 1.2 System Overview

Skolr is a multi-tenant SaaS platform deployed on AWS infrastructure. Each school (tenant) operates in an isolated PostgreSQL schema. The system exposes a REST API consumed by a React admin dashboard, a parent mobile app (React Native, Phase 2), and a statically generated public school website.



## 1.3 Stakeholders



## 1.4 Functional Requirements by Module



### 1.4.1 Authentication & Authorization

Phase 1

The system shall support role-based access control (RBAC) with roles: super_admin, school_admin, teacher, accountant, parent

JWT-based authentication with 15-minute access tokens and 7-day refresh tokens

OAuth2 Google Sign-In support for school staff

All sensitive operations shall require re-authentication confirmation

Session invalidation on password change or admin revocation



### 1.4.2 Student Management

Phase 1

Admission: capture full profile (personal, academic, medical, family background)

Auto-generate unique admission numbers per school per year

Upload and store student documents (birth certificate, Aadhaar, TC, etc.)

Assign students to class and section; support mid-year class transfer

Student lifecycle: active → transferred → alumni → inactive

Bulk import students via Excel/CSV template

Student profile page with full history: fees, attendance, academic record

Search/filter by name, admission number, class, section, status



### 1.4.3 Employee / HR Management

Phase 1

Employee profile: personal, professional, documents, bank details

Designations: teacher, admin staff, support staff, management

Department management (Academic, Administration, Support)

Leave management: apply, approve/reject, leave balance tracking

Payroll: salary structure, monthly payslip generation, PDF export

Employee attendance (manual or biometric-ready)

Role assignment for system access



### 1.4.4 Attendance Management

Phase 1

Period-wise or session-wise (morning/afternoon) attendance marking

Teacher marks attendance from class list with one-tap P/A/L marking

Bulk attendance marking (mark all present, then adjust absents)

Daily attendance summary report per class

Monthly and annual attendance report per student

Auto-trigger WhatsApp notification to parent on student absence

Holiday calendar management — holidays excluded from attendance

Attendance percentage threshold alerts (below 75%)



### 1.4.5 Fees Management

Phase 1

Define fee structures per academic year (class-wise or school-wide)

Fee heads: Tuition, Transport, Lab, Library, Exam, Activity, etc.

Frequency: one-time, monthly, quarterly, half-yearly, annual

Auto-generate fee accounts per student based on class + structure

Record payments: cash, UPI, NEFT, cheque, Razorpay online

Auto-generate and email/WhatsApp fee receipt (PDF)

Fee defaulter reports: student-wise, class-wise, due-date-wise

Discount management: sibling discount, merit scholarship, staff ward

Outstanding dues dashboard for accountant

Razorpay payment link generation for online fee collection



### 1.4.6 Academics Management

Phase 1

Academic year and term management

Class timetable builder (drag-and-drop period assignment)

Subject master with CBSE curriculum code support

Homework: assign, attach files, set due date, track submissions

Syllabus tracker: chapter-wise coverage per subject per class

Lesson planner: weekly/monthly lesson plans per teacher

Academic calendar: events, PTMs, exams, holidays



### 1.4.7 Exam Management

Phase 1

Exam schedule creation: name, dates, classes, subjects

Marks entry per student per subject (inline spreadsheet-style)

Grade configuration: marks to grade mapping per school policy

Report card generation: template-based, PDF export, bulk print

Pass/fail analysis with class topper and rank calculation

Historical exam comparison (current vs previous term)



### 1.4.8 Notification Management

Phase 1

Channels: WhatsApp (Meta Business API), SMS (Twilio/MSG91), In-app push, Email

Event-triggered notifications: absent, fee due, exam result, homework

Manual broadcast: school admin sends announcement to all/selected parents

Notification templates with variable substitution ({student_name}, {amount}, etc.)

Notification delivery log with status (sent/failed/pending)

Parent can configure preferred channel (WhatsApp primary, SMS fallback)



### 1.4.9 Parent–School Relationship

Phase 1

Parent account linked to student profile (one parent can have multiple students)

Parent dashboard: attendance summary, fee status, homework, upcoming events

Parent can view but not edit school data

In-app messaging: parent to class teacher (moderated)

PTM scheduling: parent books slot, receives confirmation

Parent acknowledgement for circulars and notices



### 1.4.10 CMS + Website Builder

Phase 2

Template gallery: 12 professionally designed school website templates

One-click template selection with live preview

Page management: create/edit/delete pages (Home, About, Admissions, Gallery, Contact, etc.)

Section-based content editing: hero, stats, about, gallery, faculty, testimonials, contact

Drag-and-drop section reordering within pages

Color scheme selector (3–4 preset schemes per template)

Media library: upload, organize, and insert images

School subdomain auto-provisioned: schoolname.skolr.in

Custom domain support via CNAME

One-click publish with CDN invalidation (~30 second deploy)

ERP data auto-sync: faculty names, academic calendar, fee structure to website

SEO configuration per page: title, meta description, OG image



### 1.4.11 Admin & Settings

Phase 1

School profile: name, logo, address, affiliation, contact, social links

Academic year configuration and rollover

User management: create/edit/deactivate staff accounts, assign roles

Feature flag dashboard (visible to super_admin only)

Audit log: all sensitive actions logged with user, timestamp, and IP

Backup: automated daily database backup to S3



## 1.5 Non-Functional Requirements



## 1.6 Constraints

Must run on AWS ap-south-1 (Mumbai) region for data residency

WhatsApp integration requires approved Meta Business Account per school

Razorpay requires registered Indian business account for payment processing

Phase 1 does not include a mobile app; parent access is via responsive web




# 2. Functional Requirements Specification (FRS)



## 2.1 User Stories & Acceptance Criteria



### 2.1.1 Student Management — Detailed Features

Phase 1




### 2.1.2 Fees Management — Detailed Features

Phase 1




### 2.1.3 Attendance — Detailed Features

Phase 1


Attendance Marking Flow:

Teacher opens the Attendance module and selects their class and date

System loads the full student roster for that class

By default, all students are marked Present (green)

Teacher taps on absent students to toggle to Absent (red) or Late (yellow)

Teacher submits — system saves session with timestamp and teacher ID

WhatsApp notification auto-sent to parents of absent students within 2 minutes

Attendance locked after 2 hours; edit requires school admin override



### 2.1.4 CMS Website Builder — Detailed Workflow

Phase 2


First-Time Setup Flow:

School admin navigates to Website > Get Started

System prompts for school subdomain (validated for uniqueness)

Admin sees Template Gallery — 12 cards with thumbnails and live demo link

Admin selects a template → sees color scheme options → confirms

System creates default pages: Home, About, Admissions, Gallery, Contact

Admin enters Website Editor


Content Editing Flow:

Left panel shows: page list + section list for current page

Admin clicks a section in the left panel OR clicks a section in the iframe preview

Right panel loads the content editor specific to that section type

Admin edits text, uploads/selects images, sets URLs

Live preview iframe updates in real-time as admin types

Admin can reorder sections by dragging handles in the left panel

Admin can toggle section visibility (hide without deleting)

Changes auto-save as draft every 30 seconds


Publish Flow:

Admin clicks Publish button (top right)

System shows diff: 'X sections updated since last publish'

Admin confirms — Celery task queued

Progress indicator: Generating → Uploading → Invalidating Cache → Live

Typical publish time: 20–40 seconds

Admin receives in-app notification: 'Your website is now live!'



## 2.2 API Endpoint Specification



### 2.2.1 Authentication APIs



### 2.2.2 Student APIs



### 2.2.3 Fees APIs



### 2.2.4 Attendance APIs




# 3. High-Level Design (HLD)



## 3.1 System Architecture

Skolr follows a layered, multi-tenant cloud architecture on AWS ap-south-1 (Mumbai). The system is composed of four primary tiers: Presentation, API, Service, and Data.



### 3.1.1 Architecture Overview (ASCII Diagram)

┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────────┐   │
│  │  Admin Panel    │  │  Parent Web App  │  │  School Website   │   │
│  │  (React + TS)   │  │  (React — P2)   │  │  (Static HTML)    │   │
│  └────────┬────────┘  └────────┬─────────┘  └─────────┬─────────┘  │
└───────────┼────────────────────┼──────────────────────┼────────────┘
            │                    │                       │ CDN (CloudFront)
┌───────────▼────────────────────▼───────────┐          │
│            AWS Application Load Balancer     │          │
│                   (HTTPS / TLS 1.3)          │          │
└───────────────────────┬───────────────────────┘          │
                        │                                   │
┌───────────────────────▼────────────────────────────────── ┐
│                  API GATEWAY LAYER                         │
│  ┌─────────────────────────────────────────────────────┐  │
│  │         FastAPI Application (Uvicorn + Gunicorn)     │  │
│  │                                                       │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │  │
│  │  │ Auth     │ │ Students │ │  Fees    │ │  CMS   │ │  │
│  │  │ Router   │ │ Router   │ │  Router  │ │ Router │ │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │  │
│  │       └────────────┼─────────────┼───────────┘       │  │
│  │              ┌─────▼─────────────▼──────┐            │  │
│  │              │   Middleware Layer         │            │  │
│  │              │  Auth | Tenant | Logging  │            │  │
│  └──────────────┴───────────────────────────┴────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  SERVICE / BUSINESS LAYER                    │
│  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Student   │ │  Fee       │ │ Attend.  │ │  Notif.  │  │
│  │  Service   │ │  Service   │ │ Service  │ │ Service  │  │
│  └────────────┘ └────────────┘ └──────────┘ └──────────┘  │
│                         ┌──────────────┐                    │
│                         │  Celery Tasks│                    │
│                         │  (Async work)│                    │
│                         └──────────────┘                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     DATA LAYER                               │
│  ┌──────────────────────┐   ┌─────────┐   ┌────────────┐  │
│  │  PostgreSQL 16       │   │ Redis 7 │   │   AWS S3   │  │
│  │  (Multi-schema)      │   │ (Cache  │   │  (Media,   │  │
│  │  public schema +     │   │  Queue) │   │  Backups,  │  │
│  │  school_<id> schemas │   └─────────┘   │  PDFs)     │  │
│  └──────────────────────┘                 └────────────┘  │
└─────────────────────────────────────────────────────────────┘



## 3.2 Multi-Tenancy Design

Skolr uses the schema-per-tenant pattern in PostgreSQL. This provides strong data isolation without the operational complexity of separate databases per school.



## 3.3 Technology Stack Rationale



## 3.4 Deployment Architecture



## 3.5 Security Architecture

All traffic encrypted via TLS 1.3 (enforced at ALB)

API authentication: JWT Bearer tokens with RS256 signing

Secrets management: AWS Secrets Manager (no secrets in code or .env in prod)

Database: RDS in private subnet, no public endpoint

WAF: AWS WAF rules on ALB — SQL injection, XSS, rate limiting

CORS: Strict whitelist of allowed origins per environment

File uploads: virus scan via ClamAV on S3 trigger Lambda

Audit logs: all state-changing operations logged to append-only table

RBAC: permissions enforced at service layer, not just route guards




# 4. Low-Level Design (LLD)



## 4.1 Backend Module Design



### 4.1.1 Student Module — Class Diagram

StudentRouter (FastAPI APIRouter)
    │
    ├── GET  /          → list_students(filters, page, per_page) → StudentService.list()
    ├── POST /          → create_student(StudentCreate)          → StudentService.create()
    ├── GET  /{id}      → get_student(id)                        → StudentService.get_by_id()
    ├── PUT  /{id}      → update_student(id, StudentUpdate)      → StudentService.update()
    ├── DELETE /{id}    → delete_student(id)                     → StudentService.soft_delete()
    └── POST /bulk      → bulk_import(file)                      → StudentService.bulk_import()

StudentService
    │  ← depends on: StudentRepository, NotificationService, FileService
    ├── list(filters, page, per_page) → (List[Student], int)
    ├── create(data: StudentCreate) → Student
    │       └── _generate_admission_number() → str
    ├── get_by_id(id: UUID) → Student | None
    ├── update(id: UUID, data: StudentUpdate) → Student
    ├── soft_delete(id: UUID) → bool
    └── bulk_import(file: UploadFile) → BulkImportResult

StudentRepository
    │  ← depends on: AsyncSession
    ├── get_by_id(id) → Student | None
    ├── get_by_admission_no(no) → Student | None
    ├── list_paginated(filters, offset, limit) → (List[Student], int)
    ├── create(student: Student) → Student
    ├── update(student: Student) → Student
    └── soft_delete(id: UUID) → bool



### 4.1.2 Fee Collection — Sequence Diagram

Accountant → FeeRouter → FeeService → FeeRepository → Database
                                   → ReceiptService → WeasyPrint → S3
                                   → NotificationService → WhatsApp API

POST /api/v1/fees/transactions/

1. FeeRouter.record_payment(FeeTransactionCreate)
2.   validate JWT + role (accountant or school_admin)
3.   FeeService.record_payment(data)
4.     FeeRepository.get_fee_account(student_id, year_id)
5.     validate: amount <= outstanding balance
6.     FeeRepository.create_transaction(txn_data)
7.     FeeRepository.update_fee_account(paid_amount += txn.amount)
8.     receipt_no = ReceiptService.generate_number(school_id)
9.     pdf_url = ReceiptService.generate_pdf(txn, student, school)
           → render fee_receipt.html template with Jinja2
           → WeasyPrint converts HTML → PDF bytes
           → upload PDF to S3: receipts/{school_id}/{receipt_no}.pdf
10.    NotificationService.send_fee_receipt(parent, pdf_url, txn)
           → WhatsApp template: 'fee_payment_confirmation'
           → variables: {student_name}, {amount}, {receipt_no}, {pdf_link}
11.  return FeeTransactionResponse (receipt_no, pdf_url, new_balance)



## 4.2 Database Schema Details



### 4.2.1 Core Tables ERD (Text Representation)

academic_years ─────────────────────────────────────────────┐
  id (PK)                                                    │
  name                                                        │
  start_date, end_date                                        │
  is_current (BOOL)                                           │
                                                              │
classes ──────────────────────────────────────────┐         │
  id (PK)                                          │         │
  academic_year_id (FK) ────────────────────────── │─────────┘
  name, section                                    │
  class_teacher_id (FK → employees)               │
                                                    │
students ─────────────────────────────────────────┤
  id (PK)                                          │
  admission_number (UNIQUE)                        │
  class_id (FK) ────────────────────────────────── ┘
  first_name, last_name, dob, gender               │
  status                                            │
       │                                            │
       ├── student_parents (student_id FK)         │
       │     parent_type, mobile, user_id           │
       │                                            │
       ├── student_fee_accounts (student_id FK)     │
       │     academic_year_id, structure_id          │
       │     total, paid, balance (GENERATED)        │
       │          │                                  │
       │          └── fee_transactions (account FK)  │
       │                receipt_no, amount, method   │
       │                                             │
       └── student_attendance (student_id FK)       │
             session_id, status (P/A/L)             │
                    │                               │
             attendance_sessions ───────────────────┘
               class_id, date, taken_by



## 4.3 Frontend Module Architecture



### 4.3.1 Module Structure Pattern

src/modules/students/
├── pages/
│   ├── StudentListPage.tsx      ← DataTable with filters
│   ├── StudentDetailPage.tsx    ← Profile with tabs
│   ├── StudentFormPage.tsx      ← Create / Edit
│   └── StudentImportPage.tsx    ← Bulk import wizard
├── components/
│   ├── StudentCard.tsx
│   ├── StudentFilters.tsx       ← Class, section, status filters
│   ├── StudentTable.tsx         ← Column definitions
│   ├── StudentForm.tsx          ← Multi-step form
│   └── AttendanceBadge.tsx
├── hooks/
│   ├── useStudents.ts           ← TanStack Query list
│   ├── useStudent.ts            ← TanStack Query single
│   ├── useCreateStudent.ts      ← useMutation
│   └── useStudentImport.ts
├── api/
│   └── studentApi.ts            ← Axios calls
└── types.ts                     ← TypeScript interfaces



### 4.3.2 State Management Flow

User Action
    │
    ▼
React Component
    │  reads from:
    ├── TanStack Query (server state: students, fees, attendance)
    │      └── cached, background-refetch, optimistic updates
    └── Zustand Store (UI state: sidebar open, selected class, modal state)

On Mutation:
    useMutation(studentApi.create)
        onSuccess: queryClient.invalidateQueries(['students'])
                   → TanStack auto-refetches
                   → toast.success('Student created')
        onError:   toast.error(error.message)



## 4.4 CMS Builder — Component Architecture

CMSEditorPage
├── CMSEditorLayout
│   ├── LeftPanel
│   │   ├── PageList (pages from API)
│   │   └── SectionList (dnd-kit SortableContext)
│   │       └── SectionItem[] (draggable, visibility toggle)
│   │
│   ├── CenterPreview
│   │   └── <iframe src='/preview/{page_id}' /> (live preview)
│   │
│   └── RightPanel
│       └── ContentEditorRouter
│           ├── <HeroEditor />           (section.type === 'hero')
│           ├── <StatsEditor />           (section.type === 'stats')
│           ├── <GalleryEditor />         (section.type === 'gallery')
│           ├── <TestimonialsEditor />    (section.type === 'testimonials')
│           ├── <FacultyEditor />         (section.type === 'faculty')
│           └── <ContactEditor />         (section.type === 'contact')

State management for CMS:
  useCMSStore (Zustand):
    selectedPageId: string | null
    selectedSectionId: string | null
    isDirty: boolean
    sections: Section[]
    updateSection: (id, content) => void  ← optimistic update
    reorderSections: (from, to) => void
    → debounced auto-save → PATCH /api/v1/cms/pages/{id}




# 5. Product Roadmap & Phase Plan


Each phase is designed to be independently deployable and revenue-generating. The goal is to have a paying customer by end of Phase 1.



## Phase 1 — Core ERP Foundation (Month 1–4)

TARGET: Minimum viable school management system. Enough to replace Excel + WhatsApp for a school.




## Phase 2 — CMS + Website Builder + Mobile (Month 5–8)

TARGET: Every school on Skolr gets a world-class public website. This becomes the #1 sales differentiator.



## Phase 3 — Intelligence + Integrations (Month 9–14)

TARGET: Make Skolr sticky with data-driven insights and deep ecosystem integrations.



## Phase 4 — LMS + Advanced Analytics (Month 15–20)




# 6. Pricing Architecture & Go-To-Market



## 6.1 SaaS Pricing Tiers


📌 Feature flags in the database control which modules each plan can access. The Price Management module (admin UI) allows toggling per-tenant.



## 6.2 Go-To-Market Strategy


### Beachhead: Tier 2 CBSE Schools in Maharashtra, Gujarat, Karnataka

Target: English/semi-English medium, 500–2000 students, ₹1000–₹3000/month fees

Channels: Direct sales (inside sales team), school association tie-ups, edtech events

Pilot program: 3-month free pilot for first 10 schools; data collected for case studies

Distribution: Partner with school software resellers in Tier 2 cities

Referral: 20% commission for schools that refer another school



## 6.3 Onboarding SLA




# 7. Risks, Assumptions & Open Items



## 7.1 Technical Risks



## 7.2 Business Risks



## 7.3 Assumptions

Schools have at least one person comfortable with a web browser

Schools have a stable internet connection (4G minimum) for admin operations

Meta Business API approval obtained before Phase 1 launch

Razorpay account registered with Indian business entity

AWS credits or initial runway of ₹15–20L available for infra and team



## 7.4 Open Items (Decision Required)




# 8. References & Appendix


Supporting files included in the Skolr documentation package:

CLAUDE.md — AI coding agent reference document

SKILL-backend.md — FastAPI + Python backend patterns

SKILL-frontend.md — React + TypeScript frontend patterns

SKILL-database.md — PostgreSQL schema and ORM patterns

SKILL-cms.md — CMS website builder architecture

SKILL-testing.md — Testing strategy and patterns


Tech documentation links:

FastAPI: https://fastapi.tiangolo.com/

SQLAlchemy 2.0: https://docs.sqlalchemy.org/en/20/

TanStack Query v5: https://tanstack.com/query/latest

shadcn/ui: https://ui.shadcn.com/

dnd-kit: https://dndkit.com/

Razorpay API: https://razorpay.com/docs/

Meta WhatsApp Business API: https://developers.facebook.com/docs/whatsapp/

WeasyPrint: https://doc.courtbouillon.org/weasyprint/



# Document Tables

### Table 1

| Document | Value |
| Version | 1.0.0 |
| Status | Draft for Review |
| Date | June 2026 |
| Author | Product & Engineering Team |
| Target Market | Indian Schools — Tier 1, 2, 3 |
| Tech Stack | Python + FastAPI + PostgreSQL + React + TypeScript |

### Table 2

| Term | Definition |
| Tenant | A single school organization using Skolr |
| Academic Year | The school's operating year, e.g., 2025–26 |
| Class | A named grade, e.g., Class 5, with one or more sections |
| Super Admin | Skolr platform administrator |
| School Admin | Principal or designated admin of a school |
| CMS | Content Management System — manages the school's public website |
| ERP | Enterprise Resource Planning — manages internal school operations |
| Feature Flag | A switch to enable/disable a module per tenant/plan |

### Table 3

| Stakeholder | Role | Primary Concern |
| School Owner / Trustee | Decision maker, budget holder | ROI, brand visibility, compliance |
| Principal | Day-to-day school operations | Attendance, academics, staff management |
| Accountant / Finance | Fee collection and reconciliation | Fee reports, payment tracking |
| Teacher | Class management, teaching | Timetable, attendance, homework |
| Parent | Child's academic journey | Attendance alerts, fee status, communication |
| Student (Phase 2) | Portal access | Timetable, homework, results |
| Skolr Super Admin | Platform administration | Tenant management, billing, uptime |

### Table 4

| Category | Requirement |
| Performance | API response time < 300ms for 95th percentile under normal load |
| Performance | Dashboard page load < 2 seconds on 10Mbps connection |
| Scalability | Support 500 concurrent users per tenant without degradation |
| Availability | 99.5% uptime SLA (allows ~43 hours downtime/year) |
| Security | All data encrypted in transit (TLS 1.3) and at rest (AES-256) |
| Security | OWASP Top 10 vulnerabilities addressed |
| Security | Role-based access enforced at API layer, not just UI |
| Data Privacy | Compliant with India IT Act 2000 and upcoming DPDP Act 2023 |
| Compliance | School data must remain on Indian AWS region (ap-south-1) |
| Backup | Daily automated backups, 30-day retention, tested monthly |
| Mobile | Admin panel responsive for tablet (768px+); full mobile for parent views |
| Localization | English UI primary; Hindi and regional language support in Phase 3 |
| Accessibility | WCAG 2.1 AA compliance for public-facing school websites |
| Browser Support | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |

### Table 5

| Feature ID | User Story | Acceptance Criteria |
| STU-001 | As a school admin, I want to register a new student so that they are enrolled in the system | Given valid student data, when submitted, then admission number is auto-generated and student appears in the class list |
| STU-002 | As a school admin, I want to bulk import students via Excel so that I can migrate from an old system | Given a valid Excel file matching the template, when imported, then students are created with validation errors reported per row |
| STU-003 | As a school admin, I want to transfer a student to another class mid-year so that records are updated | Given a transfer request, when approved, then student appears in new class, old class history preserved |
| STU-004 | As a teacher, I want to view my class student list with photos so that I can identify students | Given teacher login, when viewing class, then list shows name, photo, roll number, parent mobile |
| STU-005 | As a school admin, I want to generate a TC (Transfer Certificate) so that a leaving student gets official documents | Given student ID, when TC requested, then PDF generated with school letterhead and all mandatory fields |

### Table 6

| Feature ID | User Story | Acceptance Criteria |
| FEE-001 | As an accountant, I want to record a fee payment so that the student's account is updated | Given payment details, when saved, system generates unique receipt number, updates balance, sends WhatsApp receipt to parent |
| FEE-002 | As an accountant, I want to see all students with outstanding fees so that I can follow up | Given defaulter filter, when applied, list shows student, class, total due, overdue days, last payment date |
| FEE-003 | As a school admin, I want to generate a Razorpay payment link for a student so that they can pay online | Given student fee account, when link generated, unique Razorpay link created and sent to parent via WhatsApp |
| FEE-004 | As an accountant, I want to apply a sibling discount so that the second child gets 10% off tuition | Given two siblings in system, when discount applied, fee account updated and audit log records approver |
| FEE-005 | As a school admin, I want a monthly fee collection report so that I can present to management | Given month and year, when report generated, shows total collected, by payment method, by class, and outstanding |

### Table 7

| Method | Endpoint | Description | Auth |
| POST | /api/v1/auth/login | Email/password login, returns JWT | Public |
| POST | /api/v1/auth/refresh | Refresh access token using cookie | Refresh token |
| POST | /api/v1/auth/logout | Invalidate refresh token | Bearer |
| GET | /api/v1/auth/me | Get current user profile | Bearer |
| POST | /api/v1/auth/change-password | Change password (requires current) | Bearer |

### Table 8

| Method | Endpoint | Description | Role |
| GET | /api/v1/students/ | List students with filters & pagination | admin, teacher |
| POST | /api/v1/students/ | Create new student | admin |
| GET | /api/v1/students/{id} | Get student full profile | admin, teacher |
| PUT | /api/v1/students/{id} | Update student details | admin |
| DELETE | /api/v1/students/{id} | Soft delete student | admin |
| POST | /api/v1/students/bulk-import | CSV/Excel bulk import | admin |
| GET | /api/v1/students/{id}/attendance | Student attendance history | admin, teacher, parent |
| GET | /api/v1/students/{id}/fees | Student fee account summary | admin, accountant, parent |
| POST | /api/v1/students/{id}/transfer | Transfer to different class | admin |
| POST | /api/v1/students/{id}/tc | Generate Transfer Certificate PDF | admin |

### Table 9

| Method | Endpoint | Description | Role |
| GET | /api/v1/fees/structures/ | List fee structures | admin, accountant |
| POST | /api/v1/fees/structures/ | Create fee structure | admin |
| GET | /api/v1/fees/accounts/ | List student fee accounts | admin, accountant |
| POST | /api/v1/fees/transactions/ | Record fee payment | admin, accountant |
| GET | /api/v1/fees/transactions/{id}/receipt | Download fee receipt PDF | admin, accountant, parent |
| GET | /api/v1/fees/defaulters/ | List students with outstanding dues | admin, accountant |
| POST | /api/v1/fees/payment-link/ | Generate Razorpay payment link | admin, accountant |
| GET | /api/v1/fees/reports/monthly | Monthly collection report | admin, accountant |

### Table 10

| Method | Endpoint | Description | Role |
| GET | /api/v1/attendance/sessions/ | List attendance sessions | admin, teacher |
| POST | /api/v1/attendance/sessions/ | Create new session + mark attendance | teacher |
| PUT | /api/v1/attendance/sessions/{id} | Edit session (within 2-hour window) | teacher |
| GET | /api/v1/attendance/summary/class/{class_id} | Class attendance summary for date range | admin, teacher |
| GET | /api/v1/attendance/summary/student/{student_id} | Student attendance summary | admin, teacher, parent |
| GET | /api/v1/attendance/reports/monthly | Monthly attendance report PDF | admin |

### Table 11

| Approach | Schema-Per-Tenant (chosen) |
| Isolation | Strong — each school's data in separate schema |
| Cost | Low — single PostgreSQL cluster |
| Migration | Alembic runs per-schema; per-tenant migration scripts |
| Backup | Per-schema or full cluster; point-in-time recovery |
| Performance | Connection pooling via PgBouncer; schema search_path per request |

### Table 12

| Layer | Choice | Why |
| API Framework | FastAPI | Native async, automatic OpenAPI docs, Pydantic v2 validation, fastest Python framework |
| Database | PostgreSQL 16 | Schema isolation for multi-tenancy, JSONB for CMS sections, full ACID, Indian cloud support |
| ORM | SQLAlchemy 2.0 async | Mature, battle-tested, async support, excellent Alembic integration |
| Cache/Queue | Redis 7 | Celery broker, API response cache, session store, rate limiting |
| Frontend | React 18 + TypeScript | Industry standard, strong ecosystem, concurrent features, strict typing |
| UI | shadcn/ui + Radix | Accessible, headless, highly customizable, no licensing cost |
| State | TanStack Query + Zustand | Separates server and UI state clearly, excellent DX |
| File Storage | AWS S3 | Scalable, cheap, CDN-ready, available in ap-south-1 |
| Notifications | Meta WhatsApp API | WhatsApp is the #1 communication channel for Indian parents |
| Payments | Razorpay | India-first, supports UPI/NEFT/cards, excellent API, used widely in EdTech |
| PDF | WeasyPrint | Python-native, CSS-based templates, excellent for reports and receipts |
| Email | AWS SES | Cheap, reliable, available in ap-south-1, high deliverability |

### Table 13

| Component | Service | Spec (Production) |
| API Servers | AWS EC2 (Auto Scaling Group) | c6i.xlarge, min 2, max 10 instances |
| Database | AWS RDS PostgreSQL | db.r6g.large, Multi-AZ, 500GB gp3 |
| Cache / Queue | AWS ElastiCache Redis | cache.r6g.large, cluster mode |
| File Storage | AWS S3 | ap-south-1 bucket, versioning enabled |
| CDN | AWS CloudFront | For static school websites and media |
| Load Balancer | AWS ALB | HTTPS, WAF enabled |
| Container | Docker + ECR | Images in ECR, deployed via ECS Fargate |
| Celery Workers | AWS ECS Fargate | Auto-scaled based on queue depth |
| Monitoring | AWS CloudWatch + Sentry | Metrics, logs, error tracking |
| CI/CD | GitHub Actions | Test → Build → Deploy pipeline |

### Table 14

| Module | Features Included | Priority |
| Auth & Roles | Login, JWT, RBAC (admin/teacher/parent/accountant), School setup wizard | P0 |
| Student Management | Admission, profile, documents, class assignment, bulk import, TC generation | P0 |
| Employee Management | Profile, designation, department, leave management, basic payroll | P0 |
| Attendance | Period/session marking, parent WhatsApp alert, monthly reports | P0 |
| Fees Management | Fee structure, collection, Razorpay integration, receipt PDF, defaulter report | P0 |
| Academics | Academic year, timetable, subjects, homework, syllabus tracker | P1 |
| Exam Management | Exam schedule, marks entry, report card PDF generation, rank/grade | P1 |
| Notifications | WhatsApp + email templates, event-triggered, manual broadcast | P1 |
| Admin Settings | School profile, user management, audit log, academic year rollover | P1 |
| Parent Portal | Web dashboard (responsive): attendance, fees, notices, homework | P1 |
| Dashboard | School admin overview: students count, today's attendance, fee collection, pending actions | P1 |

### Table 15

| Metric | Phase 1 Target |
| Time to Onboard a New School | < 7 days |
| Modules Delivered | 9 core modules |
| Pricing Target | ₹80,000–₹1,50,000/year per school |
| Paying Pilot Schools | 3–5 schools by month 4 |
| Team Needed | 2 backend + 2 frontend + 1 DevOps + 1 designer |

### Table 16

| Module | Features Included |
| CMS Website Builder | Template gallery (12 templates), page manager, section editor, color scheme, publish workflow |
| Media Library | Image upload, organize by album/tag, CDN delivery |
| Domain Management | Subdomain auto-provisioning, custom domain CNAME support, SSL auto-provisioned |
| Gallery Module | Event-based photo albums, tagging, parent shareable links |
| Testimonials | Admin adds testimonials, displayed on website automatically |
| Parent Mobile App | React Native app — attendance, fees, communication, push notifications |
| Admission CRM | Lead capture form on website → inquiry pipeline → admission funnel |
| Calendar (Public) | Academic events on website, auto-synced from ERP |
| Portfolio | Student digital portfolio — achievements, certificates, cumulative record |

### Table 17

| Module | Features Included |
| AI Insights Dashboard | Dropout risk prediction, fee defaulter patterns, attendance trend alerts, teacher performance |
| WhatsApp-First Communication | Two-way WhatsApp messaging, fee reminders, PTM booking, all via WhatsApp |
| Tally Integration | Auto-push fee transactions to Tally via REST connector |
| DigiLocker Integration | Student document verification, certificate issuance via DigiLocker API |
| CBSE Compliance Reports | Auto-generate affiliation renewal documents, student data reports for CBSE |
| Library Management | Barcode-based book issue/return, overdue tracking, catalog management |
| Canteen Management | Parent-loaded digital wallet, cashless canteen transactions |
| HR Statutory Compliance | PF, ESI, TDS calculation and report generation for teachers |
| Multi-Language UI | Hindi, Marathi, Tamil, Gujarati language support in admin and parent app |
| Alumni Management | Alumni registration, reunion management, career tracking |

### Table 18

| Module | Features Included |
| LMS (Light) | Recorded video lectures, study material library, online assignment submission, class discussion boards |
| Online Exam | MCQ-based online exams, auto-grading, anti-cheating measures, result analytics |
| PTM Scheduler | Slot booking, video call integration (Jitsi/Zoom), feedback collection |
| Transport Management | GPS tracking integration, route management, driver/bus assignment, parent live tracking |
| Advanced Analytics | Multi-school comparison (for school chains), cohort analysis, 5-year trend reports |
| White Label / Franchise | School chains can manage 10–100 schools from a single super-admin panel |
| Marketplace | Third-party app integrations — edtech tools, assessments, counseling platforms |

### Table 19

| Plan | Target School | Price (Annual) | Key Features |
| Starter | < 300 students, Tier 3 | ₹60,000/year | Students, Attendance, Fees, Notifications |
| Growth | 300–1000 students, Tier 2 | ₹1,20,000/year | All Starter + Timetable, Exams, CMS Website, Parent App |
| Pro | 1000–3000 students, Tier 1 | ₹2,40,000/year | All Growth + Admission CRM, Analytics, Custom Domain, API Access |
| Enterprise | Chains / 3000+ | Custom | All Pro + White label, Multi-school, Tally, DigiLocker, SLA |

### Table 20

| Day | Activity |
| Day 1 | Account creation, school profile setup, first admin user |
| Day 2 | Student bulk import, class/section configuration |
| Day 3 | Fee structure setup, academic year configuration |
| Day 4 | Staff accounts, timetable setup, subject assignment |
| Day 5 | Training session (2 hours) with principal + accountant + 2 teachers |
| Day 6 | Parent onboarding: WhatsApp broadcast with parent login link |
| Day 7 | Go-live: all operations running on Skolr |

### Table 21

| Risk | Probability | Impact | Mitigation |
| WhatsApp API approval delay (Meta review takes 2–4 weeks) | High | High | Start Meta Business Verification on Day 1. Use SMS fallback in interim. |
| Razorpay onboarding requires registered entity | Medium | High | Register company early. Use Razorpay test mode during development. |
| Multi-schema migrations in production with 100+ tenants | Medium | Medium | Automate with Alembic + tenant migration script. Test on staging monthly. |
| School website CDN cost at scale | Low | Low | CloudFront pricing very cheap for static HTML. ₹500/month for 100 schools. |
| DPDP Act 2023 compliance requirements evolving | Medium | High | Engage legal counsel, build data consent flows, maintain processing records. |

### Table 22

| Risk | Mitigation |
| Low willingness to pay in Tier 3 schools | Don't target Tier 3 in Phase 1. Tier 2 beachhead first. |
| Existing ERP vendor lock-in | Build migration tools for Entab, Fedena, MySchoolPage imports |
| Long sales cycle (3–6 months for schools) | Free 3-month pilot with no credit card. Reduce friction. |
| Principal changes = churn risk | Ensure multiple school admin accounts. Train trustees, not just principals. |
| Low parent app adoption | Make parent onboarding WhatsApp-first (no app install required initially) |

### Table 23

| # | Item | Owner | Deadline |
| 1 | Company name and trademark filing for 'Skolr' | Founder | Week 1 |
| 2 | React Native vs Flutter for parent mobile app (Phase 2) | Tech Lead | Month 2 |
| 3 | Self-hosted MinIO vs AWS S3 for Starter plan (cost optimization) | Tech Lead | Month 1 |
| 4 | Choose SMS provider: Twilio vs MSG91 vs Exotel | Product | Month 1 |
| 5 | CBSE affiliation report template design (need sample from school) | Product | Month 2 |
| 6 | Tally integration approach: direct API vs middleman service | Tech Lead | Month 6 (Phase 3) |
| 7 | Legal review of school data processing under DPDP Act 2023 | Legal | Month 2 |
| 8 | Pricing: monthly billing option for smaller schools? | Founder | Month 1 |

