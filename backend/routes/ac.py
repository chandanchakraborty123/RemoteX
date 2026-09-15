from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.ac_remote import manager

router = APIRouter(prefix="/ac", tags=["ac"])


class ConnectIn(BaseModel):
    device_id: str = Field(..., min_length=1)
    transport: str | None = Field(default="ir", pattern="^(ir|wifi)$")


class DeviceIn(BaseModel):
    device_id: str = Field(..., min_length=1)


class CommandIn(BaseModel):
    device_id: str
    action: str
    payload: dict[str, Any] | None = None


@router.post("/connect")
def connect(body: ConnectIn):
    session = manager.get(body.device_id)
    return session.connect(body.transport)


@router.post("/status")
def status(body: DeviceIn):
    return manager.get(body.device_id).status()


@router.post("/disconnect")
def disconnect(body: DeviceIn):
    return manager.get(body.device_id).disconnect()


@router.post("/command")
def command(body: CommandIn):
    session = manager.get(body.device_id)
    if not session.connected:
        session.connect()
    return session.send_action(body.action, body.payload)
