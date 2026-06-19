# SKILL: Database Design — Skolr Platform

> Reference this file for all PostgreSQL / SQLAlchemy schema work on Skolr.

---

## Multi-Tenant Schema Strategy

Each school gets its own PostgreSQL schema: `school_<uuid4_hex_short>`

```sql
-- Example schemas
public          → platform-level tables
school_abc123   → School A's data
school_def456   → School B's data
```

**Shared (public schema) tables:**
- `tenants` — school registration, plan, status
- `plans` — Starter, Growth, Enterprise
- `feature_flags` — per-tenant feature toggles
- `billing_records`
- `platform_admins`

**Per-tenant tables** (all others — created fresh per school on signup).

---

## Base Model (all tables)

```python
class SkolrBase(DeclarativeBase):
    pass

class TimestampMixin:
    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

---

## Core Schema Tables (Phase 1)

### Academic Structure
```sql
academic_years     (id, name, start_date, end_date, is_current)
classes            (id, name, section, academic_year_id, class_teacher_id)
subjects           (id, name, code, class_id)
```

### Student Domain
```sql
students (
  id UUID PK,
  admission_number VARCHAR(20) UNIQUE,
  first_name, last_name, middle_name VARCHAR,
  date_of_birth DATE,
  gender CHAR(1),  -- M/F/O
  blood_group VARCHAR(5),
  profile_photo_url TEXT,
  class_id UUID FK classes,
  roll_number SMALLINT,
  admission_date DATE,
  status VARCHAR(20) DEFAULT 'active',  -- active/inactive/transferred/alumni
  created_at, updated_at, deleted_at TIMESTAMPTZ
)

student_parents (
  id UUID PK,
  student_id UUID FK,
  parent_type VARCHAR(20),  -- father/mother/guardian
  first_name, last_name VARCHAR,
  mobile VARCHAR(15) UNIQUE,
  email VARCHAR(255),
  occupation VARCHAR(100),
  user_id UUID FK users  -- linked login account
)

student_documents (
  id UUID PK,
  student_id UUID FK,
  document_type VARCHAR(50),  -- birth_cert/aadhaar/tc/etc
  file_url TEXT,
  verified BOOLEAN DEFAULT false
)
```

### Staff / HR Domain
```sql
employees (
  id UUID PK,
  employee_code VARCHAR(20) UNIQUE,
  first_name, last_name VARCHAR,
  designation VARCHAR(100),
  department VARCHAR(100),
  date_of_joining DATE,
  employment_type VARCHAR(20),  -- permanent/contract/part_time
  mobile, email VARCHAR,
  salary_amount DECIMAL(10,2),
  salary_type VARCHAR(10),  -- monthly/hourly
  status VARCHAR(20) DEFAULT 'active',
  user_id UUID FK users
)

leave_applications (
  id UUID PK,
  employee_id UUID FK,
  leave_type VARCHAR(30),  -- sick/casual/earned/maternity
  from_date, to_date DATE,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',  -- pending/approved/rejected
  approved_by UUID FK employees,
  applied_at TIMESTAMPTZ
)
```

### Attendance Domain
```sql
attendance_sessions (
  id UUID PK,
  class_id UUID FK,
  subject_id UUID FK nullable,
  session_date DATE,
  session_type VARCHAR(20),  -- morning/afternoon/period
  taken_by UUID FK employees,
  taken_at TIMESTAMPTZ
)

student_attendance (
  id UUID PK,
  session_id UUID FK,
  student_id UUID FK,
  status CHAR(1),  -- P/A/L/H (present/absent/late/holiday)
  remarks TEXT
)

employee_attendance (
  id UUID PK,
  employee_id UUID FK,
  attendance_date DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status CHAR(1)
)
```

### Fees Domain
```sql
fee_structures (
  id UUID PK,
  academic_year_id UUID FK,
  class_id UUID FK nullable,  -- NULL = all classes
  name VARCHAR(100),
  description TEXT
)

fee_structure_items (
  id UUID PK,
  structure_id UUID FK,
  fee_head VARCHAR(100),   -- Tuition/Transport/Lab/etc
  amount DECIMAL(10,2),
  due_day SMALLINT,        -- day of month
  frequency VARCHAR(20)    -- monthly/quarterly/annual/one_time
)

student_fee_accounts (
  id UUID PK,
  student_id UUID FK,
  academic_year_id UUID FK,
  structure_id UUID FK,
  total_amount DECIMAL(10,2),
  paid_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  balance DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - paid_amount - discount_amount) STORED
)

fee_transactions (
  id UUID PK,
  student_id UUID FK,
  fee_account_id UUID FK,
  receipt_number VARCHAR(30) UNIQUE,
  amount DECIMAL(10,2),
  payment_method VARCHAR(20),  -- cash/upi/cheque/card/online
  payment_date DATE,
  transaction_ref VARCHAR(100),  -- UTR/cheque no
  collected_by UUID FK employees,
  status VARCHAR(20) DEFAULT 'completed',
  remarks TEXT
)

fee_discounts (
  id UUID PK,
  student_id UUID FK,
  discount_type VARCHAR(50),  -- sibling/merit/staff_ward/scholarship
  amount DECIMAL(10,2),
  percentage DECIMAL(5,2),
  approved_by UUID FK,
  valid_from, valid_to DATE
)
```

### Academics Domain
```sql
timetable_slots (
  id UUID PK,
  class_id UUID FK,
  day_of_week SMALLINT,  -- 0=Mon to 5=Sat
  period_number SMALLINT,
  start_time TIME,
  end_time TIME,
  subject_id UUID FK,
  teacher_id UUID FK employees
)

homework (
  id UUID PK,
  class_id UUID FK,
  subject_id UUID FK,
  assigned_by UUID FK employees,
  title VARCHAR(255),
  description TEXT,
  attachment_url TEXT,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'active'
)

homework_submissions (
  id UUID PK,
  homework_id UUID FK,
  student_id UUID FK,
  submission_url TEXT,
  submitted_at TIMESTAMPTZ,
  remarks TEXT,
  marks_obtained DECIMAL(5,2)
)
```

### CMS / Website Builder (Phase 2 but schema designed now)
```sql
cms_templates (
  id UUID PK,
  template_key VARCHAR(50) UNIQUE,  -- 'template-001-prestige'
  name VARCHAR(100),
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true
)

cms_sites (
  id UUID PK,
  -- (lives in tenant schema)
  template_id UUID FK cms_templates,
  subdomain VARCHAR(63) UNIQUE,
  custom_domain VARCHAR(255),
  is_published BOOLEAN DEFAULT false,
  last_published_at TIMESTAMPTZ,
  meta_title VARCHAR(255),
  meta_description TEXT,
  primary_color VARCHAR(7),
  accent_color VARCHAR(7)
)

cms_pages (
  id UUID PK,
  site_id UUID FK,
  slug VARCHAR(100),  -- 'home', 'about', 'admissions'
  title VARCHAR(255),
  is_homepage BOOLEAN DEFAULT false,
  sections JSONB,  -- ordered list of section configs
  seo_title VARCHAR(255),
  seo_description TEXT,
  status VARCHAR(20) DEFAULT 'draft'
)

cms_media (
  id UUID PK,
  site_id UUID FK,
  file_url TEXT,
  file_name VARCHAR(255),
  file_type VARCHAR(50),
  file_size INTEGER,
  uploaded_by UUID FK users
)
```

### Notifications
```sql
notification_templates (
  id UUID PK,
  trigger_event VARCHAR(100),  -- 'fee_due', 'attendance_absent', 'exam_result'
  channel VARCHAR(20),         -- whatsapp/sms/push/email
  template_body TEXT,
  is_active BOOLEAN DEFAULT true
)

notification_logs (
  id UUID PK,
  template_id UUID FK nullable,
  recipient_id UUID,
  recipient_type VARCHAR(20),  -- student/parent/employee
  channel VARCHAR(20),
  message TEXT,
  status VARCHAR(20),  -- sent/failed/pending
  sent_at TIMESTAMPTZ,
  error_message TEXT
)
```

---

## Indexes (Critical for Performance)

```sql
-- Students
CREATE INDEX idx_students_class ON students(class_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_admission ON students(admission_number);
CREATE INDEX idx_students_status ON students(status) WHERE deleted_at IS NULL;

-- Attendance
CREATE INDEX idx_attendance_date_class ON student_attendance(session_id);
CREATE INDEX idx_attendance_student ON student_attendance(student_id);

-- Fees
CREATE INDEX idx_fee_txn_student ON fee_transactions(student_id);
CREATE INDEX idx_fee_txn_date ON fee_transactions(payment_date);
CREATE INDEX idx_fee_account_balance ON student_fee_accounts(student_id, academic_year_id);
```

---

## Migration Commands
```bash
# Create migration
alembic revision --autogenerate -m "add_student_documents_table"

# Apply migrations
alembic upgrade head

# Per-tenant migration (run after new school signup)
python scripts/run_tenant_migrations.py --school-id <uuid>
```
