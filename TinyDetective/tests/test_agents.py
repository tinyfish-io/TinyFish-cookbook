"""Non-network agent tests."""

from __future__ import annotations

import asyncio

from agents.candidate_discovery_agent import CandidateDiscoveryAgent
from agents.candidate_triage_agent import CandidateTriageAgent
from agents.evidence_agent import EvidenceAgent
from agents.product_comparison_agent import ProductComparisonAgent
from agents.reasoning_enrichment_agent import ReasoningEnrichmentAgent
from agents.ranking_agent import RankingAgent
from agents.research_summary_agent import ResearchSummaryAgent
from models.schemas import (
    CandidateProduct,
    ComparisonReasoningEnrichment,
    ComparisonResult,
    SourceProduct,
)
from services.settings import settings


class StubComparisonAdapter:
    async def fetch_candidate_product(self, candidate_url: str, marketplace: str):
        candidate = CandidateProduct(
            product_url=candidate_url,
            marketplace=marketplace,
            seller_name="Discount Device Hub",
            title="Impact Case Hello Kitty Compatible Case",
            price=19.9,
            currency="SGD",
            brand="CasetifyX",
            color="Midnight Black",
            size="iPhone 16 Pro",
            material="Shock-absorbing TPU",
            model="CAS-1234",
            sku="CAS-HELLO1-ALT",
            description="Premium impact protection with MagSafe support. Compatible edition.",
            image_urls=[],
        )
        return candidate, {"tinyfish_run_id": "stub-run", "tinyfish_status": "COMPLETED"}


class OfficialStoreStubComparisonAdapter:
    async def fetch_candidate_product(self, candidate_url: str, marketplace: str):
        candidate = CandidateProduct(
            product_url=candidate_url,
            marketplace=marketplace,
            seller_name="Casetify Official Store",
            title="Impact Case Hello Kitty",
            price=89.0,
            currency="SGD",
            brand="Casetify",
            color="Midnight Black",
            size="iPhone 16 Pro",
            material="Shock-absorbing TPU",
            model="CAS-1234",
            sku="CAS-HELLO1",
            description="Premium impact protection with MagSafe support.",
            image_urls=[],
        )
        return candidate, {"tinyfish_run_id": "stub-run", "tinyfish_status": "COMPLETED"}


class SearchCaptureAdapter:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    async def search(
        self,
        source_product: SourceProduct,
        comparison_site: str,
        search_query: str,
        top_n: int = 3,
        on_update=None,
    ):
        del source_product, on_update
        self.calls.append(
            {
                "comparison_site": comparison_site,
                "search_query": search_query,
                "top_n": top_n,
            }
        )
        candidate = CandidateProduct(
            product_url=f"{comparison_site.rstrip('/')}/product/{search_query.replace(' ', '-')}",
            marketplace="Shopee",
            discovery_queries=[search_query],
        )
        return [candidate], {"tinyfish_run_id": "stub-run", "tinyfish_status": "COMPLETED"}


class StubOpenAIClient:
    async def run_json(self, **kwargs):
        del kwargs
        return {
            "enriched_reason": "OpenAI found stronger suspicious overlap than the deterministic summary captured.",
            "reasoning_notes": ["Description overlap reinforces counterfeit concern."],
            "additional_suspicious_signals": ["description_semantic_overlap"],
            "risk_adjustment": 0.07,
            "match_adjustment": 0.03,
        }


def test_product_comparison_agent_flags_low_priced_copy() -> None:
    async def run() -> None:
        source_product = SourceProduct(
            source_url="https://brand.example/products/alpha-case",
            brand="Casetify",
            product_name="Impact Case Hello Kitty",
            category="Accessories",
            subcategory="Phone Case",
            price=89.0,
            currency="SGD",
            color="Midnight Black",
            size="iPhone 16 Pro",
            material="Shock-absorbing TPU",
            model="CAS-1234",
            sku="CAS-HELLO1",
            description="Premium impact protection with MagSafe support.",
        )
        candidate = CandidateProduct(product_url="https://shopee.sg/product/alpha-copy", marketplace="Shopee")
        agent = ProductComparisonAgent(adapter=StubComparisonAdapter())
        result, _ = await agent.run(source_product, candidate)
        assert result.counterfeit_risk_score >= 0.6
        assert "suspiciously_low_price" in result.suspicious_signals
        assert "brand_mismatch" in result.suspicious_signals
        assert "sku_mismatch" not in result.suspicious_signals

    asyncio.run(run())


def test_evidence_agent_emits_structured_differences() -> None:
    async def run() -> None:
        source_product = SourceProduct(
            source_url="https://brand.example/products/alpha-case",
            brand="Casetify",
            product_name="Impact Case Hello Kitty",
            price=89.0,
            currency="SGD",
            color="Midnight Black",
            size="iPhone 16 Pro",
            material="Shock-absorbing TPU",
            model="CAS-1234",
            sku="CAS-HELLO1",
            description="Premium impact protection with MagSafe support.",
        )
        comparison_agent = ProductComparisonAgent(adapter=StubComparisonAdapter())
        candidate = CandidateProduct(product_url="https://shopee.sg/product/alpha-copy", marketplace="Shopee")
        comparison, _ = await comparison_agent.run(source_product, candidate)
        evidence = await EvidenceAgent().run(source_product, comparison)
        assert any(item.field == "price" for item in evidence)
        assert any(item.field == "brand" for item in evidence)
        assert not any(item.field == "sku" for item in evidence)

    asyncio.run(run())


def test_product_comparison_agent_marks_official_store_for_exclusion() -> None:
    async def run() -> None:
        source_product = SourceProduct(
            source_url="https://www.casetify.com/product/alpha-case",
            brand="Casetify",
            product_name="Impact Case Hello Kitty",
            price=89.0,
            currency="SGD",
            color="Midnight Black",
            size="iPhone 16 Pro",
            material="Shock-absorbing TPU",
            model="CAS-1234",
            sku="CAS-HELLO1",
            description="Premium impact protection with MagSafe support.",
        )
        candidate = CandidateProduct(
            product_url="https://shopee.sg/product/official-alpha",
            marketplace="Shopee",
        )
        result, _ = await ProductComparisonAgent(
            adapter=OfficialStoreStubComparisonAdapter()
        ).run(source_product, candidate)
        assert result.is_official_store is True
        assert result.official_store_confidence >= 0.75
        assert "seller_name_contains_official_store_terms" in result.official_store_signals

    asyncio.run(run())


def test_research_summary_agent_explains_official_store_exclusions() -> None:
    async def run() -> None:
        source_product = SourceProduct(
            source_url="https://www.casetify.com/product/alpha-case",
            brand="Casetify",
            product_name="Impact Case Hello Kitty",
        )
        summary = await ResearchSummaryAgent().run(
            source_product,
            [],
            excluded_official_store_count=2,
        )
        assert "official-store" in summary

    asyncio.run(run())


def test_candidate_discovery_agent_builds_semantic_brand_led_queries() -> None:
    async def run() -> None:
        adapter = SearchCaptureAdapter()
        agent = CandidateDiscoveryAgent(adapter=adapter)
        source_product = SourceProduct(
            source_url="https://www.casetify.com/product/impact-case-hello-kitty",
            brand="Casetify",
            product_name="Impact Case Hello Kitty",
            category="Accessories",
            subcategory="Phone Case",
            color="Midnight Black",
            size="iPhone 16 Pro",
            material="Shock-absorbing TPU",
            features=["MagSafe compatible", "Impact resistance"],
        )
        candidates, raw_outputs = await agent.run(source_product, ["https://shopee.sg"], top_n=2)
        queries = [call["search_query"] for call in adapter.calls]
        assert queries
        assert all(isinstance(query, str) for query in queries)
        assert all(str(query).startswith("casetify ") for query in queries)
        assert len(queries) == 5
        assert any("phone case" in str(query) for query in queries)
        assert len(adapter.calls) == len(queries)
        assert len(raw_outputs) == len(queries)
        assert len(candidates) == len(queries)
        assert all(candidate.discovery_queries for candidate in candidates)

    asyncio.run(run())


def test_candidate_triage_agent_heuristic_shortlists_relevant_discount_listing() -> None:
    async def run() -> None:
        source_product = SourceProduct(
            source_url="https://brand.example/products/alpha-case",
            brand="Brand",
            product_name="Alpha Case",
            category="Accessories",
            subcategory="Phone Case",
            price=100.0,
            currency="SGD",
        )
        candidate = CandidateProduct(
            product_url="https://market.example/listing/alpha-case-discount",
            marketplace="Market",
            seller_name="Discount Hub",
            title="Brand Alpha Case",
            price=55.0,
            currency="SGD",
            brand="Brand",
            discovery_queries=["brand alpha case"],
        )
        assessment = await CandidateTriageAgent().run(source_product, candidate)
        assert assessment.should_shortlist is True
        assert assessment.investigation_priority_score >= 0.34
        assert assessment.suspicion_score >= 0.32

    asyncio.run(run())


def test_reasoning_enrichment_agent_applies_bounded_adjustments() -> None:
    async def run() -> None:
        original_api_key = settings.openai_api_key
        object.__setattr__(settings, "openai_api_key", "test-key")
        try:
            source_product = SourceProduct(
                source_url="https://brand.example/products/alpha-case",
                brand="Brand",
                product_name="Alpha Case",
                description="Protective phone case",
            )
            comparison = ComparisonResult(
                source_url=source_product.source_url,
                product_url="https://market.example/listing/alpha-case",
                marketplace="Market",
                match_score=0.52,
                is_exact_match=False,
                counterfeit_risk_score=0.58,
                suspicious_signals=["suspiciously_low_price"],
                reason="Deterministic baseline reason.",
                candidate_product=CandidateProduct(
                    product_url="https://market.example/listing/alpha-case",
                    marketplace="Market",
                    description="Protective phone case compatible version",
                ),
            )
            agent = ReasoningEnrichmentAgent(client=StubOpenAIClient())
            enrichment = await agent.run(source_product, comparison)
            assert isinstance(enrichment, ComparisonReasoningEnrichment)
            enriched = agent.apply(comparison, enrichment)
            assert enriched.reason.startswith("OpenAI found stronger suspicious overlap")
            assert "description_semantic_overlap" in enriched.suspicious_signals
            assert enriched.counterfeit_risk_score == 0.65
            assert enriched.match_score == 0.55
        finally:
            object.__setattr__(settings, "openai_api_key", original_api_key)

    asyncio.run(run())


def test_ranking_agent_sorts_by_risk_and_returns_five_matches() -> None:
    async def run() -> None:
        source_url = "https://brand.example/products/alpha-case"
        comparisons = [
            ComparisonResult(
                source_url=source_url,
                product_url=f"https://market.example/listing/{index}",
                marketplace="Shopee",
                match_score=0.95 - (index * 0.05),
                is_exact_match=index == 0,
                counterfeit_risk_score=0.1 + (index * 0.15),
                suspicious_signals=[],
                reason=f"Candidate {index}",
                candidate_product=CandidateProduct(
                    product_url=f"https://market.example/listing/{index}",
                    marketplace="Shopee",
                ),
            )
            for index in range(6)
        ]

        ranked = await RankingAgent().run(comparisons)

        assert len(ranked) == 5
        assert str(ranked[0].product_url).endswith("/5")
        assert str(ranked[1].product_url).endswith("/4")
        assert str(ranked[4].product_url).endswith("/1")

    asyncio.run(run())
