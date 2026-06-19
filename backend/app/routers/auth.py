from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.core.deps import get_current_user
from app.models.public import User, Tenant
from app.schemas.auth import LoginRequest, TokenResponse, TokenData, UserResponse, UserResponseData

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    x_school_id: str | None = Header(None, alias="X-School-ID"),
    db: AsyncSession = Depends(get_db)
):
    # Find user in public schema with school details
    result = await db.execute(
        select(User)
        .options(selectinload(User.school))
        .where(User.email == login_data.email)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated"
        )

    # Generate tokens
    # Add user metadata to payload
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    resolved_school_id = str(user.school_id) if user.school_id else x_school_id
    resolved_school_name = user.school.name if user.school else None
    resolved_school_subdomain = user.school.subdomain if user.school else None
    
    return TokenResponse(
        data=TokenData(
            access_token=access_token,
            refresh_token=refresh_token,
            role=user.role,
            school_id=resolved_school_id,
            school_name=resolved_school_name,
            school_subdomain=resolved_school_subdomain
        )
    )

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    x_school_id: str | None = Header(None, alias="X-School-ID"),
    db: AsyncSession = Depends(get_db)
):
    school_name = None
    school_subdomain = None
    if current_user.school_id:
        result = await db.execute(
            select(Tenant).where(Tenant.id == current_user.school_id)
        )
        tenant = result.scalar_one_or_none()
        if tenant:
            school_name = tenant.name
            school_subdomain = tenant.subdomain
            
    return UserResponse(
        data=UserResponseData(
            id=current_user.id,
            email=current_user.email,
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            role=current_user.role,
            school_id=str(current_user.school_id) if current_user.school_id else x_school_id,
            school_name=school_name,
            school_subdomain=school_subdomain
        )
    )
