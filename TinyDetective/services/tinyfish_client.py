"""TinyFish SDK client."""

from __future__ import annotations

import asyncio
import json
import os
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from tinyfish import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AsyncTinyFish,
    BrowserProfile,
    ProxyConfig,
    ProxyCountryCode,
)

from services.settings import settings


class TinyFishError(RuntimeError):
    """Raised when TinyFish returns an error or unexpected payload."""


@dataclass
class TinyFishRun:
    run_id: str
    status: str
    result: Any = None
    error: Any = None
    raw: dict[str, Any] | None = None
    elapsed_seconds: float | None = None
    delayed: bool = False
    last_heartbeat_at: datetime | None = None
    last_progress_at: datetime | None = None


TinyFishRunUpdateCallback = Callable[[TinyFishRun], Awaitable[None] | None]


class TinyFishClient:
    """TinyFish SDK wrapper that preserves the app's run/poll contract."""

    def __init__(self) -> None:
        self.base_url = settings.tinyfish_base_url.rstrip("/")
        self.api_key = settings.tinyfish_api_key
        self.browser_profile = settings.tinyfish_browser_profile
        self._client: AsyncTinyFish | None = None
        os.environ.setdefault("TF_API_INTEGRATION", "tinydetective")

    async def run_json(
        self,
        url: str,
        goal: str,
        on_update: TinyFishRunUpdateCallback | None = None,
    ) -> TinyFishRun:
        run_id = await self.start_run(url, goal)
        if on_update is not None:
            queued_at = datetime.now(timezone.utc)
            maybe_awaitable = on_update(
                TinyFishRun(
                    run_id=run_id,
                    status="QUEUED",
                    elapsed_seconds=0.0,
                    last_heartbeat_at=queued_at,
                    last_progress_at=queued_at,
                )
            )
            if asyncio.iscoroutine(maybe_awaitable):
                await maybe_awaitable
        return await self.wait_for_run(run_id, on_update=on_update)

    async def start_run(self, url: str, goal: str) -> str:
        try:
            response = await self._sdk_client().agent.queue(
                goal=goal,
                url=url,
                browser_profile=self._browser_profile(),
                proxy_config=self._proxy_config(),
            )
        except APITimeoutError as exc:
            raise TinyFishError("Timed out while waiting for TinyFish to respond.") from exc
        except APIConnectionError as exc:
            raise TinyFishError(f"Failed to reach TinyFish: {exc.message}") from exc
        except APIStatusError as exc:
            raise TinyFishError(f"TinyFish HTTP {exc.status_code}: {exc.message}") from exc

        run_id = response.run_id
        if not run_id:
            raise TinyFishError(f"TinyFish did not return a run_id: {response}")
        return run_id

    async def wait_for_run(
        self,
        run_id: str,
        on_update: TinyFishRunUpdateCallback | None = None,
        started_at: datetime | None = None,
        last_progress_at: datetime | None = None,
    ) -> TinyFishRun:
        now_utc = datetime.now(timezone.utc)
        now_mono = time.monotonic()
        started_mono = now_mono - self._elapsed_seconds_since(started_at, now_utc)
        last_heartbeat_mono = now_mono
        last_progress_mono = now_mono - self._elapsed_seconds_since(last_progress_at, now_utc)
        heartbeat_at = now_utc
        progress_at = last_progress_at or heartbeat_at
        last_fingerprint: str | None = None

        while True:
            now_mono = time.monotonic()
            elapsed_seconds = now_mono - started_mono
            if elapsed_seconds >= settings.tinyfish_run_hard_timeout_seconds:
                raise TinyFishError(
                    f"TinyFish run {run_id} exceeded the hard timeout of "
                    f"{settings.tinyfish_run_hard_timeout_seconds:.0f}s."
                )

            try:
                run = await self.get_run(run_id)
            except TinyFishError as exc:
                if now_mono - last_heartbeat_mono >= settings.tinyfish_run_stall_timeout_seconds:
                    raise TinyFishError(
                        f"TinyFish run {run_id} stalled after "
                        f"{settings.tinyfish_run_stall_timeout_seconds:.0f}s without a successful status poll: {exc}"
                    ) from exc
                await asyncio.sleep(settings.tinyfish_poll_interval_seconds)
                continue

            heartbeat_at = datetime.now(timezone.utc)
            last_heartbeat_mono = time.monotonic()
            fingerprint = self._fingerprint(run)
            if fingerprint != last_fingerprint:
                last_fingerprint = fingerprint
                last_progress_mono = last_heartbeat_mono
                progress_at = heartbeat_at

            run.elapsed_seconds = last_heartbeat_mono - started_mono
            run.delayed = run.elapsed_seconds >= settings.tinyfish_run_soft_timeout_seconds
            run.last_heartbeat_at = heartbeat_at
            run.last_progress_at = progress_at

            if on_update is not None:
                maybe_awaitable = on_update(run)
                if asyncio.iscoroutine(maybe_awaitable):
                    await maybe_awaitable

            status = run.status.upper()
            if status == "COMPLETED":
                return run
            if status in {"FAILED", "CANCELLED"}:
                raise TinyFishError(f"TinyFish run {run_id} ended with status {status}: {run.error}")
            await asyncio.sleep(settings.tinyfish_poll_interval_seconds)

    @staticmethod
    def _elapsed_seconds_since(timestamp: datetime | None, now: datetime) -> float:
        if timestamp is None:
            return 0.0
        return max(0.0, (now - timestamp).total_seconds())

    async def get_run(self, run_id: str) -> TinyFishRun:
        try:
            response = await self._sdk_client().runs.get(run_id)
        except APITimeoutError as exc:
            raise TinyFishError("Timed out while waiting for TinyFish to respond.") from exc
        except APIConnectionError as exc:
            raise TinyFishError(f"Failed to reach TinyFish: {exc.message}") from exc
        except APIStatusError as exc:
            raise TinyFishError(f"TinyFish HTTP {exc.status_code}: {exc.message}") from exc

        return TinyFishRun(
            run_id=response.run_id or run_id,
            status=response.status.value if hasattr(response.status, "value") else str(response.status),
            result=response.result,
            error=response.error.model_dump(mode="json") if response.error is not None else None,
            raw=response.model_dump(mode="json"),
        )

    def _sdk_client(self) -> AsyncTinyFish:
        if not self.api_key:
            raise TinyFishError("TINYFISH_API_KEY is not configured.")
        if self._client is None:
            self._client = AsyncTinyFish(
                api_key=self.api_key,
                base_url=self.base_url,
                timeout=settings.tinyfish_http_timeout_seconds,
            )
        return self._client

    def _browser_profile(self) -> BrowserProfile | None:
        value = self.browser_profile.strip().lower()
        if not value:
            return None
        try:
            return BrowserProfile(value)
        except ValueError as exc:
            supported = ", ".join(profile.value for profile in BrowserProfile)
            raise TinyFishError(
                f"Unsupported TINYFISH_BROWSER_PROFILE '{self.browser_profile}'. Expected one of: {supported}."
            ) from exc

    @staticmethod
    def _proxy_config() -> ProxyConfig | None:
        if not settings.tinyfish_proxy_enabled:
            return None
        country_code = settings.tinyfish_proxy_country_code.strip().upper()
        if not country_code:
            return ProxyConfig(enabled=True)
        try:
            return ProxyConfig(enabled=True, country_code=ProxyCountryCode(country_code))
        except ValueError:
            return ProxyConfig(enabled=True)

    @staticmethod
    def _fingerprint(run: TinyFishRun) -> str:
        return json.dumps(
            {
                "status": run.status,
                "result": run.result,
                "error": run.error,
                "raw": run.raw,
            },
            sort_keys=True,
            default=str,
        )
