from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import date, datetime
from typing import List, Optional

class ParentBase(BaseModel):
    parent_type: str = Field(..., description="father, mother, or guardian")
    first_name: str = Field(..., min_length=2)
    last_name: str = Field(..., min_length=2)
    mobile: str = Field(..., pattern=r"^\+?[0-9]{10,15}$")
    email: Optional[EmailStr] = None
    occupation: Optional[str] = None

class ParentCreate(ParentBase):
    pass

class ParentResponse(ParentBase):
    id: UUID
    student_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StudentBase(BaseModel):
    first_name: str = Field(..., min_length=2)
    last_name: str = Field(..., min_length=2)
    date_of_birth: date
    gender: str = Field(..., pattern="^[MFO]$") # M, F, O
    roll_number: Optional[int] = None
    admission_date: date
    class_id: UUID

class StudentCreate(StudentBase):
    parents: List[ParentCreate] = Field(..., min_items=1)

class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    roll_number: Optional[int] = None
    admission_date: Optional[date] = None
    class_id: Optional[UUID] = None
    status: Optional[str] = None # active, inactive, transferred, alumni

class StudentResponseData(StudentBase):
    id: UUID
    admission_number: str
    status: str
    parents: List[ParentResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StudentResponse(BaseModel):
    success: bool = True
    data: StudentResponseData
    message: str = "OK"

class StudentListResponsePagination(BaseModel):
    page: int
    per_page: int
    total: int
    pages: int

class StudentListResponse(BaseModel):
    success: bool = True
    data: List[StudentResponseData]
    pagination: StudentListResponsePagination
    message: str = "OK"


class ClassCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    section: str = Field(..., min_length=1, max_length=10)
    academic_year_id: UUID

