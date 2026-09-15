from __future__ import annotations

import asyncio
import logging
import re
from pathlib import Path
from typing import Any

from androidtvremote2 import (
    AndroidTVRemote,
    CannotConnect,
    ConnectionClosed,
    InvalidAuth,
)

logger = logging.getLogger("remotex.androidtv")

CERT_ROOT = Path(__file__).resolve().parent.parent / "data" / "certs"
CERT_ROOT.mkdir(parents=True, exist_ok=True)

CLIENT_NAME = "RemoteX"

ACTION_TO_KEY: dict[str, str] = {
    "POWER": "POWER",
    "VOLUME_UP": "VOLUME_UP",
    "VOLUME_DOWN": "VOLUME_DOWN",
    "MUTE": "VOLUME_MUTE",
    "CHANNEL_UP": "CHANNEL_UP",
    "CHANNEL_DOWN": "CHANNEL_DOWN",
    "HOME": "HOME",
    "BACK": "BACK",
    "MENU": "MENU",
    "OK": "DPAD_CENTER",
    "NAV_UP": "DPAD_UP",
    "NAV_DOWN": "DPAD_DOWN",
    "NAV_LEFT": "DPAD_LEFT",
    "NAV_RIGHT": "DPAD_RIGHT",
    "PLAY": "MEDIA_PLAY",
    "PAUSE": "MEDIA_PAUSE",
    "NEXT": "MEDIA_NEXT",
    "PREVIOUS": "MEDIA_PREVIOUS",
    "GUIDE": "GUIDE",
    "APPS": "ALL_APPS",
    "RECENT": "APP_SWITCH",
    "SETTINGS": "SETTINGS",
    "INPUT": "TV_INPUT",
    "SEARCH": "SEARCH",
    "LIVE_TV": "TV",
}

APP_LINKS: dict[str, str] = {
    "youtube": "https://www.youtube.com",
    "netflix": "https://www.netflix.com/title",
    "prime": "https://app.primevideo.com",
    "amazon": "https://app.primevideo.com",
    "hotstar": "https://www.hotstar.com/in",
    "jiohotstar": "https://www.hotstar.com/in",
    "disney": "https://www.disneyplus.com",
    "spotify": "https://open.spotify.com",
    "assistant": "https://assistant.google.com",
    # live_tv handled specially via key command
}


def _safe_host_dir(host: str) -> Path:
    safe = re.sub(r"[^0-9a-zA-Z_.-]+", "_", host.strip())
    path = CERT_ROOT / safe
    path.mkdir(parents=True, exist_ok=True)
    return path


def certs_exist(host: str) -> bool:
    cert_dir = _safe_host_dir(host)
    return (cert_dir / "cert.pem").exists() and (cert_dir / "key.pem").exists()


class AndroidTVSession:
    def __init__(self, host: str) -> None:
        self.host = host
        cert_dir = _safe_host_dir(host)
        self.certfile = str(cert_dir / "cert.pem")
        self.keyfile = str(cert_dir / "key.pem")
        self.remote = AndroidTVRemote(
            CLIENT_NAME,
            self.certfile,
            self.keyfile,
            host,
        )
        self.device_name: str | None = None
        self.mac: str | None = None
        self.pairing = False
        self._connected = False
        self._lock = asyncio.Lock()

    @property
    def paired(self) -> bool:
        return Path(self.certfile).exists() and Path(self.keyfile).exists()

    async def ensure_cert(self) -> None:
        await self.remote.async_generate_cert_if_missing()

    async def status(self) -> dict[str, Any]:
        return {
            "ok": True,
            "host": self.host,
            "paired": self.paired,
            "connected": self.is_connected,
            "name": self.device_name,
            "mac": self.mac,
        }

    async def probe(self) -> dict[str, Any]:
        await self.ensure_cert()
        try:
            name, mac = await self.remote.async_get_name_and_mac()
            self.device_name = name
            self.mac = mac
            return {
                "ok": True,
                "name": name,
                "mac": mac,
                "host": self.host,
                "paired": self.paired,
            }
        except Exception as exc:  # noqa: BLE001
            return {
                "ok": False,
                "host": self.host,
                "paired": self.paired,
                "error": str(exc),
            }

    async def start_pairing(self) -> dict[str, Any]:
        await self.ensure_cert()
        try:
            await self.remote.async_start_pairing()
            self.pairing = True
            return {
                "ok": True,
                "host": self.host,
                "status": "awaiting_code",
                "message": "Enter the 6-digit code shown on your TV",
            }
        except Exception as exc:  # noqa: BLE001
            self.pairing = False
            return {"ok": False, "host": self.host, "error": str(exc)}

    async def finish_pairing(self, code: str) -> dict[str, Any]:
        code = code.strip().replace(" ", "")
        try:
            await self.remote.async_finish_pairing(code)
            self.pairing = False
            connected = await self.connect()
            return {
                "ok": True,
                "host": self.host,
                "status": "paired",
                "connected": connected.get("ok", False),
                "device": connected,
            }
        except InvalidAuth as exc:
            return {"ok": False, "host": self.host, "error": f"Invalid pairing code: {exc}"}
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "host": self.host, "error": str(exc)}

    async def connect(self) -> dict[str, Any]:
        await self.ensure_cert()
        async with self._lock:
            return await self._connect_unlocked()

    async def _connect_unlocked(self) -> dict[str, Any]:
        try:
            await self.remote.async_connect()
            self.remote.keep_reconnecting()
            info = self.remote.device_info or {}
            name = info.get("name") or self.device_name or f"Android TV ({self.host})"
            self.device_name = name
            self._connected = True
            return {
                "ok": True,
                "host": self.host,
                "name": name,
                "mac": self.mac,
                "is_on": bool(getattr(self.remote, "is_on", False)),
                "current_app": getattr(self.remote, "current_app", None),
                "status": "connected",
                "paired": True,
            }
        except InvalidAuth:
            self._connected = False
            return {
                "ok": False,
                "host": self.host,
                "status": "needs_pairing",
                "paired": self.paired,
                "error": "Pairing required",
            }
        except (CannotConnect, ConnectionClosed) as exc:
            self._connected = False
            return {
                "ok": False,
                "host": self.host,
                "status": "disconnected",
                "paired": self.paired,
                "error": str(exc),
            }
        except Exception as exc:  # noqa: BLE001
            self._connected = False
            return {
                "ok": False,
                "host": self.host,
                "status": "disconnected",
                "paired": self.paired,
                "error": str(exc),
            }

    def disconnect(self) -> dict[str, Any]:
        try:
            self.remote.disconnect()
        except Exception:  # noqa: BLE001
            pass
        self._connected = False
        return {"ok": True, "host": self.host, "status": "disconnected"}

    @property
    def is_connected(self) -> bool:
        return bool(getattr(self, "_connected", False)) and not self.pairing

    async def send_action(
        self,
        action: str,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = payload or {}
        async with self._lock:
            if not getattr(self, "_connected", False):
                await self.ensure_cert()
                connect_result = await self._connect_unlocked()
                if not connect_result.get("ok"):
                    return {
                        "ok": False,
                        "error": connect_result.get("error", "Not connected"),
                        "status": connect_result.get("status"),
                    }

            try:
                if action == "TEXT_INPUT":
                    text = str(payload.get("text", ""))
                    if not text:
                        return {"ok": False, "error": "Empty text"}
                    self.remote.send_key_command(f"text:{text}")
                    return {"ok": True, "message": f'Typed "{text}"'}

                if action == "OPEN_APP":
                    app = str(payload.get("app", "")).lower().strip()
                    if app in {"live", "live_tv", "livetv"}:
                        self.remote.send_key_command("TV")
                        return {"ok": True, "message": "Opened Live TV"}
                    link = APP_LINKS.get(app) or str(payload.get("url") or "")
                    if not link:
                        return {
                            "ok": False,
                            "error": f"No launch link configured for app '{app}'",
                        }
                    self.remote.send_launch_app_command(link)
                    return {"ok": True, "message": f"Opened {app or link}"}

                if action == "LIVE_TV":
                    self.remote.send_key_command("TV")
                    return {"ok": True, "message": "Live TV"}

                if action == "SEARCH":
                    query = str(payload.get("query", ""))
                    self.remote.send_key_command("SEARCH")
                    if query:
                        await asyncio.sleep(0.35)
                        self.remote.send_key_command(f"text:{query}")
                    return {"ok": True, "message": f'Searching "{query}"' if query else "Search"}

                key = ACTION_TO_KEY.get(action)
                if not key:
                    return {
                        "ok": False,
                        "error": f"Action '{action}' is not supported on Android TV yet",
                    }

                # Absolute volume via repeated presses is not ideal; level payload = relative taps
                if action == "VOLUME_UP" and payload.get("level") is not None:
                    # Treat as "set-ish": press mute unmute path is unavailable; send VOL_UP once + message
                    self.remote.send_key_command(key)
                    return {"ok": True, "message": f"Volume up (requested {payload['level']})"}

                self.remote.send_key_command(key)
                return {"ok": True, "message": action.replace("_", " ").title()}
            except ConnectionClosed as exc:
                self._connected = False
                return {"ok": False, "error": f"Connection closed: {exc}", "status": "disconnected"}
            except Exception as exc:  # noqa: BLE001
                return {"ok": False, "error": str(exc)}


class AndroidTVManager:
    def __init__(self) -> None:
        self._sessions: dict[str, AndroidTVSession] = {}

    def get(self, host: str) -> AndroidTVSession:
        host = host.strip()
        if host not in self._sessions:
            self._sessions[host] = AndroidTVSession(host)
        return self._sessions[host]

    def drop(self, host: str) -> None:
        session = self._sessions.pop(host.strip(), None)
        if session:
            session.disconnect()


manager = AndroidTVManager()
