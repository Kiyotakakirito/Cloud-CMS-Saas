from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr

from supabase_client import supabase, supabase_service
from schemas.user import UserOut
from utils.auth import get_current_user, require_role
from .audit import log_action

router = APIRouter(prefix="/api/v1/staff", tags=["Staff Management"])

class StaffCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str
    permissions: Optional[dict] = {}

class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    permissions: Optional[dict] = None

@router.get("/", response_model=List[UserOut])
async def list_staff(
    current_user: UserOut = Depends(require_role(["owner", "admin"]))
):
    """List all staff members and fetch their permissions from Auth Metadata"""
    tenant_id = current_user.tenant_id
    
    # 1. Fetch profiles from Database
    if current_user.role == "admin":
        query = supabase_service.table("user_profiles").select("*")
    else:
        if tenant_id is None:
             raise HTTPException(status_code=400, detail="Owner has no tenant assigned")
        query = supabase_service.table("user_profiles").select("*").eq("tenant_id", tenant_id)
    
    db_res = query.order("created_at", desc=True).execute()
    
    # 2. Fetch all users from Auth to get metadata (permissions)
    # Note: list_users() returns up to 1000 users. For a small shop this is fine.
    auth_users = supabase_service.auth.admin.list_users()
    auth_map = {u.id: u.user_metadata for u in auth_users}
    
    users_out = []
    for p in db_res.data:
        p_id = p["id"]
        metadata = auth_map.get(p_id, {})
        
        user_dict = {
            "id": UUID(p_id),
            "email": p.get("email", "unknown@example.com"),
            "full_name": p.get("full_name"),
            "role": p.get("role"),
            "tenant_id": p.get("tenant_id"),
            "is_active": p.get("is_active"),
            "created_at": p.get("created_at"),
            "permissions": metadata.get("permissions", {}) # Fetch from Auth Metadata
        }
        users_out.append(user_dict)
    return users_out

@router.post("/", response_model=UserOut)
async def create_staff(
    staff_data: StaffCreate,
    current_user: UserOut = Depends(require_role(["owner", "admin"]))
):
    """Create a new staff member with permissions stored in Auth Metadata"""
    tenant_id = current_user.tenant_id
    
    if current_user.role != "admin" and tenant_id is None:
        raise HTTPException(status_code=400, detail="Owner has no tenant assigned")

    try:
        # Create Auth User with Permissions in Metadata
        auth_res = supabase_service.auth.admin.create_user({
            "email": staff_data.email,
            "password": staff_data.password,
            "email_confirm": True,
            "user_metadata": {
                "role": staff_data.role, 
                "full_name": staff_data.full_name,
                "tenant_id": tenant_id,
                "permissions": staff_data.permissions # Store here!
            }
        })

        if not auth_res.user:
            raise HTTPException(status_code=400, detail="Error creating auth user")

        user_id = auth_res.user.id

        # Update Profile (Non-permission fields)
        profile_data = {
            "full_name": staff_data.full_name,
            "role": staff_data.role,
            "tenant_id": tenant_id,
            "is_active": True
        }
        supabase_service.table("user_profiles").update(profile_data).eq("id", user_id).execute()
        
        await log_action(
            user_id=current_user.id,
            action="CREATE_STAFF",
            resource="user",
            resource_id=str(user_id),
            details={"email": staff_data.email, "role": staff_data.role, "perms": True},
            tenant_id=tenant_id
        )

        res = supabase_service.table("user_profiles").select("*").eq("id", user_id).execute()
        p = res.data[0]
        p["permissions"] = staff_data.permissions
        return p

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{user_id}/", response_model=UserOut)
async def update_staff(
    user_id: UUID,
    staff_data: StaffUpdate,
    current_user: UserOut = Depends(require_role(["owner", "admin"]))
):
    """Update staff member and sync permissions to Auth Metadata"""
    check_res = supabase_service.table("user_profiles").select("tenant_id, role").eq("id", str(user_id)).execute()
    if not check_res.data:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    staff = check_res.data[0]
    if current_user.role != "admin":
        if staff["tenant_id"] != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Not authorized")

    try:
        update_dict = staff_data.model_dump(exclude_unset=True)
        permissions = update_dict.pop("permissions", None)
        
        # 1. Update Database Profile (Core fields)
        if update_dict:
            db_res = supabase_service.table("user_profiles").update(update_dict).eq("id", str(user_id)).execute()
            final_profile = db_res.data[0]
        else:
            db_res = supabase_service.table("user_profiles").select("*").eq("id", str(user_id)).execute()
            final_profile = db_res.data[0]

        # 2. Update Auth Metadata (Permissions & Role)
        # We fetch existing metadata to ensure we don't wipe out other fields
        existing_auth = supabase_service.auth.admin.get_user_by_id(str(user_id))
        existing_meta = existing_auth.user.user_metadata or {}
        
        new_meta = {**existing_meta}
        if permissions is not None:
            new_meta["permissions"] = permissions
        if "role" in update_dict:
            new_meta["role"] = update_dict["role"]
            
        supabase_service.auth.admin.update_user_by_id(
            str(user_id), 
            {"user_metadata": new_meta}
        )
        
        final_profile["permissions"] = new_meta.get("permissions", {})
        return final_profile
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{user_id}/")
async def delete_staff(
    user_id: UUID,
    current_user: UserOut = Depends(require_role(["owner", "admin"]))
):
    """Delete a staff member (Owner only for their tenant)"""
    check_res = supabase_service.table("user_profiles").select("tenant_id, role").eq("id", str(user_id)).execute()
    if not check_res.data:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    staff = check_res.data[0]
    if current_user.role != "admin":
        if staff["tenant_id"] != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete staff from another tenant")
        if staff["role"] == "owner":
            raise HTTPException(status_code=403, detail="Owners cannot delete other owners")

    try:
        supabase_service.auth.admin.delete_user(str(user_id))
        
        await log_action(
            user_id=current_user.id,
            action="DELETE_STAFF",
            resource="user",
            resource_id=str(user_id),
            tenant_id=current_user.tenant_id
        )
        return {"message": "Staff member deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
