from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List, Optional
from uuid import UUID

from supabase_client import supabase, supabase_service
from schemas.user import UserOut
from utils.auth import get_current_user, require_role

router = APIRouter(prefix="/api/v1/audit", tags=["Audit Logs"])

@router.get("/")
async def list_audit_logs(
    tenant_id: Optional[int] = None,
    action: Optional[str] = None,
    resource: Optional[str] = None,
    current_user: UserOut = Depends(get_current_user)
):
    """List audit logs with manual user profile merging to avoid join errors"""
    query = supabase_service.table("audit_logs").select("*")

    # 1. Filter by Tenant
    if current_user.role == "admin":
        if tenant_id:
            query = query.eq("tenant_id", tenant_id)
    else:
        if current_user.tenant_id is None:
             raise HTTPException(status_code=400, detail="Owner has no tenant assigned")
        query = query.eq("tenant_id", current_user.tenant_id)

    # 2. Other Filters
    if action:
        query = query.eq("action", action)
    if resource:
        query = query.eq("resource", resource)

    # 3. Execute
    log_res = query.order("created_at", desc=True).limit(200).execute()
    logs = log_res.data

    if not logs:
        return []

    # 4. Manual Join: Fetch all user profiles for these logs
    user_ids = list(set([log["user_id"] for log in logs if log.get("user_id")]))
    profiles_res = supabase_service.table("user_profiles").select("id, full_name, email").in_("id", user_ids).execute()
    prof_map = {p["id"]: p for p in profiles_res.data}

    # 5. Merge
    for log in logs:
        log["user_profiles"] = prof_map.get(log["user_id"], {"full_name": "System", "email": "system@cms.com"})

    return logs
async def log_action(
    user_id: UUID, 
    action: str, 
    resource: str, 
    resource_id: str = None, 
    details: dict = None, 
    tenant_id: int = None,
    ip_address: str = None
):
    """Utility to log an action to the audit_logs table"""
    log_data = {
        "user_id": str(user_id),
        "action": action,
        "resource": resource,
        "resource_id": resource_id,
        "details": details or {},
        "tenant_id": tenant_id,
        "ip_address": ip_address
    }
    supabase_service.table("audit_logs").insert(log_data).execute()
