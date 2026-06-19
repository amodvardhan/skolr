from pydantic import BaseModel, Field
from uuid import UUID
from datetime import date, datetime
from typing import List, Optional

class ExamCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    academic_year_id: UUID

class ExamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    status: Optional[str] = Field(None, pattern="^(draft|scheduled|completed)$")

class ExamResponseData(BaseModel):
    id: UUID
    name: str
    academic_year_id: UUID
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ExamResponse(BaseModel):
    success: bool = True
    data: ExamResponseData
    message: str = "OK"

class ExamListResponse(BaseModel):
    success: bool = True
    data: List[ExamResponseData]
    message: str = "OK"


# Exam Schedule
class ExamScheduleCreate(BaseModel):
    exam_id: UUID
    subject_id: UUID
    class_id: UUID
    exam_date: date
    max_marks: float = Field(100.0, ge=1.0)
    passing_marks: float = Field(35.0, ge=0.0)

class ExamScheduleResponseData(BaseModel):
    id: UUID
    exam_id: UUID
    subject_id: UUID
    class_id: UUID
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    exam_date: date
    max_marks: float
    passing_marks: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ExamScheduleListResponse(BaseModel):
    success: bool = True
    data: List[ExamScheduleResponseData]
    message: str = "OK"

class ExamScheduleResponse(BaseModel):
    success: bool = True
    data: ExamScheduleResponseData
    message: str = "OK"


# Exam Marks
class ExamMarkCreate(BaseModel):
    student_id: UUID
    marks_obtained: float = Field(..., ge=0.0)
    remarks: Optional[str] = Field(None, max_length=255)

class MarksEntryListRequest(BaseModel):
    marks: List[ExamMarkCreate]

class ExamMarkResponseData(BaseModel):
    id: UUID
    exam_schedule_id: UUID
    student_id: UUID
    student_name: Optional[str] = None
    roll_number: Optional[int] = None
    marks_obtained: Optional[float] = None
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ExamMarkListResponse(BaseModel):
    success: bool = True
    data: List[ExamMarkResponseData]
    message: str = "OK"


# Grade Scale
class GradeScaleCreate(BaseModel):
    min_percentage: float = Field(..., ge=0.0, le=100.0)
    max_percentage: float = Field(..., ge=0.0, le=100.0)
    grade_name: str = Field(..., min_length=1, max_length=5)
    description: Optional[str] = Field(None, max_length=100)

class GradeScaleResponseData(GradeScaleCreate):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class GradeScaleListResponse(BaseModel):
    success: bool = True
    data: List[GradeScaleResponseData]
    message: str = "OK"

class GradeScaleResponse(BaseModel):
    success: bool = True
    data: GradeScaleResponseData
    message: str = "OK"
