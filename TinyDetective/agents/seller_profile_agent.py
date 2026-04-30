"""Seller profile agent."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any

from adapters.seller_page_adapter import TinyFishSellerPageAdapter
from models.case_schemas import SellerProfile
from services.tinyfish_client import TinyFishRun


class SellerProfileAgent:
    """Inspect a seller storefront and normalize profile metadata."""

    def __init__(self, adapter: TinyFishSellerPageAdapter | None = None) -> None:
        self.adapter = adapter or TinyFishSellerPageAdapter()

    async def run(
        self,
        listing_url: str,
        marketplace: str,
        seller_name: str | None = None,
        seller_url: str | None = None,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
    ) -> tuple[SellerProfile, dict[str, Any]]:
        return await self.adapter.extract_profile(
            listing_url,
            marketplace,
            seller_name=seller_name,
            seller_url=seller_url,
            on_update=on_update,
        )

    async def resume(
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
        return await self.adapter.resume_extract_profile(
            listing_url,
            marketplace,
            run_id,
            seller_name=seller_name,
            seller_url=seller_url,
            on_update=on_update,
            started_at=started_at,
            last_progress_at=last_progress_at,
        )
