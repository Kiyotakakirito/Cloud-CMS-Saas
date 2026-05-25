from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID

from supabase_client import supabase, supabase_service
from schemas.user import UserOut, UserCreate
from utils.auth import get_current_user, require_role
from .audit import log_action

router = APIRouter(prefix="/api/v1/users", tags=["User Management"])

@router.post("/create/", response_model=UserOut)
async def create_user(
    user_data: UserCreate,
    current_user: UserOut = Depends(require_role(["admin"]))
):
    """Create a new user (Admin only)"""
    try:
        # Create user in Supabase Auth using service role
        auth_res = supabase_service.auth.admin.create_user({
            "email": user_data.email,
            "password": user_data.password,
            "email_confirm": True,
            "user_metadata": {
                "role": user_data.role, 
                "full_name": user_data.full_name,
                "tenant_id": user_data.tenant_id if user_data.tenant_id and int(user_data.tenant_id) > 0 else None
            }
        })

        if not auth_res.user:
            raise HTTPException(status_code=400, detail="Error creating auth user")

        user_id = auth_res.user.id

        # Profile update
        profile_data = {
            "full_name": user_data.full_name,
            "role": user_data.role,
            "tenant_id": user_data.tenant_id if user_data.tenant_id and int(user_data.tenant_id) > 0 else None,
            "is_active": True
        }

        res = supabase_service.table("user_profiles").update(profile_data).eq("id", user_id).execute()
        
        # Log the action
        await log_action(
            user_id=current_user.id,
            action="CREATE_USER",
            resource="user",
            resource_id=str(user_id),
            details={"email": user_data.email, "role": user_data.role, "tenant_id": user_data.tenant_id},
            tenant_id=user_data.tenant_id if user_data.tenant_id and int(user_data.tenant_id) > 0 else None
        )

        # Fetch the final profile
        profile_res = supabase_service.table("user_profiles").select("*").eq("id", user_id).execute()
        p = profile_res.data[0]
        return UserOut(
            id=UUID(p["id"]),
            email=p.get("email"),
            full_name=p.get("full_name"),
            role=p.get("role"),
            tenant_id=p.get("tenant_id"),
            is_active=p.get("is_active"),
            created_at=p.get("created_at")
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[UserOut])
async def list_users(
    tenant_id: Optional[int] = None,
    current_user: UserOut = Depends(require_role(["admin"]))
):
    """List all users (Admin only)"""
    query = supabase_service.table("user_profiles").select("*")
    if tenant_id:
        query = query.eq("tenant_id", tenant_id)
        
    res = query.order("created_at", desc=True).execute()
    
    users_out = []
    for p in res.data:
        users_out.append(UserOut(
            id=UUID(p["id"]),
            email=p.get("email", "unknown@example.com"),
            full_name=p.get("full_name"),
            role=p.get("role"),
            tenant_id=p.get("tenant_id"),
            is_active=p.get("is_active"),
            created_at=p.get("created_at")
        ))
    return users_out

@router.get("/{user_id}/", response_model=UserOut)
async def get_user(
    user_id: UUID,
    current_user: UserOut = Depends(require_role(["admin"]))
):
    """Get user details (Admin only)"""
    res = supabase_service.table("user_profiles").select("*").eq("id", str(user_id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    p = res.data[0]
    return UserOut(
        id=user_id,
        email=p.get("email"),
        full_name=p.get("full_name"),
        role=p.get("role"),
        tenant_id=p.get("tenant_id"),
        is_active=p.get("is_active"),
        created_at=p.get("created_at")
    )

@router.put("/{user_id}/", response_model=UserOut)
async def update_user(
    user_id: UUID,
    user_data: dict,
    current_user: UserOut = Depends(require_role(["admin"]))
):
    """Update user profile (Admin only)"""
    profile_updates = {k: v for k, v in user_data.items() if k in ["full_name", "role", "tenant_id", "is_active"]}
    if "tenant_id" in profile_updates and (profile_updates["tenant_id"] == 0 or profile_updates["tenant_id"] == "0"):
        profile_updates["tenant_id"] = None

    res = supabase_service.table("user_profiles").update(profile_updates).eq("id", str(user_id)).execute()
    
    # Log the action
    await log_action(
        user_id=current_user.id,
        action="UPDATE_USER",
        resource="user",
        resource_id=str(user_id),
        details=profile_updates
    )

    p = res.data[0]
    return UserOut(
        id=user_id,
        email=p.get("email"),
        full_name=p.get("full_name"),
        role=p.get("role"),
        tenant_id=p.get("tenant_id"),
        is_active=p.get("is_active"),
        created_at=p.get("created_at")
    )

@router.post("/{user_id}/reset-password/")
async def admin_reset_password(
    user_id: UUID,
    payload: dict,
    current_user: UserOut = Depends(require_role(["admin"]))
):
    """Force reset any user's password (Admin only)"""
    new_password = payload.get("password")
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    try:
        supabase_service.auth.admin.update_user_by_id(str(user_id), {"password": new_password})
        
        await log_action(
            user_id=current_user.id,
            action="RESET_PASSWORD",
            resource="user",
            resource_id=str(user_id)
        )
        return {"message": "Password updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{user_id}/")
async def delete_user(
    user_id: UUID,
    current_user: UserOut = Depends(require_role(["admin"]))
):
    """Delete user (Admin only). If it's a Shop Owner, the shop is kept but the user is removed."""
    # Log the action
    await log_action(
        user_id=current_user.id,
        action="DELETE_USER",
        resource="user",
        resource_id=str(user_id)
    )

    # Note: If you want 'Purge' to also delete the shop, 
    # the frontend should call the /tenants/{id} DELETE endpoint instead.
    
    supabase_service.auth.admin.delete_user(str(user_id))
    return {"message": "User deleted successfully"}
