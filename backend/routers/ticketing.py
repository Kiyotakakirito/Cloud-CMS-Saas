from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from uuid import UUID

from supabase_client import supabase
from schemas.user import UserOut
from utils.auth import get_current_user, require_any_role

router = APIRouter(prefix="/api/v1/ticketing", tags=["Ticketing and Outages"])

# --- Schemas ---

class TicketCreate(BaseModel):
    customer_id: int
    issue_type: str
    description: str

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    assigned_worker_id: Optional[UUID] = None

class OutageCreate(BaseModel):
    area: str
    service_type: str
    description: str

class OutageUpdate(BaseModel):
    status: str

# --- Ticket Endpoints ---

@router.post("/tickets/")
async def create_ticket(ticket_in: TicketCreate, current_user: UserOut = Depends(require_any_role)):
    customer_res = supabase.table("customers").select("id").eq("id", ticket_in.customer_id).eq("tenant_id", current_user.tenant_id).execute()
    
    if not customer_res.data:
        raise HTTPException(status_code=404, detail="Customer not found in this tenant")

    ticket_data = {
        "customer_id": ticket_in.customer_id,
        "issue_type": ticket_in.issue_type,
        "description": ticket_in.description,
        "tenant_id": current_user.tenant_id,
        "status": "Open"
    }
    
    res = supabase.table("support_tickets").insert(ticket_data).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Error creating ticket")
    
    return res.data[0]

@router.get("/tickets/")
async def get_tickets(status: Optional[str] = None, current_user: UserOut = Depends(require_any_role)):
    query = supabase.table("support_tickets").select("*, customers(full_name, area), user_profiles(full_name)").eq("tenant_id", current_user.tenant_id)
    
    # If the user is a worker, they should only see tickets assigned to them or unassigned tickets
    if current_user.role == "worker":
        query = query.or_(f"assigned_worker_id.eq.{current_user.id},assigned_worker_id.is.null")
        
    if status is not None:
        query = query.eq("status", status)
        
    res = query.order("created_at", desc=True).execute()
    
    # Enrich/format results
    results = []
    for t in res.data:
        results.append({
            "id": t["id"],
            "customer_id": t["customer_id"],
            "customer_name": t.get("customers", {}).get("full_name", "Unknown"),
            "customer_area": t.get("customers", {}).get("area", "Unknown"),
            "issue_type": t["issue_type"],
            "description": t["description"],
            "status": t["status"],
            "assigned_worker_id": t["assigned_worker_id"],
            "worker_name": t.get("user_profiles", {}).get("full_name", "Unassigned"),
            "created_at": t["created_at"][:10],
        })
    return results

@router.patch("/tickets/{ticket_id}/")
async def update_ticket(ticket_id: int, ticket_in: TicketUpdate, current_user: UserOut = Depends(require_any_role)):
    check_res = supabase.table("support_tickets").select("id").eq("id", ticket_id).eq("tenant_id", current_user.tenant_id).execute()
    
    if not check_res.data:
        raise HTTPException(status_code=404, detail="Ticket not found")

    update_data = {}
    if ticket_in.status:
        update_data["status"] = ticket_in.status
        if ticket_in.status == "Resolved":
            update_data["resolved_at"] = datetime.utcnow().isoformat()
            
    if ticket_in.assigned_worker_id is not None:
        # Only owners/senior_workers can assign tickets to others
        if current_user.role in ["owner", "senior_worker"]:
            update_data["assigned_worker_id"] = str(ticket_in.assigned_worker_id)

    if not update_data:
        return {"message": "No changes requested"}

    res = supabase.table("support_tickets").update(update_data).eq("id", ticket_id).execute()
    
    if not res.data:
        raise HTTPException(status_code=400, detail="Error updating ticket")
        
    return {"message": "Ticket updated", "status": res.data[0]["status"], "assigned": res.data[0]["assigned_worker_id"]}

# --- Outage Endpoints ---

@router.post("/outages/")
async def declare_outage(out_in: OutageCreate, current_user: UserOut = Depends(require_any_role)):
    if current_user.role not in ["owner", "senior_worker"]:
        raise HTTPException(status_code=403, detail="Not authorized to declare an outage")

    outage_data = {
        "area": out_in.area,
        "service_type": out_in.service_type,
        "description": out_in.description,
        "tenant_id": current_user.tenant_id,
        "status": "Active"
    }
    
    res = supabase.table("outages").insert(outage_data).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Error declaring outage")
    
    # MOCK NOTIFICATION SYSTEM
    affected_customers_res = supabase.table("customers").select("id", count="exact")\
        .eq("area", out_in.area)\
        .eq("tenant_id", current_user.tenant_id)\
        .execute()
    
    affected_customers = affected_customers_res.count or 0
    
    return {
        "message": f"Outage declared for {out_in.area}. Sent SMS dispatch to {affected_customers} customers.",
        "outage_id": res.data[0]["id"]
    }

@router.get("/outages/")
async def get_outages(current_user: UserOut = Depends(require_any_role)):
    res = supabase.table("outages").select("*").eq("tenant_id", current_user.tenant_id).order("created_at", desc=True).execute()
    
    results = []
    for out in res.data:
        results.append({
            "id": out["id"],
            "area": out["area"],
            "service_type": out["service_type"],
            "description": out["description"],
            "status": out["status"],
            "created_at": out["created_at"][:10]
        })
    return results

@router.patch("/outages/{outage_id}/")
async def update_outage(outage_id: int, out_in: OutageUpdate, current_user: UserOut = Depends(require_any_role)):
    check_res = supabase.table("outages").select("id").eq("id", outage_id).eq("tenant_id", current_user.tenant_id).execute()
    if not check_res.data:
        raise HTTPException(status_code=404, detail="Outage not found")
        
    update_data = {"status": out_in.status}
    if out_in.status == "Resolved":
        update_data["resolved_at"] = datetime.utcnow().isoformat()
        
    res = supabase.table("outages").update(update_data).eq("id", outage_id).execute()
    
    if not res.data:
        raise HTTPException(status_code=400, detail="Error updating outage")
        
    return {"message": f"Outage marked as {out_in.status}"}
