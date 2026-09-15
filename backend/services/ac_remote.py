"""AC remote state — IR / Wi‑Fi bridge stub.

Without a blaster (Broadlink / ESP) or brand cloud API, we keep local
state so the phone UI is usable and ready to plug a real transport later.
"""

from __future__ import annotations

import re
from typing import Any

MODES = ("cool", "heat", "fan", "dry", "auto")
FAN_SPEEDS = ("auto", "low", "medium", "high")


def _safe_id(device_id: str) -> str:
    return re.sub(r"[^0-9a-zA-Z_.-]+", "_", device_id.strip()) or "ac"


class AcSession:
    def __init__(self, device_id: str) -> None:
        self.device_id = _safe_id(device_id)
        self.power = False
        self.temp = 24
        self.mode = "cool"
        self.fan = "auto"
        self.connected = False
        self.transport = "ir"  # ir | wifi

    def status(self) -> dict[str, Any]:
        return {
            "ok": True,
            "device_id": self.device_id,
            "connected": self.connected,
            "transport": self.transport,
            "power": self.power,
            "temp": self.temp,
            "mode": self.mode,
            "fan": self.fan,
        }

    def connect(self, transport: str | None = None) -> dict[str, Any]:
        if transport in {"ir", "wifi"}:
            self.transport = transport
        self.connected = True
        return {**self.status(), "status": "connected", "paired": True}

    def disconnect(self) -> dict[str, Any]:
        self.connected = False
        return {**self.status(), "status": "disconnected"}

    def send_action(
        self, action: str, payload: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        payload = payload or {}
        action = action.upper().strip()

        if not self.connected:
            return {"ok": False, "error": "AC not connected", "status": "disconnected"}

        if action == "POWER":
            if "state" in payload:
                state = str(payload["state"]).lower()
                self.power = state in {"on", "1", "true"}
            else:
                self.power = not self.power
            return {
                "ok": True,
                "message": f"Power {'on' if self.power else 'off'}",
                **self.status(),
            }

        if action == "TEMP_UP":
            self.temp = min(30, self.temp + 1)
            self.power = True
            return {"ok": True, "message": f"{self.temp}°C", **self.status()}

        if action == "TEMP_DOWN":
            self.temp = max(16, self.temp - 1)
            self.power = True
            return {"ok": True, "message": f"{self.temp}°C", **self.status()}

        if action == "MODE":
            if "mode" in payload:
                mode = str(payload["mode"]).lower()
                if mode in MODES:
                    self.mode = mode
            else:
                idx = MODES.index(self.mode) if self.mode in MODES else 0
                self.mode = MODES[(idx + 1) % len(MODES)]
            self.power = True
            return {"ok": True, "message": f"Mode · {self.mode}", **self.status()}

        if action == "FAN":
            if "fan" in payload:
                fan = str(payload["fan"]).lower()
                if fan in FAN_SPEEDS:
                    self.fan = fan
            else:
                idx = FAN_SPEEDS.index(self.fan) if self.fan in FAN_SPEEDS else 0
                self.fan = FAN_SPEEDS[(idx + 1) % len(FAN_SPEEDS)]
            self.power = True
            return {"ok": True, "message": f"Fan · {self.fan}", **self.status()}

        return {"ok": False, "error": f"Unsupported AC action '{action}'"}


class AcManager:
    def __init__(self) -> None:
        self._sessions: dict[str, AcSession] = {}

    def get(self, device_id: str) -> AcSession:
        key = _safe_id(device_id)
        if key not in self._sessions:
            self._sessions[key] = AcSession(key)
        return self._sessions[key]


manager = AcManager()
