"""Source extraction agent."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any

from adapters.source_page_adapter import TinyFishSourcePageAdapter
from models.schemas import SourceProduct
from services.tinyfish_client import TinyFishRun


class SourceExtractionAgent:
    """Extract normalized source product details from an official URL."""

    def __init__(self, adapter: TinyFishSourcePageAdapter | None = None) -> None:
        self.adapter = adapter or TinyFishSourcePageAdapter()

    async def run(
        self,
        source_url: str,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
    ) -> tuple[SourceProduct, dict[str, Any]]:
        if on_update is None:
            return await self.adapter.extract_product(source_url)
        return await self.adapter.extract_product(source_url, on_update=on_update)

    async def resume(
        self,
        source_url: str,
        run_id: str,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
        started_at: datetime | None = None,
        last_progress_at: datetime | None = None,
    ) -> tuple[SourceProduct, dict[str, Any]]:
        if on_update is None:
            return await self.adapter.resume_extract_product(
                source_url,
                run_id,
                started_at=started_at,
                last_progress_at=last_progress_at,
            )
        return await self.adapter.resume_extract_product(
            source_url,
            run_id,
            on_update=on_update,
            started_at=started_at,
            last_progress_at=last_progress_at,
        )

