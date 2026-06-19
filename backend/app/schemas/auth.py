from pydantic import BaseModel, EmailStr
from uuid import UUID

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenData(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    school_id: str | None = None
    school_name: str | None = None
    school_subdomain: str | None = None

class TokenResponse(BaseModel):
    success: bool = True
    data: TokenData
    message: str = "Login successful"

class UserResponseData(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    role: str
    school_id: str | None = None
    school_name: str | None = None
    school_subdomain: str | None = None

class UserResponse(BaseModel):
    success: bool = True
    data: UserResponseData
    message: str = "OK"
