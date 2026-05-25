from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from uuid import UUID

from supabase_client import supabase, supabase_service
from schemas.user import UserOut
from utils.auth import get_current_user, require_role
from utils.logger import logger
from .audit import log_action

router = APIRouter(prefix="/api/v1/tenants", tags=["Tenant Management"])

class TenantCreate(BaseModel):
    name: str
    slug: str
    is_active: bool = True
    # Owner details for atomic creation
    owner_email: Optional[EmailStr] = None
    owner_password: Optional[str] = None
    owner_full_name: Optional[str] = None

class TenantOut(BaseModel):
    id: int
    name: str
    slug: str
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True

@router.get("/my-shop/", response_model=TenantOut)
async def get_my_shop(
    current_user: UserOut = Depends(get_current_user)
):
    """Get own shop details (Owners/Admins)"""
    tenant_id = current_user.tenant_id
    if tenant_id is None:
        raise HTTPException(status_code=400, detail="User has no tenant assigned")
        
    res = supabase_service.table("tenants").select("*").eq("id", tenant_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Shop not found")
    return res.data[0]

@router.put("/my-shop/", response_model=TenantOut)
async def update_my_shop(
    tenant_data: dict,
    current_user: UserOut = Depends(get_current_user)
):
    """Update own shop details (Owners only)"""
    tenant_id = current_user.tenant_id
    if tenant_id is None:
        raise HTTPException(status_code=400, detail="User has no tenant assigned")
        
    # Filter valid keys for owner update
    valid_data = {k: v for k, v in tenant_data.items() if k in ["name"]}

    res = supabase_service.table("tenants").update(valid_data).eq("id", tenant_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Shop not found")
    return res.data[0]

@router.get("/", response_model=List[TenantOut])
async def list_tenants(
    current_user: UserOut = Depends(require_role(["admin"]))
):
    """List all tenants (Admin only)"""
    res = supabase_service.table("tenants").select("*").execute()
    return res.data

@router.get("/{tenant_id}/", response_model=TenantOut)
async def get_tenant(
    tenant_id: int,
    current_user: UserOut = Depends(require_role(["admin"]))
):
    """Get tenant details (Admin only)"""
    res = supabase_service.table("tenants").select("*").eq("id", tenant_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return res.data[0]

@router.post("/", response_model=TenantOut)
async def create_tenant(
    tenant_data: TenantCreate,
    current_user: UserOut = Depends(require_role(["admin"]))
):
    """Create a new tenant and optionally its first owner account (Admin only)"""
    # 1. Check if slug already exists
    check_res = supabase_service.table("tenants").select("id").eq("slug", tenant_data.slug).execute()
    if check_res.data:
        raise HTTPException(status_code=400, detail="Tenant slug already exists")

    # 2. Create the tenant
    tenant_insert_data = {
        "name": tenant_data.name,
        "slug": tenant_data.slug,
        "is_active": tenant_data.is_active
    }
    
    res = supabase_service.table("tenants").insert(tenant_insert_data).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Error creating tenant")

    new_tenant = res.data[0]
    tenant_id = new_tenant["id"]

    # 3. Create owner user if provided
    if tenant_data.owner_email and tenant_data.owner_password:
        try:
            # Create user in Supabase Auth
            auth_res = supabase_service.auth.admin.create_user({
                "email": tenant_data.owner_email,
                "password": tenant_data.owner_password,
                "email_confirm": True,
                "user_metadata": {
                    "role": "owner", 
                    "full_name": tenant_data.owner_full_name or tenant_data.name + " Owner",
                    "tenant_id": tenant_id
                }
            })

            if auth_res.user:
                owner_id = auth_res.user.id
                # Update profile linked to tenant (Trigger will handle the insert, but we update to be safe)
                supabase_service.table("user_profiles").update({
                    "tenant_id": tenant_id,
                    "role": "owner"
                }).eq("id", owner_id).execute()
        except Exception as e:
            logger.warning(f"Failed to create owner for tenant {tenant_id}: {str(e)}")

    return new_tenant

@router.put("/{tenant_id}/", response_model=TenantOut)
async def update_tenant(
    tenant_id: int,
    tenant_data: dict,
    current_user: UserOut = Depends(require_role(["admin"]))
):
    """Update tenant details (Admin only)"""
    # Filter valid keys
    valid_data = {k: v for k, v in tenant_data.items() if k in ["name", "slug", "is_active"]}

    res = supabase_service.table("tenants").update(valid_data).eq("id", tenant_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return res.data[0]

@router.delete("/{tenant_id}/")
async def delete_tenant(
    tenant_id: int,
    current_user: UserOut = Depends(require_role(["admin"]))
):
    """Delete tenant and ALL associated data (Admin only)"""
    logger.info(f"PERMANENT PURGE requested for Tenant #{tenant_id} by {current_user.email}")
    
    try:
        # 1. Purge all operational data linked to this tenant
        tables_to_purge = [
            "support_tickets",
            "payments",
            "invoices",
            "customers",
            "billing_plans",
            "audit_logs",
            "outages"
        ]
        
        for table in tables_to_purge:
            try:
                supabase_service.table(table).delete().eq("tenant_id", tenant_id).execute()
            except Exception as tbl_err:
                logger.warning(f"Could not purge table {table} for tenant {tenant_id}: {str(tbl_err)}")

        # 2. Find all users associated with this tenant
        users_res = supabase_service.table("user_profiles").select("id").eq("tenant_id", tenant_id).execute()
        user_ids = [u["id"] for u in users_res.data]

        # 3. Delete auth users
        for uid in user_ids:
            try:
                supabase_service.auth.admin.delete_user(uid)
            except Exception as e:
                logger.warning(f"Failed to delete auth user {uid}: {str(e)}")

        # 4. Manually delete profiles if they remain
        try:
            supabase_service.table("user_profiles").delete().eq("tenant_id", tenant_id).execute()
        except Exception as prof_err:
            logger.warning(f"Failed to delete profiles for tenant {tenant_id}: {str(prof_err)}")

        # 5. Finally delete the tenant record
        res = supabase_service.table("tenants").delete().eq("id", tenant_id).execute()
        
        if not res.data:
            # If data is empty but no error, it might already be gone
            logger.info(f"Tenant #{tenant_id} already deleted or not found.")
            return {"message": "Tenant record was already removed or not found."}
        
        await log_action(
            user_id=current_user.id,
            action="PURGE_TENANT",
            resource="tenant",
            resource_id=str(tenant_id),
            details={"tenant_id": tenant_id},
            tenant_id=None # Admin action
        )
        
        return {"message": "Tenant and all associated accounts purged successfully"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Tenant purge CRITICAL failure: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
