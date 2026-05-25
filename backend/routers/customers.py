from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from typing import List, Optional
from uuid import UUID
from datetime import date, timedelta

from supabase_client import supabase, supabase_service
from schemas.customer import (
    CustomerResponse, CustomerCreate, CustomerUpdate,
    ImportPreviewResponse, ImportConfirmRequest
)
from schemas.user import UserOut
from services.crm_service import parse_import_file, generate_customer_id, extract_area_from_door_number
from utils.auth import get_current_user, require_any_role
from .audit import log_action
from utils.logger import logger

router = APIRouter(prefix="/api/v1/customers", tags=["customers"])


# ── Import endpoints ──────────────────────────────────────────────────────────

@router.post("/import/preview/", response_model=ImportPreviewResponse)
async def preview_import(
    file: UploadFile = File(...),
    current_user: UserOut = Depends(require_any_role),
):
    """Parse an Excel/CSV file and return a preview with validation results."""
    tenant_id = current_user.tenant_id
    contents = await file.read()
    try:
        preview_response = await parse_import_file(contents, file.filename, tenant_id)
        return preview_response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/import/confirm/", response_model=dict)
async def confirm_import(
    request: ImportConfirmRequest,
    current_user: UserOut = Depends(require_any_role),
):
    """Commit only the 'new' rows from a validated preview into the database."""
    tenant_id = current_user.tenant_id
    imported_count = 0
    try:
        customers_to_insert = []
        default_expiry = (date.today() + timedelta(days=30)).isoformat()
        
        # Internal cache for sequence numbers to avoid duplicates in same batch
        area_sequence_cache = {}

        for row in request.data:
            if row.status_import == "new":
                area = row.area or extract_area_from_door_number(row.door_number)
                prefix = area if area else "GEN"
                
                # Get or initialize sequence for this area
                if prefix not in area_sequence_cache:
                    # Query once per area prefix per batch
                    latest_res = supabase.table("customers")\
                        .select("customer_id")\
                        .eq("tenant_id", tenant_id)\
                        .like("customer_id", f"{prefix}-%")\
                        .order("id", desc=True)\
                        .limit(1)\
                        .execute()
                    
                    if latest_res.data:
                        try:
                            seq_part = latest_res.data[0]["customer_id"].split("-")[1]
                            area_sequence_cache[prefix] = int(seq_part)
                        except (IndexError, ValueError):
                            area_sequence_cache[prefix] = 0
                    else:
                        area_sequence_cache[prefix] = 0
                
                # Increment sequence
                area_sequence_cache[prefix] += 1
                customer_id = f"{prefix}-{area_sequence_cache[prefix]:03d}"

                expiry = row.expiry_date.isoformat() if row.expiry_date else default_expiry

                customers_to_insert.append({
                    "customer_id": customer_id,
                    "full_name": row.name,
                    "door_number": row.door_number,
                    "area": area,
                    "card_number": row.card_number,
                    "phone_number": row.phone_number,
                    "provider_tag": row.provider_tag,
                    "tenant_id": tenant_id,
                    "subscription_end_date": expiry
                })
        
        if customers_to_insert:
            # Use supabase_service to bypass RLS for large batch inserts if needed, 
            # though supabase should work if RLS allows.
            res = supabase_service.table("customers").insert(customers_to_insert).execute()
            if not res.data:
                 raise Exception("Database insertion returned no data.")
            imported_count = len(res.data)

        await log_action(
            user_id=current_user.id,
            action="IMPORT_CUSTOMERS",
            resource="shop",
            resource_id=str(tenant_id),
            details={"count": imported_count},
            tenant_id=tenant_id
        )

    except Exception as e:
        logger.error(f"Import confirm failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")

    return {
        "message": f"Successfully imported {imported_count} customers.",
        "imported_count": imported_count,
    }


# ── CRUD endpoints ────────────────────────────────────────────────────────────

@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer: CustomerCreate,
    current_user: UserOut = Depends(require_any_role),
):
    tenant_id = current_user.tenant_id
    area = customer.area or extract_area_from_door_number(customer.door_number)
    customer_id = generate_customer_id(area, tenant_id)

    customer_data = customer.model_dump()
    customer_data["customer_id"] = customer_id
    customer_data["area"] = area
    customer_data["tenant_id"] = tenant_id
    
    # Set initial subscription end date to 30 days from today
    if not customer_data.get("subscription_end_date"):
        customer_data["subscription_end_date"] = (date.today() + timedelta(days=30)).isoformat()

    # Use supabase_service to ensure creation succeeds regardless of RLS metadata lag
    try:
        res = supabase_service.table("customers").insert(customer_data).execute()
        if not res.data:
            raise HTTPException(
                status_code=400,
                detail="Error creating customer. Check for duplicate card or customer numbers.",
            )
        
        new_cust = res.data[0]
        await log_action(
            user_id=current_user.id,
            action="CREATE_CUSTOMER",
            resource="customer",
            resource_id=str(new_cust["id"]),
            details={"name": new_cust["full_name"], "id": new_cust["customer_id"]},
            tenant_id=tenant_id
        )
        return new_cust
    except Exception as e:
        logger.error(f"Customer creation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[CustomerResponse])
async def get_customers(
    skip: int = 0,
    limit: int = 100,
    area: Optional[str] = None,
    status: Optional[str] = None,
    include_deleted: bool = False,
    search: Optional[str] = None,
    tenant_id: Optional[int] = None,
    current_user: UserOut = Depends(require_any_role),
):
    # Admins can see any tenant, others only their own
    effective_tenant_id = tenant_id if current_user.role == "admin" and tenant_id else current_user.tenant_id
    
    # Use supabase_service to ensure data is visible regardless of RLS policy state,
    # while still enforcing tenant isolation manually in the query below.
    query = supabase_service.table("customers").select("*")
    if effective_tenant_id is not None:
        query = query.eq("tenant_id", int(effective_tenant_id))
    
    if area:
        query = query.eq("area", area)
    
    if status:
        query = query.eq("status", status)
    elif not include_deleted:
        query = query.neq("status", "Deleted")
        
    if search:
        query = query.or_(f"full_name.ilike.%{search}%,phone_number.ilike.%{search}%,card_number.ilike.%{search}%,customer_id.ilike.%{search}%")
    
    # Order by ID descending so newly imported customers appear first
    res = query.order("id", desc=True).range(skip, skip + limit - 1).execute()
    return res.data


@router.get("/{customer_id}/", response_model=CustomerResponse)
async def get_customer(
    customer_id: int,
    current_user: UserOut = Depends(require_any_role),
):
    tenant_id = current_user.tenant_id
    res = supabase.table("customers").select("*").eq("id", customer_id).eq("tenant_id", tenant_id).execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    return res.data[0]


@router.put("/{customer_id}/", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    customer_update: CustomerUpdate,
    current_user: UserOut = Depends(require_any_role),
):
    tenant_id = current_user.tenant_id
    
    # Check if exists
    check_res = supabase.table("customers").select("id").eq("id", customer_id).eq("tenant_id", tenant_id).execute()
    if not check_res.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = customer_update.model_dump(exclude_unset=True)

    # Recalculate area if door_number changes
    if "door_number" in update_data and "area" not in update_data:
        update_data["area"] = extract_area_from_door_number(update_data["door_number"])

    res = supabase.table("customers").update(update_data).eq("id", customer_id).execute()
    
    if not res.data:
        raise HTTPException(status_code=400, detail="Error updating customer.")
    
    await log_action(
        user_id=current_user.id,
        action="UPDATE_CUSTOMER",
        resource="customer",
        resource_id=str(customer_id),
        details={"updated_fields": list(update_data.keys())},
        tenant_id=tenant_id
    )
    
    return res.data[0]


@router.get("/{customer_id}/profile/")
async def get_customer_profile(
    customer_id: int,
    current_user: UserOut = Depends(require_any_role),
):
    """Aggregated profile data for a specific customer"""
    tenant_id = current_user.tenant_id
    
    # 1. Fetch customer details
    cust_res = supabase.table("customers").select("*, billing_plans(*)").eq("id", customer_id).eq("tenant_id", tenant_id).execute()
    if not cust_res.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer = cust_res.data[0]

    # 2. Fetch invoices (billing history)
    inv_res = supabase.table("invoices").select("*").eq("customer_id", customer_id).order("created_at", desc=True).execute()
    
    # 3. Calculate outstanding balance: Sum(Total) - Sum(Paid) for Pending invoices
    pending_invoices = [i for i in inv_res.data if i["status"] == "Pending"]
    outstanding = sum(i["total_amount"] - i.get("paid_amount", 0.0) for i in pending_invoices)

    # 4. Get all payments for ledger
    pay_res = supabase.table("payments").select("*").eq("customer_id", customer_id).order("payment_date", desc=True).execute()
    payments = pay_res.data

    return {
        "customer": customer,
        "billing": {
            "outstanding": outstanding,
            "last_payment": payments[0] if payments else None,
            "invoices": inv_res.data,
            "payments": payments
        }
    }


@router.post("/{customer_id}/restore/")
async def restore_customer(
    customer_id: int,
    current_user: UserOut = Depends(require_any_role),
):
    """Restore a soft-deleted customer"""
    tenant_id = current_user.tenant_id
    res = supabase.table("customers").update({"status": "Active"}).eq("id", customer_id).eq("tenant_id", tenant_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Customer not found or access denied")
    
    await log_action(
        user_id=current_user.id,
        action="RESTORE_CUSTOMER",
        resource="customer",
        resource_id=str(customer_id),
        tenant_id=tenant_id
    )
    return {"message": "Customer restored successfully"}

@router.delete("/{customer_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: int,
    current_user: UserOut = Depends(require_any_role),
    permanent: bool = False
):
    tenant_id = current_user.tenant_id
    
    if permanent:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can permanently purge records")
        supabase.table("customers").delete().eq("id", customer_id).eq("tenant_id", tenant_id).execute()
    else:
        # Soft delete
        supabase.table("customers").update({"status": "Deleted"}).eq("id", customer_id).eq("tenant_id", tenant_id).execute()
    
    await log_action(
        user_id=current_user.id,
        action="DELETE_CUSTOMER",
        resource="customer",
        resource_id=str(customer_id),
        details={"permanent": permanent},
        tenant_id=tenant_id
    )
    return None
