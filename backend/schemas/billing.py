from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from utils.validators import sanitize_html

# --- Billing Plan Schemas ---

class BillingPlanBase(BaseModel):
    name: str = Field(..., description="Name of the plan, e.g., Basic Cable")
    base_price: float = Field(..., description="Price inclusive of all taxes")
    cgst_rate: float = Field(0.0, description="CGST percentage")
    sgst_rate: float = Field(0.0, description="SGST percentage")
    is_active: int = 1

    @field_validator('name')
    def sanitize_name(cls, v):
        return sanitize_html(v) if v else v

class BillingPlanCreate(BillingPlanBase):
    pass

class BillingPlanUpdate(BaseModel):
    name: Optional[str] = None
    base_price: Optional[float] = None
    is_active: Optional[int] = None

    @field_validator('name')
    def sanitize_name(cls, v):
        return sanitize_html(v) if v else v

class BillingPlanResponse(BillingPlanBase):
    id: int
    tenant_id: int
    total_price: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Invoice Schemas ---

class InvoiceBase(BaseModel):
    customer_id: int
    plan_id: Optional[int] = None
    subtotal: float
    cgst_amount: float
    sgst_amount: float
    total_amount: float
    issue_date: date
    due_date: date
    status: str = "Pending"

class InvoiceCreate(InvoiceBase):
    billing_cycle: str  # e.g., "Oct-2023"

class InvoiceResponse(InvoiceBase):
    id: int
    tenant_id: int
    invoice_number: str
    billing_cycle: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Payment Schemas ---

class PaymentBase(BaseModel):
    invoice_id: int
    customer_id: int
    amount: float
    payment_method: str  # "Cash", "UPI"
    transaction_id: Optional[str] = None
    status: str = "Success"

    @field_validator('transaction_id')
    def sanitize_tx_id(cls, v):
        return sanitize_html(v) if v else v

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: int
    tenant_id: int
    collected_by: Optional[UUID] = None
    payment_date: datetime

    class Config:
        from_attributes = True
