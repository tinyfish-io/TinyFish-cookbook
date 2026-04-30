"""Product comparison agent."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import datetime
from urllib.parse import urlparse

from adapters.comparison_site_adapter import TinyFishComparisonSiteAdapter
from models.schemas import CandidateProduct, ComparisonResult, SourceProduct
from services.settings import settings
from services.tinyfish_client import TinyFishRun


OFFICIAL_STORE_CONFIDENCE_THRESHOLD = 0.75
OFFICIAL_STORE_TERMS = (
    "official",
    "official store",
    "flagship",
    "authorized",
    "authorised",
    "authentic",
    "mall",
)


def counterfeit_risk_score_safe(score: float) -> bool:
    """Guard exact-match classification with a conservative risk threshold."""
    return score <= 0.3


class ProductComparisonAgent:
    """Compare source and candidate products with explainable heuristics."""

    def __init__(self, adapter: TinyFishComparisonSiteAdapter | None = None) -> None:
        self.adapter = adapter or TinyFishComparisonSiteAdapter()

    async def run(
        self,
        source_product: SourceProduct,
        candidate: CandidateProduct,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
    ) -> tuple[ComparisonResult, dict[str, Any]]:
        candidate_full, raw_output = await self._fetch_candidate(candidate, on_update=on_update)
        candidate_full.discovery_queries = list(candidate.discovery_queries)
        return self._build_result(source_product, candidate_full), raw_output

    async def resume(
        self,
        source_product: SourceProduct,
        candidate: CandidateProduct,
        run_id: str,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
        started_at: datetime | None = None,
        last_progress_at: datetime | None = None,
    ) -> tuple[ComparisonResult, dict[str, Any]]:
        candidate_full, raw_output = await self._resume_candidate(
            candidate,
            run_id,
            on_update=on_update,
            started_at=started_at,
            last_progress_at=last_progress_at,
        )
        candidate_full.discovery_queries = list(candidate.discovery_queries)
        return self._build_result(source_product, candidate_full), raw_output

    async def _fetch_candidate(
        self,
        candidate: CandidateProduct,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
    ) -> tuple[CandidateProduct, dict[str, Any]]:
        if on_update is None:
            return await self.adapter.fetch_candidate_product(
                str(candidate.product_url),
                candidate.marketplace,
            )
        return await self.adapter.fetch_candidate_product(
            str(candidate.product_url),
            candidate.marketplace,
            on_update=on_update,
        )

    async def _resume_candidate(
        self,
        candidate: CandidateProduct,
        run_id: str,
        on_update: Callable[[TinyFishRun], Awaitable[None] | None] | None = None,
        started_at: datetime | None = None,
        last_progress_at: datetime | None = None,
    ) -> tuple[CandidateProduct, dict[str, Any]]:
        if on_update is None:
            return await self.adapter.resume_candidate_product(
                str(candidate.product_url),
                candidate.marketplace,
                run_id,
                started_at=started_at,
                last_progress_at=last_progress_at,
            )
        return await self.adapter.resume_candidate_product(
            str(candidate.product_url),
            candidate.marketplace,
            run_id,
            on_update=on_update,
            started_at=started_at,
            last_progress_at=last_progress_at,
        )

    def _build_result(
        self,
        source_product: SourceProduct,
        candidate_full: CandidateProduct,
    ) -> ComparisonResult:
        comparisons = {
            "brand": self._eq(source_product.brand, candidate_full.brand),
            "title": self._contains(source_product.product_name, candidate_full.title),
            "sku": self._eq(source_product.sku, candidate_full.sku),
            "model": self._eq(source_product.model, candidate_full.model),
            "color": self._eq(source_product.color, candidate_full.color),
            "material": self._eq(source_product.material, candidate_full.material),
            "size": self._eq(source_product.size, candidate_full.size),
            "description": self._description_similarity(
                source_product.description, candidate_full.description
            ),
        }
        base_match_score = (
            comparisons["brand"] * 0.25
            + comparisons["title"] * 0.25
            + comparisons["model"] * 0.15
            + comparisons["color"] * 0.05
            + comparisons["material"] * 0.05
            + comparisons["size"] * 0.05
            + comparisons["description"] * 0.10
        )
        sku_bonus = 0.10 if comparisons["sku"] == 1.0 else 0.0
        match_score = round(min(1.0, base_match_score + sku_bonus), 2)

        suspicious_signals: list[str] = []
        price_gap = self._price_gap_ratio(source_product.price, candidate_full.price)
        if price_gap >= 0.4:
            suspicious_signals.append("suspiciously_low_price")
        if comparisons["brand"] < 1.0:
            suspicious_signals.append("brand_mismatch")
        if comparisons["description"] >= 0.7 and price_gap >= 0.4:
            suspicious_signals.append("copied_description_with_discount_pricing")

        counterfeit_risk = round(
            min(
                1.0,
                0.2
                + (0.45 if price_gap >= 0.4 else 0.0)
                + (0.15 if comparisons["brand"] < 1.0 else 0.0)
                + (0.1 if comparisons["description"] >= 0.7 else 0.0),
            ),
            2,
        )
        is_exact_match = (
            comparisons["brand"] == 1.0
            and comparisons["title"] >= 0.9
            and comparisons["model"] == 1.0
            and counterfeit_risk_score_safe(counterfeit_risk)
        )

        official_store_confidence, official_store_signals = self._official_store_confidence(
            source_product,
            candidate_full,
            comparisons["brand"],
        )
        is_official_store = official_store_confidence >= OFFICIAL_STORE_CONFIDENCE_THRESHOLD
        reason = self._build_reason(match_score, counterfeit_risk, suspicious_signals)
        if is_official_store:
            reason = "High-confidence official store listing detected; excluded from suspicious results."

        return ComparisonResult(
            source_url=source_product.source_url,
            product_url=candidate_full.product_url,
            marketplace=candidate_full.marketplace,
            match_score=match_score,
            is_exact_match=is_exact_match,
            is_official_store=is_official_store,
            official_store_confidence=official_store_confidence,
            official_store_signals=official_store_signals,
            counterfeit_risk_score=counterfeit_risk,
            suspicious_signals=suspicious_signals,
            reason=reason,
            candidate_product=candidate_full,
        )

    @staticmethod
    def _eq(left: str | None, right: str | None) -> float:
        return 1.0 if left and right and left.lower() == right.lower() else 0.0

    @staticmethod
    def _contains(left: str | None, right: str | None) -> float:
        if not left or not right:
            return 0.0
        left_norm = left.lower()
        right_norm = right.lower()
        if left_norm == right_norm:
            return 1.0
        if left_norm in right_norm or right_norm in left_norm:
            return 0.8
        overlap = len(set(left_norm.split()) & set(right_norm.split()))
        return min(0.7, overlap / max(len(left_norm.split()), 1))

    @staticmethod
    def _description_similarity(left: str | None, right: str | None) -> float:
        if not left or not right:
            return 0.0
        left_words = set(left.lower().split())
        right_words = set(right.lower().split())
        if not left_words or not right_words:
            return 0.0
        return round(len(left_words & right_words) / len(left_words | right_words), 2)

    @staticmethod
    def _price_gap_ratio(source_price: float | None, candidate_price: float | None) -> float:
        if not source_price or not candidate_price:
            return 0.0
        return round(max(0.0, (source_price - candidate_price) / source_price), 2)

    @staticmethod
    def _official_store_confidence(
        source_product: SourceProduct,
        candidate_product: CandidateProduct,
        brand_match_score: float,
    ) -> tuple[float, list[str]]:
        signals: list[str] = []
        confidence = 0.0
        source_host = ProductComparisonAgent._host(str(source_product.source_url))
        candidate_host = ProductComparisonAgent._host(str(candidate_product.product_url))
        brand_host = ProductComparisonAgent._host(settings.brand_landing_page_url)
        seller_name = ProductComparisonAgent._normalize(candidate_product.seller_name)
        source_brand = ProductComparisonAgent._normalize(source_product.brand)

        if candidate_host and (candidate_host == source_host or (brand_host and candidate_host == brand_host)):
            signals.append("listing_host_matches_official_brand_host")
            return 1.0, signals

        if brand_match_score == 1.0:
            confidence += 0.2
            signals.append("candidate_brand_matches_source_brand")

        brand_tokens = [token for token in source_brand.split() if token]
        if seller_name and brand_tokens:
            if all(token in seller_name for token in brand_tokens):
                confidence += 0.35
                signals.append("seller_name_matches_source_brand")
            elif any(token in seller_name for token in brand_tokens):
                confidence += 0.15
                signals.append("seller_name_partially_matches_source_brand")

        if seller_name and any(term in seller_name for term in OFFICIAL_STORE_TERMS):
            confidence += 0.35
            signals.append("seller_name_contains_official_store_terms")

        return round(min(1.0, confidence), 2), signals

    @staticmethod
    def _normalize(value: str | None) -> str:
        if not value:
            return ""
        return " ".join(value.lower().replace("-", " ").replace("_", " ").split())

    @staticmethod
    def _host(value: str | None) -> str:
        if not value:
            return ""
        return urlparse(value).netloc.lower().replace("www.", "")

    @staticmethod
    def _build_reason(
        match_score: float,
        counterfeit_risk: float,
        suspicious_signals: list[str],
    ) -> str:
        if match_score >= 0.85 and counterfeit_risk < 0.35:
            return "Strong structured attribute match with limited counterfeit signals."
        if suspicious_signals:
            return (
                "Candidate shares some product attributes but shows risk indicators: "
                + ", ".join(suspicious_signals)
                + "."
            )
        return "Candidate is directionally similar but lacks enough aligned attributes."
