import asyncio
import os
import sys
import pytest
from datetime import date, datetime
from uuid import UUID
from unittest.mock import AsyncMock, patch
from sqlalchemy import select, text

# Add backend directory to python path
sys.path.append("/Users/amod/Documents/Products/Skolr/backend")

from app.core.database import AsyncSessionLocal
from app.models.tenant import Student, StudentParent, Class, AcademicYear, CMSSite
from app.models.public import Tenant, User
from app.services.student import StudentService
from app.repositories.student import StudentRepository
from app.services.fees import FeesService
from app.repositories.fees import FeesRepository
from app.services.attendance import AttendanceService
from app.repositories.attendance import AttendanceRepository
from app.schemas.student import StudentCreate, ParentCreate
from app.utils.whatsapp import whatsapp_client

@pytest.mark.asyncio
async def test_whatsapp_automations_flow():
    print("Starting WhatsApp Automations Integration Test...")
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
        from app.core.database import sanitize_schema_name, SkolrBase
        schema_name = sanitize_schema_name(str(tenant_id))
        await db.execute(text(f"SET search_path TO {schema_name}, public"))
        
        # Ensure all tables exist in this schema
        conn = await db.connection()
        await conn.execute(text(f"SET search_path TO {schema_name}, public"))
        await conn.run_sync(SkolrBase.metadata.create_all)
        
        # Retrieve or create class for admission
        class_res = await db.execute(select(Class).limit(1))
        cls = class_res.scalar_one_or_none()
        if not cls:
            ay_res = await db.execute(select(AcademicYear).limit(1))
            ay = ay_res.scalar_one_or_none()
            if not ay:
                ay = AcademicYear(name="2025-2026", start_date=date(2025, 4, 1), end_date=date(2026, 3, 31), is_active=True)
                db.add(ay)
                await db.flush()
            cls = Class(name="Grade 5", section="A", academic_year_id=ay.id)
            db.add(cls)
            await db.flush()
        
        # Set up a CMSSite settings record if not exists
        site_res = await db.execute(select(CMSSite).limit(1))
        site = site_res.scalar_one_or_none()
        if not site:
            site = CMSSite(
                template_id="template-001-prestige",
                color_scheme="Navy & Gold",
                settings={
                    "whatsapp_admission_enabled": True,
                    "whatsapp_payment_enabled": True,
                    "whatsapp_attendance_enabled": True
                }
            )
            db.add(site)
            await db.flush()
        else:
            # Force settings to enable all
            site.settings = {
                **site.settings,
                "whatsapp_admission_enabled": True,
                "whatsapp_payment_enabled": True,
                "whatsapp_attendance_enabled": True
            }
            db.add(site)
            await db.flush()
        await db.commit()

        # Clean up existing test student/parent
        parent_email = "automation.test.parent@example.com"
        await db.execute(
            text(f"DELETE FROM {schema_name}.student_parents WHERE email = :email"),
            {"email": parent_email}
        )
        await db.execute(
            text(f"DELETE FROM {schema_name}.students WHERE admission_number LIKE 'AUTO-%'")
        )
        await db.commit()

        # Instantiate Services
        student_repo = StudentRepository(db)
        student_service = StudentService(student_repo)
        
        fees_repo = FeesRepository(db)
        fees_service = FeesService(fees_repo)
        
        attendance_repo = AttendanceRepository(db)
        attendance_service = AttendanceService(attendance_repo)

        # Mock send_template_message
        mock_send = AsyncMock(return_value={"success": True, "message": "Mocked"})
        
        with patch.object(whatsapp_client, "send_template_message", mock_send):
            # ==========================================
            # TEST 1: Student Admission (Enabled)
            # ==========================================
            print("\n--- Testing Admission Alert (ENABLED) ---")
            mock_send.reset_mock()
            
            student_create = StudentCreate(
                first_name="John",
                last_name="Automation",
                date_of_birth=date(2016, 1, 1),
                gender="M",
                roll_number=101,
                admission_date=date(2025, 4, 1),
                class_id=cls.id,
                parents=[
                    ParentCreate(
                        parent_type="father",
                        first_name="Robert",
                        last_name="Automation",
                        mobile="9876500001",
                        email=parent_email,
                        occupation="Engineer"
                    )
                ]
            )
            
            # Change admission number pattern
            student = await student_service.admit_student(student_create, school_id=tenant_id)
            await db.commit()
            
            # Since notify task is created via asyncio.create_task, let's yield control
            await asyncio.sleep(0.1)
            
            assert mock_send.called, "WhatsApp send was not called on student admission"
            call_args = mock_send.call_args[1]
            assert call_args["to_phone"] == "9876500001"
            assert "John Automation" in call_args["body_parameters"][0]
            print(f"SUCCESS: Student Admission alert sent successfully to {call_args['to_phone']}")

            # ==========================================
            # TEST 2: Student Admission (Disabled)
            # ==========================================
            print("\n--- Testing Admission Alert (DISABLED) ---")
            mock_send.reset_mock()
            
            # Disable admissions settings
            site.settings = {
                **site.settings,
                "whatsapp_admission_enabled": False
            }
            db.add(site)
            await db.commit()
            
            student_create_2 = StudentCreate(
                first_name="Jane",
                last_name="Automation",
                date_of_birth=date(2016, 2, 2),
                gender="F",
                roll_number=102,
                admission_date=date(2025, 4, 1),
                class_id=cls.id,
                parents=[
                    ParentCreate(
                        parent_type="father",
                        first_name="Robert",
                        last_name="Automation",
                        mobile="9876500001",
                        email=parent_email,
                        occupation="Engineer"
                    )
                ]
            )
            
            student2 = await student_service.admit_student(student_create_2, school_id=tenant_id)
            await db.commit()
            await asyncio.sleep(0.1)
            
            assert not mock_send.called, "WhatsApp send was called even though whatsapp_admission_enabled was disabled"
            print("SUCCESS: Student Admission alert was not triggered because configuration switch was disabled.")

            # ==========================================
            # TEST 3: Fees Payment Alert (Enabled)
            # ==========================================
            print("\n--- Testing Fees Payment Alert (ENABLED) ---")
            mock_send.reset_mock()
            
            # Re-enable payment alerts
            site.settings = {
                **site.settings,
                "whatsapp_payment_enabled": True
            }
            db.add(site)
            await db.commit()
            
            # Trigger payment success helper directly using student 1
            await fees_service._notify_payment_success(
                student_id=student.id,
                amount_paid=15500.0,
                receipt_number="REC-TEST-999"
            )
            
            assert mock_send.called, "WhatsApp send was not called on payment success notification helper"
            call_args = mock_send.call_args[1]
            assert call_args["to_phone"] == "9876500001"
            assert "John Automation" in call_args["body_parameters"][0]
            assert "Rs. 15,500.00" in call_args["body_parameters"][1]
            print(f"SUCCESS: Fees Payment alert sent successfully to {call_args['to_phone']} with amount {call_args['body_parameters'][1]}")

            # ==========================================
            # TEST 4: Fees Payment Alert (Disabled)
            # ==========================================
            print("\n--- Testing Fees Payment Alert (DISABLED) ---")
            mock_send.reset_mock()
            
            # Disable payment alerts
            site.settings = {
                **site.settings,
                "whatsapp_payment_enabled": False
            }
            db.add(site)
            await db.commit()
            
            await fees_service._notify_payment_success(
                student_id=student.id,
                amount_paid=15500.0,
                receipt_number="REC-TEST-999"
            )
            
            assert not mock_send.called, "WhatsApp send was triggered for fees payment even though whatsapp_payment_enabled was disabled"
            print("SUCCESS: Fees Payment alert was not triggered because configuration switch was disabled.")

            # ==========================================
            # TEST 5: Attendance Absent Alert (Enabled)
            # ==========================================
            print("\n--- Testing Attendance Alert (ENABLED) ---")
            mock_send.reset_mock()
            
            # Re-enable attendance alerts
            site.settings = {
                **site.settings,
                "whatsapp_attendance_enabled": True
            }
            db.add(site)
            await db.commit()
            
            # Call attendance service absenteeism notification directly for student 1
            await attendance_service._notify_absent_students(
                student_ids=[student.id],
                session_date=date(2026, 6, 21)
            )
            
            assert mock_send.called, "WhatsApp send was not called on student attendance absenteeism notify helper"
            call_args = mock_send.call_args[1]
            assert call_args["to_phone"] == "9876500001"
            assert "John Automation" in call_args["body_parameters"][0]
            assert any("21-06-2026" in str(param) for param in call_args["body_parameters"]), "Date parameter missing in WhatsApp arguments"
            print(f"SUCCESS: Student Absent alert sent successfully to {call_args['to_phone']} for date 21-06-2026")

            # ==========================================
            # TEST 6: Attendance Absent Alert (Disabled)
            # ==========================================
            print("\n--- Testing Attendance Alert (DISABLED) ---")
            mock_send.reset_mock()
            
            # Disable attendance alerts
            site.settings = {
                **site.settings,
                "whatsapp_attendance_enabled": False
            }
            db.add(site)
            await db.commit()
            
            await attendance_service._notify_absent_students(
                student_ids=[student.id],
                session_date=date(2026, 6, 21)
            )
            
            assert not mock_send.called, "WhatsApp send was triggered for absenteeism notification even though whatsapp_attendance_enabled was disabled"
            print("SUCCESS: Student Absent alert was not triggered because configuration switch was disabled.")
            
            # ==========================================
            # CLEANUP
            # ==========================================
            print("\n--- Cleaning up test data ---")
            await db.execute(
                text(f"DELETE FROM {schema_name}.student_parents WHERE email = :email"),
                {"email": parent_email}
            )
            # Find both students and delete them
            await db.execute(
                text(f"DELETE FROM {schema_name}.students WHERE id IN (:id1, :id2)"),
                {"id1": student.id, "id2": student2.id}
            )
            # Restore default site settings
            site.settings = {
                **site.settings,
                "whatsapp_admission_enabled": True,
                "whatsapp_payment_enabled": True,
                "whatsapp_attendance_enabled": True
            }
            db.add(site)
            await db.commit()
            print("Cleanup completed successfully.")
            
        print("\nALL WHATSAPP AUTOMATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_whatsapp_automations_flow())
