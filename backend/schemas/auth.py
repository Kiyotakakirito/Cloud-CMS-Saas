from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    tenant_id: Optional[int] = None

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "Staff"

class UserCreate(UserBase):
    password: str
    tenant_id: int

class User(UserBase):
    id: int
    is_active: bool
    tenant_id: int
    created_at: datetime

    class Config:
        from_attributes = True
