from pydantic import BaseModel, Field
from uuid import UUID
from datetime import date, datetime
from typing import List, Optional

# Fee Head
class FeeHeadCreate(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=255)

class FeeHeadResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Fee Structure Item
class FeeStructureItemCreate(BaseModel):
    fee_head_id: UUID
    amount: float = Field(..., gt=0)
    frequency: str = Field(..., description="monthly, quarterly, yearly, one_time")

class FeeStructureItemResponse(BaseModel):
    id: UUID
    fee_head_id: UUID
    amount: float
    frequency: str
    fee_head: Optional[FeeHeadResponse] = None

    class Config:
        from_attributes = True

# Fee Structure
class FeeStructureCreate(BaseModel):
    name: str = Field(..., max_length=100)
    academic_year_id: UUID
    items: List[FeeStructureItemCreate]

class FeeStructureResponse(BaseModel):
    id: UUID
    name: str
    academic_year_id: UUID
    items: List[FeeStructureItemResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True

# Student Fee Account
class StudentFeeAccountResponse(BaseModel):
    id: UUID
    student_id: UUID
    fee_structure_id: UUID
    total_applicable: float
    total_paid: float
    total_discount: float
    outstanding_balance: float

    class Config:
        from_attributes = True

class StudentFeeAccountDetailResponse(BaseModel):
    id: UUID
    student_id: UUID
    fee_structure_id: UUID
    total_applicable: float
    total_paid: float
    total_discount: float
    outstanding_balance: float
    fee_structure: Optional[FeeStructureResponse] = None

    class Config:
        from_attributes = True

# Fee Transaction / Payment
class FeeTransactionCreate(BaseModel):
    student_id: UUID
    amount_paid: float = Field(..., gt=0)
    payment_mode: str = Field(..., description="cash, upi, bank_transfer, card")
    transaction_reference: Optional[str] = Field(None, max_length=100)
    remarks: Optional[str] = Field(None, max_length=255)

class FeeTransactionResponse(BaseModel):
    id: UUID
    student_id: UUID
    receipt_number: str
    amount_paid: float
    payment_mode: str
    payment_date: date
    transaction_reference: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Fee Defaulter item
class FeeDefaulterResponse(BaseModel):
    student_id: UUID
    first_name: str
    last_name: str
    admission_number: str
    class_name: str
    class_section: str
    parent_mobile: str
    total_applicable: float
    total_paid: float
    total_discount: float
    outstanding_balance: float

# Overall Fee Ledger Summary
class FeeSummaryResponse(BaseModel):
    total_collected: float
    total_outstanding: float
    total_applicable: float
    collection_rate: float # percentage
