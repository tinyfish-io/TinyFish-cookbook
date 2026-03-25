"""Seller listing triage agent backed by OpenAI with a heuristic fallback."""

from __future__ import annotations

from models.case_schemas import SellerListing, SellerListingTriageAssessment, SellerProfile
from models.schemas import ComparisonResult, SourceProduct
from services.openai_client import OpenAIClient
from services.settings import settings


class SellerListingTriageAgent:
    """Shortlist seller listings before expensive official matching and TinyFish extraction."""

    def __init__(self, client: OpenAIClient | None = None) -> None:
        self.client = client or OpenAIClient()

    async def run(
        self,
        source_product: SourceProduct,
        seller_profile: SellerProfile,
        selected_listing: ComparisonResult,
        listing: SellerListing,
    ) -> SellerListingTriageAssessment:
        if not settings.openai_enabled:
            return self._heuristic_assessment(source_product, selected_listing, listing)

        try:
            payload = await self.client.run_json(
                model=settings.openai_triage_model,
                instructions=(
                    "You triage seller-storefront listings before expensive official-site matching and deep browser extraction. "
                    "Prioritize listings that likely belong to the protected brand, the same product family, or a suspiciously similar variant. "
                    "Be conservative but preserve recall for repeat-seller patterns that strengthen a counterfeit case."
                ),
                input_text=self._prompt(source_product, seller_profile, selected_listing, listing),
                schema_name="seller_listing_triage_assessment",
                schema=self._schema(),
                max_output_tokens=400,
            )
            return SellerListingTriageAssessment.model_validate(
                {
                    **payload,
                    "product_url": str(listing.product_url),
                }
            )
        except Exception:
            return self._heuristic_assessment(source_product, selected_listing, listing)

    @staticmethod
    def _prompt(
        source_product: SourceProduct,
        seller_profile: SellerProfile,
        selected_listing: ComparisonResult,
        listing: SellerListing,
    ) -> str:
        return (
            "Protected official product:\n"
            f"- source_url: {source_product.source_url}\n"
            f"- brand: {source_product.brand}\n"
            f"- product_name: {source_product.product_name}\n"
            f"- category: {source_product.category}\n"
            f"- subcategory: {source_product.subcategory}\n"
            f"- model: {source_product.model}\n"
            f"- sku: {source_product.sku}\n"
            f"- color: {source_product.color}\n"
            f"- material: {source_product.material}\n"
            f"- price: {source_product.price} {source_product.currency}\n"
            f"- features: {source_product.features}\n\n"
            "Seed suspicious listing:\n"
            f"- product_url: {selected_listing.product_url}\n"
            f"- title: {selected_listing.candidate_product.title}\n"
            f"- seller_name: {selected_listing.candidate_product.seller_name}\n"
            f"- risk_score: {selected_listing.counterfeit_risk_score}\n\n"
            "Seller storefront context:\n"
            f"- seller_name: {seller_profile.seller_name}\n"
            f"- seller_url: {seller_profile.seller_url}\n"
            f"- badges: {seller_profile.badges}\n"
            f"- official_store_claims: {seller_profile.official_store_claims}\n\n"
            "Discovered seller listing:\n"
            f"- product_url: {listing.product_url}\n"
            f"- title: {listing.title}\n"
            f"- price: {listing.price} {listing.currency}\n"
            f"- brand: {listing.brand}\n"
            f"- color: {listing.color}\n"
            f"- size: {listing.size}\n"
            f"- material: {listing.material}\n"
            f"- model: {listing.model}\n"
            f"- sku: {listing.sku}\n"
            f"- description: {listing.description}\n"
            f"- discovery_source: {listing.discovery_source}\n\n"
            "Return a structured shortlist decision for whether this seller listing deserves official-site matching and deep extraction."
        )

    @staticmethod
    def _schema() -> dict[str, object]:
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
        selected_listing: ComparisonResult,
        listing: SellerListing,
    ) -> SellerListingTriageAssessment:
        title_similarity = SellerListingTriageAgent._text_overlap(
            source_product.product_name,
            listing.title or listing.description,
        )
        brand_match = SellerListingTriageAgent._exact_match(source_product.brand, listing.brand)
        model_match = SellerListingTriageAgent._exact_match(source_product.model, listing.model)
        price_gap = SellerListingTriageAgent._price_gap_ratio(source_product.price, listing.price)
        seed_title_overlap = SellerListingTriageAgent._text_overlap(
            selected_listing.candidate_product.title,
            listing.title or listing.description,
        )

        signals: list[str] = []
        if price_gap >= 0.35:
            signals.append("suspiciously_low_price")
        if title_similarity >= 0.4:
            signals.append("seller_listing_title_overlap")
        if seed_title_overlap >= 0.4:
            signals.append("seed_listing_family_overlap")
        if listing.brand and source_product.brand and listing.brand.lower() != source_product.brand.lower():
            signals.append("brand_mismatch")

        suspicion_score = min(
            1.0,
            0.18
            + (0.24 if price_gap >= 0.35 else 0.0)
            + (0.14 if "brand_mismatch" in signals else 0.0)
            + (0.14 if seed_title_overlap >= 0.4 else 0.0),
        )
        priority_score = min(
            1.0,
            0.2
            + (0.3 * title_similarity)
            + (0.18 * seed_title_overlap)
            + (0.18 * brand_match)
            + (0.12 * model_match)
            + (0.12 if price_gap >= 0.35 else 0.0),
        )
        should_shortlist = priority_score >= 0.34 or suspicion_score >= 0.32
        rationale = (
            "Heuristic shortlist based on seller-listing overlap with the protected product family."
            if should_shortlist
            else "Heuristic triage found weak overlap with the protected product family."
        )
        return SellerListingTriageAssessment(
            product_url=listing.product_url,
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
