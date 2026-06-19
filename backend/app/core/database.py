import re
from typing import AsyncGenerator
from uuid import uuid4
from datetime import datetime
from sqlalchemy import DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, registry
from sqlalchemy.sql import func
from fastapi import Header, HTTPException

from app.core.config import settings

# Create engine and session local
engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_size=20)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# Naming convention for metadata constraints
class SkolrBase(DeclarativeBase):
    registry = registry()

class TimestampMixin:
    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

# Helper to sanitize school_id for schema name to prevent SQL injection
def sanitize_schema_name(school_id: str) -> str:
    # Allow alphanumeric and dashes (UUID standard)
    if not re.match(r"^[a-zA-Z0-9\-]+$", school_id):
        raise HTTPException(status_code=400, detail="Invalid school ID format")
    # Replace dashes with underscores for Postgres schema compatibility
    return f"school_{school_id.replace('-', '_')}"

async def get_db(x_school_id: str | None = Header(None, alias="X-School-ID")) -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        if x_school_id:
            schema_name = sanitize_schema_name(x_school_id)
            # Set search path to current tenant's schema and fall back to public
            await session.execute(text(f"SET search_path TO {schema_name}, public"))
        else:
            await session.execute(text("SET search_path TO public"))
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
