"""Seller-case drafting agent."""

from __future__ import annotations

from models.case_schemas import (
    ActionRequestDraft,
    OfficialProductMatch,
    SellerCaseEvidenceItem,
    SellerProfile,
)
from models.schemas import ComparisonResult, SourceProduct


class CaseDraftAgent:
    """Draft an analyst-facing seller case with a platform action request."""

    async def run(
        self,
        source_product: SourceProduct,
        seller_profile: SellerProfile,
        selected_listing: ComparisonResult,
        suspect_listings: list[ComparisonResult],
        evidence: list[SellerCaseEvidenceItem],
        official_matches: list[OfficialProductMatch],
    ) -> ActionRequestDraft:
        high_risk_count = sum(1 for item in suspect_listings if item.counterfeit_risk_score >= 0.7)
        medium_risk_count = sum(1 for item in suspect_listings if 0.45 <= item.counterfeit_risk_score < 0.7)
        repeated_pattern = high_risk_count + medium_risk_count >= 2
        matched_official_count = sum(1 for item in official_matches if item.official_product_url)

        if high_risk_count >= 2:
            recommended_action = "seller suspension review"
        elif high_risk_count == 1:
            recommended_action = "listing takedown and seller review"
        elif medium_risk_count >= 1:
            recommended_action = "manual review"
        else:
            recommended_action = "insufficient evidence"

        violation_type = "suspected counterfeit / trademark misuse"
        evidence_references = list(
            dict.fromkeys(
                [
                    str(item.reference_url)
                    for item in evidence
                    if item.reference_url
                ]
            )
        )[:8]

        seller_name = seller_profile.seller_name or selected_listing.candidate_product.seller_name or "Unknown seller"
        product_label = source_product.product_name or source_product.model or source_product.brand or "protected product"
        risk_line = (
            f"{high_risk_count} high-risk and {medium_risk_count} medium-risk seller listings were identified."
            if suspect_listings
            else "No additional seller listings were confirmed beyond the selected listing."
        )
        reasoning = (
            f"The selected seller storefront for {seller_name} shows repeated product-listing behavior that overlaps with "
            f"the protected product {product_label}. {risk_line} "
            f"{matched_official_count} seller listing{'s' if matched_official_count != 1 else ''} were also linked back to official brand-site product pages for direct comparison. "
            "The attached evidence captures pricing anomalies, copied or overlapping product attributes, and repeated "
            "use of the protected brand or product family across the seller inventory."
        )
        if not repeated_pattern and recommended_action == "insufficient evidence":
            reasoning = (
                f"The seller storefront for {seller_name} was reviewed, but the evidence did not reach a strong enough "
                "threshold for a confident enforcement recommendation without manual review."
            )

        summary = (
            f"Seller case prepared for {seller_name} with {len(suspect_listings)} suspect listing"
            f"{'' if len(suspect_listings) == 1 else 's'} and {len(evidence)} evidence item"
            f"{'' if len(evidence) == 1 else 's'}."
        )

        request_text = (
            f"We request marketplace review of seller {seller_name} for suspected counterfeit or infringing listings "
            f"related to {source_product.brand or 'the protected brand'}. "
            f"The selected seed listing is {selected_listing.product_url}. "
            f"Our review found {len(suspect_listings)} seller listing{'s' if len(suspect_listings) != 1 else ''} "
            f"with overlapping product attributes and {matched_official_count} matched official product reference"
            f"{'' if matched_official_count == 1 else 's'} on the brand website, together with supporting evidence indicating potential counterfeit or imitation activity. "
            "Please review the cited URLs and evidence references and take the appropriate trust-and-safety action."
        )

        confidence = 0.88 if high_risk_count >= 2 else 0.74 if high_risk_count == 1 else 0.58

        return ActionRequestDraft(
            case_title=f"Seller enforcement case for {seller_name}",
            summary=summary,
            reasoning=reasoning,
            suspected_violation_type=violation_type,
            recommended_action=recommended_action,
            request_text=request_text,
            evidence_references=evidence_references,
            confidence=confidence,
        )
