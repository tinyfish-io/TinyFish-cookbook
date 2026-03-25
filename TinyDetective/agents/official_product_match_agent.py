"""Official product matching agent for seller-case evidence strengthening."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any

from adapters.official_product_adapter import TinyFishOfficialProductAdapter
from agents.source_extraction_agent import SourceExtractionAgent
from models.case_schemas import OfficialProductMatch, SellerListing
from models.schemas import SourceProduct
from services.tinyfish_client import TinyFishRun


class OfficialProductMatchAgent:
    """Find and extract the closest official product page for a seller listing."""

    def __init__(
        self,
        adapter: TinyFishOfficialProductAdapter | None = None,
        source_agent: SourceExtractionAgent | None = None,
    ) -> None:
        self.adapter = adapter or TinyFishOfficialProductAdapter()
        self.source_agent = source_agent or SourceExtractionAgent()

    async def run(
        self,
        source_product: SourceProduct,
        listing: SellerListing,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
    ) -> tuple[OfficialProductMatch, dict[str, Any]]:
        match, discovery_output = await self.adapter.discover_official_product(
            source_product,
            listing,
            on_update=on_update,
        )
        enriched_match, extraction_output = await self._extract_official_product(match, source_product)
        return enriched_match, {
            "discovery_runtime": discovery_output,
            "extraction_runtime": extraction_output,
        }

    async def resume(
        self,
        source_product: SourceProduct,
        listing: SellerListing,
        run_id: str,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
        started_at: datetime | None = None,
        last_progress_at: datetime | None = None,
    ) -> tuple[OfficialProductMatch, dict[str, Any]]:
        match, discovery_output = await self.adapter.resume_discover_official_product(
            source_product,
            listing,
            run_id,
            on_update=on_update,
            started_at=started_at,
            last_progress_at=last_progress_at,
        )
        enriched_match, extraction_output = await self._extract_official_product(match, source_product)
        return enriched_match, {
            "discovery_runtime": discovery_output,
            "extraction_runtime": extraction_output,
        }

    async def _extract_official_product(
        self,
        match: OfficialProductMatch,
        fallback_source_product: SourceProduct,
    ) -> tuple[OfficialProductMatch, dict[str, Any]]:
        if not match.official_product_url:
            match.official_product = fallback_source_product
            return match, {}
        if str(match.official_product_url) == str(fallback_source_product.source_url):
            match.official_product = fallback_source_product
            return match, {}

        official_product, extraction_output = await self.source_agent.run(str(match.official_product_url))
        match.official_product = official_product
        return match, extraction_output
