"""Seller-case orchestration tests."""

from __future__ import annotations

import asyncio

from agents.case_draft_agent import CaseDraftAgent
from models.case_schemas import (
    ActionRequestDraft,
    OfficialProductMatch,
    SellerCaseCreateRequest,
    SellerCaseEvidenceItem,
    SellerListing,
    SellerListingTriageAssessment,
    SellerProfile,
)
from models.schemas import (
    CandidateProduct,
    ComparisonResult,
    InvestigationCreateRequest,
    InvestigationReport,
    InvestigationStatus,
    SourceProduct,
)
from services.investigation_store import InvestigationStore
from services.seller_case_orchestrator import SellerCaseOrchestrator


class StubSellerProfileAgent:
    async def run(self, listing_url: str, marketplace: str, seller_name=None, seller_url=None, on_update=None):
        return (
            SellerProfile(
                seller_name=seller_name or "Case Seller",
                seller_url=seller_url or "https://seller.example/store",
                marketplace=marketplace,
                badges=["Top seller"],
                official_store_claims=["authorized dealer"],
                storefront_summary="Seller storefront summary.",
                entry_urls=[seller_url or "https://seller.example/store", listing_url],
                storefront_shard_urls=[seller_url or "https://seller.example/store", "https://seller.example/store?page=2"],
                extraction_confidence=0.92,
            ),
            {"tinyfish_status": "COMPLETED", "tinyfish_run_id": "profile-run"},
        )


class StubSellerListingDiscoveryAgent:
    async def run(self, source_product, seller_profile, selected_listing, entry_url, top_n=8, on_update=None):
        listings = [
            SellerListing(
                product_url=selected_listing.product_url,
                marketplace=selected_listing.marketplace,
                seller_name=seller_profile.seller_name,
                seller_store_url=seller_profile.seller_url,
                title=selected_listing.candidate_product.title,
                price=selected_listing.candidate_product.price,
                currency=selected_listing.candidate_product.currency,
                brand=selected_listing.candidate_product.brand,
                description=selected_listing.candidate_product.description,
                discovery_entry_url=entry_url,
                discovery_shard_url=entry_url,
                discovery_source="seller_storefront_shard",
            ),
            SellerListing(
                product_url="https://market.example/listing-2",
                marketplace=selected_listing.marketplace,
                seller_name=seller_profile.seller_name,
                seller_store_url=seller_profile.seller_url,
                title="Brand Alpha Variant",
                price=55.0,
                currency="SGD",
                brand=source_product.brand,
                description=source_product.description,
                discovery_entry_url=entry_url,
                discovery_shard_url=entry_url,
                discovery_source="seller_storefront_shard",
            ),
        ]
        return listings[:top_n], {"tinyfish_status": "COMPLETED", "tinyfish_run_id": "discovery-run"}


class StubSellerListingTriageAgent:
    async def run(self, source_product, seller_profile, selected_listing, listing):
        return SellerListingTriageAssessment(
            product_url=listing.product_url,
            investigation_priority_score=0.86 if "listing-2" in str(listing.product_url) else 0.74,
            suspicion_score=0.82 if "listing-2" in str(listing.product_url) else 0.58,
            should_shortlist=True,
            rationale="Shortlist this seller listing for deeper review.",
            suspicious_signals=["suspiciously_low_price"],
        )


class StubOfficialProductMatchAgent:
    async def run(self, source_product, listing, on_update=None):
        return (
            OfficialProductMatch(
                product_url=listing.product_url,
                official_product_url=source_product.source_url,
                official_product=source_product,
                match_confidence=0.88,
                rationale="Matched back to the official product page.",
                search_queries=["brand alpha case"],
            ),
            {"discovery_runtime": {"tinyfish_status": "COMPLETED", "tinyfish_run_id": "official-run"}},
        )


class StubSellerListingAnalysisAgent:
    async def run(self, source_product, listing, on_update=None):
        candidate = CandidateProduct(
            product_url=listing.product_url,
            marketplace=listing.marketplace,
            seller_name=listing.seller_name,
            seller_store_url=listing.seller_store_url,
            title=listing.title,
            price=listing.price,
            currency=listing.currency,
            brand=listing.brand or source_product.brand,
            description=listing.description,
        )
        result = ComparisonResult(
            source_url=source_product.source_url,
            product_url=listing.product_url,
            marketplace=listing.marketplace,
            match_score=0.62,
            is_exact_match=False,
            counterfeit_risk_score=0.81 if "listing-2" in str(listing.product_url) else 0.74,
            suspicious_signals=["suspiciously_low_price", "copied_description_with_discount_pricing"],
            reason="Repeated low-price listing tied to the same seller.",
            evidence=[],
            candidate_product=candidate,
        )
        return result, {"tinyfish_status": "COMPLETED", "tinyfish_run_id": f"analysis-{listing.product_url}"}


class StubSellerEvidenceAgent:
    async def run(self, source_product, seller_profile, selected_listing, suspect_listings, official_matches):
        return [
            SellerCaseEvidenceItem(
                type="repeat_product_family_pattern",
                title="Repeated suspicious listings",
                note="Multiple suspicious listings were found on the same storefront.",
                reference_url=seller_profile.seller_url,
                confidence=0.88,
            )
        ]


class StubCaseDraftAgent(CaseDraftAgent):
    async def run(self, source_product, seller_profile, selected_listing, suspect_listings, evidence, official_matches):
        return ActionRequestDraft(
            case_title="Seller enforcement case",
            summary="Seller case prepared.",
            reasoning="Evidence supports marketplace escalation.",
            suspected_violation_type="suspected counterfeit / trademark misuse",
            recommended_action="seller suspension review",
            request_text="Please review and take action.",
            evidence_references=[str(seller_profile.seller_url)],
            confidence=0.91,
        )


def test_seller_case_orchestrator_builds_case_from_existing_investigation(tmp_path) -> None:
    async def run() -> None:
        store = InvestigationStore(tmp_path / "seller-case.sqlite3")
        created = await store.create(
            InvestigationCreateRequest(
                source_urls=["https://brand.example/products/alpha-case"],
                comparison_sites=["https://market.example/"],
            )
        )

        source_product = SourceProduct(
            source_url="https://brand.example/products/alpha-case",
            brand="Brand",
            product_name="Alpha Case",
            category="Phone Case",
            description="Protective phone case",
            price=120.0,
            currency="SGD",
        )
        seed_listing = ComparisonResult(
            source_url=source_product.source_url,
            product_url="https://market.example/listing-1",
            marketplace="Market",
            match_score=0.58,
            is_exact_match=False,
            counterfeit_risk_score=0.72,
            suspicious_signals=["suspiciously_low_price"],
            reason="Seed suspicious listing.",
            evidence=[],
            candidate_product=CandidateProduct(
                product_url="https://market.example/listing-1",
                marketplace="Market",
                seller_name="Case Seller",
                seller_store_url="https://seller.example/store",
                title="Brand Alpha Case",
                price=60.0,
                currency="SGD",
                brand="Brand",
                description="Protective phone case",
            ),
        )

        investigation = await store.get(created.investigation_id)
        assert investigation is not None
        investigation.status = InvestigationStatus.completed
        investigation.reports = [
            InvestigationReport(
                source_url=source_product.source_url,
                extracted_source_product=source_product,
                top_matches=[seed_listing],
                summary="Completed.",
            )
        ]
        await store.save(investigation)

        seller_case = await store.create_case(
            SellerCaseCreateRequest(
                investigation_id=created.investigation_id,
                source_url=source_product.source_url,
                product_url=seed_listing.product_url,
            )
        )

        orchestrator = SellerCaseOrchestrator(
            store=store,
            seller_profile_agent=StubSellerProfileAgent(),
            seller_listing_discovery_agent=StubSellerListingDiscoveryAgent(),
            seller_listing_triage_agent=StubSellerListingTriageAgent(),
            official_product_match_agent=StubOfficialProductMatchAgent(),
            seller_listing_analysis_agent=StubSellerListingAnalysisAgent(),
            seller_evidence_agent=StubSellerEvidenceAgent(),
            case_draft_agent=StubCaseDraftAgent(),
        )
        await orchestrator.run_case(seller_case.case_id)

        saved = await store.get_case(seller_case.case_id)
        assert saved is not None
        assert saved.status == "completed"
        assert saved.seller_profile is not None
        assert len(saved.discovered_listings) >= 2
        assert len(saved.triage_assessments) >= 1
        assert len(saved.official_product_matches) >= 1
        assert len(saved.suspect_listings) >= 1
        assert saved.action_request_draft is not None
        assert saved.summary == "Seller case prepared."

    asyncio.run(run())
