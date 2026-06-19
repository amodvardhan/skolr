from pydantic import BaseModel, Field
from uuid import UUID
from datetime import date, datetime
from typing import List, Optional

class SubjectBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=20)
    description: Optional[str] = Field(None, max_length=255)

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    code: Optional[str] = Field(None, min_length=2, max_length=20)
    description: Optional[str] = Field(None, max_length=255)

class SubjectResponseData(SubjectBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SubjectResponse(BaseModel):
    success: bool = True
    data: SubjectResponseData
    message: str = "OK"

class SubjectListResponse(BaseModel):
    success: bool = True
    data: List[SubjectResponseData]
    message: str = "OK"


# Homework
class HomeworkBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: str = Field(..., min_length=2, max_length=1000)
    due_date: date
    attachment_url: Optional[str] = Field(None, max_length=500)
    class_id: UUID
    subject_id: UUID

class HomeworkCreate(HomeworkBase):
    pass

class HomeworkResponseData(HomeworkBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    class_name: Optional[str] = None
    subject_name: Optional[str] = None
    teacher_name: Optional[str] = None

    class Config:
        from_attributes = True

class HomeworkResponse(BaseModel):
    success: bool = True
    data: HomeworkResponseData
    message: str = "OK"

class HomeworkListResponse(BaseModel):
    success: bool = True
    data: List[HomeworkResponseData]
    message: str = "OK"


# Homework Submissions
class SubmissionGradeRequest(BaseModel):
    status: str = Field("graded", pattern="^(submitted|graded)$")
    remarks: Optional[str] = Field(None, max_length=255)
    grade: Optional[str] = Field(None, max_length=10)

class SubmissionResponseData(BaseModel):
    id: UUID
    homework_id: UUID
    student_id: UUID
    student_name: Optional[str] = None
    roll_number: Optional[int] = None
    submission_date: Optional[datetime] = None
    attachment_url: Optional[str] = None
    status: str
    remarks: Optional[str] = None
    grade: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SubmissionResponse(BaseModel):
    success: bool = True
    data: SubmissionResponseData
    message: str = "OK"

class HomeworkSubmissionsListResponse(BaseModel):
    success: bool = True
    data: List[SubmissionResponseData]
    message: str = "OK"
