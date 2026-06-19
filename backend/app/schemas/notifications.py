from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import List, Optional

# Notification Template Schemas
class NotificationTemplateCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Friendly template name")
    template_name: str = Field(..., min_length=2, max_length=100, description="Meta WhatsApp template name")
    body_format: str = Field(..., min_length=2, max_length=500, description="Template body format with placeholders, e.g. {{1}}")
    category: str = Field("general", min_length=2, max_length=50, description="Category of the template (e.g. general, academic, fees, attendance)")

class NotificationTemplateResponseData(BaseModel):
    id: UUID
    name: str
    template_name: str
    body_format: str
    category: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class NotificationTemplateResponse(BaseModel):
    success: bool = True
    data: NotificationTemplateResponseData
    message: str = "OK"

class NotificationTemplateListResponse(BaseModel):
    success: bool = True
    data: List[NotificationTemplateResponseData]
    message: str = "OK"


# Broadcast Request Schema
class BroadcastRequest(BaseModel):
    template_id: UUID
    target_type: str = Field(..., pattern="^(all|class|individual)$", description="Target of the broadcast")
    class_id: Optional[UUID] = Field(None, description="Required if target_type is class")
    custom_phones: Optional[List[str]] = Field(None, description="Required if target_type is individual")
    variables: List[str] = Field(default_factory=list, description="Positional template parameter values")


# Notification Log Schemas
class NotificationLogResponseData(BaseModel):
    id: UUID
    sender_id: Optional[UUID] = None
    sender_name: Optional[str] = None
    recipient_name: str
    recipient_phone: str
    message_body: str
    channel: str
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationLogPagination(BaseModel):
    page: int
    per_page: int
    total: int
    pages: int

class NotificationLogListResponse(BaseModel):
    success: bool = True
    data: List[NotificationLogResponseData]
    pagination: NotificationLogPagination
    message: str = "OK"
