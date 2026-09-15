"""Discover LG webOS TVs via SSDP."""

from __future__ import annotations

import asyncio
import logging
import socket
from typing import Any

logger = logging.getLogger("remotex.discovery.webos")

SSDP_ADDR = ("239.255.255.250", 1900)
SEARCH_TARGETS = (
    "urn:lge-com:service:webos-second-screen:1",
    "urn:dial-multiscreen-org:service:dial:1",
)


def _parse_ssdp(data: bytes) -> dict[str, str]:
    text = data.decode("utf-8", errors="ignore")
    headers: dict[str, str] = {}
    for line in text.split("\r\n"):
        if ":" in line:
            key, value = line.split(":", 1)
            headers[key.strip().upper()] = value.strip()
    return headers


def _looks_like_lg(headers: dict[str, str]) -> bool:
    server = headers.get("SERVER", "").lower()
    usn = headers.get("USN", "").lower()
    st = headers.get("ST", "").lower()
    blob = f"{server} {usn} {st}"
    return any(token in blob for token in ("lge", "webos", "lg electronics"))


async def discover_webos_tvs(timeout: float = 5.0) -> list[dict[str, Any]]:
    """UDP M-SEARCH for LG webOS / DIAL devices; keep LG-looking hosts."""
    found: dict[str, dict[str, Any]] = {}
    loop = asyncio.get_running_loop()

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.setblocking(False)
    try:
        sock.bind(("", 0))
    except OSError as exc:
        logger.error("SSDP bind failed: %s", exc)
        sock.close()
        return []

    for st in SEARCH_TARGETS:
        msg = (
            "M-SEARCH * HTTP/1.1\r\n"
            f"HOST: {SSDP_ADDR[0]}:{SSDP_ADDR[1]}\r\n"
            'MAN: "ssdp:discover"\r\n'
            f"MX: {max(1, int(timeout))}\r\n"
            f"ST: {st}\r\n"
            "\r\n"
        )
        try:
            await loop.sock_sendto(sock, msg.encode("utf-8"), SSDP_ADDR)
        except OSError as exc:
            logger.warning("SSDP send failed: %s", exc)

    deadline = loop.time() + timeout
    while loop.time() < deadline:
        remaining = deadline - loop.time()
        try:
            data, addr = await asyncio.wait_for(
                loop.sock_recvfrom(sock, 4096),
                timeout=max(0.05, remaining),
            )
        except asyncio.TimeoutError:
            break
        except OSError:
            break

        host = addr[0]
        headers = _parse_ssdp(data)
        if not _looks_like_lg(headers):
            continue

        found[host] = {
            "id": f"webos-{host.replace('.', '-')}",
            "name": "LG webOS TV",
            "host": host,
            "ipAddress": host,
            "brand": "LG",
            "platform": "webOS",
            "connectionType": "local_network",
            "driver": "webos",
        }
        logger.info("Discovered webOS at %s (%s)", host, headers.get("SERVER", ""))

    sock.close()
    return sorted(found.values(), key=lambda d: d["name"].lower())
