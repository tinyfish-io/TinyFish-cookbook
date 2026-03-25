"""Evidence synthesis agent."""

from __future__ import annotations

from models.schemas import ComparisonResult, EvidenceItem, SourceProduct


class EvidenceAgent:
    """Produce audit-friendly evidence items for each comparison."""

    async def run(
        self,
        source_product: SourceProduct,
        comparison: ComparisonResult,
    ) -> list[EvidenceItem]:
        candidate = comparison.candidate_product
        evidence: list[EvidenceItem] = []
        evidence.extend(
            self._compare_field("brand_match", "brand", source_product.brand, candidate.brand)
        )
        evidence.extend(
            self._compare_field(
                "sku_check",
                "sku",
                source_product.sku,
                candidate.sku,
                report_mismatch=False,
            )
        )
        evidence.extend(self._compare_field("model_check", "model", source_product.model, candidate.model))
        evidence.extend(self._compare_field("color_check", "color", source_product.color, candidate.color))
        evidence.extend(self._compare_field("size_check", "size", source_product.size, candidate.size))
        if source_product.price and candidate.price:
            ratio = (source_product.price - candidate.price) / source_product.price
            if ratio >= 0.4:
                evidence.append(
                    EvidenceItem(
                        type="price_gap",
                        field="price",
                        source_value=source_product.price,
                        candidate_value=candidate.price,
                        confidence=0.91,
                        note="Candidate price is materially below the official source price.",
                    )
                )
        if (
            source_product.description
            and candidate.description
            and source_product.description[:40].lower() in candidate.description.lower()
        ):
            evidence.append(
                EvidenceItem(
                    type="copied_description",
                    field="description",
                    source_value=source_product.description[:60],
                    candidate_value=candidate.description[:60],
                    confidence=0.73,
                    note="Candidate description appears to reuse source product copy.",
                )
            )
        return evidence

    @staticmethod
    def _compare_field(
        evidence_type: str,
        field: str,
        source_value: str | None,
        candidate_value: str | None,
        report_mismatch: bool = True,
    ) -> list[EvidenceItem]:
        if not source_value and not candidate_value:
            return []
        matches = bool(source_value and candidate_value and source_value.lower() == candidate_value.lower())
        if not matches and not report_mismatch:
            return []
        return [
            EvidenceItem(
                type=evidence_type,
                field=field,
                source_value=source_value,
                candidate_value=candidate_value,
                confidence=0.9 if matches else 0.65,
                note=f"{field.title()} {'matches' if matches else 'does not match'} between source and candidate.",
            )
        ]
