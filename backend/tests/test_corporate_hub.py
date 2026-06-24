# Phase: 3
import sys
import os
import uuid
import pytest
from datetime import date, datetime, timezone
from sqlalchemy import select, text
from httpx import AsyncClient, ASGITransport


# Add backend to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import AsyncSessionLocal, sanitize_schema_name, SkolrBase
from app.core.security import create_access_token
from app.models.public import Plan, Tenant, User, CorporateAnalytics
from app.models.tenant import Student, Employee, FeeTransaction, AcademicYear, Class


@pytest.mark.asyncio
async def test_corporate_hub_security_and_sync():
    print("\nStarting Corporate Hub Multi-Tenant Security & Sync Integration Test...")
    
    async with AsyncSessionLocal() as db:
        # 1. Clean up existing records in public schema to avoid primary key/unique clashes
        await db.execute(text("SET search_path TO public"))
        await db.execute(text("TRUNCATE TABLE public.corporate_analytics CASCADE"))
        await db.execute(text("DELETE FROM public.users WHERE email IN ('director@dav.com', 'director@dps.com', 'principal@patna.com', 'super@skolr.com')"))
        await db.execute(text("DELETE FROM public.tenants WHERE subdomain IN ('patna-dav', 'nalanda-dav', 'buxar-dps')"))
        await db.commit()

        # 2. Setup plans and tenants
        # Check or create default Pro plan
        plan_res = await db.execute(select(Plan).where(Plan.code == "pro"))
        plan = plan_res.scalar_one_or_none()
        if not plan:
            plan = Plan(name="Pro Tier", code="pro", description="Enterprise pro plan", features={})
            db.add(plan)
            await db.flush()

        tenant_a1 = Tenant(id=uuid.uuid4(), name="Patna DAV", subdomain="patna-dav", chain_id="dav_chain", plan_id=plan.id)
        tenant_a2 = Tenant(id=uuid.uuid4(), name="Nalanda DAV", subdomain="nalanda-dav", chain_id="dav_chain", plan_id=plan.id)
        tenant_b1 = Tenant(id=uuid.uuid4(), name="Buxar DPS", subdomain="buxar-dps", chain_id="dps_chain", plan_id=plan.id)
        
        db.add_all([tenant_a1, tenant_a2, tenant_b1])
        await db.flush()

        # 3. Create Users
        user_chain_a = User(
            email="director@dav.com",
            hashed_password="mocked_password",
            first_name="DAV",
            last_name="Director",
            role="chain_admin",
            chain_id="dav_chain",
            is_active=True
        )
        user_chain_b = User(
            email="director@dps.com",
            hashed_password="mocked_password",
            first_name="DPS",
            last_name="Director",
            role="chain_admin",
            chain_id="dps_chain",
            is_active=True
        )
        user_school = User(
            email="principal@patna.com",
            hashed_password="mocked_password",
            first_name="Patna",
            last_name="Principal",
            role="school_admin",
            school_id=tenant_a1.id,
            is_active=True
        )
        user_super = User(
            email="super@skolr.com",
            hashed_password="mocked_password",
            first_name="Platform",
            last_name="Super",
            role="super_admin",
            is_active=True
        )

        db.add_all([user_chain_a, user_chain_b, user_school, user_super])
        await db.commit()

        # 4. Generate database schemas and populate dummy branch statistics
        # We will loop and seed Class, Students, Teachers, and Revenue inside each tenant's schema
        for tenant in [tenant_a1, tenant_a2, tenant_b1]:
            schema_name = sanitize_schema_name(str(tenant.id))
            await db.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema_name}"))
            
            # Ensure schema exists and tables are created
            conn = await db.connection()
            await conn.execute(text(f"SET search_path TO {schema_name}, public"))
            await conn.run_sync(SkolrBase.metadata.create_all)
            
            # Direct the session's current transaction context to the tenant schema
            await db.execute(text(f"SET search_path TO {schema_name}, public"))
            
            # Initial Academic Year
            ay = AcademicYear(name="2025-26", start_date=date(2025, 6, 1), end_date=date(2026, 4, 30), is_current=True)
            db.add(ay)
            await db.flush()

            # Seed branches with unique metrics counts
            if tenant.subdomain == "patna-dav":
                students_count = 12
                teachers_count = 3
                revenue_amount = 50000.0
            elif tenant.subdomain == "nalanda-dav":
                students_count = 8
                teachers_count = 2
                revenue_amount = 30000.0
            else:  # buxar-dps
                students_count = 20
                teachers_count = 5
                revenue_amount = 90000.0

            # Seed Class
            cls = Class(name="Class 5", section="A", academic_year_id=ay.id)
            db.add(cls)
            await db.flush()

            # Seed Students
            first_student_id = None
            for i in range(students_count):
                student_id = uuid.uuid4()
                student = Student(
                    id=student_id,
                    admission_number=f"ADM-{tenant.subdomain}-{i}",
                    first_name=f"Student-{i}",
                    last_name="Test",
                    date_of_birth=date(2015, 8, 15),
                    gender="M",
                    admission_date=date(2025, 6, 1),
                    status="active",
                    class_id=cls.id
                )
                db.add(student)
                if i == 0:
                    first_student_id = student_id

            # Seed Employees (Teachers)
            for j in range(teachers_count):
                teacher = Employee(
                    employee_code=f"EMP-{tenant.subdomain}-{j}",
                    first_name=f"Teacher-{j}",
                    last_name="Test",
                    designation="Teacher",
                    department="Academics",
                    date_of_joining=date(2021, 6, 1),
                    employment_type="permanent",
                    mobile=f"90000000{j}",
                    email=f"teacher{j}@{tenant.subdomain}.com",
                    status="active"
                )
                db.add(teacher)

            # Seed Fee Transactions
            txn = FeeTransaction(
                student_id=first_student_id,  # Link to seeded student
                receipt_number=f"REC-{tenant.subdomain}",
                amount_paid=revenue_amount,
                payment_mode="upi",
                payment_date=date(2025, 6, 2)
            )
            db.add(txn)
            await db.commit()



    # Generate JWT authentication tokens
    token_chain_a = create_access_token({"sub": "director@dav.com"})
    token_chain_b = create_access_token({"sub": "director@dps.com"})
    token_school = create_access_token({"sub": "principal@patna.com"})
    token_super = create_access_token({"sub": "super@skolr.com"})

    # 5. Trigger on-demand sync via API using Chain A Admin (director@dav.com)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:

        # A. Trigger sync for Chain A
        sync_res = await client.post(
            "/api/v1/corporate/sync",
            headers={"Authorization": f"Bearer {token_chain_a}"}
        )
        assert sync_res.status_code == 200
        sync_data = sync_res.json()
        assert sync_data["success"] is True
        
        # Verify Patna DAV and Nalanda DAV are returned, but Buxar DPS is NOT
        branches = sync_data["data"]
        assert len(branches) == 2
        subdomains = [b["subdomain"] for b in branches]
        assert "patna-dav" in subdomains
        assert "nalanda-dav" in subdomains
        assert "buxar-dps" not in subdomains

        # B. Retrieve stats for Chain A and assert correct metrics counts
        stats_res = await client.get(
            "/api/v1/corporate/stats",
            headers={"Authorization": f"Bearer {token_chain_a}"}
        )
        assert stats_res.status_code == 200
        stats_data = stats_res.json()["data"]
        assert len(stats_data) == 2
        
        patna_stats = next(b for b in stats_data if b["subdomain"] == "patna-dav")
        assert patna_stats["student_count"] == 12
        assert patna_stats["teacher_count"] == 3
        assert patna_stats["total_revenue"] == 50000.0

        # C. Retrieve stats for Chain B (director@dps.com) and assert empty cached list (DPS stats not synced yet)
        stats_b_res = await client.get(
            "/api/v1/corporate/stats",
            headers={"Authorization": f"Bearer {token_chain_b}"}
        )
        assert stats_b_res.status_code == 200
        assert len(stats_b_res.json()["data"]) == 0

        # D. Trigger sync for Chain B and verify only Buxar DPS stats are compiled
        sync_b_res = await client.post(
            "/api/v1/corporate/sync",
            headers={"Authorization": f"Bearer {token_chain_b}"}
        )
        assert sync_b_res.status_code == 200
        branches_b = sync_b_res.json()["data"]
        assert len(branches_b) == 1
        assert branches_b[0]["subdomain"] == "buxar-dps"
        assert branches_b[0]["student_count"] == 20
        assert branches_b[0]["teacher_count"] == 5
        assert branches_b[0]["total_revenue"] == 90000.0

        # E. Verify that Chain A director still CANNOT see Chain B data
        stats_a_again = await client.get(
            "/api/v1/corporate/stats",
            headers={"Authorization": f"Bearer {token_chain_a}"}
        )
        assert len(stats_a_again.json()["data"]) == 2
        assert "buxar-dps" not in [b["subdomain"] for b in stats_a_again.json()["data"]]

        # F. Access using standard school_admin user and verify 403 Forbidden protection
        forbidden_res = await client.get(
            "/api/v1/corporate/stats",
            headers={"Authorization": f"Bearer {token_school}"}
        )
        assert forbidden_res.status_code == 403

        # G. Query stats using super_admin and assert they can see ALL branches across both chains (wildcard)
        super_res = await client.get(
            "/api/v1/corporate/stats",
            headers={"Authorization": f"Bearer {token_super}"}
        )
        assert super_res.status_code == 200
        all_branches = super_res.json()["data"]
        assert len(all_branches) == 3
        all_subdomains = [b["subdomain"] for b in all_branches]
        assert "patna-dav" in all_subdomains
        assert "nalanda-dav" in all_subdomains
        assert "buxar-dps" in all_subdomains

        # H. Verify AI Chat RAG queries return key error on empty settings API key
        chat_err_res = await client.post(
            "/api/v1/corporate/chat",
            json={"message": "Show total student count"},
            headers={"Authorization": f"Bearer {token_chain_a}"}
        )
        assert chat_err_res.status_code == 400
        assert chat_err_res.json()["detail"] == "GEMINI_API_KEY_MISSING"

    print("Corporate Hub Multi-Tenant Security & Sync Integration Tests passed successfully!\n")
