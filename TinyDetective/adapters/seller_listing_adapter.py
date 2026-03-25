"""TinyFish-backed seller listing discovery adapter."""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any
from urllib.parse import urlparse

from models.case_schemas import SellerListing, SellerProfile
from models.schemas import ComparisonResult, SourceProduct
from services.tinyfish_client import TinyFishClient, TinyFishRun


class TinyFishSellerListingAdapter:
    """Discover related listings from a seller storefront using TinyFish."""

    def __init__(self, client: TinyFishClient | None = None) -> None:
        self.client = client or TinyFishClient()

    async def discover_listings(
        self,
        source_product: SourceProduct,
        seller_profile: SellerProfile,
        selected_listing: ComparisonResult,
        entry_url: str,
        top_n: int,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
    ) -> tuple[list[SellerListing], dict[str, Any]]:
        run = await self.client.run_json(
            entry_url,
            self._goal(source_product, seller_profile, selected_listing, entry_url, top_n),
            on_update=on_update,
        )
        return self._coerce_listings(run, seller_profile, selected_listing, entry_url, top_n), self._raw_output(run)

    async def resume_discover_listings(
        self,
        source_product: SourceProduct,
        seller_profile: SellerProfile,
        selected_listing: ComparisonResult,
        entry_url: str,
        run_id: str,
        top_n: int,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
        started_at: datetime | None = None,
        last_progress_at: datetime | None = None,
    ) -> tuple[list[SellerListing], dict[str, Any]]:
        run = await self.client.wait_for_run(
            run_id,
            on_update=on_update,
            started_at=started_at,
            last_progress_at=last_progress_at,
        )
        return self._coerce_listings(run, seller_profile, selected_listing, entry_url, top_n), self._raw_output(run)

    @staticmethod
    def _goal(
        source_product: SourceProduct,
        seller_profile: SellerProfile,
        selected_listing: ComparisonResult,
        entry_url: str,
        top_n: int,
    ) -> str:
        return (
            "You are investigating a seller suspected of listing counterfeit or infringing goods. "
            f"Start from this seller storefront entry or shard URL: {entry_url!r}. "
            f"Seller name: {seller_profile.seller_name!r}. Seller storefront URL: {seller_profile.seller_url!r}. "
            f"Seed suspicious listing URL: {selected_listing.product_url!r}. "
            f"Protected brand: {source_product.brand!r}. Product name: {source_product.product_name!r}. "
            f"Category: {source_product.category!r}. Subcategory: {source_product.subcategory!r}. "
            f"Model: {source_product.model!r}. SKU: {source_product.sku!r}. "
            f"Color: {source_product.color!r}. Material: {source_product.material!r}. "
            f"Key features: {source_product.features!r}. "
            f"Navigate this seller storefront and return up to {top_n} listing URLs that appear most relevant to the protected brand "
            "or product family, including visually or semantically similar variants if present. "
            "Return valid JSON only with this exact shape: "
            '{"seller_listings":[{"product_url":"","marketplace":"","seller_name":"","seller_store_url":"",'
            '"seller_id":"","title":"","price":0,"currency":"","brand":"","color":"","size":"","material":"",'
            '"model":"","sku":"","description":"","image_urls":[]}]} '
            "Only include listings actually visible from this seller inventory. Do not fabricate URLs."
        )

    @staticmethod
    def _coerce_listings(
        run: TinyFishRun,
        seller_profile: SellerProfile,
        selected_listing: ComparisonResult,
        entry_url: str,
        top_n: int,
    ) -> list[SellerListing]:
        result = TinyFishSellerListingAdapter._coerce_result_object(run)
        marketplace = seller_profile.marketplace or selected_listing.marketplace or TinyFishSellerListingAdapter._marketplace_name(
            str(selected_listing.product_url)
        )
        seller_name = seller_profile.seller_name or selected_listing.candidate_product.seller_name
        seller_url = str(seller_profile.seller_url or selected_listing.candidate_product.seller_store_url or "")
        listings = [
            SellerListing.model_validate(
                {
                    **listing,
                    "marketplace": listing.get("marketplace") or marketplace,
                    "seller_name": listing.get("seller_name") or seller_name,
                    "seller_store_url": listing.get("seller_store_url") or seller_url or None,
                    "seller_id": listing.get("seller_id") or seller_profile.seller_id,
                    "discovery_entry_url": listing.get("discovery_entry_url") or entry_url,
                    "discovery_shard_url": listing.get("discovery_shard_url") or entry_url,
                    "discovery_source": listing.get("discovery_source") or "seller_storefront_shard",
                }
            )
            for listing in result.get("seller_listings", [])
            if listing.get("product_url")
        ]
        return listings[:top_n]

    @staticmethod
    def _coerce_result_object(run: TinyFishRun) -> dict[str, Any]:
        result = run.result
        if isinstance(result, dict):
            return result
        if isinstance(result, str):
            try:
                return json.loads(result)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Seller listing discovery was not valid JSON: {result}") from exc
        raise ValueError(f"Unexpected TinyFish seller listing result: {result!r}")

    @staticmethod
    def _marketplace_name(site: str) -> str:
        host = urlparse(site).netloc.lower().replace("www.", "")
        return (host.split(".")[0] if host else site).title()

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
