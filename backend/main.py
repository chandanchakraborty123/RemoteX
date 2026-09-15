"""
RemoteX FastAPI backend.

- Android TV / Google TV via androidtvremote2
- LG webOS via aiowebostv
- AC IR / Wi‑Fi bridge stub (stateful; ready for Broadlink / brand APIs)
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any

from routes.ac import router as ac_router
from routes.androidtv import router as androidtv_router
from routes.webos import router as webos_router

app = FastAPI(title="RemoteX API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(androidtv_router)
app.include_router(webos_router)
app.include_router(ac_router)


class DeviceIn(BaseModel):
    id: str | None = None
    name: str
    type: str
    brand: str
    platform: str
    connection_type: str
    ip_address: str | None = None
    status: str = "disconnected"


class AICommandIn(BaseModel):
    text: str
    device_id: str | None = None


DEVICES: dict[str, dict[str, Any]] = {}


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "remotex-api",
        "androidtv": True,
        "webos": True,
        "ac": True,
    }


@app.get("/devices")
def list_devices():
    return list(DEVICES.values())


@app.post("/devices")
def upsert_device(device: DeviceIn):
    device_id = device.id or f"dev-{len(DEVICES) + 1}"
    payload = device.model_dump()
    payload["id"] = device_id
    DEVICES[device_id] = payload
    return payload


@app.delete("/devices/{device_id}")
def delete_device(device_id: str):
    DEVICES.pop(device_id, None)
    return {"ok": True}


@app.post("/ai/parse")
def parse_ai_command(body: AICommandIn):
    text = body.text.lower()
    if "youtube" in text:
        return {"action": "OPEN_APP", "app": "youtube"}
    if "netflix" in text:
        return {"action": "OPEN_APP", "app": "netflix"}
    if "volume" in text:
        digits = "".join(ch for ch in text if ch.isdigit())
        return {"action": "SET_VOLUME", "level": int(digits or "20")}
    return {"action": "CUSTOM", "transcript": body.text}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive_text()
            await websocket.send_json({"type": "ack", "received": message})
    except WebSocketDisconnect:
        return
