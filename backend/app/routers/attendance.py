from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import date
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import require_roles
from app.repositories.attendance import AttendanceRepository
from app.services.attendance import AttendanceService
from app.schemas.attendance import (
    AttendanceMarkRequest, 
    AttendanceMarkResponse,
    StudentAttendanceSummary,
    ClassAttendanceSummary,
    AttendanceSessionResponseData,
    StudentAttendanceResponseData
)
from app.models.public import User
from app.models.tenant import Employee
from sqlalchemy import select

router = APIRouter(prefix="/attendance", tags=["Attendance"])

class SessionDetailsResponse(BaseModel):
    exists: bool
    session: Optional[AttendanceSessionResponseData] = None
    records: List[StudentAttendanceResponseData] = []

@router.get("/session", response_model=SessionDetailsResponse)
async def get_session_details(
    class_id: UUID = Query(...),
    session_date: date = Query(...),
    session_type: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = AttendanceRepository(db)
    session = await repo.get_session_by_date_and_class(class_id, session_date, session_type)
    if not session:
        return SessionDetailsResponse(exists=False)
    
    records = await repo.get_session_records(session.id)
    return SessionDetailsResponse(
        exists=True,
        session=session,
        records=records
    )


@router.post("/", response_model=AttendanceMarkResponse)
async def mark_attendance(
    request_data: AttendanceMarkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    # Resolve the employee ID associated with this user log in
    result = await db.execute(
        select(Employee).where(Employee.user_id == current_user.id)
    )
    employee = result.scalar_one_or_none()
    taken_by_id = employee.id if employee else current_user.id # Fallback to user UUID if direct link is missing

    repo = AttendanceRepository(db)
    service = AttendanceService(repo)
    session, records = await service.mark_attendance(request_data, taken_by_id)
    
    return AttendanceMarkResponse(
        session=session,
        records=records
    )

@router.get("/summary/student/{student_id}", response_model=StudentAttendanceSummary)
async def get_student_summary(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher", "parent"]))
):
    repo = AttendanceRepository(db)
    service = AttendanceService(repo)
    summary = await service.get_student_summary(student_id)
    
    return StudentAttendanceSummary(
        present_days=summary["present_days"],
        absent_days=summary["absent_days"],
        late_days=summary["late_days"],
        total_days=summary["total_days"],
        attendance_percentage=summary["attendance_percentage"]
    )

@router.get("/summary/class/{class_id}", response_model=ClassAttendanceSummary)
async def get_class_summary(
    class_id: UUID,
    start_date: date = Query(..., description="Start date of range"),
    end_date: date = Query(..., description="End date of range"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = AttendanceRepository(db)
    service = AttendanceService(repo)
    summary_list = await service.get_class_summary(class_id, start_date, end_date)
    
    return ClassAttendanceSummary(data=summary_list)
