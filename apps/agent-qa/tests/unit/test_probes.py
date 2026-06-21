import socket
from datetime import datetime

import httpx
import pytest
from agent_qa.health import probes
from agent_qa.health.probes import ServiceName, ServiceStatus, probe_all, probe_service


@pytest.fixture(autouse=True)
def reset_transport(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(probes, "HTTP_TRANSPORT", None)


def install_transport(monkeypatch: pytest.MonkeyPatch, handler: httpx.MockTransport) -> None:
    monkeypatch.setattr(probes, "HTTP_TRANSPORT", handler)


@pytest.mark.asyncio
async def test_web_any_http_response_is_up(monkeypatch: pytest.MonkeyPatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/"
        return httpx.Response(404)

    install_transport(monkeypatch, httpx.MockTransport(handler))

    result = await probe_service(ServiceName.WEB, "http://web.local")

    assert result.status is ServiceStatus.UP
    assert result.latency_ms is not None
    assert isinstance(result.checked_at, datetime)


@pytest.mark.asyncio
async def test_fastify_degrades_on_unhealthy_json(monkeypatch: pytest.MonkeyPatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/health"
        return httpx.Response(200, json={"message": "not a health shape"})

    install_transport(monkeypatch, httpx.MockTransport(handler))

    result = await probe_service(ServiceName.FASTIFY, "http://api.local/")

    assert result.status is ServiceStatus.DEGRADED
    assert "missing healthy status" in result.detail


@pytest.mark.asyncio
async def test_ollama_requires_models_array(monkeypatch: pytest.MonkeyPatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/tags"
        return httpx.Response(200, json={"models": []})

    install_transport(monkeypatch, httpx.MockTransport(handler))

    result = await probe_service(ServiceName.OLLAMA, "http://ollama.local")

    assert result.status is ServiceStatus.UP
    assert "models=0" in result.detail


@pytest.mark.asyncio
async def test_connection_refused_is_down(monkeypatch: pytest.MonkeyPatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    install_transport(monkeypatch, httpx.MockTransport(handler))

    result = await probe_service(ServiceName.HOCUSPOCUS, "http://sync.local")

    assert result.status is ServiceStatus.DOWN
    assert "connection refused" in result.detail


@pytest.mark.asyncio
async def test_timeout_is_down(monkeypatch: pytest.MonkeyPatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    install_transport(monkeypatch, httpx.MockTransport(handler))

    result = await probe_service(ServiceName.RAG, "http://rag.local", timeout_s=0.01)

    assert result.status is ServiceStatus.DOWN
    assert "timed out" in result.detail


@pytest.mark.asyncio
async def test_probe_all_gathers_results(monkeypatch: pytest.MonkeyPatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/health":
            return httpx.Response(200, json={"status": "ok"})
        return httpx.Response(200)

    install_transport(monkeypatch, httpx.MockTransport(handler))

    results = await probe_all(
        {
            ServiceName.WEB: "http://web.local",
            ServiceName.FASTIFY: "http://api.local",
        }
    )

    assert set(results) == {ServiceName.WEB, ServiceName.FASTIFY}
    assert all(result.status is ServiceStatus.UP for result in results.values())


@pytest.mark.asyncio
async def test_postgres_falls_back_to_tcp_when_asyncpg_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, int, float]] = []

    def fake_connect(address: tuple[str, int], timeout: float) -> object:
        calls.append((address[0], address[1], timeout))

        class Connection:
            def __enter__(self) -> "Connection":
                return self

            def __exit__(self, exc_type: object, exc: object, traceback: object) -> None:
                return None

        return Connection()

    monkeypatch.setattr(probes, "asyncpg", None)
    monkeypatch.setattr(socket, "create_connection", fake_connect)

    result = await probe_service(ServiceName.POSTGRES, "localhost:18123")

    assert result.status is ServiceStatus.UP
    assert calls == [("localhost", 18123, 2.0)]
