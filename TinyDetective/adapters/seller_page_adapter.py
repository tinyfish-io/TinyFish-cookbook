"""TinyFish-backed seller storefront extraction adapter."""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any

from models.case_schemas import SellerProfile
from services.tinyfish_client import TinyFishClient, TinyFishRun


class TinyFishSellerPageAdapter:
    """Extract seller profile details from a storefront or listing page using TinyFish."""

    def __init__(self, client: TinyFishClient | None = None) -> None:
        self.client = client or TinyFishClient()

    async def extract_profile(
        self,
        listing_url: str,
        marketplace: str,
        seller_name: str | None = None,
        seller_url: str | None = None,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
    ) -> tuple[SellerProfile, dict[str, Any]]:
        target_url = seller_url or listing_url
        run = await self.client.run_json(
            target_url,
            self._goal(listing_url, marketplace, seller_name, seller_url),
            on_update=on_update,
        )
        result = self._coerce_result_object(run)
        result["seller_url"] = result.get("seller_url") or seller_url or target_url
        result["seller_name"] = result.get("seller_name") or seller_name
        result["marketplace"] = result.get("marketplace") or marketplace
        return SellerProfile.model_validate(result), self._raw_output(run)

    async def resume_extract_profile(
        self,
        listing_url: str,
        marketplace: str,
        run_id: str,
        seller_name: str | None = None,
        seller_url: str | None = None,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
        started_at: datetime | None = None,
        last_progress_at: datetime | None = None,
    ) -> tuple[SellerProfile, dict[str, Any]]:
        target_url = seller_url or listing_url
        run = await self.client.wait_for_run(
            run_id,
            on_update=on_update,
            started_at=started_at,
            last_progress_at=last_progress_at,
        )
        result = self._coerce_result_object(run)
        result["seller_url"] = result.get("seller_url") or seller_url or target_url
        result["seller_name"] = result.get("seller_name") or seller_name
        result["marketplace"] = result.get("marketplace") or marketplace
        return SellerProfile.model_validate(result), self._raw_output(run)

    @staticmethod
    def _goal(
        listing_url: str,
        marketplace: str,
        seller_name: str | None,
        seller_url: str | None,
    ) -> str:
        return (
            "You are building a seller-enforcement case for a suspicious ecommerce listing. "
            f"Primary listing URL: {listing_url!r}. Marketplace: {marketplace!r}. "
            f"Known seller name: {seller_name!r}. Known storefront URL: {seller_url!r}. "
            "If you start on the listing page, navigate to the seller storefront or profile if visible. "
            "Return valid JSON only with this exact shape: "
            '{"seller_name":"","seller_id":"","seller_url":"","marketplace":"","rating":0,'
            '"rating_count":0,"follower_count":0,"joined_date":"","location":"","badges":[],'
            '"profile_text":"","storefront_summary":"","official_store_claims":[],"image_urls":[],'
            '"entry_urls":[],"storefront_shard_urls":[],"extraction_confidence":0.0}. '
            "Use null for unknown scalar values and [] for unknown lists. "
            "Include any visible seller entry URLs, storefront tabs, category pages, or pagination links in entry_urls or storefront_shard_urls. "
            "Do not invent seller metrics or URLs that are not visible."
        )

    @staticmethod
    def _coerce_result_object(run: TinyFishRun) -> dict[str, Any]:
        result = run.result
        if isinstance(result, dict):
            return result
        if isinstance(result, str):
            try:
                return json.loads(result)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Seller profile extraction was not valid JSON: {result}") from exc
        raise ValueError(f"Unexpected TinyFish seller profile result: {result!r}")

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
