from __future__ import annotations

import asyncio
import json
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from playwright.async_api import Page


async def capture_screenshot(
    page: Page,
    path: Path,
    *,
    full_page: bool = True,
    timeout_ms: int = 2000,
) -> None:
    """Capture screenshot to path. Creates parent dirs. Raises on Playwright error."""
    path.parent.mkdir(parents=True, exist_ok=True)
    _ = await page.screenshot(path=path, full_page=full_page, timeout=timeout_ms)


async def capture_dom_snapshot(
    page: Page,
    path: Path,
    *,
    timeout_ms: int = 2000,
) -> None:
    """Capture serialized DOM (outer HTML of <html>) to path. Creates parent dirs."""
    path.parent.mkdir(parents=True, exist_ok=True)
    html = await asyncio.wait_for(page.content(), timeout=timeout_ms / 1000)
    _ = await asyncio.to_thread(path.write_text, html, encoding="utf-8")


async def capture_on_failure(
    page: Page,
    dir: Path,
    exc: BaseException,
    *,
    prefix: str = "failure",
) -> dict[str, Path]:
    """Capture both screenshot + DOM after an exception. Returns dict of artifact paths.
    File names: `{prefix}_{timestamp}_{kind}.{ext}` where kind in {png, html}.
    Timestamp is UTC compact: 2026-06-21T14-30-45Z.
    Includes exception type/message in a sidecar `{prefix}_{timestamp}.json` file:
        {"exception_type": "...", "exception_message": "...", "traceback": "..."}"""
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")  # noqa: UP017
    screenshot_path = dir / f"{prefix}_{timestamp}.png"
    dom_path = dir / f"{prefix}_{timestamp}.html"
    sidecar_path = dir / f"{prefix}_{timestamp}.json"

    await capture_screenshot(page, screenshot_path)
    await capture_dom_snapshot(page, dom_path)

    sidecar_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "exception_type": type(exc).__name__,
        "exception_message": str(exc),
        "traceback": traceback.format_exc(),
    }
    _ = await asyncio.to_thread(sidecar_path.write_text, json.dumps(payload), encoding="utf-8")

    return {"screenshot": screenshot_path, "dom": dom_path, "sidecar": sidecar_path}


async def safe_capture(
    page: Page,
    screenshot_path: Path | None = None,
    dom_path: Path | None = None,
) -> dict[str, str]:
    """Best-effort capture. Never raises — returns dict of {kind: path_or_error_string}.
    Use this in error handlers where raising would mask the original exception."""
    results: dict[str, str] = {}

    if screenshot_path is not None:
        try:
            await capture_screenshot(page, screenshot_path)
        except Exception as exc:
            results["screenshot"] = f"{type(exc).__name__}: {exc}"
        else:
            results["screenshot"] = str(screenshot_path)

    if dom_path is not None:
        try:
            await capture_dom_snapshot(page, dom_path)
        except Exception as exc:
            results["dom"] = f"{type(exc).__name__}: {exc}"
        else:
            results["dom"] = str(dom_path)

    return results


def sanitize_filename_component(s: str) -> str:
    """Make a string safe for use in a filename. Replaces / : * ? " < > | space with _.
    Used by callers who want to include charter/step context in filenames."""
    return s.translate(str.maketrans(dict.fromkeys('/:*?"<>| ', "_")))
