from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Optional
from uuid import UUID
from datetime import date, datetime, timedelta

from supabase_client import supabase, supabase_service
from schemas.user import UserOut
from utils.auth import get_current_user, require_role
from utils.logger import logger

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])

@router.get("/dashboard-stats/")
async def get_dashboard_stats(current_user: UserOut = Depends(get_current_user)):
    """Get summarized statistics for the dashboard"""
    
    # If admin, show platform-wide stats
    if current_user.role == "admin":
        tenants_res = supabase_service.table("tenants").select("id, is_active", count="exact").execute()
        users_res = supabase_service.table("user_profiles").select("id, role, is_active", count="exact").execute()
        invoices_res = supabase_service.table("invoices").select("id, status, total_amount", count="exact").execute()

        # Platform Overview
        total_tenants = tenants_res.count or 0
        active_tenants = len([t for t in tenants_res.data if t.get("is_active")])
        
        # Only count non-admin users as "Platform Users" for a more accurate business view
        platform_users = [u for u in users_res.data if u.get("role") != "admin"]
        total_users = len(platform_users)
        active_users = len([u for u in platform_users if u.get("is_active")])

        # Financial (Very simplified)
        paid_invoices_data = [i for i in invoices_res.data if i.get("status") == "Paid"]
        monthly_revenue = sum([i.get("total_amount", 0) for i in paid_invoices_data]) if paid_invoices_data else 0

        # User breakdown
        admin_users = len([u for u in users_res.data if u.get("role") == "admin"])
        owner_users = len([u for u in users_res.data if u.get("role") == "owner"])
        worker_users = len([u for u in users_res.data if u.get("role") in ["worker", "senior_worker"]])

        return {
            "role": "admin",
            "platform_overview": {
                "total_tenants": total_tenants,
                "active_tenants": active_tenants,
                "inactive_tenants": total_tenants - active_tenants,
                "total_users": total_users,
                "active_users": active_users,
            },
            "financial_overview": {
                "monthly_revenue": monthly_revenue,
                "weekly_revenue": monthly_revenue / 4,
                "monthly_revenue_formatted": f"₹{monthly_revenue:,.2f}",
                "weekly_revenue_formatted": f"₹{(monthly_revenue / 4):,.2f}",
            },
            "user_breakdown": {
                "admin_users": admin_users,
                "owner_users": owner_users,
                "worker_users": worker_users,
            }
        }
    
    # For Tenant Owners and Workers, show tenant-specific stats
    else:
        tenant_id = current_user.tenant_id
        if tenant_id is None:
            return {
                "role": current_user.role, 
                "stats": {
                    "total_customers": 0, 
                    "active_customers": 0, 
                    "open_tickets": 0, 
                    "total_tickets": 0, 
                    "monthly_revenue": 0
                }
            }

        customers_res = supabase_service.table("customers").select("id, status", count="exact").eq("tenant_id", tenant_id).execute()
        tickets_res = supabase_service.table("support_tickets").select("id, status", count="exact").eq("tenant_id", tenant_id).execute()
        invoices_res = supabase_service.table("invoices").select("id, status, total_amount", count="exact").eq("tenant_id", tenant_id).execute()
        
        total_customers = customers_res.count or 0
        active_customers = len([c for c in customers_res.data if c.get("status") == "Active"])
        
        open_tickets = len([t for t in tickets_res.data if t.get("status") == "Open"])
        total_tickets = tickets_res.count or 0
        
        paid_invoices_data = [i for i in invoices_res.data if i.get("status") == "Paid"]
        monthly_revenue = sum([i.get("total_amount", 0) for i in paid_invoices_data]) if paid_invoices_data else 0
        
        return {
            "role": current_user.role,
            "stats": {
                "total_customers": total_customers,
                "active_customers": active_customers,
                "open_tickets": open_tickets,
                "total_tickets": total_tickets,
                "monthly_revenue": monthly_revenue,
            }
        }

@router.get("/revenue-tracker/")
async def get_revenue_tracker(current_user: UserOut = Depends(require_role(["admin"]))):
    """Detailed revenue breakdown per owner (Admin only)"""
    # 1. Fetch all tenants
    tenants_res = supabase_service.table("tenants").select("id, name").execute()
    tenants = tenants_res.data
    
    # 2. Fetch all paid invoices
    invoices_res = supabase_service.table("invoices").select("tenant_id, total_amount").eq("status", "Paid").execute()
    invoices = invoices_res.data
    
    # 3. Fetch all pending invoices
    pending_res = supabase_service.table("invoices").select("tenant_id, total_amount").eq("status", "Pending").execute()
    pending = pending_res.data

    breakdown = []
    total_platform_revenue = 0

    for tenant in tenants:
        tenant_id = tenant["id"]
        tenant_paid = sum([i["total_amount"] for i in invoices if i["tenant_id"] == tenant_id])
        tenant_pending = sum([i["total_amount"] for i in pending if i["tenant_id"] == tenant_id])
        
        total_platform_revenue += tenant_paid
        
        breakdown.append({
            "tenant_id": tenant_id,
            "owner_name": tenant["name"],
            "paid_revenue": tenant_paid,
            "pending_revenue": tenant_pending,
            "paid_revenue_formatted": f"₹{tenant_paid:,.2f}",
            "pending_revenue_formatted": f"₹{tenant_pending:,.2f}",
        })

    return {
        "total_platform_revenue": total_platform_revenue,
        "total_platform_revenue_formatted": f"₹{total_platform_revenue:,.2f}",
        "owner_breakdown": breakdown
    }

@router.get("/owner-metrics/")
async def get_owner_metrics(current_user: UserOut = Depends(get_current_user)):
    """Comprehensive 8-box metrics for Shop Owners with accurate Advance/Outstanding"""
    tenant_id = current_user.tenant_id
    if tenant_id is None and current_user.role != "admin":
        raise HTTPException(status_code=400, detail="User has no tenant assigned")

    today = date.today()
    start_of_month = today.replace(day=1)
    
    # 1. Collections Metrics
    pay_today = supabase_service.table("payments").select("amount, payment_method")\
        .eq("tenant_id", tenant_id).gte("payment_date", today.isoformat()).execute()
    
    collected_today = sum(p["amount"] for p in pay_today.data)
    online_today = sum(p["amount"] for p in pay_today.data if p["payment_method"] != "Cash")
    offline_today = sum(p["amount"] for p in pay_today.data if p["payment_method"] == "Cash")

    pay_month = supabase_service.table("payments").select("amount, payment_method")\
        .eq("tenant_id", tenant_id).gte("payment_date", start_of_month.isoformat()).execute()
    
    collected_month = sum(p["amount"] for p in pay_month.data)
    online_month = sum(p["amount"] for p in pay_month.data if p["payment_method"] != "Cash")
    offline_month = sum(p["amount"] for p in pay_month.data if p["payment_method"] == "Cash")

    # 2. Revenue Targets (Due)
    inv_due_today = supabase_service.table("invoices").select("total_amount")\
        .eq("tenant_id", tenant_id).eq("due_date", today.isoformat()).execute()
    due_today = sum(i["total_amount"] for i in inv_due_today.data)

    inv_due_month = supabase_service.table("invoices").select("total_amount")\
        .eq("tenant_id", tenant_id).gte("issue_date", start_of_month.isoformat()).execute()
    due_month = sum(i["total_amount"] for i in inv_due_month.data)

    # 3. Subscriber & Connection Counts (Use count='exact' for efficiency)
    cust_stats = supabase_service.table("customers").select("status", count="exact")\
        .eq("tenant_id", tenant_id).execute()
    
    all_cust_data = cust_stats.data
    total_connections = cust_stats.count or 0
    active_count = len([c for c in all_cust_data if c["status"] == "Active"])
    inactive_count = total_connections - active_count

    # 4. Subscriber Growth
    new_subs_today = supabase_service.table("customers").select("id", count="exact")\
        .eq("tenant_id", tenant_id).gte("created_at", today.isoformat()).execute()
    new_subs_month = supabase_service.table("customers").select("id", count="exact")\
        .eq("tenant_id", tenant_id).gte("created_at", start_of_month.isoformat()).execute()

    # 5. Financial Position (Outstanding vs Advance)
    # To get accurate advance, we compare total lifetime payments vs total lifetime invoices for the tenant
    # However, for the dashboard, we usually show unpaid invoices as outstanding.
    unpaid_invoices = supabase_service.table("invoices").select("total_amount, paid_amount")\
        .eq("tenant_id", tenant_id).eq("status", "Pending").execute()
    outstanding = sum(i["total_amount"] - i.get("paid_amount", 0.0) for i in unpaid_invoices.data)
    
    # Simple advance calculation: Sum of all payments - Sum of all invoices
    # (This is an approximation of 'float' in the system)
    all_payments_sum = supabase_service.table("payments").select("amount")\
        .eq("tenant_id", tenant_id).execute()
    total_paid = sum(p["amount"] for p in all_payments_sum.data)
    
    all_invoices_sum = supabase_service.table("invoices").select("total_amount")\
        .eq("tenant_id", tenant_id).execute()
    total_billed = sum(i["total_amount"] for i in all_invoices_sum.data)
    
    advance = max(0, total_paid - total_billed)

    # 6. Expiry Reports (Top 5)
    expiry_report = [] 
    expired_report = [] 
    
    # We need to fetch customers with expiry dates for the list
    expiring_soon = supabase_service.table("customers")\
        .select("full_name, subscription_end_date")\
        .eq("tenant_id", tenant_id)\
        .gte("subscription_end_date", today.isoformat())\
        .lte("subscription_end_date", (today + timedelta(days=7)).isoformat())\
        .order("subscription_end_date").limit(5).execute()
    
    for c in expiring_soon.data:
        expiry_date = date.fromisoformat(c["subscription_end_date"])
        expiry_report.append({
            "name": c["full_name"],
            "expiry_date": c["subscription_end_date"],
            "days_left": (expiry_date - today).days
        })

    expired_subs = supabase_service.table("customers")\
        .select("full_name, subscription_end_date")\
        .eq("tenant_id", tenant_id)\
        .lt("subscription_end_date", today.isoformat())\
        .order("subscription_end_date", desc=True).limit(5).execute()
    
    for c in expired_subs.data:
        expiry_date = date.fromisoformat(c["subscription_end_date"])
        expired_report.append({
            "name": c["full_name"],
            "expiry_date": c["subscription_end_date"],
            "days_passed": (today - expiry_date).days
        })

    # 7. Ticketing Today
    tickets = supabase_service.table("support_tickets").select("id, status")\
        .eq("tenant_id", tenant_id).gte("created_at", today.isoformat()).execute()
    
    open_tickets = len([t for t in tickets.data if t["status"] == "Open"])
    closed_tickets = len([t for t in tickets.data if t["status"] == "Resolved"])
    canceled_tickets = len([t for t in tickets.data if t["status"] == "Canceled"])

    # 8. Staff Performance (Collections Today)
    staff_breakdown = {}
    for p in pay_today.data:
        worker_id = p.get("collected_by")
        if not worker_id: continue
        
        if worker_id not in staff_breakdown:
            staff_breakdown[worker_id] = {"amount": 0, "count": 0}
        
        staff_breakdown[worker_id]["amount"] += p["amount"]
        staff_breakdown[worker_id]["count"] += 1
    
    # Enrich staff names
    staff_performance = []
    if staff_breakdown:
        staff_ids = list(staff_breakdown.keys())
        profiles_res = supabase_service.table("user_profiles").select("id, full_name").in_("id", staff_ids).execute()
        for prof in profiles_res.data:
            s_id = prof["id"]
            staff_performance.append({
                "worker_name": prof["full_name"],
                "collected": staff_breakdown[s_id]["amount"],
                "tx_count": staff_breakdown[s_id]["count"]
            })

    return {
        "collections_today": {
            "due": due_today,
            "collected": collected_today,
            "online": online_today,
            "offline": offline_today
        },
        "collections_month": {
            "due": due_month,
            "collected": collected_month,
            "online": online_month,
            "offline": offline_month
        },
        "expiry_report": expiry_report,
        "expired_report": expired_report,
        "subscribers": {
            "today": new_subs_today.count or 0,
            "month": new_subs_month.count or 0
        },
        "connections": {
            "active": active_count,
            "inactive": inactive_count,
            "total": total_connections
        },
        "financials": {
            "outstanding": outstanding,
            "advance": advance
        },
        "tickets": {
            "open": open_tickets,
            "closed": closed_tickets,
            "canceled": canceled_tickets
        },
        "staff_performance": staff_performance
    }
