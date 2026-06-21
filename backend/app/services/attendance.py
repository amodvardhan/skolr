import asyncio
import logging
from uuid import UUID
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.repositories.attendance import AttendanceRepository
from app.models.tenant import AttendanceSession, StudentAttendance, Student, StudentParent
from app.schemas.attendance import AttendanceMarkRequest, StudentAttendanceMark
from app.utils.whatsapp import whatsapp_client

logger = logging.getLogger("attendance_service")

# Background notifier task
async def notify_absent_parent(student_name: str, parent_mobile: str, date_str: str):
    try:
        from app.core.config import settings
        template_name = settings.WHATSAPP_ATTENDANCE_TEMPLATE or "jaspers_market_order_confirmation_v1"
        
        # Formulate parameters based on template configuration
        if template_name == "jaspers_market_order_confirmation_v1":
            body_params = [
                student_name,
                "Absent Notification",
                f"Date: {date_str}"
            ]
        else:
            body_params = [student_name, date_str]

        # Calls Meta Graph API using our configured credentials
        await whatsapp_client.send_template_message(
            to_phone=parent_mobile,
            template_name=template_name,
            language_code="en_US" if template_name == "jaspers_market_order_confirmation_v1" else "en",
            body_parameters=body_params
        )
    except Exception as e:
        logger.error(f"Failed to trigger Meta WhatsApp notification task: {str(e)}")

class AttendanceService:
    def __init__(self, repo: AttendanceRepository):
        self.repo = repo

    async def mark_attendance(
        self,
        data: AttendanceMarkRequest,
        taken_by_employee_id: UUID
    ) -> Tuple[AttendanceSession, List[StudentAttendance]]:
        
        # 1. Check if session already exists
        session = await self.repo.get_session_by_date_and_class(
            class_id=data.session.class_id,
            session_date=data.session.session_date,
            session_type=data.session.session_type
        )
        
        is_update = session is not None
        
        if is_update:
            # Enforce 2-hour locking window constraint
            # taken_at in DB has timezone, compare using UTC time offset
            taken_at_utc = session.taken_at.replace(tzinfo=timezone.utc) if session.taken_at.tzinfo else session.taken_at.replace(tzinfo=timezone.utc)
            now_utc = datetime.now(timezone.utc)
            
            if now_utc - taken_at_utc > timedelta(hours=2):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Attendance locked. Modifications after 2 hours require administrative override."
                )
            
            # Delete old student attendance records to overwrite
            await self.repo.delete_records_by_session_id(session.id)
            session.taken_at = datetime.utcnow()
        else:
            # Create a new session
            session = AttendanceSession(
                class_id=data.session.class_id,
                subject_id=data.session.subject_id,
                session_date=data.session.session_date,
                session_type=data.session.session_type,
                taken_by=taken_by_employee_id,
                taken_at=datetime.utcnow()
            )
            session = await self.repo.create_session(session)

        # 2. Add student attendance logs
        db_records = []
        absent_student_ids = []
        
        for r in data.records:
            record = StudentAttendance(
                session_id=session.id,
                student_id=r.student_id,
                status=r.status,
                remarks=r.remarks
            )
            db_records.append(record)
            if r.status == 'A':
                absent_student_ids.append(r.student_id)
                
        await self.repo.add_attendance_records(db_records)

        # 3. Trigger WhatsApp absent alerts async in background
        if absent_student_ids:
            asyncio.create_task(self._notify_absent_students(absent_student_ids, session.session_date))

        return session, db_records

    async def _notify_absent_students(self, student_ids: List[UUID], session_date: date):
        """
        Background task querying parent mobile details for absent students and dispatching WhatsApp alerts.
        """
        try:
            from app.models.tenant import CMSSite
            site_res = await self.repo.db.execute(
                select(CMSSite).where(CMSSite.deleted_at.is_(None)).limit(1)
            )
            site = site_res.scalar_one_or_none()
            whatsapp_enabled = True
            if site and site.settings:
                whatsapp_enabled = site.settings.get("whatsapp_attendance_enabled", True)
                
            if not whatsapp_enabled:
                logger.info("WhatsApp attendance notifications are disabled in settings.")
                return
        except Exception as e:
            logger.error(f"Failed to check WhatsApp settings for attendance alerts: {str(e)}")
            
        date_str = session_date.strftime("%d-%m-%Y")
        for sid in student_ids:
            try:
                # Eager load parent records
                result = await self.repo.db.execute(
                    select(Student)
                    .where(Student.id == sid)
                    .options(selectinload(Student.parents))
                )
                student = result.scalar_one_or_none()
                if not student:
                    continue
                
                # Fetch first father or guardian contact number
                parent = next((p for p in student.parents if p.parent_type in ['father', 'guardian']), None)
                if not parent:
                    parent = student.parents[0] if student.parents else None

                if parent and parent.mobile:
                    student_name = f"{student.first_name} {student.last_name}"
                    # Launch non-blocking Meta Graph API Graph task
                    await notify_absent_parent(student_name, parent.mobile, date_str)
            except Exception as e:
                logger.error(f"WhatsApp notification dispatch exception for student {sid}: {str(e)}")

    async def get_student_summary(self, student_id: UUID) -> dict:
        present, absent, late, total = await self.repo.get_student_summary(student_id)
        percentage = (present / total) * 100 if total > 0 else 100.0
        return {
            "present_days": present,
            "absent_days": absent,
            "late_days": late,
            "total_days": total,
            "attendance_percentage": round(percentage, 2)
        }

    async def get_class_summary(self, class_id: UUID, start_date: date, end_date: date) -> List[dict]:
        rows = await self.repo.get_class_summary_by_date_range(class_id, start_date, end_date)
        return [
            {
                "date": row[0],
                "present_count": row[1],
                "absent_count": row[2],
                "late_count": row[3],
                "total_count": row[4]
            }
            for row in rows
        ]
