"""LG webOS TV session manager (aiowebostv)."""

from __future__ import annotations

import asyncio
import json
import logging
import re
from pathlib import Path
from typing import Any

from aiowebostv import WebOsClient, WebOsTvCommandError, WebOsTvPairError

logger = logging.getLogger("remotex.webos")

CLIENT_NAME = "RemoteX"
KEY_ROOT = Path(__file__).resolve().parent.parent / "data" / "webos"
KEY_ROOT.mkdir(parents=True, exist_ok=True)

# Map RemoteX actions → webOS button names / helpers
ACTION_TO_BUTTON: dict[str, str] = {
    "NAV_UP": "UP",
    "NAV_DOWN": "DOWN",
    "NAV_LEFT": "LEFT",
    "NAV_RIGHT": "RIGHT",
    "OK": "ENTER",
    "BACK": "BACK",
    "HOME": "HOME",
    "MENU": "MENU",
    "MUTE": "MUTE",
    "VOLUME_UP": "VOLUMEUP",
    "VOLUME_DOWN": "VOLUMEDOWN",
    "CHANNEL_UP": "CHANNELUP",
    "CHANNEL_DOWN": "CHANNELDOWN",
    "GUIDE": "GUIDE",
    "APPS": "MYAPPS",
    "RECENT": "RECENT",
    "LIVE_TV": "DASH",
    "PLAY": "PLAY",
    "PAUSE": "PAUSE",
    "NEXT": "FASTFORWARD",
    "PREVIOUS": "REWIND",
    "INPUT": "INPUT_HUB",
}

APP_IDS: dict[str, str] = {
    "youtube": "youtube.leanback.v4",
    "netflix": "netflix",
    "prime": "amazon",
    "amazon": "amazon",
    "hotstar": "com.disney.hotstar.tv.lg",
    "jiohotstar": "com.disney.hotstar.tv.lg",
    "disney": "com.disney.disneyplus-prod",
    "spotify": "spotify-beehive",
}


def _safe_host_file(host: str) -> Path:
    safe = re.sub(r"[^0-9a-zA-Z_.-]+", "_", host.strip())
    return KEY_ROOT / f"{safe}.json"


def load_client_key(host: str) -> str | None:
    path = _safe_host_file(host)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        key = data.get("client_key")
        return str(key) if key else None
    except Exception:  # noqa: BLE001
        return None


def save_client_key(host: str, client_key: str, name: str | None = None) -> None:
    path = _safe_host_file(host)
    payload = {"client_key": client_key, "name": name}
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def key_exists(host: str) -> bool:
    return load_client_key(host) is not None


class WebOsSession:
    def __init__(self, host: str) -> None:
        self.host = host.strip()
        self.client_key = load_client_key(self.host)
        self.client: WebOsClient | None = None
        self.device_name: str | None = None
        self._lock = asyncio.Lock()

    @property
    def paired(self) -> bool:
        return bool(self.client_key)

    def is_connected(self) -> bool:
        return bool(self.client and self.client.is_connected())

    async def status(self) -> dict[str, Any]:
        return {
            "ok": True,
            "host": self.host,
            "paired": self.paired,
            "connected": self.is_connected(),
            "name": self.device_name,
        }

    async def probe(self) -> dict[str, Any]:
        try:
            client = WebOsClient(self.host, client_key=self.client_key, timeout_connect=3)
            # Lightweight: try connect; if unpaired, needs prompt
            if not self.client_key:
                return {
                    "ok": True,
                    "host": self.host,
                    "paired": False,
                    "status": "needs_pairing",
                    "message": "Accept the prompt on your LG TV",
                }
            await client.connect()
            name = None
            try:
                info = await client.get_system_info()
                name = (info or {}).get("modelName") or (info or {}).get("serialNumber")
            except Exception:  # noqa: BLE001
                pass
            self.device_name = name or f"LG TV ({self.host})"
            await client.disconnect()
            return {
                "ok": True,
                "host": self.host,
                "name": self.device_name,
                "paired": True,
            }
        except WebOsTvPairError as exc:
            return {
                "ok": False,
                "host": self.host,
                "paired": False,
                "status": "needs_pairing",
                "error": str(exc),
            }
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "host": self.host, "paired": self.paired, "error": str(exc)}

    async def connect(self, *, wait_for_pair: bool = False) -> dict[str, Any]:
        async with self._lock:
            return await self._connect_unlocked(wait_for_pair=wait_for_pair)

    async def _connect_unlocked(self, *, wait_for_pair: bool = False) -> dict[str, Any]:
        if self.is_connected() and self.client:
            return {
                "ok": True,
                "host": self.host,
                "name": self.device_name or f"LG TV ({self.host})",
                "status": "connected",
                "paired": True,
            }

        if not self.client_key and not wait_for_pair:
            return {
                "ok": False,
                "host": self.host,
                "status": "needs_pairing",
                "paired": False,
                "error": "Accept the prompt on your LG TV, then tap Pair",
            }

        try:
            # Longer timeout while waiting for on-TV Accept
            timeout = 60 if wait_for_pair else 5
            client = WebOsClient(
                self.host,
                client_key=self.client_key,
                timeout_connect=timeout,
            )
            await client.connect()
            self.client = client
            if client.client_key:
                self.client_key = client.client_key
                save_client_key(self.host, client.client_key, self.device_name)

            name = self.device_name
            try:
                info = await client.get_system_info()
                name = (info or {}).get("modelName") or name
            except Exception:  # noqa: BLE001
                pass
            self.device_name = name or f"LG TV ({self.host})"
            save_client_key(self.host, self.client_key or "", self.device_name)

            return {
                "ok": True,
                "host": self.host,
                "name": self.device_name,
                "status": "connected",
                "paired": True,
            }
        except WebOsTvPairError as exc:
            self.client = None
            return {
                "ok": False,
                "host": self.host,
                "status": "needs_pairing",
                "paired": bool(self.client_key),
                "error": str(exc) or "Pairing rejected or timed out on TV",
            }
        except Exception as exc:  # noqa: BLE001
            self.client = None
            logger.exception("webOS connect failed for %s", self.host)
            return {
                "ok": False,
                "host": self.host,
                "status": "disconnected",
                "paired": self.paired,
                "error": str(exc),
            }

    async def pair(self) -> dict[str, Any]:
        """Open connection and wait for the on-TV Accept prompt."""
        return await self.connect(wait_for_pair=True)

    async def disconnect(self) -> dict[str, Any]:
        if self.client:
            try:
                await self.client.disconnect()
            except Exception:  # noqa: BLE001
                pass
        self.client = None
        return {"ok": True, "host": self.host, "status": "disconnected"}

    async def send_action(
        self, action: str, payload: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        payload = payload or {}
        action = action.upper().strip()

        async with self._lock:
            if not self.is_connected() or not self.client:
                linked = await self._connect_unlocked(wait_for_pair=False)
                if not linked.get("ok"):
                    return {
                        "ok": False,
                        "error": linked.get("error", "Not connected"),
                        "status": linked.get("status"),
                    }

            assert self.client is not None
            try:
                if action == "POWER":
                    if self.client.is_on:
                        await self.client.power_off()
                    else:
                        await self.client.power_on()
                    return {"ok": True, "message": "Power toggled"}

                if action == "OPEN_APP":
                    app = str(payload.get("app", "")).lower().strip()
                    app_id = APP_IDS.get(app) or str(payload.get("appId") or "")
                    if not app_id:
                        return {"ok": False, "error": f"No app id for '{app}'"}
                    await self.client.launch_app(app_id)
                    return {"ok": True, "message": f"Opened {app or app_id}"}

                if action == "LIVE_TV":
                    await self.client.button("DASH")
                    return {"ok": True, "message": "Live TV"}

                if action == "SETTINGS":
                    await self.client.button("QMENU")
                    return {"ok": True, "message": "Settings"}

                button = ACTION_TO_BUTTON.get(action)
                if not button:
                    return {
                        "ok": False,
                        "error": f"Action '{action}' is not supported on webOS yet",
                    }
                await self.client.button(button)
                return {"ok": True, "message": action.replace("_", " ").title()}
            except WebOsTvCommandError as exc:
                return {"ok": False, "error": str(exc), "status": "disconnected"}
            except Exception as exc:  # noqa: BLE001
                self.client = None
                return {"ok": False, "error": str(exc), "status": "disconnected"}


class WebOsManager:
    def __init__(self) -> None:
        self._sessions: dict[str, WebOsSession] = {}

    def get(self, host: str) -> WebOsSession:
        host = host.strip()
        if host not in self._sessions:
            self._sessions[host] = WebOsSession(host)
        return self._sessions[host]


manager = WebOsManager()
