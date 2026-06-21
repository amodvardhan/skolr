from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

# CMS Site schemas
class CMSSiteSettings(BaseModel):
    admissions_open: bool = True
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    linkedin_url: Optional[str] = None

class CMSSiteResponseData(BaseModel):
    id: UUID
    template_id: str
    color_scheme: str
    is_published: bool
    published_at: Optional[datetime] = None
    settings: Dict[str, Any]

class CMSSiteResponse(BaseModel):
    success: bool = True
    data: CMSSiteResponseData
    message: str = "OK"

class CMSSiteUpdate(BaseModel):
    template_id: Optional[str] = None
    color_scheme: Optional[str] = None
    is_published: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None


# CMS Page schemas
class CMSPageResponseData(BaseModel):
    id: UUID
    slug: str
    title: str
    sections: List[Dict[str, Any]]
    is_published: bool
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class CMSPageResponse(BaseModel):
    success: bool = True
    data: CMSPageResponseData
    message: str = "OK"

class CMSPageListResponse(BaseModel):
    success: bool = True
    data: List[CMSPageResponseData]
    message: str = "OK"

class CMSPageCreate(BaseModel):
    slug: str = Field(..., min_length=1, max_length=100)
    title: str = Field(..., min_length=1, max_length=100)
    sections: Optional[List[Dict[str, Any]]] = None
    is_published: Optional[bool] = True
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None

class CMSPageUpdate(BaseModel):
    slug: Optional[str] = None
    title: Optional[str] = None
    sections: Optional[List[Dict[str, Any]]] = None
    is_published: Optional[bool] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


# Publish response
class PublishResponseData(BaseModel):
    success: bool
    url: str
    published_at: datetime

class PublishResponse(BaseModel):
    success: bool = True
    data: PublishResponseData
    message: str = "OK"


# Inquiry schemas
class CMSInquiryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=1, max_length=1000)

class CMSInquiryResponseData(BaseModel):
    id: UUID
    name: str
    email: str
    message: str
    status: str
    created_at: datetime

class CMSInquiryResponse(BaseModel):
    success: bool = True
    data: CMSInquiryResponseData
    message: str = "OK"

class CMSInquiryListResponse(BaseModel):
    success: bool = True
    data: List[CMSInquiryResponseData]
    message: str = "OK"
