from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from typing import Optional
from uuid import UUID

from config import settings
from supabase_client import supabase, supabase_service
from schemas.user import Token, UserOut, UserLogin
from utils.auth import get_current_user
from utils.logger import logger

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@router.post("/login/", response_model=Token)
async def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends()):
    """Login with email and password using Supabase"""
    try:
        # Authenticate with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": form_data.username,
            "password": form_data.password
        })

        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        user_id = auth_response.user.id
        access_token = auth_response.session.access_token

        # Get user profile using service role to bypass RLS during login phase
        profile_response = supabase_service.table("user_profiles").select("*").eq("id", user_id).execute()
        
        profile_data = {}
        if profile_response.data:
            profile_data = profile_response.data[0]
        else:
            # Default profile if not found
            profile_data = {
                "full_name": None,
                "role": "worker",
                "tenant_id": None,
                "is_active": True,
                "created_at": auth_response.user.created_at
            }

        role = profile_data.get("role", "worker")

        # Sync role and tenant_id to Supabase user metadata so it appears in the JWT for RLS
        # We fetch existing metadata first to PRESERVE permissions
        try:
            curr_auth_user = supabase_service.auth.admin.get_user_by_id(user_id)
            existing_meta = curr_auth_user.user.user_metadata or {}

            supabase_service.auth.admin.update_user_by_id(
                user_id,
                {
                    "user_metadata": {
                        **existing_meta,
                        "role": role,
                        "full_name": profile_data.get("full_name"),
                        "tenant_id": profile_data.get("tenant_id")
                    }
                }
            )
            # Update auth_response with the latest metadata for the user_out below
            auth_response.user.user_metadata = {
                **existing_meta,
                "role": role,
                "full_name": profile_data.get("full_name"),
                "tenant_id": profile_data.get("tenant_id")
            }
        except Exception as meta_err:
            logger.error(f"Metadata sync failed: {str(meta_err)}")
            pass # Non-critical failure
        user_out = UserOut(
            id=UUID(user_id),
            email=auth_response.user.email,
            full_name=profile_data.get("full_name"),
            role=role,
            tenant_id=profile_data.get("tenant_id"),
            is_active=profile_data.get("is_active", True),
            created_at=profile_data.get("created_at") or auth_response.user.created_at,
            permissions=auth_response.user.user_metadata.get("permissions", {})
        )

        # Set httpOnly cookie with hardened security
        response.set_cookie(
            key="access_token",
            value=access_token,
            max_age=3600 * 24 * 7, # 7 days
            httponly=True,
            secure=settings.ENVIRONMENT == "production",
            samesite="strict",
            path="/"
        )

        return Token(
            access_token=access_token,
            token_type="bearer",
            user=user_out
        )

    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

@router.get("/me/", response_model=UserOut)
async def read_users_me(current_user: UserOut = Depends(get_current_user)):
    return current_user

@router.post("/logout/")
async def logout(response: Response):
    """Logout by clearing cookie"""
    try:
        supabase.auth.sign_out()
    except:
        pass
    
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}

@router.post("/request-password-reset/")
async def request_password_reset(email: str):
    """Request password reset via Supabase"""
    try:
        supabase.auth.reset_password_for_email(email)
        return {"message": "If the email exists, a reset link has been sent"}
    except Exception as e:
        # Don't reveal if user exists
        return {"message": "If the email exists, a reset link has been sent"}
