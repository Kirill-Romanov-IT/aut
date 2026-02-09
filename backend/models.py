from pydantic import BaseModel
from typing import Optional

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

class Client(BaseModel):
    id: Optional[int] = None
    phone_number: str
    user_name: str
    user_surname: str
    clients_company: str
    position: str
    agent_name: str
    location_office: str
    direct_extension: Optional[str] = None
    previous_call_summary: Optional[str] = None

    class Config:
        extra = "ignore"

class Company(BaseModel):
    id: Optional[int] = None
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    status: Optional[str] = "active"
    created_at: Optional[str] = None

    class Config:
        extra = "ignore"
