import asyncio
import os
import sys
import pytest
from datetime import date
from sqlalchemy import select, text

# Add backend directory to python path
sys.path.append("/Users/amod/Documents/Products/Skolr/backend")

from app.core.database import AsyncSessionLocal
from app.models.tenant import Student, StudentParent, Class, AcademicYear
from app.models.public import Tenant, User
from app.services.student import StudentService
from app.repositories.student import StudentRepository
from app.schemas.student import StudentCreate, ParentCreate
from app.routers.parent import get_linked_students, verify_parent_child_link

@pytest.mark.asyncio
async def test_parent_portal_flow():
    print("Starting Parent Portal & Sibling Sync Integration Test...")
    async with AsyncSessionLocal() as db:
        # 1. Resolve first tenant
        result = await db.execute(select(Tenant).limit(1))
        tenant = result.scalar_one_or_none()
        if not tenant:
            print("No tenants found in database. Exiting.")
            return
            
        tenant_id = tenant.id
        print(f"Using Tenant: {tenant.name} ({tenant_id})")
        
        # Set tenant schema search path
        from app.core.database import sanitize_schema_name
        schema_name = sanitize_schema_name(str(tenant_id))
        await db.execute(text(f"SET search_path TO {schema_name}, public"))
        
        # 2. Retrieve or create class for admission
        class_res = await db.execute(select(Class).limit(1))
        cls = class_res.scalar_one_or_none()
        if not cls:
            print("Creating dummy class for testing...")
            # Retrieve or create AcademicYear
            ay_res = await db.execute(select(AcademicYear).limit(1))
            ay = ay_res.scalar_one_or_none()
            if not ay:
                ay = AcademicYear(name="2025-2026", start_date=date(2025, 4, 1), end_date=date(2026, 3, 31), is_active=True)
                db.add(ay)
                await db.flush()
            cls = Class(name="Grade 5", section="A", academic_year_id=ay.id)
            db.add(cls)
            await db.flush()
        
        print(f"Using Class: {cls.name} - {cls.section} (ID: {cls.id})")
        
        # Clean up existing test parent user if any
        parent_email = "test.father.sharma@example.com"
        user_res = await db.execute(select(User).where(User.email == parent_email))
        existing_user = user_res.scalar_one_or_none()
        if existing_user:
            print(f"Found existing test user {parent_email}. Deleting link and user for clean test run.")
            # Find and delete student parents links
            await db.execute(
                text(f"DELETE FROM {schema_name}.student_parents WHERE email = :email"),
                {"email": parent_email}
            )
            await db.delete(existing_user)
            await db.commit()

        # 3. Provision Sibling 1 (Amit Sharma)
        print("\n--- Admitting Sibling 1 (Amit Sharma) ---")
        student_repo = StudentRepository(db)
        student_service = StudentService(student_repo)
        
        sibling1_create = StudentCreate(
            first_name="Amit",
            last_name="Sharma",
            date_of_birth=date(2015, 5, 10),
            gender="M",
            roll_number=10,
            admission_date=date(2025, 4, 1),
            class_id=cls.id,
            parents=[
                ParentCreate(
                    parent_type="father",
                    first_name="Rohan",
                    last_name="Sharma",
                    mobile="9876543210",
                    email=parent_email,
                    occupation="Engineer"
                )
            ]
        )
        
        student1 = await student_service.admit_student(sibling1_create, school_id=tenant_id)
        await db.commit()
        print(f"Admitted Student 1: {student1.first_name} {student1.last_name} with Admission No: {student1.admission_number}")
        
        # Verify parent user was created
        user_res = await db.execute(select(User).where(User.email == parent_email))
        parent_user = user_res.scalar_one_or_none()
        assert parent_user is not None, "Parent user was not provisioned in public.users"
        assert parent_user.role == "parent", "Parent user role must be 'parent'"
        print(f"Verified Parent User created: {parent_user.email} (ID: {parent_user.id})")
        
        # 4. Provision Sibling 2 (Anjali Sharma)
        print("\n--- Admitting Sibling 2 (Anjali Sharma) ---")
        sibling2_create = StudentCreate(
            first_name="Anjali",
            last_name="Sharma",
            date_of_birth=date(2017, 8, 15),
            gender="F",
            roll_number=11,
            admission_date=date(2025, 4, 1),
            class_id=cls.id,
            parents=[
                ParentCreate(
                    parent_type="father",
                    first_name="Rohan",
                    last_name="Sharma",
                    mobile="9876543210",
                    email=parent_email,
                    occupation="Engineer"
                )
            ]
        )
        
        student2 = await student_service.admit_student(sibling2_create, school_id=tenant_id)
        await db.commit()
        print(f"Admitted Student 2: {student2.first_name} {student2.last_name} with Admission No: {student2.admission_number}")
        
        # Verify parent user was re-used (not duplicated)
        user_res_all = await db.execute(select(User).where(User.email == parent_email))
        all_parent_users = user_res_all.scalars().all()
        assert len(all_parent_users) == 1, "Duplicate parent user accounts provisioned"
        
        # Verify both student profiles are linked to the same parent User ID
        p1_res = await db.execute(select(StudentParent).where(StudentParent.student_id == student1.id))
        p1 = p1_res.scalar_one()
        p2_res = await db.execute(select(StudentParent).where(StudentParent.student_id == student2.id))
        p2 = p2_res.scalar_one()
        assert p1.user_id == parent_user.id, "Student 1 not linked to correct parent user"
        assert p2.user_id == parent_user.id, "Student 2 not linked to correct parent user"
        print("Verified both sibling student profiles correctly mapped to a single parent account!")
        
        # 5. Test Router Logic for Linked Students
        print("\n--- Simulating Router Endpoint: GET /parent/students ---")
        linked_res = await get_linked_students(db=db, current_user=parent_user)
        assert linked_res["success"] is True
        assert len(linked_res["data"]) >= 2
        siblings_returned = [s["first_name"] for s in linked_res["data"]]
        print(f"Linked students returned: {siblings_returned}")
        assert "Amit" in siblings_returned
        assert "Anjali" in siblings_returned
        print("Verified sibling list retrieval matches.")

        # 6. Test Security Boundaries
        print("\n--- Testing Security Access Controls ---")
        # Allowed access to siblings
        verify_s1 = await verify_parent_child_link(student1.id, parent_user.id, db)
        assert verify_s1.id == student1.id
        print(f"Access granted for parent to Student 1: Amit Sharma (Verified)")

        # Create another student with a different parent email to verify isolation
        other_student_create = StudentCreate(
            first_name="Rahul",
            last_name="Verma",
            date_of_birth=date(2016, 2, 20),
            gender="M",
            roll_number=12,
            admission_date=date(2025, 4, 1),
            class_id=cls.id,
            parents=[
                ParentCreate(
                    parent_type="mother",
                    first_name="Sunita",
                    last_name="Verma",
                    mobile="9876543211",
                    email="other.mother@example.com",
                    occupation="Doctor"
                )
            ]
        )
        other_student = await student_service.admit_student(other_student_create, school_id=tenant_id)
        await db.commit()
        
        # Attempt to access non-sibling profile
        from fastapi import HTTPException
        try:
            await verify_parent_child_link(other_student.id, parent_user.id, db)
            assert False, "Security vulnerability: parent was able to access a non-sibling profile!"
        except HTTPException as e:
            assert e.status_code == 403
            print(f"Access correctly denied for parent to non-sibling Student ID {other_student.id}: {e.detail}")

        # Clean up test admissions
        print("\nCleaning up test databases records...")
        await db.execute(
            text(f"DELETE FROM {schema_name}.student_parents WHERE email IN (:email1, :email2)"),
            {"email1": parent_email, "email2": "other.mother@example.com"}
        )
        # Delete student records
        await db.execute(
            text(f"DELETE FROM {schema_name}.students WHERE id IN (:id1, :id2, :id3)"),
            {"id1": student1.id, "id2": student2.id, "id3": other_student.id}
        )
        # Delete other mother user
        await db.execute(
            text("DELETE FROM public.users WHERE email IN (:email1, :email2)"),
            {"email1": parent_email, "email2": "other.mother@example.com"}
        )
        await db.commit()
        print("Test database clean. Integration tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_parent_portal_flow())
