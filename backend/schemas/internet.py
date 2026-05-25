from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime

class InternetServiceBase(BaseModel):
    customer_id: int
    mac_address: str
    plan_id: int
    ip_address: Optional[str] = None
    cmts_ip: Optional[str] = None
    node_id: Optional[int] = None
    equipment_id: Optional[int] = None

class InternetServiceCreate(InternetServiceBase):
    pass

class InternetServiceUpdate(BaseModel):
    plan_id: Optional[int] = None
    ip_address: Optional[str] = None
    cmts_ip: Optional[str] = None
    node_id: Optional[int] = None
    equipment_id: Optional[int] = None
    status: Optional[str] = None

class InternetServiceResponse(InternetServiceBase):
    id: int
    tenant_id: int
    download_speed_mbps: int
    upload_speed_mbps: int
    data_cap_gb: Optional[int]
    status: str
    activation_date: datetime
    suspension_date: Optional[datetime]
    termination_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class InternetPlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    download_speed_mbps: int
    upload_speed_mbps: int
    data_cap_gb: Optional[int] = None
    base_price: float
    cgst_rate: float = 9.0
    sgst_rate: float = 9.0
    is_unlimited: bool = False
    includes_static_ip: bool = False
    includes_router: bool = False

class InternetPlanCreate(InternetPlanBase):
    pass

class InternetPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    download_speed_mbps: Optional[int] = None
    upload_speed_mbps: Optional[int] = None
    data_cap_gb: Optional[int] = None
    base_price: Optional[float] = None
    cgst_rate: Optional[float] = None
    sgst_rate: Optional[float] = None
    is_unlimited: Optional[bool] = None
    includes_static_ip: Optional[bool] = None
    includes_router: Optional[bool] = None
    is_active: Optional[bool] = None

class InternetPlanResponse(InternetPlanBase):
    id: int
    tenant_id: int
    total_price: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DataUsageBase(BaseModel):
    download_bytes: int = 0
    upload_bytes: int = 0
    total_bytes: int = 0
    usage_date: datetime
    period: str = "daily"  # daily, weekly, monthly

class DataUsageResponse(DataUsageBase):
    id: int
    internet_service_id: int
    tenant_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ServiceActivationRequest(BaseModel):
    action: str  # activate, suspend, terminate
    reason: Optional[str] = None

class ServiceActivationLogResponse(BaseModel):
    id: int
    internet_service_id: int
    tenant_id: int
    performed_by: int
    action: str
    previous_status: Optional[str]
    new_status: str
    changes: Optional[str]
    performed_at: datetime

    class Config:
        from_attributes = True