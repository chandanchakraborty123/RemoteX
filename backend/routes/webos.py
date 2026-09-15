from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.discovery_webos import discover_webos_tvs
from services.webos_tv import manager

router = APIRouter(prefix="/webos", tags=["webos"])


class HostIn(BaseModel):
    host: str = Field(..., min_length=1)


class CommandIn(BaseModel):
    host: str
    action: str
    payload: dict[str, Any] | None = None


class ScanIn(BaseModel):
    timeout: float = Field(default=5.0, ge=1.0, le=15.0)


@router.post("/scan")
async def scan(body: ScanIn | None = None):
    timeout = body.timeout if body else 5.0
    devices = await discover_webos_tvs(timeout=timeout)
    return {
        "ok": True,
        "count": len(devices),
        "devices": devices,
        "message": (
            f"Found {len(devices)} LG TV{'s' if len(devices) != 1 else ''}"
            if devices
            else "No LG webOS TVs found. Enter the IP manually if needed."
        ),
    }


@router.post("/probe")
async def probe(body: HostIn):
    session = manager.get(body.host)
    return await session.probe()


@router.post("/pair")
async def pair(body: HostIn):
    """Wait for the on-TV Accept prompt and save the client key."""
    session = manager.get(body.host)
    return await session.pair()


@router.post("/connect")
async def connect(body: HostIn):
    session = manager.get(body.host)
    return await session.connect(wait_for_pair=False)


@router.post("/status")
async def status(body: HostIn):
    session = manager.get(body.host)
    return await session.status()


@router.post("/disconnect")
async def disconnect(body: HostIn):
    session = manager.get(body.host)
    return await session.disconnect()


@router.post("/command")
async def command(body: CommandIn):
    session = manager.get(body.host)
    result = await session.send_action(body.action, body.payload)
    if result.get("ok"):
        return result
    if result.get("status") == "disconnected":
        connected = await session.connect(wait_for_pair=False)
        if not connected.get("ok"):
            return {
                "ok": False,
                "error": connected.get("error", "Not connected"),
                "status": connected.get("status"),
            }
        return await session.send_action(body.action, body.payload)
    return result
