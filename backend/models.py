from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class User(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None




class CompanyCreate(BaseModel):
    name: str
    employees: int = 0
    location: Optional[str] = None
    limit_val: Optional[str] = None
    description: Optional[str] = None
    is_ready: bool = False
    status: str = "new"
    scheduled_at: Optional[datetime] = None
    contact_name: Optional[str] = None
    contact_surname: Optional[str] = None
    contact_phone: Optional[str] = None

class Company(BaseModel):
    id: int
    name: str
    employees: int
    location: Optional[str]
    limit_val: Optional[str]
    description: Optional[str]
    is_ready: bool = False
    status: str = "new"
    scheduled_at: Optional[datetime] = None
    contact_name: Optional[str] = None
    contact_surname: Optional[str] = None
    contact_phone: Optional[str] = None
    created_at: Optional[datetime] = None

class CompanyEnrich(BaseModel):
    id: int
    employees: int

class ReadyCompanyCreate(BaseModel):
    company_name: str
    location: Optional[str] = None
    name: Optional[str] = None
    sur_name: Optional[str] = None
    phone_number: Optional[str] = None

class ReadyCompany(BaseModel):
    id: int
    company_name: str
    location: Optional[str]
    name: Optional[str]
    sur_name: Optional[str]
    phone_number: Optional[str]
    created_at: Optional[datetime] = None
