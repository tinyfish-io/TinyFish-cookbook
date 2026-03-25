"""TinyFish-backed source page extraction adapter."""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any

from models.schemas import SourceProduct
from services.tinyfish_client import TinyFishClient, TinyFishRun


class TinyFishSourcePageAdapter:
    """Extract source product details from an official product page using TinyFish."""

    def __init__(self, client: TinyFishClient | None = None) -> None:
        self.client = client or TinyFishClient()

    async def extract_product(
        self,
        source_url: str,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
    ) -> tuple[SourceProduct, dict[str, Any]]:
        run = await self.client.run_json(source_url, self._goal(), on_update=on_update)
        data = self._coerce_result_object(run)
        data["source_url"] = source_url
        return SourceProduct.model_validate(data), self._raw_output(run)

    async def resume_extract_product(
        self,
        source_url: str,
        run_id: str,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
        started_at: datetime | None = None,
        last_progress_at: datetime | None = None,
    ) -> tuple[SourceProduct, dict[str, Any]]:
        run = await self.client.wait_for_run(
            run_id,
            on_update=on_update,
            started_at=started_at,
            last_progress_at=last_progress_at,
        )
        data = self._coerce_result_object(run)
        data["source_url"] = source_url
        return SourceProduct.model_validate(data), self._raw_output(run)

    @staticmethod
    def _goal() -> str:
        goal = (
            "Visit this official product page and extract structured product data. "
            "Return valid JSON only with this exact shape: "
            '{"brand":"","product_name":"","category":"","subcategory":"","price":0,'
            '"currency":"","color":"","size":"","material":"","model":"","sku":"",'
            '"features":[],"description":"","image_urls":[],"extraction_confidence":0.0}. '
            "Use null for unknown scalar values and [] for unknown lists. "
            "Do not invent values that are not visible on the page."
        )
        return goal

    @staticmethod
    def _coerce_result_object(run: TinyFishRun) -> dict[str, Any]:
        result = run.result
        if isinstance(result, dict):
            return result
        if isinstance(result, str):
            try:
                return json.loads(result)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Source extraction was not valid JSON: {result}") from exc
        raise ValueError(f"Unexpected TinyFish extraction result: {result!r}")

    @staticmethod
    def _raw_output(run: TinyFishRun) -> dict[str, Any]:
        return {
            "tinyfish_run_id": run.run_id,
            "tinyfish_status": run.status,
            "tinyfish_result": run.result,
            "tinyfish_elapsed_seconds": run.elapsed_seconds,
            "tinyfish_delayed": run.delayed,
            "tinyfish_last_heartbeat_at": run.last_heartbeat_at.isoformat() if run.last_heartbeat_at else None,
            "tinyfish_last_progress_at": run.last_progress_at.isoformat() if run.last_progress_at else None,
        }

