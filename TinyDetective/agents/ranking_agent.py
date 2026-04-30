"""Ranking agent."""

from __future__ import annotations

from models.schemas import ComparisonResult


class RankingAgent:
    """Rank candidates by counterfeit risk and keep the strongest set."""

    TOP_MATCH_LIMIT = 5

    async def run(self, comparisons: list[ComparisonResult]) -> list[ComparisonResult]:
        ranked = sorted(
            comparisons,
            key=lambda item: (
                item.counterfeit_risk_score,
                item.match_score,
                1 if item.is_exact_match else 0,
            ),
            reverse=True,
        )
        return ranked[: self.TOP_MATCH_LIMIT]

