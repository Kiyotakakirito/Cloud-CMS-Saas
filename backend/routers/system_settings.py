from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Any, Optional
from pydantic import BaseModel

from supabase_client import supabase, supabase_service
from schemas.user import UserOut
from utils.auth import get_current_user, require_role

router = APIRouter(prefix="/api/v1/settings", tags=["System Settings"])

class SettingUpdate(BaseModel):
    value: Any
    description: Optional[str] = None

@router.get("/")
async def get_all_settings(current_user: UserOut = Depends(require_role(["admin"]))):
    """Fetch all system settings (Admin only)"""
    res = supabase_service.table("system_settings").select("*").execute()
    return res.data

@router.put("/{key}/")
async def update_setting(
    key: str, 
    setting: dict, 
    current_user: UserOut = Depends(require_role(["admin"]))
):
    """Update a specific setting (Admin only)"""
    update_data = {
        "value": setting.get("value"),
        "updated_at": "now()",
        "updated_by": str(current_user.id)
    }
    if "description" in setting:
        update_data["description"] = setting["description"]

    res = supabase_service.table("system_settings").update(update_data).eq("key", key).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Setting not found")
    return res.data[0]
