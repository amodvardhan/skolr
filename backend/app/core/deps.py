from typing import Annotated, List
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, sanitize_schema_name
from app.core.security import decode_token
from app.models.public import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

async def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)] = None,
    token_query: str | None = Query(None, alias="token"),
    db: AsyncSession = Depends(get_db)
) -> User:
    actual_token = token or token_query
    if not actual_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(actual_token)
    email: str = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    result = await db.execute(select(User).where(User.email == email, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
        
    # If the user belongs to a school tenant, force set the schema search path to their tenant's schema
    if user.school_id:
        schema_name = sanitize_schema_name(str(user.school_id))
        await db.execute(text(f"SET search_path TO {schema_name}, public"))
        
    return user

def require_roles(allowed_roles: List[str]):
    async def role_checker(current_user: Annotated[User, Depends(get_current_user)]):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: Insufficient privileges",
            )
        return current_user
    return role_checker
