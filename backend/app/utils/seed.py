import asyncio
import logging
from datetime import date, datetime
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.core.config import settings
from app.core.database import SkolrBase
from app.core.security import get_password_hash
from app.models.public import Plan, Tenant, User
from app.models.tenant import (
    AcademicYear, Class, Employee, Student, StudentParent,
    FeeHead, FeeStructure, FeeStructureItem, StudentFeeAccount, FeeDiscount, FeeTransaction
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")

DEFAULT_SCHOOL_ID = "11111111-1111-1111-1111-111111111111"
DEFAULT_SCHEMA_NAME = f"school_{DEFAULT_SCHOOL_ID.replace('-', '_')}"

async def seed_database():
    logger.info("Connecting to database to run migrations and seed data...")
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    
    # 1. Create schemas
    async with engine.begin() as conn:
        logger.info(f"Creating schemas public and {DEFAULT_SCHEMA_NAME} if not exist...")
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS public"))
        await conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {DEFAULT_SCHEMA_NAME}"))
        
        logger.info("Setting search_path to create tables...")
        await conn.execute(text(f"SET search_path TO {DEFAULT_SCHEMA_NAME}, public"))
        
        # Create all tables (public and tenant specific)
        await conn.run_sync(SkolrBase.metadata.create_all)
        logger.info("Tables created successfully.")

    # 2. Insert Seed Data
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    async with AsyncSessionLocal() as session:
        # Set search path for session
        await session.execute(text(f"SET search_path TO {DEFAULT_SCHEMA_NAME}, public"))
        
        # Check if plans exist
        result = await session.execute(text("SELECT COUNT(*) FROM public.plans"))
        plan_count = result.scalar()
        
        plans = {}
        if plan_count == 0:
            logger.info("Seeding plans...")
            plan_specs = [
                {"name": "Starter", "code": "starter", "description": "Starter plan for Tier 3 schools", "features": {"max_students": 300, "modules": ["students", "attendance", "fees"]}},
                {"name": "Growth", "code": "growth", "description": "Growth plan for Tier 2 schools", "features": {"max_students": 1000, "modules": ["students", "attendance", "fees", "exams", "cms"]}},
                {"name": "Pro", "code": "pro", "description": "Pro plan for Tier 1 schools", "features": {"max_students": 3000, "modules": ["students", "attendance", "fees", "exams", "cms", "crm"]}},
            ]
            for spec in plan_specs:
                p = Plan(
                    name=spec["name"],
                    code=spec["code"],
                    description=spec["description"],
                    features=spec["features"],
                )
                session.add(p)
                plans[spec["code"]] = p
            await session.commit()
            for code, p in plans.items():
                await session.refresh(p)
        else:
            # Load existing plans
            from sqlalchemy import select
            db_plans = await session.execute(select(Plan))
            for p in db_plans.scalars():
                plans[p.code] = p

        # Check if default tenant exists
        result = await session.execute(text("SELECT COUNT(*) FROM public.tenants"))
        tenant_count = result.scalar()
        
        default_tenant = None
        if tenant_count == 0:
            logger.info(f"Seeding default tenant with ID {DEFAULT_SCHOOL_ID}...")
            default_tenant = Tenant(
                name="Prestige Public School",
                subdomain="default",
                custom_domain=None,
                status="active",
                plan_id=plans["pro"].id
            )
            default_tenant.id = UUID(DEFAULT_SCHOOL_ID)
            session.add(default_tenant)
            await session.commit()
            await session.refresh(default_tenant)
        
        # Check if default users exist
        admin_user = None
        teacher_user = None
        
        # We query for existing users to make seeding idempotent
        from sqlalchemy import select
        res_admin = await session.execute(select(User).where(User.email == "admin@default.skolr.in"))
        admin_user = res_admin.scalar_one_or_none()
        
        res_teacher = await session.execute(select(User).where(User.email == "teacher@default.skolr.in"))
        teacher_user = res_teacher.scalar_one_or_none()
        
        if not admin_user:
            logger.info("Seeding default admin user...")
            admin_user = User(
                email="admin@default.skolr.in",
                hashed_password=get_password_hash("admin123"),
                first_name="School",
                last_name="Admin",
                role="school_admin",
                school_id=UUID(DEFAULT_SCHOOL_ID),
                is_active=True
            )
            session.add(admin_user)
            await session.commit()
            await session.refresh(admin_user)

        if not teacher_user:
            logger.info("Seeding default teacher user...")
            teacher_user = User(
                email="teacher@default.skolr.in",
                hashed_password=get_password_hash("admin123"),
                first_name="Aditya",
                last_name="Sharma",
                role="teacher",
                school_id=UUID(DEFAULT_SCHOOL_ID),
                is_active=True
            )
            session.add(teacher_user)
            await session.commit()
            await session.refresh(teacher_user)

        # Seeding tenant structures inside school_school_default
        result = await session.execute(text(f"SELECT COUNT(*) FROM {DEFAULT_SCHEMA_NAME}.academic_years"))
        ay_count = result.scalar()
        
        if ay_count == 0:
            logger.info("Seeding default academic year...")
            ay = AcademicYear(
                name="2025-26",
                start_date=date(2025, 6, 1),
                end_date=date(2026, 4, 30),
                is_current=True
            )
            session.add(ay)
            await session.commit()
            await session.refresh(ay)
            
            logger.info("Seeding class...")
            cls = Class(
                name="Class 5",
                section="A",
                academic_year_id=ay.id
            )
            session.add(cls)
            await session.commit()
            await session.refresh(cls)
            
            logger.info("Seeding default employee (Principal)...")
            emp = Employee(
                employee_code="EMP001",
                first_name="School",
                last_name="Principal",
                designation="Principal",
                department="Administration",
                date_of_joining=date(2020, 4, 1),
                employment_type="permanent",
                mobile="9876543210",
                email="admin@default.skolr.in",
                status="active",
                user_id=admin_user.id if admin_user else None
            )
            session.add(emp)
            
            logger.info("Seeding default teacher employee...")
            teacher_emp = Employee(
                employee_code="EMP002",
                first_name="Aditya",
                last_name="Sharma",
                designation="Teacher",
                department="Academics",
                date_of_joining=date(2021, 6, 1),
                employment_type="permanent",
                mobile="9876543212",
                email="teacher@default.skolr.in",
                status="active",
                user_id=teacher_user.id if teacher_user else None
            )
            session.add(teacher_emp)
            await session.commit()
            await session.refresh(emp)
            await session.refresh(teacher_emp)

            # Link employee to class teacher
            cls.class_teacher_id = teacher_emp.id
            await session.commit()
            
            logger.info("Seeding student...")
            student = Student(
                admission_number="ADM2025001",
                first_name="Aarav",
                last_name="Patel",
                date_of_birth=date(2015, 8, 15),
                gender="M",
                roll_number=1,
                admission_date=date(2025, 6, 1),
                status="active",
                class_id=cls.id
            )
            session.add(student)
            await session.commit()
            await session.refresh(student)
            
            logger.info("Seeding parent...")
            parent = StudentParent(
                student_id=student.id,
                parent_type="father",
                first_name="Rajesh",
                last_name="Patel",
                mobile="9876543211",
                email="rajesh.patel@example.com",
                occupation="Business"
            )
            session.add(parent)
            await session.commit()

            logger.info("Seeding fee heads...")
            fh_tuition = FeeHead(name="Tuition Fee", description="Standard monthly academic instruction fee")
            fh_transport = FeeHead(name="Transport Fee", description="Bus transportation charges")
            session.add_all([fh_tuition, fh_transport])
            await session.commit()
            await session.refresh(fh_tuition)
            await session.refresh(fh_transport)

            logger.info("Seeding fee structure...")
            structure = FeeStructure(name="Class 5 Standard Group", academic_year_id=ay.id)
            session.add(structure)
            await session.commit()
            await session.refresh(structure)

            logger.info("Seeding fee structure items...")
            item1 = FeeStructureItem(fee_structure_id=structure.id, fee_head_id=fh_tuition.id, amount=12000.0, frequency="yearly")
            item2 = FeeStructureItem(fee_structure_id=structure.id, fee_head_id=fh_transport.id, amount=3000.0, frequency="yearly")
            session.add_all([item1, item2])
            await session.commit()

            logger.info("Seeding student fee account...")
            fee_account = StudentFeeAccount(
                student_id=student.id,
                fee_structure_id=structure.id,
                total_applicable=15000.0,
                total_paid=3000.0,
                total_discount=0.0
            )
            session.add(fee_account)
            await session.commit()

            logger.info("Seeding fee transaction...")
            txn = FeeTransaction(
                student_id=student.id,
                receipt_number="REC-2025-0001",
                amount_paid=3000.0,
                payment_mode="upi",
                payment_date=date(2025, 6, 2),
                transaction_reference="UPI9876543210",
                remarks="First installment paid"
            )
            session.add(txn)
            await session.commit()

        logger.info("Database seeding completed successfully.")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_database())
