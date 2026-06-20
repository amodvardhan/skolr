from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import List, Optional

# Infrastructure & CBSE Profile
class CBSEProfileCreate(BaseModel):
    affiliation_number: Optional[str] = Field(None, max_length=50)
    school_code: Optional[str] = Field(None, max_length=50)
    land_area_sq_mtrs: float = Field(0.0, ge=0.0)
    built_up_area_sq_mtrs: float = Field(0.0, ge=0.0)
    playground_area_sq_mtrs: float = Field(0.0, ge=0.0)
    classroom_count: int = Field(0, ge=0)
    composite_science_lab_count: int = Field(0, ge=0)
    math_lab_count: int = Field(0, ge=0)
    computer_lab_count: int = Field(0, ge=0)
    library_book_count: int = Field(0, ge=0)
    library_magazine_count: int = Field(0, ge=0)
    library_newspaper_count: int = Field(0, ge=0)

class CBSEProfileResponseData(CBSEProfileCreate):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CBSEProfileResponse(BaseModel):
    success: bool = True
    data: Optional[CBSEProfileResponseData] = None
    message: str = "OK"


# Compliance Statistics Detailed Data
class CBSESectionInfo(BaseModel):
    id: UUID
    class_name: str
    section: str
    student_count: int

class CBSESubjectInfo(BaseModel):
    id: UUID
    name: str
    code: str
    description: Optional[str] = None

class CBSETeacherInfo(BaseModel):
    id: UUID
    employee_code: str
    first_name: str
    last_name: str
    designation: str
    qualification: Optional[str] = None


# Compliance Checklist & Audit Report
class CBSEComplianceStats(BaseModel):
    total_students: int
    total_teachers: int
    student_teacher_ratio: float
    student_teacher_compliant: bool
    total_sections: int
    teacher_section_ratio: float
    teacher_section_compliant: bool
    
    sections_over_capacity: List[CBSESectionInfo]
    sections_over_capacity_compliant: bool
    
    subjects_missing_codes: List[CBSESubjectInfo]
    subjects_compliant: bool
    
    teachers_missing_qualifications: List[CBSETeacherInfo]
    teachers_missing_professional: List[CBSETeacherInfo]
    
    land_area_compliant: bool
    land_area_required: float
    library_books_compliant: bool
    library_books_required: int
    labs_compliant: bool
    missing_labs: List[str]

class CBSEComplianceResponse(BaseModel):
    success: bool = True
    data: CBSEComplianceStats
    message: str = "OK"
