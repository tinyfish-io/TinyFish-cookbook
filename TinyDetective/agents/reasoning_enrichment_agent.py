"""OpenAI-backed comparison reasoning enrichment."""

from __future__ import annotations

from typing import Any

from models.schemas import (
    ComparisonReasoningEnrichment,
    ComparisonResult,
    SourceProduct,
)
from services.openai_client import OpenAIClient
from services.settings import settings


class ReasoningEnrichmentAgent:
    """Refine comparison rationale with a bounded OpenAI pass."""

    MAX_RISK_ADJUSTMENT = 0.12
    MIN_RISK_ADJUSTMENT = -0.08
    MAX_MATCH_ADJUSTMENT = 0.08
    MIN_MATCH_ADJUSTMENT = -0.08

    def __init__(self, client: OpenAIClient | None = None) -> None:
        self.client = client or OpenAIClient()

    async def run(
        self,
        source_product: SourceProduct,
        comparison: ComparisonResult,
    ) -> ComparisonReasoningEnrichment:
        if not settings.openai_enabled:
            return self._noop_enrichment(source_product, comparison)

        try:
            payload = await self.client.run_json(
                model=settings.openai_reasoning_model,
                instructions=(
                    "You refine structured counterfeit-comparison results after deterministic extraction and scoring. "
                    "Do not invent facts. Use only the supplied structured product data, scores, signals, and evidence. "
                    "You may add concise reasoning notes and suggest small bounded score adjustments only when the evidence strongly supports it. "
                    "Never suggest official-store classification changes or exact-match overrides."
                ),
                input_text=self._prompt(source_product, comparison),
                schema_name="comparison_reasoning_enrichment",
                schema=self._schema(),
                max_output_tokens=500,
            )
            enrichment = ComparisonReasoningEnrichment.model_validate(
                {
                    **payload,
                    "source_url": str(source_product.source_url),
                    "product_url": str(comparison.product_url),
                }
            )
            enrichment.risk_adjustment = self._clamp(
                enrichment.risk_adjustment,
                self.MIN_RISK_ADJUSTMENT,
                self.MAX_RISK_ADJUSTMENT,
            )
            enrichment.match_adjustment = self._clamp(
                enrichment.match_adjustment,
                self.MIN_MATCH_ADJUSTMENT,
                self.MAX_MATCH_ADJUSTMENT,
            )
            return enrichment
        except Exception:
            return self._noop_enrichment(source_product, comparison)

    def apply(
        self,
        comparison: ComparisonResult,
        enrichment: ComparisonReasoningEnrichment,
    ) -> ComparisonResult:
        comparison.reason = enrichment.enriched_reason or comparison.reason
        comparison.reasoning_notes = list(
            dict.fromkeys(comparison.reasoning_notes + enrichment.reasoning_notes)
        )
        comparison.suspicious_signals = list(
            dict.fromkeys(comparison.suspicious_signals + enrichment.additional_suspicious_signals)
        )
        comparison.counterfeit_risk_score = round(
            self._clamp(
                comparison.counterfeit_risk_score + enrichment.risk_adjustment,
                0.0,
                1.0,
            ),
            2,
        )
        comparison.match_score = round(
            self._clamp(
                comparison.match_score + enrichment.match_adjustment,
                0.0,
                1.0,
            ),
            2,
        )
        comparison.reasoning_enrichment_source = "openai" if settings.openai_enabled else "deterministic"
        return comparison

    @staticmethod
    def _prompt(source_product: SourceProduct, comparison: ComparisonResult) -> str:
        candidate = comparison.candidate_product
        evidence_lines = [
            f"- {item.field}: {item.note} | source={item.source_value} | candidate={item.candidate_value}"
            for item in comparison.evidence
        ]
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
            f"- description: {source_product.description}\n\n"
            "Extracted candidate listing:\n"
            f"- product_url: {comparison.product_url}\n"
            f"- marketplace: {comparison.marketplace}\n"
            f"- seller_name: {candidate.seller_name}\n"
            f"- title: {candidate.title}\n"
            f"- price: {candidate.price} {candidate.currency}\n"
            f"- brand: {candidate.brand}\n"
            f"- color: {candidate.color}\n"
            f"- size: {candidate.size}\n"
            f"- material: {candidate.material}\n"
            f"- model: {candidate.model}\n"
            f"- sku: {candidate.sku}\n"
            f"- description: {candidate.description}\n\n"
            "Current deterministic comparison output:\n"
            f"- match_score: {comparison.match_score}\n"
            f"- counterfeit_risk_score: {comparison.counterfeit_risk_score}\n"
            f"- is_exact_match: {comparison.is_exact_match}\n"
            f"- is_official_store: {comparison.is_official_store}\n"
            f"- suspicious_signals: {comparison.suspicious_signals}\n"
            f"- reason: {comparison.reason}\n\n"
            "Structured evidence:\n"
            + ("\n".join(evidence_lines) if evidence_lines else "- none\n")
        )

    @staticmethod
    def _schema() -> dict[str, Any]:
        return {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "enriched_reason": {"type": "string"},
                "reasoning_notes": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "additional_suspicious_signals": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "risk_adjustment": {"type": "number"},
                "match_adjustment": {"type": "number"},
            },
            "required": [
                "enriched_reason",
                "reasoning_notes",
                "additional_suspicious_signals",
                "risk_adjustment",
                "match_adjustment",
            ],
        }

    @staticmethod
    def _noop_enrichment(
        source_product: SourceProduct,
        comparison: ComparisonResult,
    ) -> ComparisonReasoningEnrichment:
        return ComparisonReasoningEnrichment(
            source_url=source_product.source_url,
            product_url=comparison.product_url,
            enriched_reason=comparison.reason,
            reasoning_notes=[],
            additional_suspicious_signals=[],
            risk_adjustment=0.0,
            match_adjustment=0.0,
        )

    @staticmethod
    def _clamp(value: float, lower: float, upper: float) -> float:
        return max(lower, min(upper, float(value)))
