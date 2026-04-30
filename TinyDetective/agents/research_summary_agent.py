"""Research summary agent."""

from __future__ import annotations

from models.schemas import ComparisonResult, SourceProduct


class ResearchSummaryAgent:
    """Generate a concise investigation summary per source product."""

    async def run(
        self,
        source_product: SourceProduct | None,
        top_matches: list[ComparisonResult],
        excluded_official_store_count: int = 0,
        error: str | None = None,
    ) -> str:
        if error:
            return f"Source extraction failed: {error}"
        if source_product is None:
            return "No source product could be extracted."
        if not top_matches:
            if excluded_official_store_count > 0:
                return (
                    "Only high-confidence official-store listings were found and excluded "
                    "from suspicious results."
                )
            return "No strong candidate was found across the selected comparison sites."
        best = top_matches[0]
        if best.is_exact_match and best.counterfeit_risk_score < 0.3:
            return (
                "Results suggest a legitimate matching listing with strong structured overlap "
                "and limited counterfeit indicators."
            )
        if best.counterfeit_risk_score >= 0.6:
            return (
                "Results suggest a likely counterfeit or imitation listing due to pricing and "
                "attribute inconsistencies."
            )
        if best.match_score >= 0.55:
            return (
                "Results suggest a possible unauthorized reseller or similar listing, but "
                "evidence is not conclusive."
            )
        return "There is insufficient evidence to classify the candidate listings confidently."
