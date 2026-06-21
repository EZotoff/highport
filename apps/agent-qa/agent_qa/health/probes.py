import asyncio
import importlib
import socket
import time
from collections.abc import Awaitable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from typing import Protocol, cast
from urllib.parse import urlparse

import httpx


class _AsyncPGConnection(Protocol):
    def fetchval(self, query: str) -> Awaitable[object]: ...

    def close(self) -> Awaitable[None]: ...


class _AsyncPGModule(Protocol):
    def connect(self, dsn: str) -> Awaitable[_AsyncPGConnection]: ...


try:
    asyncpg = cast(_AsyncPGModule, cast(object, importlib.import_module("asyncpg")))
except ImportError:
    asyncpg: _AsyncPGModule | None = None


class ServiceName(StrEnum):
    WEB = "web"
    HOCUSPOCUS = "hocuspocus"
    FASTIFY = "fastify"
    POSTGRES = "postgres"
    RAG = "rag"
    OLLAMA = "ollama"


class ServiceStatus(StrEnum):
    UP = "up"
    DOWN = "down"
    DEGRADED = "degraded"
    UNKNOWN = "unknown"


@dataclass
class ProbeResult:
    service: ServiceName
    status: ServiceStatus
    latency_ms: float | None
    detail: str
    checked_at: datetime


HTTP_TRANSPORT: httpx.AsyncBaseTransport | None = None


async def probe_service(name: ServiceName, url: str, timeout_s: float = 2.0) -> ProbeResult:
    started = time.perf_counter()
    try:
        if name is ServiceName.POSTGRES:
            return await _probe_postgres(url, timeout_s, started)
        return await _probe_http_service(name, url, timeout_s, started)
    except (httpx.HTTPError, OSError, TimeoutError) as exc:
        return _result(name, ServiceStatus.DOWN, started, f"{name.value} down: {exc}")
    except ValueError as exc:
        return _result(name, ServiceStatus.DOWN, started, f"{name.value} invalid response: {exc}")


async def probe_all(urls: Mapping[ServiceName, str]) -> dict[ServiceName, ProbeResult]:
    tasks = [probe_service(name, url) for name, url in urls.items()]
    results = await asyncio.gather(*tasks)
    return {result.service: result for result in results}


def probe_service_sync(name: ServiceName, url: str, timeout_s: float = 2.0) -> ProbeResult:
    return asyncio.run(probe_service(name, url, timeout_s))


async def _probe_http_service(
    name: ServiceName,
    url: str,
    timeout_s: float,
    started: float,
) -> ProbeResult:
    target_url = _service_url(name, url)
    async with httpx.AsyncClient(timeout=timeout_s, transport=HTTP_TRANSPORT) as client:
        response = await client.get(target_url)

    if name in {ServiceName.WEB, ServiceName.HOCUSPOCUS}:
        return _result(name, ServiceStatus.UP, started, f"HTTP {response.status_code}")

    if response.status_code != 200:
        return _result(name, ServiceStatus.DOWN, started, f"HTTP {response.status_code}")

    payload = cast(object, response.json())
    if name is ServiceName.OLLAMA:
        return _probe_ollama_payload(name, payload, started)
    return _probe_health_payload(name, payload, started)


async def _probe_postgres(url: str, timeout_s: float, started: float) -> ProbeResult:
    if asyncpg is not None:
        try:
            connection = await asyncio.wait_for(asyncpg.connect(url), timeout=timeout_s)
            try:
                value = await asyncio.wait_for(connection.fetchval("SELECT 1"), timeout=timeout_s)
            finally:
                await connection.close()
        except (OSError, TimeoutError) as exc:
            return _result(
                ServiceName.POSTGRES, ServiceStatus.DOWN, started, f"postgres down: {exc}"
            )
        if value == 1:
            return _result(ServiceName.POSTGRES, ServiceStatus.UP, started, "SELECT 1 ok")
        return _result(
            ServiceName.POSTGRES, ServiceStatus.DEGRADED, started, f"SELECT 1 returned {value}"
        )

    host, port = _host_port(url, 18123)
    try:
        await asyncio.to_thread(_tcp_connect, host, port, timeout_s)
    except OSError as exc:
        return _result(
            ServiceName.POSTGRES, ServiceStatus.DOWN, started, f"tcp {host}:{port} down: {exc}"
        )
    return _result(ServiceName.POSTGRES, ServiceStatus.UP, started, f"tcp {host}:{port} connected")


def _probe_health_payload(name: ServiceName, payload: object, started: float) -> ProbeResult:
    payload_object = _dict_payload(payload)
    if payload_object is None:
        return _result(name, ServiceStatus.DEGRADED, started, "JSON payload is not an object")

    status = payload_object.get("status")
    if isinstance(status, str) and status.lower() in {"ok", "up", "healthy", "ready"}:
        return _result(name, ServiceStatus.UP, started, f"status={status}")
    if payload_object.get("ok") is True or payload_object.get("healthy") is True:
        return _result(name, ServiceStatus.UP, started, "health flag ok")
    return _result(name, ServiceStatus.DEGRADED, started, "missing healthy status")


def _probe_ollama_payload(name: ServiceName, payload: object, started: float) -> ProbeResult:
    payload_object = _dict_payload(payload)
    if payload_object is not None:
        models = payload_object.get("models")
        if isinstance(models, list):
            models_list = cast(list[object], models)
            return _result(name, ServiceStatus.UP, started, f"models={len(models_list)}")
    return _result(name, ServiceStatus.DEGRADED, started, "missing models array")


def _dict_payload(payload: object) -> dict[str, object] | None:
    if not isinstance(payload, dict):
        return None
    payload_mapping = cast(dict[object, object], payload)
    if not all(isinstance(key, str) for key in payload_mapping):
        return None
    return {cast(str, key): value for key, value in payload_mapping.items()}


def _service_url(name: ServiceName, base_url: str) -> str:
    base = base_url.rstrip("/")
    match name:
        case ServiceName.WEB | ServiceName.HOCUSPOCUS:
            return f"{base}/"
        case ServiceName.FASTIFY | ServiceName.RAG:
            return f"{base}/health"
        case ServiceName.OLLAMA:
            return f"{base}/api/tags"
        case ServiceName.POSTGRES:
            return base_url


def _host_port(url: str, default_port: int) -> tuple[str, int]:
    parsed = urlparse(url)
    if parsed.hostname:
        return parsed.hostname, parsed.port or default_port

    if ":" in url:
        host, port = url.rsplit(":", 1)
        return host or "localhost", int(port)

    return url or "localhost", default_port


def _tcp_connect(host: str, port: int, timeout_s: float) -> None:
    with socket.create_connection((host, port), timeout=timeout_s):
        return


def _result(
    service: ServiceName,
    status: ServiceStatus,
    started: float,
    detail: str,
) -> ProbeResult:
    latency_ms = (time.perf_counter() - started) * 1000
    return ProbeResult(
        service=service,
        status=status,
        latency_ms=latency_ms,
        detail=detail,
        checked_at=datetime.now(UTC),
    )
