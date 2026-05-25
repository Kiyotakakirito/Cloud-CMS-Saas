from pydantic import BaseModel, Field, validator, constr, field_validator
from typing import Optional, List
from datetime import datetime, date
import re
from utils.validators import sanitize_html

class CustomerBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Customer full name")
    area: Optional[str] = Field(None, max_length=100, description="Area name or code")
    door_number: str = Field(..., min_length=1, max_length=100, description="Door/house number")
    card_number: str = Field(..., min_length=3, max_length=100, description="Customer card number")
    phone_number: Optional[str] = Field(None, max_length=30, description="Primary phone number")
    alternate_phone: Optional[str] = Field(None, max_length=30, description="Alternate phone number")
    service_type: str = Field("Cable", description="Service type: Cable, Internet, or Combo")
    provider_tag: Optional[str] = Field(None, max_length=100, description="Service provider tag")
    status: str = Field("Active", description="Customer status: Active, Inactive, or Suspended")
    subscription_end_date: Optional[date] = Field(None, description="Exact 30-day cycle expiry date")
    plan_id: Optional[int] = Field(None, description="Assigned billing plan ID")
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes")

    @validator('service_type')
    def validate_service_type(cls, v):
        valid_types = {"Cable", "Internet", "Combo"}
        if v not in valid_types:
            raise ValueError(f"Service type must be one of: {', '.join(valid_types)}")
        return v

    @validator('status')
    def validate_status(cls, v):
        valid_statuses = {"Active", "Inactive", "Suspended", "Deleted"}
        if v not in valid_statuses:
            raise ValueError(f"Status must be one of: {', '.join(valid_statuses)}")
        return v

    @validator('phone_number', 'alternate_phone')
    def validate_phone_number(cls, v):
        if not v: # Handles None and empty string
            return None
        # Basic phone number validation (allow numbers, +, -, spaces)
        if not re.match(r'^[\+\d\-\(\)\s]+$', v):
            raise ValueError("Phone number contains invalid characters")
        # Remove non-digit characters and check length
        digits = re.sub(r'\D', '', v)
        if len(digits) < 5 or len(digits) > 20:
            raise ValueError("Phone number must be between 5 and 20 digits")
        return v

    @field_validator('full_name', 'area', 'door_number', 'card_number', 'provider_tag', 'notes')
    def sanitize_strings(cls, v):
        return sanitize_html(v) if v else v

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    full_name: Optional[str] = None
    customer_id: Optional[str] = None
    area: Optional[str] = None
    door_number: Optional[str] = None
    card_number: Optional[str] = None
    phone_number: Optional[str] = None
    alternate_phone: Optional[str] = None
    service_type: Optional[str] = None
    status: Optional[str] = None
    plan_id: Optional[int] = None
    notes: Optional[str] = None
    subscription_end_date: Optional[date] = None

    @field_validator('full_name', 'area', 'door_number', 'card_number', 'notes')
    def sanitize_strings(cls, v):
        return sanitize_html(v) if v else v

class CustomerResponse(CustomerBase):
    id: int
    customer_id: str
    tenant_id: int
    plan_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ImportPreviewRow(BaseModel):
    door_number: Optional[str] = None
    name: Optional[str] = None
    card_number: Optional[str] = None
    phone_number: Optional[str] = None
    provider_tag: Optional[str] = None
    area: Optional[str] = None
    expiry_date: Optional[date] = None
    status_import: str = "pending" # pending, new, duplicate, error
    error_message: Optional[str] = None

    @field_validator('door_number', 'name', 'card_number', 'provider_tag', 'area')
    def sanitize_strings(cls, v):
        return sanitize_html(v) if v else v

class ImportPreviewResponse(BaseModel):
    total_rows: int
    valid_rows: int
    error_rows: int
    duplicate_rows: int
    data: List[ImportPreviewRow]

class ImportConfirmRequest(BaseModel):
    data: List[ImportPreviewRow]
