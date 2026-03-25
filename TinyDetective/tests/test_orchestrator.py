"""Non-network orchestrator-adjacent tests."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from models.schemas import (
    AgentTaskState,
    CandidateProduct,
    ComparisonReasoningEnrichment,
    CandidateTriageAssessment,
    ComparisonResult,
    InvestigationCreateRequest,
    InvestigationReport,
    InvestigationStatus,
    SourceProduct,
    TaskStatus,
)
from services.investigation_orchestrator import InvestigationOrchestrator
from services.investigation_store import InvestigationStore
from services.tinyfish_client import TinyFishRun


def test_investigation_request_defaults_comparison_sites() -> None:
    request = InvestigationCreateRequest(
        source_urls=["https://brand.example/products/alpha-case"],
    )
    assert request.comparison_sites == []


class BlockingSourceAgent:
    def __init__(self) -> None:
        self.started = asyncio.Event()
        self.release = asyncio.Event()

    async def run(self, source_url: str, on_update=None):
        self.started.set()
        await self.release.wait()
        return SourceProduct(source_url=source_url, brand="Brand"), {"runtime": "stub"}


class EmptyDiscoveryAgent:
    async def run(
        self,
        source_product: SourceProduct,
        comparison_sites: list[str],
        top_n: int = 5,
        on_update=None,
    ):
        return [], []

    async def run_for_site(
        self,
        source_product: SourceProduct,
        comparison_site: str,
        top_n: int = 5,
        on_update=None,
    ):
        return [], {}


class MultiCandidateDiscoveryAgent:
    def build_search_queries(self, source_product: SourceProduct) -> list[str]:
        del source_product
        return ["brand alpha case"]

    async def run_for_site(
        self,
        source_product: SourceProduct,
        comparison_site: str,
        search_query: str,
        top_n: int = 5,
        on_update=None,
    ):
        del source_product, comparison_site, top_n, on_update
        candidates = [
            CandidateProduct(
                product_url=f"https://market.example/{search_query.replace(' ', '-')}-{index}",
                marketplace="Market",
                title=f"Candidate {index}",
                discovery_queries=[search_query],
            )
            for index in range(3)
        ]
        return candidates, {}


class SummaryAgent:
    async def run(
        self,
        source_product: SourceProduct | None,
        top_matches: list[object],
        excluded_official_store_count: int = 0,
        error: str | None = None,
    ):
        del source_product, top_matches, excluded_official_store_count
        return error or "Finished summary"


class ImmediateSourceAgent:
    async def run(self, source_url: str, on_update=None):
        del on_update
        return SourceProduct(source_url=source_url, brand="Brand", product_name="Alpha Case"), {}


class StubTriageAgent:
    async def run(self, source_product: SourceProduct, candidate: CandidateProduct):
        del source_product
        shortlisted = not str(candidate.product_url).endswith("-2")
        return CandidateTriageAssessment(
            source_url="https://brand.example/products/alpha-case",
            product_url=str(candidate.product_url),
            investigation_priority_score=0.8 if shortlisted else 0.1,
            suspicion_score=0.6 if shortlisted else 0.05,
            should_shortlist=shortlisted,
            rationale="shortlist" if shortlisted else "skip",
            suspicious_signals=["title_semantic_overlap"] if shortlisted else [],
        )


class ParallelComparisonAgent:
    def __init__(self) -> None:
        self.calls = 0
        self.active = 0
        self.max_active = 0

    async def run(self, source_product: SourceProduct, candidate: CandidateProduct, on_update=None):
        del source_product, on_update
        self.calls += 1
        self.active += 1
        self.max_active = max(self.max_active, self.active)
        await asyncio.sleep(0.05)
        self.active -= 1
        return (
            ComparisonResult(
                source_url="https://brand.example/products/alpha-case",
                product_url=candidate.product_url,
                marketplace=candidate.marketplace,
                match_score=0.6,
                is_exact_match=False,
                counterfeit_risk_score=0.7,
                suspicious_signals=["suspiciously_low_price"],
                reason="Parallel comparison result.",
                candidate_product=candidate,
            ),
            {"tinyfish_status": "COMPLETED", "tinyfish_run_id": f"run-{self.calls}"},
        )


class EmptyEvidenceAgent:
    async def run(self, source_product: SourceProduct, comparison: ComparisonResult):
        del source_product, comparison
        return []


class StubReasoningEnrichmentAgent:
    async def run(self, source_product: SourceProduct, comparison: ComparisonResult):
        del source_product
        return ComparisonReasoningEnrichment(
            source_url=comparison.source_url,
            product_url=comparison.product_url,
            enriched_reason="OpenAI enrichment elevated the suspicious-case rationale.",
            reasoning_notes=["Semantic overlap reinforced the deterministic comparison."],
            additional_suspicious_signals=["description_semantic_overlap"],
            risk_adjustment=0.06,
            match_adjustment=0.02,
        )

    def apply(self, comparison: ComparisonResult, enrichment):
        comparison.reason = enrichment.enriched_reason
        comparison.reasoning_notes = list(enrichment.reasoning_notes)
        comparison.suspicious_signals = list(
            dict.fromkeys(comparison.suspicious_signals + enrichment.additional_suspicious_signals)
        )
        comparison.counterfeit_risk_score = round(comparison.counterfeit_risk_score + enrichment.risk_adjustment, 2)
        comparison.match_score = round(comparison.match_score + enrichment.match_adjustment, 2)
        comparison.reasoning_enrichment_source = "openai"
        return comparison


class PassthroughRankingAgent:
    async def run(self, comparisons: list[ComparisonResult]):
        return comparisons


class UpdatingSourceAgent:
    def __init__(self) -> None:
        self.started = asyncio.Event()
        self.release = asyncio.Event()

    async def run(self, source_url: str, on_update=None):
        if on_update is not None:
            await on_update(
                TinyFishRun(
                    run_id="run-source-123",
                    status="RUNNING",
                    elapsed_seconds=12.5,
                    last_heartbeat_at=datetime(2026, 3, 21, 10, 0, 5, tzinfo=timezone.utc),
                    last_progress_at=datetime(2026, 3, 21, 10, 0, 3, tzinfo=timezone.utc),
                )
            )
        self.started.set()
        await self.release.wait()
        return SourceProduct(source_url=source_url, brand="Brand"), {"tinyfish_run_id": "run-source-123"}


class ResumeOnlySourceAgent:
    def __init__(self) -> None:
        self.run_calls = 0
        self.resume_calls = 0

    async def run(self, source_url: str, on_update=None):
        self.run_calls += 1
        raise AssertionError("resume path should not start a new TinyFish run")

    async def resume(
        self,
        source_url: str,
        run_id: str,
        on_update=None,
        started_at=None,
        last_progress_at=None,
    ):
        self.resume_calls += 1
        if on_update is not None:
            await on_update(
                TinyFishRun(
                    run_id=run_id,
                    status="RUNNING",
                    elapsed_seconds=18.0,
                    last_heartbeat_at=datetime(2026, 3, 21, 10, 0, 9, tzinfo=timezone.utc),
                    last_progress_at=datetime(2026, 3, 21, 10, 0, 7, tzinfo=timezone.utc),
                )
            )
        return SourceProduct(source_url=source_url, brand="Brand"), {
            "tinyfish_run_id": run_id,
            "tinyfish_status": "COMPLETED",
        }


def test_orchestrator_persists_inflight_task_progress(tmp_path) -> None:
    async def run() -> None:
        store = InvestigationStore(tmp_path / "orchestrator-progress.sqlite3")
        source_agent = BlockingSourceAgent()
        orchestrator = InvestigationOrchestrator(
            store=store,
            source_agent=source_agent,
            discovery_agent=EmptyDiscoveryAgent(),
            summary_agent=SummaryAgent(),
        )
        created = await store.create(
            InvestigationCreateRequest(
                source_urls=["https://brand.example/products/alpha-case"],
                comparison_sites=["https://shopee.sg/"],
            )
        )

        investigation_task = asyncio.create_task(orchestrator.run_investigation(created.investigation_id))
        await asyncio.wait_for(source_agent.started.wait(), timeout=1.0)

        in_progress = await store.get(created.investigation_id)
        assert in_progress is not None
        assert in_progress.status == InvestigationStatus.running
        assert len(in_progress.reports) == 1
        assert in_progress.reports[0].summary == "Extracting official product details."
        assert len(in_progress.reports[0].raw_agent_outputs) == 1
        assert in_progress.reports[0].raw_agent_outputs[0].agent_name == "source_extraction"
        assert in_progress.reports[0].raw_agent_outputs[0].status == TaskStatus.running

        source_agent.release.set()
        await asyncio.wait_for(investigation_task, timeout=1.0)

    asyncio.run(run())


def test_orchestrator_persists_provider_heartbeat_updates(tmp_path) -> None:
    async def run() -> None:
        store = InvestigationStore(tmp_path / "orchestrator-heartbeat.sqlite3")
        source_agent = UpdatingSourceAgent()
        orchestrator = InvestigationOrchestrator(
            store=store,
            source_agent=source_agent,
            discovery_agent=EmptyDiscoveryAgent(),
            summary_agent=SummaryAgent(),
        )
        created = await store.create(
            InvestigationCreateRequest(
                source_urls=["https://brand.example/products/alpha-case"],
                comparison_sites=["https://shopee.sg/"],
            )
        )

        investigation_task = asyncio.create_task(orchestrator.run_investigation(created.investigation_id))
        await asyncio.wait_for(source_agent.started.wait(), timeout=1.0)

        in_progress = await store.get(created.investigation_id)
        assert in_progress is not None
        source_task = in_progress.reports[0].raw_agent_outputs[0]
        assert source_task.provider_run_id == "run-source-123"
        assert source_task.provider_status == "RUNNING"
        assert source_task.last_heartbeat_at == datetime(2026, 3, 21, 10, 0, 5, tzinfo=timezone.utc)
        assert source_task.last_progress_at == datetime(2026, 3, 21, 10, 0, 3, tzinfo=timezone.utc)
        assert source_task.output_payload["runtime"]["tinyfish_run_id"] == "run-source-123"

        source_agent.release.set()
        await asyncio.wait_for(investigation_task, timeout=1.0)

    asyncio.run(run())


def test_investigation_store_persists_across_instances(tmp_path) -> None:
    async def run() -> None:
        database_path = tmp_path / "investigations.sqlite3"
        store = InvestigationStore(database_path)
        created = await store.create(
            InvestigationCreateRequest(
                source_urls=["https://brand.example/products/alpha-case"],
                comparison_sites=["https://shopee.sg/"],
            )
        )

        created.status = InvestigationStatus.completed
        await store.save(created)

        reloaded_store = InvestigationStore(database_path)
        saved_request = await reloaded_store.get_request(created.investigation_id)
        saved_investigation = await reloaded_store.get(created.investigation_id)

        assert saved_request.source_urls == ["https://brand.example/products/alpha-case"]
        assert saved_request.comparison_sites == ["https://shopee.sg/"]
        assert saved_investigation is not None
        assert saved_investigation.investigation_id == created.investigation_id
        assert saved_investigation.status == InvestigationStatus.completed

    asyncio.run(run())


def test_investigation_store_lists_active_runs(tmp_path) -> None:
    async def run() -> None:
        store = InvestigationStore(tmp_path / "active.sqlite3")
        active = await store.create(
            InvestigationCreateRequest(
                source_urls=["https://brand.example/products/active-case"],
                comparison_sites=["https://shopee.sg/"],
            )
        )
        completed = await store.create(
            InvestigationCreateRequest(
                source_urls=["https://brand.example/products/completed-case"],
                comparison_sites=["https://shopee.sg/"],
            )
        )
        completed.status = InvestigationStatus.completed
        await store.save(completed)

        active_runs = await store.list_active()
        active_ids = {item.investigation_id for item in active_runs}

        assert active.investigation_id in active_ids
        assert completed.investigation_id not in active_ids

    asyncio.run(run())


def test_investigation_store_lists_recent_runs_newest_first(tmp_path) -> None:
    async def run() -> None:
        store = InvestigationStore(tmp_path / "recent.sqlite3")
        first = await store.create(
            InvestigationCreateRequest(
                source_urls=["https://brand.example/products/first-case"],
                comparison_sites=["https://shopee.sg/"],
            )
        )
        second = await store.create(
            InvestigationCreateRequest(
                source_urls=["https://brand.example/products/second-case"],
                comparison_sites=["https://shopee.sg/"],
            )
        )

        recent_runs = await store.list_recent(limit=10)

        assert [item.investigation_id for item in recent_runs[:2]] == [
            second.investigation_id,
            first.investigation_id,
        ]
        assert recent_runs[0].primary_source_url == "https://brand.example/products/second-case"

    asyncio.run(run())


def test_orchestrator_resumes_saved_source_run_after_restart(tmp_path) -> None:
    async def run() -> None:
        database_path = tmp_path / "resume.sqlite3"
        store = InvestigationStore(database_path)
        created = await store.create(
            InvestigationCreateRequest(
                source_urls=["https://brand.example/products/alpha-case"],
                comparison_sites=["https://shopee.sg/"],
            )
        )

        investigation = await store.get(created.investigation_id)
        assert investigation is not None
        investigation.status = InvestigationStatus.running
        investigation.reports = [
            InvestigationReport(
                source_url="https://brand.example/products/alpha-case",
                summary="Extracting official product details.",
                raw_agent_outputs=[
                    AgentTaskState(
                        agent_name="source_extraction",
                        status=TaskStatus.running,
                        input_payload={"source_url": "https://brand.example/products/alpha-case"},
                        output_payload={"runtime": {"tinyfish_run_id": "run-source-123"}},
                        provider_run_id="run-source-123",
                        provider_status="RUNNING",
                        started_at=datetime(2026, 3, 21, 10, 0, 0, tzinfo=timezone.utc),
                        last_heartbeat_at=datetime(2026, 3, 21, 10, 0, 5, tzinfo=timezone.utc),
                        last_progress_at=datetime(2026, 3, 21, 10, 0, 3, tzinfo=timezone.utc),
                    )
                ],
            )
        ]
        await store.save(investigation)

        source_agent = ResumeOnlySourceAgent()
        orchestrator = InvestigationOrchestrator(
            store=InvestigationStore(database_path),
            source_agent=source_agent,
            discovery_agent=EmptyDiscoveryAgent(),
            summary_agent=SummaryAgent(),
        )

        await orchestrator.run_investigation(created.investigation_id)

        reloaded = await store.get(created.investigation_id)
        assert reloaded is not None
        assert source_agent.resume_calls == 1
        assert source_agent.run_calls == 0
        assert reloaded.status == InvestigationStatus.completed
        assert reloaded.reports[0].extracted_source_product is not None
        source_task = reloaded.reports[0].raw_agent_outputs[0]
        assert source_task.status == TaskStatus.completed
        assert source_task.provider_run_id == "run-source-123"

    asyncio.run(run())


def test_orchestrator_shortlists_candidates_before_parallel_tinyfish_comparison(tmp_path) -> None:
    async def run() -> None:
        store = InvestigationStore(tmp_path / "shortlist.sqlite3")
        comparison_agent = ParallelComparisonAgent()
        orchestrator = InvestigationOrchestrator(
            store=store,
            source_agent=ImmediateSourceAgent(),
            discovery_agent=MultiCandidateDiscoveryAgent(),
            triage_agent=StubTriageAgent(),
            comparison_agent=comparison_agent,
            evidence_agent=EmptyEvidenceAgent(),
            reasoning_enrichment_agent=StubReasoningEnrichmentAgent(),
            ranking_agent=PassthroughRankingAgent(),
            summary_agent=SummaryAgent(),
        )
        created = await store.create(
            InvestigationCreateRequest(
                source_urls=["https://brand.example/products/alpha-case"],
                comparison_sites=["https://market.example/"],
                max_shortlisted_candidates=2,
            )
        )

        await orchestrator.run_investigation(created.investigation_id)

        saved = await store.get(created.investigation_id)
        assert saved is not None
        report = saved.reports[0]
        triage_tasks = [
            task for task in report.raw_agent_outputs if task.agent_name == "candidate_triage"
        ]
        comparison_tasks = [
            task for task in report.raw_agent_outputs if task.agent_name == "product_comparison"
        ]
        enrichment_tasks = [
            task for task in report.raw_agent_outputs if task.agent_name == "reasoning_enrichment"
        ]
        assert len(triage_tasks) >= 3
        assert len(comparison_tasks) == 2
        assert len(enrichment_tasks) == 2
        assert comparison_agent.calls == 2
        assert comparison_agent.max_active >= 2
        assert report.top_matches[0].reasoning_enrichment_source == "openai"
        assert "description_semantic_overlap" in report.top_matches[0].suspicious_signals

    asyncio.run(run())
