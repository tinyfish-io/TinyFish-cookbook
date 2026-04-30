"""Seller-case evidence synthesis agent."""

from __future__ import annotations

from statistics import mean

from models.case_schemas import OfficialProductMatch, SellerCaseEvidenceItem, SellerProfile
from models.schemas import ComparisonResult, SourceProduct


class SellerEvidenceAgent:
    """Convert seller research outputs into case-friendly evidence objects."""

    async def run(
        self,
        source_product: SourceProduct,
        seller_profile: SellerProfile,
        selected_listing: ComparisonResult,
        suspect_listings: list[ComparisonResult],
        official_matches: list[OfficialProductMatch],
    ) -> list[SellerCaseEvidenceItem]:
        evidence: list[SellerCaseEvidenceItem] = []
        official_matches_by_url = {str(item.product_url): item for item in official_matches}

        if seller_profile.official_store_claims:
            evidence.append(
                SellerCaseEvidenceItem(
                    type="official_store_mimicry",
                    title="Storefront uses official-store language",
                    note=(
                        "The seller storefront presents official or authorized-store claims that should be "
                        "reviewed against the brand's actual authorized channels."
                    ),
                    reference_url=seller_profile.seller_url,
                    candidate_value=", ".join(seller_profile.official_store_claims),
                    confidence=0.67,
                    subject=seller_profile.seller_name,
                    supporting_signals=list(seller_profile.official_store_claims),
                )
            )

        risk_listings = [listing for listing in suspect_listings if listing.counterfeit_risk_score >= 0.55]
        if len(risk_listings) >= 2:
            evidence.append(
                SellerCaseEvidenceItem(
                    type="repeat_product_family_pattern",
                    title="Multiple suspicious listings from the same seller",
                    note=(
                        f"The seller storefront surfaced {len(risk_listings)} listings with elevated counterfeit-risk "
                        "scores against the same protected brand or product family."
                    ),
                    reference_url=seller_profile.seller_url or selected_listing.product_url,
                    candidate_value=len(risk_listings),
                    confidence=0.84,
                    subject=seller_profile.seller_name,
                    supporting_signals=["repeat_suspicious_listing"],
                )
            )

        discounted = [
            listing for listing in suspect_listings if "suspiciously_low_price" in listing.suspicious_signals
        ]
        discounted_prices = [
            listing.candidate_product.price
            for listing in discounted
            if listing.candidate_product.price is not None
        ]
        if discounted and discounted_prices:
            avg_price = mean(discounted_prices)
            evidence.append(
                SellerCaseEvidenceItem(
                    type="suspicious_price_pattern",
                    title="Seller shows repeated below-market pricing",
                    note=(
                        "One or more seller listings are priced materially below the official source product, "
                        "which is a common counterfeit or imitation signal."
                    ),
                    reference_url=discounted[0].product_url,
                    source_value=source_product.price,
                    candidate_value=round(avg_price, 2),
                    confidence=0.89,
                    subject=seller_profile.seller_name,
                    supporting_signals=["suspiciously_low_price"],
                )
            )

        for listing in suspect_listings[:8]:
            official_match = official_matches_by_url.get(str(listing.product_url))
            if official_match and official_match.official_product_url:
                evidence.append(
                    SellerCaseEvidenceItem(
                        type="official_product_reference",
                        title=f"{listing.marketplace}: Official product reference located",
                        note=(
                            official_match.rationale
                            or "A corresponding official product page was located on the brand website for direct comparison."
                        ),
                        reference_url=official_match.official_product_url,
                        source_value=str(official_match.official_product_url),
                        candidate_value=str(listing.product_url),
                        confidence=official_match.match_confidence,
                        subject=listing.candidate_product.title or listing.product_url,
                        supporting_signals=["official_product_match"],
                    )
                )
            for item in listing.evidence[:5]:
                evidence.append(
                    SellerCaseEvidenceItem(
                        type=item.type,
                        title=f"{listing.marketplace}: {item.field}",
                        note=item.note,
                        reference_url=listing.product_url,
                        source_value=item.source_value,
                        candidate_value=item.candidate_value,
                        confidence=item.confidence,
                        subject=listing.candidate_product.title or listing.product_url,
                        supporting_signals=list(listing.suspicious_signals),
                    )
                )

        return evidence
