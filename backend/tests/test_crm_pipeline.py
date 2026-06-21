import asyncio
import os
import sys
import pytest
from datetime import date, datetime
from uuid import UUID
from sqlalchemy import select, text

sys.path.append("/Users/amod/Documents/Products/Skolr/backend")

from app.core.database import AsyncSessionLocal
from app.models.tenant import CMSInquiry, Class, AcademicYear
from app.models.public import Tenant
from app.repositories.cms import CMSRepository
from app.services.cms import CMSService
from app.schemas.cms import CMSInquiryCreate

@pytest.mark.asyncio
async def test_crm_pipeline_flow():
    print("Starting CRM Pipeline & inquiry integration test...")
    async with AsyncSessionLocal() as db:
        repo = CMSRepository(db)
        service = CMSService(repo)
        
        # 1. Fetch first tenant
        result = await db.execute(select(Tenant).limit(1))
        tenant = result.scalar_one_or_none()
        if not tenant:
            print("No tenants found. Can't run test.")
            return
            
        tenant_id = tenant.id
        print(f"Testing CRM with Tenant: {tenant.name} ({tenant_id})")
        
        # Switch search path to tenant schema
        from app.core.database import sanitize_schema_name, SkolrBase
        schema_name = sanitize_schema_name(str(tenant_id))
        await db.execute(text(f"SET search_path TO {schema_name}, public"))
        
        # Ensure all tables exist in this schema
        conn = await db.connection()
        await conn.execute(text(f"SET search_path TO {schema_name}, public"))
        await conn.run_sync(SkolrBase.metadata.create_all)
        
        # 2. Get or create a Class for testing target_class_id
        class_result = await db.execute(select(Class).where(Class.deleted_at.is_(None)).limit(1))
        test_class = class_result.scalar_one_or_none()
        if not test_class:
            # Need an academic year first
            ay_result = await db.execute(select(AcademicYear).where(AcademicYear.deleted_at.is_(None)).limit(1))
            test_ay = ay_result.scalar_one_or_none()
            if not test_ay:
                test_ay = AcademicYear(name="2026-27", start_date=date(2026, 4, 1), end_date=date(2027, 3, 31), is_current=True)
                db.add(test_ay)
                await db.flush()
            test_class = Class(name="Class 1", section="A", academic_year_id=test_ay.id)
            db.add(test_class)
            await db.flush()

        test_class_id = test_class.id
        print(f"Using class ID for testing: {test_class_id}")
        
        # 3. Create a detailed Inquiry
        print("\n--- Creating Detailed Admissions Inquiry ---")
        inquiry_data = CMSInquiryCreate(
            name="John Doe",
            email="johndoe@example.com",
            message="Interested in admitting my child to Class 1",
            phone="+919876543211",
            student_name="Jimmy Doe",
            student_dob=date(2020, 5, 10),
            target_class_id=test_class_id
        )
        
        inquiry = await service.create_inquiry(inquiry_data)
        assert inquiry is not None
        assert inquiry.name == "John Doe"
        assert inquiry.phone == "+919876543211"
        assert inquiry.student_name == "Jimmy Doe"
        assert inquiry.target_class_id == test_class_id
        assert inquiry.status == "new"
        assert len(inquiry.follow_up_notes) == 0
        print(f"Inquiry created successfully. ID: {inquiry.id}")

        # 4. List Inquiries and check properties
        print("\n--- Listing Inquiries & checking fields ---")
        inquiries = await service.list_inquiries()
        assert len(inquiries) > 0
        found = next((i for i in inquiries if i.id == inquiry.id), None)
        assert found is not None
        assert found.student_name == "Jimmy Doe"
        assert found.target_class is not None
        assert found.target_class.id == test_class_id
        print("Verified inquiry appears in list with loaded target_class relationship.")

        # 5. Add a follow-up note
        print("\n--- Adding Follow-up Note ---")
        updated_inq = await service.add_follow_up_note(
            inquiry_id=inquiry.id,
            note_text="Called parent, visit scheduled for next Tuesday.",
            author="Admin Staff"
        )
        assert updated_inq is not None
        assert len(updated_inq.follow_up_notes) == 1
        assert updated_inq.follow_up_notes[0]["note"] == "Called parent, visit scheduled for next Tuesday."
        assert updated_inq.follow_up_notes[0]["author"] == "Admin Staff"
        print("Verified follow-up note added and stored in JSONB.")

        # 6. Update Status
        print("\n--- Updating Status to visit_scheduled ---")
        updated_inq = await service.update_inquiry_status(inquiry.id, "visit_scheduled")
        assert updated_inq is not None
        assert updated_inq.status == "visit_scheduled"
        print("Verified inquiry status transition to 'visit_scheduled'.")

        # 7. Convert Inquiry to ERP Admission
        print("\n--- Converting Lead to ERP Admission ---")
        prefill_data = await service.convert_inquiry_to_admission(inquiry.id)
        assert prefill_data is not None
        assert prefill_data["first_name"] == "Jimmy"
        assert prefill_data["last_name"] == "Doe"
        assert prefill_data["class_id"] == str(test_class_id)
        assert len(prefill_data["parents"]) == 1
        assert prefill_data["parents"][0]["first_name"] == "John"
        assert prefill_data["parents"][0]["last_name"] == "Doe"
        assert prefill_data["parents"][0]["mobile"] == "+919876543211"
        assert prefill_data["parents"][0]["email"] == "johndoe@example.com"
        
        # Verify status of inquiry is now admitted and a follow-up log is recorded
        db_inquiry_res = await db.execute(select(CMSInquiry).where(CMSInquiry.id == inquiry.id))
        db_inquiry = db_inquiry_res.scalar_one()
        assert db_inquiry.status == "admitted"
        assert len(db_inquiry.follow_up_notes) == 2
        assert "Converted lead" in db_inquiry.follow_up_notes[1]["note"]
        print("Verified convert-to-admission updates status to 'admitted' and returns pre-populated payload.")

        # Clean up
        db_inquiry.deleted_at = datetime.utcnow()
        await db.commit()
        print("Cleanup completed. Test CRM Pipeline passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_crm_pipeline_flow())
