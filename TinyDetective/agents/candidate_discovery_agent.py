"""Candidate discovery agent."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any

from adapters.comparison_site_adapter import TinyFishComparisonSiteAdapter
from models.schemas import CandidateProduct, SourceProduct
from services.tinyfish_client import TinyFishRun


class CandidateDiscoveryAgent:
    """Find likely marketplace candidates per comparison site."""

    DEFAULT_TOP_N = 5

    def __init__(self, adapter: TinyFishComparisonSiteAdapter | None = None) -> None:
        self.adapter = adapter or TinyFishComparisonSiteAdapter()

    async def run(
        self,
        source_product: SourceProduct,
        comparison_sites: list[str],
        top_n: int = DEFAULT_TOP_N,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
    ) -> tuple[list[CandidateProduct], list[dict[str, Any]]]:
        site_query_pairs = [
            (site, query)
            for site in comparison_sites
            for query in self.build_search_queries(source_product)
        ]
        site_results = await asyncio.gather(
            *[
                self.adapter.search(
                    source_product,
                    site,
                    search_query=query,
                    top_n=top_n,
                    on_update=on_update,
                )
                for site, query in site_query_pairs
            ]
        )
        return self._merge_results(site_query_pairs, site_results)

    async def run_for_site(
        self,
        source_product: SourceProduct,
        comparison_site: str,
        search_query: str,
        top_n: int = DEFAULT_TOP_N,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
    ) -> tuple[list[CandidateProduct], dict[str, Any]]:
        return await self.adapter.search(
            source_product,
            comparison_site,
            search_query=search_query,
            top_n=top_n,
            on_update=on_update,
        )

    async def resume_for_site(
        self,
        source_product: SourceProduct,
        comparison_site: str,
        run_id: str,
        search_query: str,
        top_n: int = DEFAULT_TOP_N,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
        started_at: datetime | None = None,
        last_progress_at: datetime | None = None,
    ) -> tuple[list[CandidateProduct], dict[str, Any]]:
        return await self.adapter.resume_search(
            source_product,
            comparison_site,
            run_id,
            search_query=search_query,
            top_n=top_n,
            on_update=on_update,
            started_at=started_at,
            last_progress_at=last_progress_at,
        )

    def build_search_queries(self, source_product: SourceProduct) -> list[str]:
        brand = self._clean(source_product.brand)
        exact_name = self._clean(source_product.product_name)
        product_type = self._product_type(source_product)
        size = self._clean(source_product.size)
        material = self._clean(source_product.material)
        color = self._clean(source_product.color)
        feature_terms = [self._feature_fragment(feature) for feature in source_product.features]

        queries: list[str] = []
        if brand and product_type:
            queries.append(f"{brand} {product_type}")
        if brand and material and product_type:
            queries.append(f"{brand} {material} {product_type}")
        if brand and size and product_type:
            queries.append(f"{brand} {size} {product_type}")
        if brand and color and product_type:
            queries.append(f"{brand} {color} {product_type}")
        for feature in feature_terms[:2]:
            if brand and product_type and feature:
                queries.append(f"{brand} {feature} {product_type}")
        if brand and source_product.category:
            queries.append(f"{brand} {self._clean(source_product.category)}")
        if exact_name:
            if brand and not exact_name.startswith(f"{brand} "):
                queries.append(f"{brand} {exact_name}")
            else:
                queries.append(exact_name)

        deduped: list[str] = []
        for query in queries:
            normalized = self._clean(query)
            if normalized and normalized not in deduped:
                deduped.append(normalized)
        return deduped[:5]

    @staticmethod
    def _merge_results(
        site_query_pairs: list[tuple[str, str]],
        site_results: list[tuple[list[CandidateProduct], dict[str, Any]]],
    ) -> tuple[list[CandidateProduct], list[dict[str, Any]]]:
        candidates_by_url: dict[str, CandidateProduct] = {}
        raw_outputs: list[dict[str, Any]] = []
        for (site, query), (site_candidates, raw_output) in zip(site_query_pairs, site_results, strict=False):
            raw_outputs.append({"comparison_site": site, "search_query": query, **raw_output})
            for candidate in site_candidates:
                candidate_url = str(candidate.product_url)
                existing = candidates_by_url.get(candidate_url)
                if existing is None:
                    candidates_by_url[candidate_url] = candidate
                    continue
                existing.discovery_queries = list(
                    dict.fromkeys(existing.discovery_queries + candidate.discovery_queries)
                )
        return list(candidates_by_url.values()), raw_outputs

    @staticmethod
    def _product_type(source_product: SourceProduct) -> str:
        for value in (source_product.subcategory, source_product.category):
            cleaned = CandidateDiscoveryAgent._clean(value)
            if cleaned:
                return cleaned
        return "product"

    @staticmethod
    def _feature_fragment(feature: str | None) -> str:
        cleaned = CandidateDiscoveryAgent._clean(feature)
        if not cleaned:
            return ""
        return " ".join(cleaned.split()[:3])

    @staticmethod
    def _clean(value: str | None) -> str:
        if not value:
            return ""
        return " ".join(value.lower().replace("/", " ").replace("-", " ").split())
