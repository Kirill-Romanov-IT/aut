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

class Company(BaseModel):
    id: int
    name: str
    employees: int
    location: Optional[str]
    limit_val: Optional[str]
    description: Optional[str]
    created_at: Optional[datetime] = None
