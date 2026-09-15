"""Discover Android TV / Google TV / Xstream devices via mDNS."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from zeroconf import IPVersion, ServiceStateChange, Zeroconf
from zeroconf.asyncio import AsyncServiceBrowser, AsyncServiceInfo, AsyncZeroconf

logger = logging.getLogger("remotex.discovery")

SERVICE_TYPE = "_androidtvremote2._tcp.local."


async def discover_android_tvs(timeout: float = 5.0) -> list[dict[str, Any]]:
    """
    Browse the LAN for Android TV Remote Protocol v2 services.
    Returns unique devices: name, host, port.
    """
    found: dict[str, dict[str, Any]] = {}
    resolve_tasks: list[asyncio.Task[None]] = []

    async def resolve(zeroconf: Zeroconf, service_type: str, name: str) -> None:
        info = AsyncServiceInfo(service_type, name)
        ok = await info.async_request(zeroconf, 3000)
        if not ok or not info:
            return

        addresses = info.parsed_scoped_addresses(IPVersion.V4Only) or info.parsed_addresses()
        if not addresses:
            return

        host = addresses[0]
        friendly = name.split(".")[0] if name else host
        # Strip common suffixes like "._androidtvremote2"
        friendly = friendly.replace("._androidtvremote2", "").strip() or host

        found[host] = {
            "id": f"scan-{host.replace('.', '-')}",
            "name": friendly,
            "host": host,
            "ipAddress": host,
            "port": info.port,
            "brand": "Android TV",
            "platform": "Android TV / Google TV",
            "connectionType": "local_network",
            "driver": "androidtv",
        }
        logger.info("Discovered %s at %s", friendly, host)

    def on_service_state_change(
        zeroconf: Zeroconf,
        service_type: str,
        name: str,
        state_change: ServiceStateChange,
    ) -> None:
        if state_change is not ServiceStateChange.Added:
            return
        resolve_tasks.append(asyncio.create_task(resolve(zeroconf, service_type, name)))

    try:
        aiozc = AsyncZeroconf()
        browser = AsyncServiceBrowser(
            aiozc.zeroconf,
            [SERVICE_TYPE],
            handlers=[on_service_state_change],
        )
        await asyncio.sleep(timeout)
        if resolve_tasks:
            await asyncio.gather(*resolve_tasks, return_exceptions=True)
        await browser.async_cancel()
        await aiozc.async_close()
    except OSError as exc:
        logger.error("Discovery failed: %s", exc)
        return []

    return sorted(found.values(), key=lambda d: d["name"].lower())
