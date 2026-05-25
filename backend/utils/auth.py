from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from supabase import Client
from uuid import UUID
from functools import lru_cache
import time

from supabase_client import supabase, supabase_service
from schemas.user import UserOut, TokenData
from utils.logger import logger

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login/")

# In-memory cache for user metadata to reduce round-trips
# Format: {user_id: (timestamp, UserOut)}
USER_CACHE = {}
CACHE_TTL = 300 # 5 minutes

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserOut:
    """
    Get current user with optimized caching to reduce Supabase API round-trips.
    """
    try:
        # 1. VERIFY TOKEN (Essential for security - checks if token is still valid)
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        auth_user = user_response.user
        user_id = auth_user.id
        now = time.time()

        # 2. CHECK CACHE (Speed up repeat requests)
        if user_id in USER_CACHE:
            timestamp, cached_user = USER_CACHE[user_id]
            if now - timestamp < CACHE_TTL:
                return cached_user

        # 3. FETCH PROFILE (Database)
        profile_response = supabase_service.table("user_profiles").select("*").eq("id", user_id).execute()
        
        if not profile_response.data:
            return UserOut(
                id=UUID(user_id),
                email=auth_user.email,
                full_name=None,
                role="worker",
                tenant_id=None,
                is_active=True,
                created_at=auth_user.created_at
            )

        profile = profile_response.data[0]
        
        # 4. FETCH PERMISSIONS (Auth Metadata via Admin API)
        admin_auth_res = supabase_service.auth.admin.get_user_by_id(user_id)
        live_user = admin_auth_res.user

        user_out = UserOut(
            id=UUID(user_id),
            email=auth_user.email,
            full_name=profile.get("full_name"),
            role=profile.get("role", "worker"),
            tenant_id=profile.get("tenant_id"),
            is_active=profile.get("is_active", True),
            created_at=profile.get("created_at"),
            permissions=live_user.user_metadata.get("permissions", {})
        )

        # 5. UPDATE CACHE
        USER_CACHE[user_id] = (now, user_out)
        return user_out

    except Exception as e:
        logger.error(f"Auth error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_role(allowed_roles: List[str]):
    def role_checker(current_user: UserOut = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker

require_any_role = require_role(["admin", "owner", "senior_worker", "worker"])
require_admin = require_role(["admin"])
require_owner = require_role(["admin", "owner"])
