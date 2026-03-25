"""Seller listing discovery agent."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any

from adapters.seller_listing_adapter import TinyFishSellerListingAdapter
from models.case_schemas import SellerListing, SellerProfile
from models.schemas import ComparisonResult, SourceProduct
from services.tinyfish_client import TinyFishRun


class SellerListingDiscoveryAgent:
    """Discover a seller's most relevant listings for case-building."""

    def __init__(self, adapter: TinyFishSellerListingAdapter | None = None) -> None:
        self.adapter = adapter or TinyFishSellerListingAdapter()

    async def run(
        self,
        source_product: SourceProduct,
        seller_profile: SellerProfile,
        selected_listing: ComparisonResult,
        entry_url: str,
        top_n: int = 8,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
    ) -> tuple[list[SellerListing], dict[str, Any]]:
        return await self.adapter.discover_listings(
            source_product,
            seller_profile,
            selected_listing,
            entry_url,
            top_n,
            on_update=on_update,
        )

    async def resume(
        self,
        source_product: SourceProduct,
        seller_profile: SellerProfile,
        selected_listing: ComparisonResult,
        entry_url: str,
        run_id: str,
        top_n: int = 8,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
        started_at: datetime | None = None,
        last_progress_at: datetime | None = None,
    ) -> tuple[list[SellerListing], dict[str, Any]]:
        return await self.adapter.resume_discover_listings(
            source_product,
            seller_profile,
            selected_listing,
            entry_url,
            run_id,
            top_n,
            on_update=on_update,
            started_at=started_at,
            last_progress_at=last_progress_at,
        )
