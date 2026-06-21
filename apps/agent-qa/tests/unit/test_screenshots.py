from __future__ import annotations

import asyncio
import json
from datetime import datetime, tzinfo
from pathlib import Path
from types import SimpleNamespace
from typing import TYPE_CHECKING, cast
from unittest.mock import AsyncMock

import pytest
from agent_qa.reporting import screenshots
from agent_qa.reporting.screenshots import (
    capture_dom_snapshot,
    capture_on_failure,
    capture_screenshot,
    safe_capture,
    sanitize_filename_component,
)

if TYPE_CHECKING:
    from playwright.async_api import Page


class PlaywrightError(Exception):
    pass


class FrozenDateTime:
    @staticmethod
    def now(tz: tzinfo | None = None) -> datetime:
        return datetime(2026, 6, 21, 14, 30, 45, tzinfo=tz)


def page_mock(
    *,
    screenshot: AsyncMock | None = None,
    content: AsyncMock | None = None,
) -> Page:
    namespace: object = SimpleNamespace(
        screenshot=screenshot or AsyncMock(),
        content=content or AsyncMock(return_value="<html><body>ready</body></html>"),
    )
    return cast("Page", cast(object, namespace))


@pytest.mark.asyncio
async def test_capture_screenshot_calls_page_screenshot_with_correct_kwargs(
    tmp_path: Path,
) -> None:
    seen: dict[str, object] = {}

    async def screenshot_impl(*, path: Path, full_page: bool, timeout: int) -> None:
        seen.update({"path": path, "full_page": full_page, "timeout": timeout})

    page = page_mock(screenshot=AsyncMock(side_effect=screenshot_impl))
    path = tmp_path / "screenshots" / "step_0001.png"

    await capture_screenshot(page, path, full_page=False, timeout_ms=1234)

    assert seen == {"path": path, "full_page": False, "timeout": 1234}


@pytest.mark.asyncio
async def test_capture_screenshot_creates_parent_dir_if_missing(tmp_path: Path) -> None:
    page = page_mock()
    path = tmp_path / "missing" / "nested" / "step_0002.png"

    await capture_screenshot(page, path)

    assert path.parent.is_dir()


@pytest.mark.asyncio
async def test_capture_screenshot_propagates_playwright_error(tmp_path: Path) -> None:
    page = page_mock(screenshot=AsyncMock(side_effect=PlaywrightError("browser closed")))

    with pytest.raises(PlaywrightError, match="browser closed"):
        await capture_screenshot(page, tmp_path / "step_0003.png")


@pytest.mark.asyncio
async def test_capture_dom_snapshot_calls_page_content_and_writes_file(tmp_path: Path) -> None:
    content_calls = 0

    async def content_impl() -> str:
        nonlocal content_calls
        content_calls += 1
        return "<html><body>ready</body></html>"

    page = page_mock(content=AsyncMock(side_effect=content_impl))
    path = tmp_path / "dom" / "step_0001.html"

    await capture_dom_snapshot(page, path)

    content = await read_text(path)

    assert content_calls == 1
    assert content == "<html><body>ready</body></html>"


@pytest.mark.asyncio
async def test_capture_on_failure_writes_three_files_and_returns_paths(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(screenshots, "datetime", FrozenDateTime)

    async def write_screenshot(*, path: Path, full_page: bool, timeout: int) -> None:
        assert full_page is True
        assert timeout == 2000
        _ = await asyncio.to_thread(path.write_bytes, b"png")

    page = page_mock(screenshot=AsyncMock(side_effect=write_screenshot))

    try:
        raise RuntimeError("charter failed")
    except RuntimeError as exc:
        paths = await capture_on_failure(page, tmp_path, exc)

    assert paths == {
        "screenshot": tmp_path / "failure_2026-06-21T14-30-45Z.png",
        "dom": tmp_path / "failure_2026-06-21T14-30-45Z.html",
        "sidecar": tmp_path / "failure_2026-06-21T14-30-45Z.json",
    }
    assert await read_bytes(paths["screenshot"]) == b"png"
    assert await read_text(paths["dom"]) == "<html><body>ready</body></html>"
    assert paths["sidecar"].is_file()


@pytest.mark.asyncio
async def test_capture_on_failure_includes_exception_details_in_sidecar_json(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(screenshots, "datetime", FrozenDateTime)
    page = page_mock()

    try:
        raise ValueError("bad assertion")
    except ValueError as exc:
        paths = await capture_on_failure(page, tmp_path, exc, prefix="assertion")

    payload = cast(dict[str, object], json.loads(await read_text(paths["sidecar"])))
    trace = payload["traceback"]
    assert payload["exception_type"] == "ValueError"
    assert payload["exception_message"] == "bad assertion"
    assert isinstance(trace, str)
    assert "Traceback" in trace
    assert "ValueError: bad assertion" in trace


@pytest.mark.asyncio
async def test_safe_capture_swallows_errors_and_returns_error_strings(tmp_path: Path) -> None:
    page = page_mock(
        screenshot=AsyncMock(side_effect=RuntimeError("screen failed")),
        content=AsyncMock(side_effect=RuntimeError("dom failed")),
    )

    results = await safe_capture(
        page,
        screenshot_path=tmp_path / "step_0001.png",
        dom_path=tmp_path / "step_0001.html",
    )

    assert results == {
        "screenshot": "RuntimeError: screen failed",
        "dom": "RuntimeError: dom failed",
    }


@pytest.mark.asyncio
async def test_safe_capture_succeeds_when_paths_are_none() -> None:
    page = page_mock(
        screenshot=AsyncMock(side_effect=AssertionError("screenshot should not run")),
        content=AsyncMock(side_effect=AssertionError("content should not run")),
    )

    results = await safe_capture(page)

    assert results == {}


def test_sanitize_filename_component_replaces_dangerous_chars() -> None:
    assert sanitize_filename_component('charter/S0: step *3*?"<>|') == ("charter_S0__step__3______")


async def read_text(path: Path) -> str:
    return await asyncio.to_thread(path.read_text, encoding="utf-8")


async def read_bytes(path: Path) -> bytes:
    return await asyncio.to_thread(path.read_bytes)
