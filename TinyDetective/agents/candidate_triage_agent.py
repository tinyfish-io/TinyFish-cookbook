"""Candidate triage agent backed by OpenAI with a heuristic fallback."""

from __future__ import annotations

from typing import Any

from models.schemas import CandidateProduct, CandidateTriageAssessment, SourceProduct
from services.openai_client import OpenAIClient
from services.settings import settings


class CandidateTriageAgent:
    """Score discovered candidates before deep TinyFish extraction."""

    def __init__(self, client: OpenAIClient | None = None) -> None:
        self.client = client or OpenAIClient()

    async def run(
        self,
        source_product: SourceProduct,
        candidate: CandidateProduct,
    ) -> CandidateTriageAssessment:
        if not settings.openai_enabled:
            return self._heuristic_assessment(source_product, candidate)

        try:
            payload = await self.client.run_json(
                model=settings.openai_triage_model,
                instructions=(
                    "You triage discovered ecommerce listings before expensive browser extraction. "
                    "Prioritize candidates that are likely either the same product, a suspicious imitation, "
                    "or otherwise worth deeper counterfeit analysis. "
                    "Be conservative about official-store-like listings and low-information results."
                ),
                input_text=self._prompt(source_product, candidate),
                schema_name="candidate_triage_assessment",
                schema=self._schema(),
                max_output_tokens=400,
            )
            return CandidateTriageAssessment.model_validate(
                {
                    **payload,
                    "source_url": str(source_product.source_url),
                    "product_url": str(candidate.product_url),
                }
            )
        except Exception:
            return self._heuristic_assessment(source_product, candidate)

    @staticmethod
    def _prompt(source_product: SourceProduct, candidate: CandidateProduct) -> str:
        return (
            "Official source product:\n"
            f"- source_url: {source_product.source_url}\n"
            f"- brand: {source_product.brand}\n"
            f"- product_name: {source_product.product_name}\n"
            f"- category: {source_product.category}\n"
            f"- subcategory: {source_product.subcategory}\n"
            f"- price: {source_product.price} {source_product.currency}\n"
            f"- color: {source_product.color}\n"
            f"- size: {source_product.size}\n"
            f"- material: {source_product.material}\n"
            f"- model: {source_product.model}\n"
            f"- sku: {source_product.sku}\n"
            f"- features: {source_product.features}\n\n"
            "Discovered candidate metadata:\n"
            f"- product_url: {candidate.product_url}\n"
            f"- marketplace: {candidate.marketplace}\n"
            f"- seller_name: {candidate.seller_name}\n"
            f"- title: {candidate.title}\n"
            f"- price: {candidate.price} {candidate.currency}\n"
            f"- brand: {candidate.brand}\n"
            f"- color: {candidate.color}\n"
            f"- size: {candidate.size}\n"
            f"- material: {candidate.material}\n"
            f"- model: {candidate.model}\n"
            f"- sku: {candidate.sku}\n"
            f"- description: {candidate.description}\n"
            f"- discovery_queries: {candidate.discovery_queries}\n\n"
            "Return a structured triage decision for whether this candidate should be shortlisted for deep browser extraction."
        )

    @staticmethod
    def _schema() -> dict[str, Any]:
        return {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "investigation_priority_score": {"type": "number"},
                "suspicion_score": {"type": "number"},
                "should_shortlist": {"type": "boolean"},
                "rationale": {"type": "string"},
                "suspicious_signals": {
                    "type": "array",
                    "items": {"type": "string"},
                },
            },
            "required": [
                "investigation_priority_score",
                "suspicion_score",
                "should_shortlist",
                "rationale",
                "suspicious_signals",
            ],
        }

    @staticmethod
    def _heuristic_assessment(
        source_product: SourceProduct,
        candidate: CandidateProduct,
    ) -> CandidateTriageAssessment:
        title_similarity = CandidateTriageAgent._text_overlap(
            source_product.product_name,
            candidate.title or candidate.description,
        )
        brand_match = CandidateTriageAgent._exact_match(source_product.brand, candidate.brand)
        price_gap = CandidateTriageAgent._price_gap_ratio(source_product.price, candidate.price)
        signals: list[str] = []

        if price_gap >= 0.35:
            signals.append("suspiciously_low_price")
        if source_product.brand and candidate.title and source_product.brand.lower() in candidate.title.lower():
            signals.append("brand_mentioned_in_title")
        if title_similarity >= 0.45:
            signals.append("title_semantic_overlap")
        if candidate.seller_name and any(
            term in candidate.seller_name.lower() for term in ("official", "flagship", "mall")
        ):
            signals.append("official_store_like_seller")

        suspicion_score = min(
            1.0,
            0.15
            + (0.28 if price_gap >= 0.35 else 0.0)
            + (0.18 if brand_match == 0.0 and candidate.brand else 0.0)
            + (0.12 if title_similarity >= 0.45 else 0.0),
        )
        priority_score = min(
            1.0,
            0.18
            + (0.38 * title_similarity)
            + (0.2 * brand_match)
            + (0.18 if price_gap >= 0.35 else 0.0)
            - (0.15 if "official_store_like_seller" in signals else 0.0),
        )
        should_shortlist = priority_score >= 0.34 or suspicion_score >= 0.32
        rationale = (
            "Heuristic shortlist based on title overlap, brand alignment, and pricing signals."
            if should_shortlist
            else "Heuristic triage found insufficient overlap or suspicious signals for deep extraction."
        )
        return CandidateTriageAssessment(
            source_url=source_product.source_url,
            product_url=candidate.product_url,
            investigation_priority_score=round(priority_score, 2),
            suspicion_score=round(suspicion_score, 2),
            should_shortlist=should_shortlist,
            rationale=rationale,
            suspicious_signals=signals,
        )

    @staticmethod
    def _text_overlap(left: str | None, right: str | None) -> float:
        if not left or not right:
            return 0.0
        left_words = set(left.lower().split())
        right_words = set(right.lower().split())
        if not left_words or not right_words:
            return 0.0
        return round(len(left_words & right_words) / len(left_words | right_words), 2)

    @staticmethod
    def _exact_match(left: str | None, right: str | None) -> float:
        return 1.0 if left and right and left.lower() == right.lower() else 0.0

    @staticmethod
    def _price_gap_ratio(source_price: float | None, candidate_price: float | None) -> float:
        if not source_price or not candidate_price:
            return 0.0
        return round(max(0.0, (source_price - candidate_price) / source_price), 2)
