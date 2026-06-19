from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import date, datetime
from typing import List, Optional
from app.schemas.auth import UserResponseData

class EmployeeBase(BaseModel):
    first_name: str = Field(..., min_length=2, max_length=100)
    last_name: str = Field(..., min_length=2, max_length=100)
    designation: str = Field(..., max_length=100, description="teacher, principal, accountant, staff")
    department: str = Field(..., max_length=100, description="Academics, Admin, Finance, Support")
    date_of_joining: date
    employment_type: str = Field(..., pattern="^(permanent|contract)$")
    mobile: str = Field(..., pattern=r"^\+?[0-9]{10,15}$")
    email: EmailStr

class EmployeeCreate(EmployeeBase):
    employee_code: str = Field(..., min_length=2, max_length=20)

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=2, max_length=100)
    last_name: Optional[str] = Field(None, min_length=2, max_length=100)
    designation: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    date_of_joining: Optional[date] = None
    employment_type: Optional[str] = Field(None, pattern="^(permanent|contract)$")
    mobile: Optional[str] = Field(None, pattern=r"^\+?[0-9]{10,15}$")
    email: Optional[EmailStr] = None
    status: Optional[str] = Field(None, pattern="^(active|inactive)$")

class EmployeeResponseData(EmployeeBase):
    id: UUID
    employee_code: str
    status: str
    user_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EmployeeResponse(BaseModel):
    success: bool = True
    data: EmployeeResponseData
    message: str = "OK"

class EmployeePagination(BaseModel):
    page: int
    per_page: int
    total: int
    pages: int

class EmployeeListResponse(BaseModel):
    success: bool = True
    data: List[EmployeeResponseData]
    pagination: EmployeePagination
    message: str = "OK"

class LinkUserRequest(BaseModel):
    email: EmailStr
    password: str
    role: str = Field("teacher", pattern="^(teacher|accountant|school_admin)$")
