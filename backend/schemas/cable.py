from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CableServiceBase(BaseModel):
    customer_id: int
    stb_serial_number: str
    package_id: int
    smart_card_number: Optional[str] = None
    node_id: Optional[int] = None
    amplifier_id: Optional[int] = None
    signal_strength: Optional[float] = None
    signal_quality: Optional[float] = None

class CableServiceCreate(CableServiceBase):
    pass

class CableServiceUpdate(BaseModel):
    package_id: Optional[int] = None
    smart_card_number: Optional[str] = None
    node_id: Optional[int] = None
    amplifier_id: Optional[int] = None
    signal_strength: Optional[float] = None
    signal_quality: Optional[float] = None
    status: Optional[str] = None

class CableServiceResponse(CableServiceBase):
    id: int
    tenant_id: int
    status: str
    activation_date: datetime
    suspension_date: Optional[datetime]
    termination_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CablePackageBase(BaseModel):
    name: str
    description: Optional[str] = None
    channel_count: int
    base_price: float
    cgst_rate: float = 9.0
    sgst_rate: float = 9.0
    package_type: str = "Standard"  # Standard, HD, Ultra HD
    includes_recording: bool = False
    includes_ott: bool = False  # Over-the-top services

class CablePackageCreate(CablePackageBase):
    pass

class CablePackageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    channel_count: Optional[int] = None
    base_price: Optional[float] = None
    cgst_rate: Optional[float] = None
    sgst_rate: Optional[float] = None
    package_type: Optional[str] = None
    includes_recording: Optional[bool] = None
    includes_ott: Optional[bool] = None
    is_active: Optional[bool] = None

class CablePackageResponse(CablePackageBase):
    id: int
    tenant_id: int
    total_price: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ChannelBase(BaseModel):
    name: str
    channel_number: int
    language: Optional[str] = None
    category: str  # Entertainment, News, Sports, Movies, etc.
    frequency: Optional[str] = None
    modulation: Optional[str] = None
    is_hd: bool = False
    is_encrypted: bool = False
    standalone_price: float = 0.0

class ChannelCreate(ChannelBase):
    pass

class ChannelUpdate(BaseModel):
    name: Optional[str] = None
    channel_number: Optional[int] = None
    language: Optional[str] = None
    category: Optional[str] = None
    frequency: Optional[str] = None
    modulation: Optional[str] = None
    is_hd: Optional[bool] = None
    is_encrypted: Optional[bool] = None
    standalone_price: Optional[float] = None
    is_active: Optional[bool] = None

class ChannelResponse(ChannelBase):
    id: int
    tenant_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AdditionalChannelSubscriptionBase(BaseModel):
    channel_id: int
    end_date: Optional[datetime] = None

class AdditionalChannelSubscriptionCreate(AdditionalChannelSubscriptionBase):
    pass

class AdditionalChannelSubscriptionResponse(AdditionalChannelSubscriptionBase):
    id: int
    cable_service_id: int
    tenant_id: int
    price: float
    start_date: datetime
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ServiceActivationRequest(BaseModel):
    action: str  # activate, suspend, terminate
    reason: Optional[str] = None

class CableServiceActivationLogResponse(BaseModel):
    id: int
    cable_service_id: int
    tenant_id: int
    performed_by: int
    action: str
    previous_status: Optional[str]
    new_status: str
    changes: Optional[str]
    performed_at: datetime

    class Config:
        from_attributes = True

class PackageChannelAssociation(BaseModel):
    channel_id: int
    channel_number: Optional[int] = None
    is_primary: bool = True

class PackageChannelResponse(PackageChannelAssociation):
    id: int
    package_id: int
    created_at: datetime

    class Config:
        from_attributes = True