from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from datetime import datetime, date, timedelta
from typing import List, Optional
import uuid
from uuid import UUID

from utils.auth import get_current_user
from supabase_client import supabase, supabase_service
from schemas.user import UserOut
from schemas.billing import (
    BillingPlanCreate, BillingPlanUpdate, BillingPlanResponse,
    InvoiceCreate, InvoiceResponse,
    PaymentCreate, PaymentResponse
)
from utils.logger import logger
from .audit import log_action

router = APIRouter(prefix="/api/v1/billing", tags=["Billing & Payments"])

# --- SCHEMAS FOR REQUEST BODIES ---

class ManualInvoiceRequest(BaseModel):
    customer_id: int
    amount: float
    description: str = "Additional Charge"

class RenewalRequest(BaseModel):
    customer_id: int
    cycles: int = 1
    with_payment: bool = True
    amount: float
    payment_method: str = "Cash" 
    discount: float = 0.0
    payment_date: Optional[date] = None

class ClearOutstandingRequest(BaseModel):
    customer_id: int
    amount: float
    payment_method: str = "Cash"

# --- BILLING PLANS ---

@router.get("/plans/", response_model=List[BillingPlanResponse])
async def get_plans(current_user: UserOut = Depends(get_current_user)):
    res = supabase.table("billing_plans").select("*").eq("tenant_id", current_user.tenant_id).eq("is_active", 1).execute()
    return res.data

@router.post("/plans/", response_model=BillingPlanResponse)
async def create_plan(plan: BillingPlanCreate, current_user: UserOut = Depends(get_current_user)):
    total_price = plan.base_price # Base price is now tax-inclusive

    plan_data = plan.model_dump()
    plan_data["tenant_id"] = current_user.tenant_id
    plan_data["total_price"] = total_price
    plan_data["cgst_rate"] = 0.0
    plan_data["sgst_rate"] = 0.0

    res = supabase_service.table("billing_plans").insert(plan_data).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Error creating plan")
    
    new_plan = res.data[0]
    await log_action(
        user_id=current_user.id,
        action="CREATE_PLAN",
        resource="billing_plan",
        resource_id=str(new_plan["id"]),
        details={"name": new_plan["name"], "price": new_plan["total_price"]},
        tenant_id=current_user.tenant_id
    )
    return new_plan

@router.put("/plans/{plan_id}/", response_model=BillingPlanResponse)
async def update_plan(
    plan_id: int, 
    plan: BillingPlanUpdate, 
    current_user: UserOut = Depends(get_current_user)
):
    """Update an existing billing plan and propagate price to pending invoices"""
    update_data = plan.model_dump(exclude_unset=True)
    
    # If base_price is being updated, total_price should follow
    if "base_price" in update_data:
        update_data["total_price"] = update_data["base_price"]
        update_data["cgst_rate"] = 0.0
        update_data["sgst_rate"] = 0.0

    res = supabase_service.table("billing_plans").update(update_data).eq("id", plan_id).eq("tenant_id", current_user.tenant_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # PROPAGATE PRICE CHANGE: Update all Pending invoices linked to this plan
    if "base_price" in update_data:
        supabase_service.table("invoices").update({
            "subtotal": update_data["base_price"],
            "total_amount": update_data["total_price"],
            "cgst_amount": 0.0,
            "sgst_amount": 0.0
        }).eq("plan_id", plan_id).eq("status", "Pending").execute()

    await log_action(
        user_id=current_user.id,
        action="UPDATE_PLAN",
        resource="billing_plan",
        resource_id=str(plan_id),
        details={"updated_fields": list(update_data.keys())},
        tenant_id=current_user.tenant_id
    )

    return res.data[0]

@router.delete("/plans/{plan_id}/")
async def delete_plan(plan_id: int, current_user: UserOut = Depends(get_current_user)):
    """Deactivate a billing plan"""
    res = supabase_service.table("billing_plans").update({"is_active": 0}).eq("id", plan_id).eq("tenant_id", current_user.tenant_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    await log_action(
        user_id=current_user.id,
        action="DELETE_PLAN",
        resource="billing_plan",
        resource_id=str(plan_id),
        tenant_id=current_user.tenant_id
    )
    return {"message": "Plan deactivated successfully"}

# --- INVOICING ---

@router.get("/invoices/", response_model=List[InvoiceResponse])
async def get_invoices(
    customer_id: int = None,
    current_user: UserOut = Depends(get_current_user)
):
    query = supabase.table("invoices").select("*").eq("tenant_id", current_user.tenant_id)
    if customer_id:
        query = query.eq("customer_id", customer_id)
    
    res = query.order("created_at", desc=True).execute()
    return res.data

@router.post("/invoices/create-single/")
async def create_single_invoice(customer_id: int, current_user: UserOut = Depends(get_current_user)):
    """Create a manual invoice for a specific customer based on their plan"""
    cust_res = supabase.table("customers").select("*, billing_plans(*)").eq("id", customer_id).eq("tenant_id", current_user.tenant_id).execute()
    if not cust_res.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer = cust_res.data[0]
    plan = customer.get("billing_plans")
    
    if not plan:
        raise HTTPException(status_code=400, detail="Customer has no billing plan assigned")

    current_month = datetime.now().strftime("%b-%Y")
    
    invoice = {
        "tenant_id": current_user.tenant_id,
        "customer_id": customer["id"],
        "plan_id": plan["id"],
        "invoice_number": f"INV-{uuid.uuid4().hex[:8].upper()}",
        "billing_cycle": current_month,
        "subtotal": plan["base_price"],
        "cgst_amount": 0.0,
        "sgst_amount": 0.0,
        "total_amount": plan["total_price"],
        "paid_amount": 0.0,
        "issue_date": date.today().isoformat(),
        "due_date": (date.today() + timedelta(days=7)).isoformat(),
        "status": "Pending"
    }
    
    res = supabase_service.table("invoices").insert(invoice).execute()
    if not res.data:
        logger.error(f"Invoice creation failed for customer {customer_id}")
        raise HTTPException(status_code=400, detail="Failed to create invoice")
        
    await log_action(
        user_id=current_user.id,
        action="GENERATE_INVOICE",
        resource="customer",
        resource_id=str(customer_id),
        details={"plan_id": plan["id"], "amount": plan["total_price"]},
        tenant_id=current_user.tenant_id
    )
        
    return res.data[0]

@router.post("/invoices/manual/")
async def create_manual_invoice(
    req: ManualInvoiceRequest,
    current_user: UserOut = Depends(get_current_user)
):
    """Create a manual invoice with tenant ownership verification"""
    # SECURITY CHECK: Verify customer belongs to this tenant
    cust_check = supabase.table("customers").select("id").eq("id", req.customer_id).eq("tenant_id", current_user.tenant_id).execute()
    if not cust_check.data:
        raise HTTPException(status_code=403, detail="Customer not found in your shop")

    invoice = {
        "tenant_id": current_user.tenant_id,
        "customer_id": req.customer_id,
        "plan_id": None,
        "invoice_number": f"MAN-{uuid.uuid4().hex[:8].upper()}",
        "billing_cycle": datetime.now().strftime("%b-%Y"),
        "subtotal": req.amount,
        "cgst_amount": 0,
        "sgst_amount": 0,
        "total_amount": req.amount,
        "paid_amount": 0.0,
        "issue_date": date.today().isoformat(),
        "due_date": date.today().isoformat(),
        "status": "Pending",
        "notes": req.description
    }
    
    res = supabase_service.table("invoices").insert(invoice).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to create manual invoice")
        
    await log_action(
        user_id=current_user.id,
        action="MANUAL_CHARGE",
        resource="customer",
        resource_id=str(req.customer_id),
        details={"amount": req.amount, "desc": req.description},
        tenant_id=current_user.tenant_id
    )
        
    return res.data[0]

@router.post("/clear-outstanding/")
async def clear_outstanding_balance(
    req: ClearOutstandingRequest,
    current_user: UserOut = Depends(get_current_user)
):
    """Settle outstanding invoices using atomic database transaction"""
    try:
        res = supabase_service.rpc("fn_clear_outstanding_balance", {
            "p_customer_id": req.customer_id,
            "p_amount": req.amount,
            "p_payment_method": req.payment_method,
            "p_tenant_id": current_user.tenant_id,
            "p_collected_by": str(current_user.id)
        }).execute()

        if not res.data:
            raise HTTPException(status_code=400, detail="Transaction failed or no balance found")

        # Log the success
        await log_action(
            user_id=current_user.id,
            action="CLEAR_BALANCE",
            resource="customer",
            resource_id=str(req.customer_id),
            details={"amount": req.amount, "method": req.payment_method, "atomic": True},
            tenant_id=current_user.tenant_id
        )

        return res.data
    except Exception as e:
        logger.error(f"Atomic clearance failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/renew/")
async def renew_subscription(
    req: RenewalRequest,
    current_user: UserOut = Depends(get_current_user)
):
    """Renew subscription using atomic database transaction (Invoice + Payment + Expiry)"""
    try:
        res = supabase_service.rpc("fn_renew_subscription", {
            "p_customer_id": req.customer_id,
            "p_cycles": req.cycles,
            "p_with_payment": req.with_payment,
            "p_amount": req.amount,
            "p_discount": req.discount,
            "p_payment_method": req.payment_method,
            "p_payment_date": (req.payment_date or date.today()).isoformat(),
            "p_tenant_id": current_user.tenant_id,
            "p_collected_by": str(current_user.id)
        }).execute()

        if not res.data:
            raise HTTPException(status_code=400, detail="Renewal transaction failed")

        # Log the action
        await log_action(
            user_id=current_user.id,
            action="RENEW_SUBSCRIPTION",
            resource="customer",
            resource_id=str(req.customer_id),
            details={"cycles": req.cycles, "amount": req.amount, "method": req.payment_method, "atomic": True},
            tenant_id=current_user.tenant_id
        )

        return res.data

    except Exception as e:
        logger.error(f"Atomic renewal failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/retract/{entry_type}/{entry_id}/")
async def retract_transaction(
    entry_type: str, # 'invoice' or 'payment'
    entry_id: int,
    current_user: UserOut = Depends(get_current_user)
):
    """Undo a mistaken transaction and update audit log"""
    tenant_id = current_user.tenant_id
    is_admin = current_user.role == "admin"
    
    logger.info(f"Retract requested: {entry_type} {entry_id} by user {current_user.email} (Tenant: {tenant_id})")
    
    try:
        if entry_type == "payment":
            query = supabase_service.table("payments").select("*").eq("id", entry_id)
            if not is_admin:
                if tenant_id is None:
                    raise HTTPException(status_code=403, detail="Owner has no tenant ID assigned. Access denied.")
                query = query.eq("tenant_id", tenant_id)
                
            pay_res = query.execute()
            if not pay_res.data: 
                raise HTTPException(status_code=404, detail=f"Payment #{entry_id} not found in your shop records.")
            pay = pay_res.data[0]
            
            # 1. Rollback invoice paid_amount
            inv_res = supabase_service.table("invoices").select("*").eq("id", pay["invoice_id"]).execute()
            if inv_res.data:
                inv = inv_res.data[0]
                curr_paid = inv.get("paid_amount") or 0.0
                new_paid = max(0, curr_paid - pay["amount"])
                supabase_service.table("invoices").update({
                    "paid_amount": new_paid,
                    "status": "Pending"
                }).eq("id", inv["id"]).execute()
                
                # 2. Rollback expiry date if it was a renewal invoice
                if inv["invoice_number"].startswith("RNW"):
                    cust_res = supabase_service.table("customers").select("subscription_end_date").eq("id", pay["customer_id"]).execute()
                    if cust_res.data and cust_res.data[0]["subscription_end_date"]:
                        try:
                            curr_expiry = date.fromisoformat(cust_res.data[0]["subscription_end_date"])
                            new_expiry = curr_expiry - timedelta(days=30)
                            supabase_service.table("customers").update({"subscription_end_date": new_expiry.isoformat()}).eq("id", pay["customer_id"]).execute()
                        except Exception as de:
                            logger.error(f"Date rollback failed: {str(de)}")

            # 3. Permanent purge of the payment entry
            supabase_service.table("payments").delete().eq("id", entry_id).execute()
            
        elif entry_type == "invoice":
            # 1. Fetch the invoice first
            query = supabase_service.table("invoices").select("*").eq("id", entry_id)
            if not is_admin:
                if tenant_id is None:
                    raise HTTPException(status_code=403, detail="Owner has no tenant ID assigned. Access denied.")
                query = query.eq("tenant_id", tenant_id)
                
            inv_res = query.execute()
            if not inv_res.data: 
                raise HTTPException(status_code=404, detail=f"Invoice #{entry_id} not found in your shop records.")
            inv = inv_res.data[0]

            # 2. Check for linked payments and retract them first (Cascading Retraction)
            pay_check = supabase_service.table("payments").select("*").eq("invoice_id", entry_id).execute()
            if pay_check.data:
                for linked_pay in pay_check.data:
                    # Rollback expiry if it was a renewal
                    if inv["invoice_number"].startswith("RNW"):
                        cust_res = supabase_service.table("customers").select("subscription_end_date").eq("id", linked_pay["customer_id"]).execute()
                        if cust_res.data and cust_res.data[0]["subscription_end_date"]:
                            try:
                                curr_expiry = date.fromisoformat(cust_res.data[0]["subscription_end_date"])
                                new_expiry = curr_expiry - timedelta(days=30)
                                supabase_service.table("customers").update({"subscription_end_date": new_expiry.isoformat()}).eq("id", linked_pay["customer_id"]).execute()
                            except Exception as de:
                                logger.error(f"Cascading expiry rollback failed: {str(de)}")
                    
                    # Purge the linked payment
                    supabase_service.table("payments").delete().eq("id", linked_pay["id"]).execute()
            
            # 3. Handle expiry rollback for Credit Renewals (RNW with no payments yet)
            elif inv["invoice_number"].startswith("RNW"):
                 cust_res = supabase_service.table("customers").select("subscription_end_date").eq("id", inv["customer_id"]).execute()
                 if cust_res.data and cust_res.data[0]["subscription_end_date"]:
                    try:
                        curr_expiry = date.fromisoformat(cust_res.data[0]["subscription_end_date"])
                        new_expiry = curr_expiry - timedelta(days=30)
                        supabase_service.table("customers").update({"subscription_end_date": new_expiry.isoformat()}).eq("id", inv["customer_id"]).execute()
                    except Exception as de:
                        logger.error(f"Credit renewal expiry rollback failed: {str(de)}")
            
            # 4. Final purge of the invoice
            supabase_service.table("invoices").delete().eq("id", entry_id).execute()
        else:
            raise HTTPException(status_code=400, detail="Invalid entry type for retraction")

        await log_action(
            user_id=current_user.id,
            action="RETRACT_TRANSACTION",
            resource=entry_type,
            resource_id=str(entry_id),
            details={"type": entry_type, "id": entry_id, "tenant_id": tenant_id},
            tenant_id=tenant_id or (pay["tenant_id"] if entry_type == "payment" else inv["tenant_id"])
        )
        
        return {"message": f"{entry_type.capitalize()} retracted successfully"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Retract unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal error during retraction: {str(e)}")

@router.post("/invoices/generate-monthly/")
async def generate_monthly_invoices(current_user: UserOut = Depends(get_current_user)):
    current_month = datetime.now().strftime("%b-%Y")
    active_customers_res = supabase.table("customers").select("*").eq("tenant_id", current_user.tenant_id).eq("status", "Active").not_.is_("plan_id", "null").execute()
    active_customers = active_customers_res.data
    invoices_created = 0

    for customer in active_customers:
        existing_res = supabase.table("invoices").select("id").eq("customer_id", customer["id"]).eq("billing_cycle", current_month).execute()
        if existing_res.data: continue
        plan_res = supabase.table("billing_plans").select("*").eq("id", customer["plan_id"]).execute()
        if not plan_res.data: continue
        plan = plan_res.data[0]
        invoice = {
            "tenant_id": current_user.tenant_id,
            "customer_id": customer["id"],
            "plan_id": plan["id"],
            "invoice_number": f"INV-{uuid.uuid4().hex[:8].upper()}",
            "billing_cycle": current_month,
            "subtotal": plan["base_price"],
            "cgst_amount": 0,
            "sgst_amount": 0,
            "total_amount": plan["total_price"],
            "paid_amount": 0.0,
            "issue_date": date.today().isoformat(),
            "due_date": (date.today() + timedelta(days=7)).isoformat(),
            "status": "Pending"
        }
        supabase_service.table("invoices").insert(invoice).execute()
        invoices_created += 1
    
    await log_action(
        user_id=current_user.id,
        action="BULK_BILLING",
        resource="shop",
        resource_id=str(current_user.tenant_id),
        details={"count": invoices_created, "month": current_month},
        tenant_id=current_user.tenant_id
    )
    
    return {"message": f"Successfully generated {invoices_created} invoices for {current_month}."}

# --- COLLECTIONS & PAYMENTS ---

@router.get("/collections/all/")
async def get_all_collections(
    search: Optional[str] = None,
    filter_by: str = "all", # recharge, outstanding
    current_user: UserOut = Depends(get_current_user)
):
    """Unified collection view: Payments (Cash/Online) + Credit Recharges (Pending Renewals)"""
    tenant_id = current_user.tenant_id
    
    # 1. Fetch Actual Payments
    pay_query = supabase.table("payments").select("*, customers(*), invoices(status, invoice_number)")\
        .eq("tenant_id", tenant_id)
    pay_res = pay_query.order("payment_date", desc=True).limit(150).execute()
    
    unified_data = []
    for p in pay_res.data:
        unified_data.append({
            "id": f"pay-{p['id']}",
            "amount": p["amount"],
            "date": p["payment_date"],
            "method": p["payment_method"],
            "type": "Payment",
            "customer": p["customers"],
            "invoice_status": p.get("invoices", {}).get("status"),
            "ref": p.get("invoices", {}).get("invoice_number")
        })

    # 2. Fetch Credit Recharges (Pending Invoices starting with RNW)
    inv_query = supabase.table("invoices").select("*, customers(*)")\
        .eq("tenant_id", tenant_id)\
        .eq("status", "Pending")\
        .ilike("invoice_number", "RNW-%")
    inv_res = inv_query.order("created_at", desc=True).limit(50).execute()

    for i in inv_res.data:
        unified_data.append({
            "id": f"inv-{i['id']}",
            "amount": i["total_amount"],
            "date": i["created_at"],
            "method": "Credit",
            "type": "Credit Recharge",
            "customer": i["customers"],
            "invoice_status": "Pending",
            "ref": i["invoice_number"]
        })

    # Sort by date
    unified_data.sort(key=lambda x: x["date"], reverse=True)

    # Filter in memory (for simplicity with joined search)
    if search:
        s = search.lower()
        unified_data = [d for d in unified_data if 
                s in (d["customer"]["full_name"] or "").lower() or 
                s in (d["customer"]["card_number"] or "").lower() or 
                s in (d["customer"]["customer_id"] or "").lower()]
                
    return unified_data

@router.get("/collections/outstanding/")
async def get_outstanding_collections(
    current_user: UserOut = Depends(get_current_user)
):
    """List of all unpaid invoices with customer details"""
    tenant_id = current_user.tenant_id
    res = supabase.table("invoices").select("*, customers(*)").eq("tenant_id", tenant_id).eq("status", "Pending").order("due_date").execute()
    return res.data

@router.get("/collections/settled/")
async def get_settled_collections(
    current_user: UserOut = Depends(get_current_user)
):
    """List of all recorded payments with customer details"""
    tenant_id = current_user.tenant_id
    res = supabase.table("payments").select("*, customers(*)").eq("tenant_id", tenant_id).order("payment_date", desc=True).execute()
    return res.data

@router.get("/collections/export/")
async def export_daily_collections(
    target_date: Optional[date] = None,
    current_user: UserOut = Depends(get_current_user)
):
    """Export payments for a specific day as JSON (to be converted to CSV by frontend)"""
    tenant_id = current_user.tenant_id
    query_date = target_date or date.today()
    
    res = supabase_service.table("payments")\
        .select("payment_date, amount, payment_method, customers(full_name, customer_id, area)")\
        .eq("tenant_id", tenant_id)\
        .eq("payment_date", query_date.isoformat())\
        .execute()
    
    # Flatten the data for easier CSV conversion
    flattened = []
    for p in res.data:
        flattened.append({
            "Date": p["payment_date"],
            "Customer": p["customers"]["full_name"],
            "ID": p["customers"]["customer_id"],
            "Area": p["customers"]["area"],
            "Amount": p["amount"],
            "Method": p["payment_method"]
        })
    
    return flattened

@router.get("/payments/", response_model=List[PaymentResponse])
async def get_payments(
    customer_id: Optional[int] = None,
    tenant_id: Optional[int] = None,
    current_user: UserOut = Depends(get_current_user)
):
    """List collection records, filtered by tenant for owners, or fully accessible for admins"""
    effective_tenant_id = tenant_id if current_user.role == "admin" and tenant_id else current_user.tenant_id
    
    query = supabase.table("payments").select("*")
    if effective_tenant_id:
        query = query.eq("tenant_id", effective_tenant_id)
    if customer_id:
        query = query.eq("customer_id", customer_id)
        
    res = query.order("payment_date", desc=True).limit(500).execute()
    return res.data

@router.post("/payments/record/", response_model=PaymentResponse)
async def record_payment(payment: PaymentCreate, current_user: UserOut = Depends(get_current_user)):
    invoice_res = supabase.table("invoices").select("*").eq("id", payment.invoice_id).eq("tenant_id", current_user.tenant_id).execute()
    if not invoice_res.data: raise HTTPException(status_code=404, detail="Invoice not found")
    invoice = invoice_res.data[0]
    if invoice["status"] == "Paid": raise HTTPException(status_code=400, detail="Invoice is already paid")
    payment_data = payment.model_dump()
    payment_data["tenant_id"] = current_user.tenant_id
    payment_data["collected_by"] = str(current_user.id)
    res = supabase_service.table("payments").insert(payment_data).execute()
    if not res.data: raise HTTPException(status_code=400, detail="Error recording payment")
    new_paid = invoice.get("paid_amount", 0.0) + payment.amount
    update_data = {"paid_amount": new_paid}
    if new_paid >= invoice["total_amount"]: update_data["status"] = "Paid"
    supabase_service.table("invoices").update(update_data).eq("id", payment.invoice_id).execute()
    if new_paid >= invoice["total_amount"]:
        cust_res = supabase_service.table("customers").select("subscription_end_date").eq("id", payment.customer_id).execute()
        if cust_res.data:
            current_expiry_str = cust_res.data[0].get("subscription_end_date")
            if current_expiry_str:
                current_expiry = date.fromisoformat(current_expiry_str)
                base_date = max(current_expiry, date.today())
                new_expiry = base_date + timedelta(days=30)
            else:
                new_expiry = date.today() + timedelta(days=30)
            supabase_service.table("customers").update({"subscription_end_date": new_expiry.isoformat()}).eq("id", payment.customer_id).execute()
    return res.data[0]
