from typing import Any
from sqlalchemy import String, Boolean, Table, Column, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB

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
    
    plan_id: Mapped[str] = mapped_column(ForeignKey("public.plans.id"))
    plan = relationship("Plan")

class User(SkolrBase, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = {"schema": "public"}

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(30), nullable=False) # super_admin, school_admin, teacher, accountant, parent
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    school_id: Mapped[Any | None] = mapped_column(ForeignKey("public.tenants.id"), nullable=True)
    school = relationship("Tenant")
