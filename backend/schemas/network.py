from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class NodeType(str, Enum):
    FIBER_NODE = "fiber_node"
    DISTRIBUTION_HUB = "distribution_hub"
    ACCESS_POINT = "access_point"
    HEADEND = "headend"
    CMTS = "cmts"

class EquipmentType(str, Enum):
    MODEM = "modem"
    ROUTER = "router"
    SET_TOP_BOX = "set_top_box"
    AMPLIFIER = "amplifier"
    SPLITTER = "splitter"
    SWITCH = "switch"
    SERVER = "server"

# Network Node Schemas
class NetworkNodeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    node_code: str = Field(..., min_length=1, max_length=20, pattern=r"^[A-Z]-\d{3}$")
    node_type: NodeType
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area: str = Field(..., min_length=1, max_length=10)
    capacity: Optional[int] = None
    ip_address: Optional[str] = None
    status: str = "Active"
    parent_node_id: Optional[int] = None

class NetworkNodeCreate(NetworkNodeBase):
    pass

class NetworkNodeUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area: Optional[str] = None
    capacity: Optional[int] = None
    ip_address: Optional[str] = None
    status: Optional[str] = None
    current_utilization: Optional[int] = None
    parent_node_id: Optional[int] = None
    last_maintenance: Optional[datetime] = None
    next_maintenance: Optional[datetime] = None

class NetworkNodeResponse(NetworkNodeBase):
    id: int
    tenant_id: int
    current_utilization: int
    last_maintenance: Optional[datetime]
    next_maintenance: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# Network Amplifier Schemas
class NetworkAmplifierBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    amplifier_code: str = Field(..., min_length=1, max_length=20, pattern=r"^AMP-\d{3}$")
    model: str = Field(..., min_length=1, max_length=50)
    input_power: Optional[float] = None
    output_power: Optional[float] = None
    gain: Optional[float] = None
    frequency_range: Optional[str] = None
    status: str = "Active"
    node_id: int

class NetworkAmplifierCreate(NetworkAmplifierBase):
    pass

class NetworkAmplifierUpdate(BaseModel):
    name: Optional[str] = None
    model: Optional[str] = None
    input_power: Optional[float] = None
    output_power: Optional[float] = None
    gain: Optional[float] = None
    frequency_range: Optional[str] = None
    status: Optional[str] = None
    last_calibration: Optional[datetime] = None
    next_calibration: Optional[datetime] = None

class NetworkAmplifierResponse(NetworkAmplifierBase):
    id: int
    tenant_id: int
    last_calibration: Optional[datetime]
    next_calibration: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# CMTS Schemas
class CMTSCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    ip_address: str = Field(..., pattern=r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")
    model: str = Field(..., min_length=1, max_length=50)
    mac_address: str = Field(..., pattern=r"^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$")
    downstream_ports: int = Field(..., gt=0)
    upstream_ports: int = Field(..., gt=0)
    max_modems: int = Field(..., gt=0)
    firmware_version: Optional[str] = None
    status: str = "Active"
    node_id: Optional[int] = None

class CMTSUpdate(BaseModel):
    name: Optional[str] = None
    firmware_version: Optional[str] = None
    status: Optional[str] = None
    current_modems: Optional[int] = None
    last_reboot: Optional[datetime] = None
    node_id: Optional[int] = None

class CMTSResponse(BaseModel):
    id: int
    tenant_id: int
    name: str
    ip_address: str
    model: str
    mac_address: str
    downstream_ports: int
    upstream_ports: int
    max_modems: int
    current_modems: int
    firmware_version: Optional[str]
    status: str
    last_reboot: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# Equipment Inventory Schemas
class EquipmentInventoryBase(BaseModel):
    equipment_type: EquipmentType
    model: str = Field(..., min_length=1, max_length=50)
    serial_number: str = Field(..., min_length=1, max_length=50)
    mac_address: Optional[str] = Field(None, pattern=r"^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$")
    specifications: Optional[str] = None
    purchase_date: Optional[datetime] = None
    warranty_end: Optional[datetime] = None
    purchase_price: Optional[float] = None
    status: str = "InStock"
    current_location: Optional[str] = None
    node_id: Optional[int] = None

class EquipmentInventoryCreate(EquipmentInventoryBase):
    pass

class EquipmentInventoryUpdate(BaseModel):
    model: Optional[str] = None
    specifications: Optional[str] = None
    purchase_date: Optional[datetime] = None
    warranty_end: Optional[datetime] = None
    purchase_price: Optional[float] = None
    status: Optional[str] = None
    current_location: Optional[str] = None
    node_id: Optional[int] = None

class EquipmentInventoryResponse(EquipmentInventoryBase):
    id: int
    tenant_id: int
    assigned_to: Optional[int]
    assigned_service_id: Optional[int]
    assigned_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# Signal Quality Schemas
class SignalQualityCreate(BaseModel):
    node_id: Optional[int] = None
    amplifier_id: Optional[int] = None
    service_id: Optional[int] = None
    service_type: Optional[str] = None
    signal_strength: Optional[float] = None
    signal_noise_ratio: Optional[float] = None
    modulation_error_ratio: Optional[float] = None
    bit_error_rate: Optional[float] = None
    latency: Optional[float] = None
    jitter: Optional[float] = None
    packet_loss: Optional[float] = None
    measurement_type: str = "Automated"

class SignalQualityResponse(BaseModel):
    id: int
    tenant_id: int
    node_id: Optional[int]
    amplifier_id: Optional[int]
    service_id: Optional[int]
    service_type: Optional[str]
    signal_strength: Optional[float]
    signal_noise_ratio: Optional[float]
    modulation_error_ratio: Optional[float]
    bit_error_rate: Optional[float]
    latency: Optional[float]
    jitter: Optional[float]
    packet_loss: Optional[float]
    measurement_time: datetime
    measured_by: Optional[int]
    measurement_type: str
    created_at: datetime

    class Config:
        orm_mode = True

# Network Maintenance Log Schemas
class NetworkMaintenanceLogCreate(BaseModel):
    node_id: Optional[int] = None
    amplifier_id: Optional[int] = None
    cmts_id: Optional[int] = None
    maintenance_type: str
    description: str
    actions_taken: Optional[str] = None
    parts_replaced: Optional[str] = None
    downtime_minutes: int = 0
    before_metrics: Optional[str] = None
    after_metrics: Optional[str] = None

class NetworkMaintenanceLogResponse(BaseModel):
    id: int
    tenant_id: int
    node_id: Optional[int]
    amplifier_id: Optional[int]
    cmts_id: Optional[int]
    performed_by: int
    maintenance_type: str
    description: str
    actions_taken: Optional[str]
    parts_replaced: Optional[str]
    downtime_minutes: int
    before_metrics: Optional[str]
    after_metrics: Optional[str]
    performed_at: datetime
    completed_at: Optional[datetime]

    class Config:
        orm_mode = True

# Advanced Analytics Schemas
class SignalAnalyticsRequest(BaseModel):
    node_id: Optional[int] = None
    amplifier_id: Optional[int] = None
    start_time: datetime
    end_time: datetime
    metrics: List[str] = ["signal_strength", "signal_noise_ratio"]

class SignalAnalyticsResponse(BaseModel):
    node_id: Optional[int]
    amplifier_id: Optional[int]
    metrics: Dict[str, List[float]]
    timestamps: List[datetime]
    averages: Dict[str, float]
    min_values: Dict[str, float]
    max_values: Dict[str, float]

# Network Topology Schemas
class NetworkTopologyNode(BaseModel):
    id: int
    name: str
    node_type: str
    status: str
    latitude: Optional[float]
    longitude: Optional[float]
    children: List[int]

class NetworkTopologyResponse(BaseModel):
    nodes: List[NetworkTopologyNode]
    connections: List[Dict[str, int]]  # from_node_id, to_node_id