from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.android_tv import manager
from services.discovery import discover_android_tvs

router = APIRouter(prefix="/androidtv", tags=["androidtv"])


class HostIn(BaseModel):
    host: str = Field(..., min_length=1)


class PairFinishIn(BaseModel):
    host: str
    code: str


class CommandIn(BaseModel):
    host: str
    action: str
    payload: dict[str, Any] | None = None


class ScanIn(BaseModel):
    timeout: float = Field(default=5.0, ge=1.0, le=15.0)


@router.post("/scan")
async def scan(body: ScanIn | None = None):
    timeout = body.timeout if body else 5.0
    try:
        devices = await discover_android_tvs(timeout=timeout)
    except RuntimeError as exc:
        return {
            "ok": False,
            "count": 0,
            "devices": [],
            "message": str(exc),
        }
    return {
        "ok": True,
        "count": len(devices),
        "devices": devices,
        "message": (
            f"Found {len(devices)} device{'s' if len(devices) != 1 else ''}"
            if devices
            else "No devices found on Wi‑Fi. Make sure the TV is on and on the same network."
        ),
    }


@router.post("/probe")
async def probe(body: HostIn):
    session = manager.get(body.host)
    return await session.probe()


@router.post("/pair/start")
async def pair_start(body: HostIn):
    session = manager.get(body.host)
    return await session.start_pairing()


@router.post("/pair/finish")
async def pair_finish(body: PairFinishIn):
    session = manager.get(body.host)
    return await session.finish_pairing(body.code)


@router.post("/connect")
async def connect(body: HostIn):
    session = manager.get(body.host)
    return await session.connect()


@router.post("/disconnect")
async def disconnect(body: HostIn):
    session = manager.get(body.host)
    return session.disconnect()


@router.post("/command")
async def command(body: CommandIn):
    session = manager.get(body.host)
    result = await session.send_action(body.action, body.payload)
    if result.get("ok"):
        return result
    # One reconnect retry on dropped sockets
    if result.get("status") == "disconnected":
        connected = await session.connect()
        if not connected.get("ok"):
            return {
                "ok": False,
                "error": connected.get("error", "Not connected"),
                "status": connected.get("status"),
            }
        return await session.send_action(body.action, body.payload)
    return result
