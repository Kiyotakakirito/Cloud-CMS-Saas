from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Union
from datetime import datetime
from uuid import UUID
from utils.validators import sanitize_html


class UserLogin(BaseModel):
    email: str
    password: str


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    role: str
    tenant_id: Optional[int] = None

    @field_validator('full_name')
    def sanitize_full_name(cls, v):
        return sanitize_html(v) if v else v


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    role: str
    tenant_id: Optional[int]
    is_active: bool
    created_at: datetime
    permissions: Optional[dict] = {}

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class TokenData(BaseModel):
    user_id: Optional[UUID] = None
    role: Optional[str] = None
    tenant_id: Optional[int] = None
