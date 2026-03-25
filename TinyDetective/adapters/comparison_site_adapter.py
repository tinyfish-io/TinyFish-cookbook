"""TinyFish-backed marketplace discovery and extraction adapter."""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any
from urllib.parse import urlparse

from models.schemas import CandidateProduct, SourceProduct
from services.tinyfish_client import TinyFishClient, TinyFishRun


class TinyFishComparisonSiteAdapter:
    """Use TinyFish to search marketplace sites and extract candidate product pages."""

    def __init__(self, client: TinyFishClient | None = None) -> None:
        self.client = client or TinyFishClient()

    async def search(
        self,
        source_product: SourceProduct,
        comparison_site: str,
        search_query: str,
        top_n: int = 3,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
    ) -> tuple[list[CandidateProduct], dict[str, Any]]:
        marketplace = self._marketplace_name(comparison_site)
        run = await self.client.run_json(
            comparison_site,
            self._search_goal(source_product, search_query, top_n),
            on_update=on_update,
        )
        result = self._coerce_result_object(run)
        candidates = [
            CandidateProduct.model_validate(
                {
                    **candidate,
                    "marketplace": candidate.get("marketplace") or marketplace,
                    "discovery_queries": [search_query],
                }
            )
            for candidate in result.get("candidates", [])
            if candidate.get("product_url")
        ]
        return candidates[:top_n], self._raw_output(run, search_query)

    async def resume_search(
        self,
        source_product: SourceProduct,
        comparison_site: str,
        run_id: str,
        search_query: str,
        top_n: int = 3,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
        started_at: datetime | None = None,
        last_progress_at: datetime | None = None,
    ) -> tuple[list[CandidateProduct], dict[str, Any]]:
        marketplace = self._marketplace_name(comparison_site)
        run = await self.client.wait_for_run(
            run_id,
            on_update=on_update,
            started_at=started_at,
            last_progress_at=last_progress_at,
        )
        result = self._coerce_result_object(run)
        candidates = [
            CandidateProduct.model_validate(
                {
                    **candidate,
                    "marketplace": candidate.get("marketplace") or marketplace,
                    "discovery_queries": [search_query],
                }
            )
            for candidate in result.get("candidates", [])
            if candidate.get("product_url")
        ]
        return candidates[:top_n], self._raw_output(run, search_query)

    @staticmethod
    def _search_goal(source_product: SourceProduct, search_query: str, top_n: int) -> str:
        return (
            f"You are investigating counterfeit or suspicious product listings. Search this marketplace or store "
            f"for up to {top_n} candidate listings that may match the official source product. "
            f"Use this derived search query exactly as your starting point: {search_query!r}. "
            "This query came from the official product analysis step from the source URL. "
            f"Official product details: brand={source_product.brand!r}, product_name={source_product.product_name!r}, "
            f"category={source_product.category!r}, subcategory={source_product.subcategory!r}, "
            f"price={source_product.price!r} {source_product.currency!r}, color={source_product.color!r}, "
            f"size={source_product.size!r}, material={source_product.material!r}, model={source_product.model!r}, "
            f"sku={source_product.sku!r}, features={source_product.features!r}. "
            "Return valid JSON only with this exact shape: "
            '{"candidates":[{"product_url":"","marketplace":"","seller_name":"","seller_store_url":"",'
            '"seller_id":"","title":"","price":0,"currency":"","brand":"","color":"","size":"","material":"","model":"","sku":"",'
            '"description":"","image_urls":[]}]} '
            "Only include real listing URLs found on this site. Do not fabricate listings."
        )

    async def fetch_candidate_product(
        self,
        candidate_url: str,
        marketplace: str,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
    ) -> tuple[CandidateProduct, dict[str, Any]]:
        run = await self.client.run_json(candidate_url, self._candidate_goal(), on_update=on_update)
        result = self._coerce_result_object(run)
        result["product_url"] = candidate_url
        result["marketplace"] = marketplace
        return CandidateProduct.model_validate(result), self._raw_output(run)

    async def resume_candidate_product(
        self,
        candidate_url: str,
        marketplace: str,
        run_id: str,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
        started_at: datetime | None = None,
        last_progress_at: datetime | None = None,
    ) -> tuple[CandidateProduct, dict[str, Any]]:
        run = await self.client.wait_for_run(
            run_id,
            on_update=on_update,
            started_at=started_at,
            last_progress_at=last_progress_at,
        )
        result = self._coerce_result_object(run)
        result["product_url"] = candidate_url
        result["marketplace"] = marketplace
        return CandidateProduct.model_validate(result), self._raw_output(run)

    @staticmethod
    def _candidate_goal() -> str:
        return (
            "Visit this product listing page and extract structured product data for counterfeit research. "
            "Return valid JSON only with this exact shape: "
            '{"seller_name":"","seller_store_url":"","seller_id":"","title":"","price":0,"currency":"","brand":"","color":"","size":"",'
            '"material":"","model":"","sku":"","description":"","image_urls":[]} '
            "Use null for unknown scalar values and [] for unknown lists. Do not invent values."
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
                raise ValueError(f"Marketplace result was not valid JSON: {result}") from exc
        raise ValueError(f"Unexpected TinyFish marketplace result: {result!r}")

    @staticmethod
    def _marketplace_name(site: str) -> str:
        host = urlparse(site).netloc.lower().replace("www.", "")
        return (host.split(".")[0] if host else site).title()

    @staticmethod
    def _raw_output(run: TinyFishRun, search_query: str | None = None) -> dict[str, Any]:
        return {
            "tinyfish_run_id": run.run_id,
            "tinyfish_status": run.status,
            "tinyfish_result": run.result,
            "tinyfish_elapsed_seconds": run.elapsed_seconds,
            "tinyfish_delayed": run.delayed,
            "tinyfish_last_heartbeat_at": run.last_heartbeat_at.isoformat() if run.last_heartbeat_at else None,
            "tinyfish_last_progress_at": run.last_progress_at.isoformat() if run.last_progress_at else None,
            "search_query": search_query or "",
        }
