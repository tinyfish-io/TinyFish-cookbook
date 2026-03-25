"""TinyFish-backed official product discovery adapter for seller-case matching."""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any
from urllib.parse import urlparse

from models.case_schemas import OfficialProductMatch, SellerListing
from models.schemas import SourceProduct
from services.settings import settings
from services.tinyfish_client import TinyFishClient, TinyFishRun


class TinyFishOfficialProductAdapter:
    """Find the closest official product page for a seller listing on the brand's own website."""

    def __init__(self, client: TinyFishClient | None = None) -> None:
        self.client = client or TinyFishClient()

    async def discover_official_product(
        self,
        source_product: SourceProduct,
        listing: SellerListing,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
    ) -> tuple[OfficialProductMatch, dict[str, Any]]:
        entry_url = self._official_entry_url(source_product)
        run = await self.client.run_json(
            entry_url,
            self._goal(entry_url, source_product, listing),
            on_update=on_update,
        )
        return self._coerce_match(run, source_product, listing), self._raw_output(run)

    async def resume_discover_official_product(
        self,
        source_product: SourceProduct,
        listing: SellerListing,
        run_id: str,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
        started_at: datetime | None = None,
        last_progress_at: datetime | None = None,
    ) -> tuple[OfficialProductMatch, dict[str, Any]]:
        run = await self.client.wait_for_run(
            run_id,
            on_update=on_update,
            started_at=started_at,
            last_progress_at=last_progress_at,
        )
        return self._coerce_match(run, source_product, listing), self._raw_output(run)

    @staticmethod
    def _official_entry_url(source_product: SourceProduct) -> str:
        source_url = str(source_product.source_url)
        source_host = urlparse(source_url).netloc.lower().replace("www.", "")
        brand_url = settings.brand_landing_page_url
        brand_host = urlparse(brand_url).netloc.lower().replace("www.", "") if brand_url else ""
        if brand_url and brand_host and source_host and brand_host == source_host:
            return brand_url
        return brand_url or source_url

    @staticmethod
    def _goal(entry_url: str, source_product: SourceProduct, listing: SellerListing) -> str:
        return (
            "You are researching a suspicious marketplace listing and need to find the closest corresponding official product page "
            f"on the brand's own website. Start from this official website entry URL: {entry_url!r}. "
            f"Protected brand: {source_product.brand!r}. Seed official product URL: {source_product.source_url!r}. "
            f"Marketplace listing URL: {listing.product_url!r}. "
            f"Listing title: {listing.title!r}. Brand: {listing.brand!r}. Model: {listing.model!r}. SKU: {listing.sku!r}. "
            f"Color: {listing.color!r}. Material: {listing.material!r}. Description: {listing.description!r}. "
            "Search or browse the official site for the closest corresponding product page. "
            "Return valid JSON only with this exact shape: "
            '{"official_product_url":"","match_confidence":0.0,"rationale":"","search_queries":[]}. '
            "If no defensible official match is found, return an empty string for official_product_url and explain why."
        )

    @staticmethod
    def _coerce_match(
        run: TinyFishRun,
        source_product: SourceProduct,
        listing: SellerListing,
    ) -> OfficialProductMatch:
        result = TinyFishOfficialProductAdapter._coerce_result_object(run)
        official_url = result.get("official_product_url") or None
        if official_url is None and str(listing.brand or "").lower() == str(source_product.brand or "").lower():
            official_url = str(source_product.source_url)
            result["rationale"] = (
                result.get("rationale")
                or "Fell back to the seed official product page because no better official-site match was found."
            )
            result["match_confidence"] = max(float(result.get("match_confidence") or 0.0), 0.38)
        return OfficialProductMatch.model_validate(
            {
                "product_url": str(listing.product_url),
                "official_product_url": official_url,
                "match_confidence": result.get("match_confidence") or 0.0,
                "rationale": result.get("rationale") or "",
                "search_queries": result.get("search_queries") or [],
            }
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
                raise ValueError(f"Official product discovery was not valid JSON: {result}") from exc
        raise ValueError(f"Unexpected TinyFish official product discovery result: {result!r}")

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
