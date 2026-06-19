# SKILL: Backend Development — Skolr Platform

> Reference this file for all backend Python/FastAPI work on Skolr.

---

## Stack
- **Python 3.12+** with FastAPI 0.111+
- **PostgreSQL 16** via asyncpg + SQLAlchemy 2.0 (async)
- **Alembic** for migrations
- **Redis 7** for caching and Celery broker
- **Celery 5** for background tasks
- **Pydantic v2** for schemas
- **WeasyPrint** for PDF generation
- **Pytest + HTTPX** for testing

---

## Project Layout (backend/)

```
app/
├── main.py
├── core/
│   ├── config.py          # pydantic-settings BaseSettings
│   ├── database.py        # async engine, session factory
│   ├── redis.py           # aioredis client
│   ├── security.py        # JWT, bcrypt
│   └── middleware.py      # tenant resolver, logging
├── models/                # SQLAlchemy ORM
├── schemas/               # Pydantic v2 schemas
├── routers/               # FastAPI APIRouter
├── services/              # Business logic
├── repositories/          # DB access layer
├── tasks/                 # Celery tasks
└── utils/
```

---

## Standard Patterns

### Config (core/config.py)
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15

    class Config:
        env_file = ".env"

settings = Settings()
```

### Database Session (dependency)
```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_size=20)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
```

### Tenant Middleware Pattern
```python
@app.middleware("http")
async def tenant_middleware(request: Request, call_next):
    school_id = request.headers.get("X-School-ID")
    if school_id:
        # Set PostgreSQL search_path to school's schema
        async with get_db_connection() as conn:
            await conn.execute(f"SET search_path TO school_{school_id}, public")
    response = await call_next(request)
    return response
```

### Repository Pattern
```python
class StudentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, student_id: UUID) -> Student | None:
        result = await self.db.execute(
            select(Student).where(Student.id == student_id, Student.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def list_paginated(self, filters: StudentFilter, page: int, per_page: int):
        query = select(Student).where(Student.deleted_at.is_(None))
        if filters.class_id:
            query = query.where(Student.class_id == filters.class_id)
        count = await self.db.scalar(select(func.count()).select_from(query.subquery()))
        result = await self.db.execute(query.offset((page-1)*per_page).limit(per_page))
        return result.scalars().all(), count
```

### Service Pattern
```python
class StudentService:
    def __init__(self, repo: StudentRepository):
        self.repo = repo

    async def create_student(self, data: StudentCreate) -> Student:
        # Business logic here (e.g., auto-generate admission number)
        admission_no = await self._generate_admission_number()
        student = Student(**data.model_dump(), admission_number=admission_no)
        return await self.repo.create(student)
```

### Router Pattern
```python
router = APIRouter(prefix="/students", tags=["Students"])

@router.get("/", response_model=PaginatedResponse[StudentSchema])
async def list_students(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    class_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = StudentRepository(db)
    service = StudentService(repo)
    students, total = await service.list(filters, page, per_page)
    return paginated_response(students, total, page, per_page)
```

---

## Response Helpers

```python
def success_response(data, message="OK"):
    return {"success": True, "data": data, "message": message}

def paginated_response(items, total, page, per_page):
    return {
        "success": True,
        "data": items,
        "pagination": {"page": page, "per_page": per_page, "total": total, "pages": ceil(total/per_page)}
    }

def error_response(code: str, message: str, status_code: int = 400):
    raise HTTPException(status_code=status_code, detail={"code": code, "message": message})
```

---

## Celery Task Pattern
```python
from celery import shared_task

@shared_task(bind=True, max_retries=3)
def send_whatsapp_notification(self, phone: str, message: str, template_name: str):
    try:
        whatsapp_client.send(phone, message, template_name)
    except Exception as exc:
        self.retry(exc=exc, countdown=60)
```

---

## PDF Generation (WeasyPrint)
```python
from weasyprint import HTML
import tempfile

def generate_fee_receipt(data: dict) -> bytes:
    html_content = render_template("fee_receipt.html", **data)
    pdf_bytes = HTML(string=html_content).write_pdf()
    return pdf_bytes
```

---

## Testing
```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_create_student():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        client.headers["X-School-ID"] = "test-school-uuid"
        response = await client.post("/api/v1/students/", json={...})
        assert response.status_code == 201
```

---

## Common Mistakes to Avoid
- Never use `session.execute(text("..."))` — always use ORM
- Never forget `deleted_at.is_(None)` filter on all queries
- Never use synchronous SQLAlchemy in async context
- Always validate file uploads (type, size) before storing
- Always hash passwords with `passlib[bcrypt]`, never plain or md5
- Always use `UUID` for IDs in API responses, never expose integer PKs
