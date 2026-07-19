"""Customers API router."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from packages.domains.customers import CustomerService
from packages.database import get_session

router = APIRouter()


class CustomerIn(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr | None = None
    phone: str | None = None
    notes: str | None = None


@router.post("/")
async def create_customer(payload: CustomerIn, db: Session = Depends(get_session)) -> dict:
    cust = CustomerService(db).create(**payload.model_dump())
    return {"id": cust.id, "name": cust.full_name, "email": cust.email}


@router.get("/")
async def list_customers(db: Session = Depends(get_session)) -> list[dict]:
    return [{"id": c.id, "name": c.full_name, "email": c.email, "drive_folder_id": c.drive_folder_id} for c in CustomerService(db).list()]
