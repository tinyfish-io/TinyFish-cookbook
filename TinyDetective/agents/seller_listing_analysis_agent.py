"""Seller listing analysis agent."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any

from agents.product_comparison_agent import ProductComparisonAgent
from models.case_schemas import SellerListing
from models.schemas import CandidateProduct, ComparisonResult, SourceProduct
from services.tinyfish_client import TinyFishRun


class SellerListingAnalysisAgent:
    """Deep-dive seller listings and compare them to the protected source product."""

    def __init__(self, comparison_agent: ProductComparisonAgent | None = None) -> None:
        self.comparison_agent = comparison_agent or ProductComparisonAgent()

    async def run(
        self,
        source_product: SourceProduct,
        listing: SellerListing,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
    ) -> tuple[ComparisonResult, dict[str, Any]]:
        return await self.comparison_agent.run(
            source_product,
            self._candidate_from_listing(listing),
            on_update=on_update,
        )

    async def resume(
        self,
        source_product: SourceProduct,
        listing: SellerListing,
        run_id: str,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
        started_at: datetime | None = None,
        last_progress_at: datetime | None = None,
    ) -> tuple[ComparisonResult, dict[str, Any]]:
        return await self.comparison_agent.resume(
            source_product,
            self._candidate_from_listing(listing),
            run_id,
            on_update=on_update,
            started_at=started_at,
            last_progress_at=last_progress_at,
        )

    @staticmethod
    def _candidate_from_listing(listing: SellerListing) -> CandidateProduct:
        return CandidateProduct(
            product_url=listing.product_url,
            marketplace=listing.marketplace,
            seller_name=listing.seller_name,
            seller_store_url=listing.seller_store_url,
            seller_id=listing.seller_id,
            title=listing.title,
            price=listing.price,
            currency=listing.currency,
            brand=listing.brand,
            color=listing.color,
            size=listing.size,
            material=listing.material,
            model=listing.model,
            sku=listing.sku,
            description=listing.description,
            image_urls=list(listing.image_urls),
        )
