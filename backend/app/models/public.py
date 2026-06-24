from typing import Any
from datetime import datetime
from sqlalchemy import String, Boolean, Table, Column, ForeignKey, Integer, Float, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from uuid import UUID


from app.core.database import SkolrBase, TimestampMixin

class Plan(SkolrBase, TimestampMixin):
    __tablename__ = "plans"
    __table_args__ = {"schema": "public"}

    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False) # e.g. starter, growth, pro, enterprise
    description: Mapped[str | None] = mapped_column(String(255))
    features: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict) # JSON of enabled features
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class Tenant(SkolrBase, TimestampMixin):
    __tablename__ = "tenants"
    __table_args__ = {"schema": "public"}

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    subdomain: Mapped[str] = mapped_column(String(63), unique=True, nullable=False)
    custom_domain: Mapped[str | None] = mapped_column(String(255), unique=True)
    status: Mapped[str] = mapped_column(String(20), default="active") # active, suspended, inactive
    chain_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True) # group identifier (e.g. 'dav_group')
    
    plan_id: Mapped[str] = mapped_column(ForeignKey("public.plans.id"))
    plan = relationship("Plan")

class User(SkolrBase, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = {"schema": "public"}

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(30), nullable=False) # super_admin, school_admin, teacher, accountant, parent, chain_admin
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    chain_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True) # group identifier for corporate access
    
    school_id: Mapped[Any | None] = mapped_column(ForeignKey("public.tenants.id"), nullable=True)
    school = relationship("Tenant")

class CorporateAnalytics(SkolrBase, TimestampMixin):
    __tablename__ = "corporate_analytics"
    __table_args__ = {"schema": "public"}

    school_id: Mapped[UUID] = mapped_column(ForeignKey("public.tenants.id"), unique=True, nullable=False)
    school_name: Mapped[str] = mapped_column(String(100), nullable=False)
    subdomain: Mapped[str] = mapped_column(String(63), nullable=False)
    chain_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    student_count: Mapped[int] = mapped_column(Integer, default=0)
    teacher_count: Mapped[int] = mapped_column(Integer, default=0)
    total_revenue: Mapped[float] = mapped_column(Float, default=0.0)
    avg_attendance_rate: Mapped[float] = mapped_column(Float, default=100.0)
    last_synced: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    school = relationship("Tenant")

