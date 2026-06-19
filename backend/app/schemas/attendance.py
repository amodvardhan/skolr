from pydantic import BaseModel, Field
from uuid import UUID
from datetime import date, datetime
from typing import List, Optional

class AttendanceSessionCreate(BaseModel):
    class_id: UUID
    session_date: date
    session_type: str = Field(..., description="morning, afternoon, or period")
    subject_id: Optional[UUID] = None

class StudentAttendanceMark(BaseModel):
    student_id: UUID
    status: str = Field(..., pattern="^[PALH]$", description="P (present), A (absent), L (late), H (holiday)")
    remarks: Optional[str] = None

class AttendanceMarkRequest(BaseModel):
    session: AttendanceSessionCreate
    records: List[StudentAttendanceMark]

class StudentAttendanceResponseData(BaseModel):
    id: UUID
    student_id: UUID
    status: str
    remarks: Optional[str] = None

    class Config:
        from_attributes = True

class AttendanceSessionResponseData(BaseModel):
    id: UUID
    class_id: UUID
    subject_id: Optional[UUID] = None
    session_date: date
    session_type: str
    taken_by: UUID
    taken_at: datetime

    class Config:
        from_attributes = True

class AttendanceMarkResponse(BaseModel):
    success: bool = True
    session: AttendanceSessionResponseData
    records: List[StudentAttendanceResponseData]
    message: str = "Attendance marked successfully"

class AttendanceSummaryItem(BaseModel):
    date: date
    present_count: int
    absent_count: int
    late_count: int
    total_count: int

class ClassAttendanceSummary(BaseModel):
    success: bool = True
    data: List[AttendanceSummaryItem]
    message: str = "OK"

class StudentAttendanceSummary(BaseModel):
    success: bool = True
    present_days: int
    absent_days: int
    late_days: int
    total_days: int
    attendance_percentage: float
    message: str = "OK"
