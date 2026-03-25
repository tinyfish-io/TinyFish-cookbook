"""Investigation orchestrator for the counterfeit research pipeline."""

from __future__ import annotations

import asyncio
import inspect
from typing import Any

from agents.candidate_discovery_agent import CandidateDiscoveryAgent
from agents.candidate_triage_agent import CandidateTriageAgent
from agents.evidence_agent import EvidenceAgent
from agents.product_comparison_agent import ProductComparisonAgent
from agents.reasoning_enrichment_agent import ReasoningEnrichmentAgent
from agents.ranking_agent import RankingAgent
from agents.research_summary_agent import ResearchSummaryAgent
from agents.source_extraction_agent import SourceExtractionAgent
from models.schemas import (
    AgentTaskState,
    CandidateProduct,
    ComparisonReasoningEnrichment,
    CandidateTriageAssessment,
    ComparisonResult,
    EvidenceItem,
    InvestigationReport,
    InvestigationResponse,
    InvestigationStatus,
    SourceProduct,
    TaskStatus,
    utc_now,
)
from services.investigation_store import InvestigationStore
from services.settings import settings
from services.tinyfish_client import TinyFishRun
from services.tinyfish_runtime import TinyFishRuntime


class InvestigationOrchestrator:
    """Coordinate the multi-agent counterfeit research workflow."""

    ACTIVE_TASK_STATUSES = {TaskStatus.running, TaskStatus.delayed}

    def __init__(
        self,
        store: InvestigationStore,
        runtime: TinyFishRuntime | None = None,
        source_agent: SourceExtractionAgent | None = None,
        discovery_agent: CandidateDiscoveryAgent | None = None,
        triage_agent: CandidateTriageAgent | None = None,
        comparison_agent: ProductComparisonAgent | None = None,
        evidence_agent: EvidenceAgent | None = None,
        reasoning_enrichment_agent: ReasoningEnrichmentAgent | None = None,
        ranking_agent: RankingAgent | None = None,
        summary_agent: ResearchSummaryAgent | None = None,
    ) -> None:
        self.store = store
        self.runtime = runtime or TinyFishRuntime()
        self.source_agent = source_agent or SourceExtractionAgent()
        self.discovery_agent = discovery_agent or CandidateDiscoveryAgent()
        self.triage_agent = triage_agent or CandidateTriageAgent()
        self.comparison_agent = comparison_agent or ProductComparisonAgent()
        self.evidence_agent = evidence_agent or EvidenceAgent()
        self.reasoning_enrichment_agent = reasoning_enrichment_agent or ReasoningEnrichmentAgent()
        self.ranking_agent = ranking_agent or RankingAgent()
        self.summary_agent = summary_agent or ResearchSummaryAgent()

    @staticmethod
    def _pending_report(source_url: str) -> InvestigationReport:
        return InvestigationReport(
            source_url=source_url,
            summary="Queued for investigation.",
        )

    @staticmethod
    def _merge_reports(
        existing_reports: list[InvestigationReport],
        source_urls: list[str],
    ) -> list[InvestigationReport]:
        reports: list[InvestigationReport] = []
        for index, source_url in enumerate(source_urls):
            if index < len(existing_reports):
                report = existing_reports[index]
                report.source_url = source_url
            else:
                report = InvestigationOrchestrator._pending_report(source_url)
            reports.append(report)
        return reports

    async def _save_report_progress(
        self,
        investigation: InvestigationResponse,
        report_index: int,
        report: InvestigationReport,
    ) -> None:
        investigation.reports[report_index] = report
        await self.store.save(investigation)

    @staticmethod
    async def _run_with_optional_update(
        fn: object,
        *args: object,
        on_update: object | None = None,
        **kwargs: object,
    ) -> object:
        if on_update is not None and "on_update" in inspect.signature(fn).parameters:
            return await fn(*args, on_update=on_update, **kwargs)
        return await fn(*args, **kwargs)

    @staticmethod
    def _runtime_payload(run: TinyFishRun) -> dict[str, object]:
        return {
            "tinyfish_run_id": run.run_id,
            "tinyfish_status": run.status,
            "tinyfish_result": run.result,
            "tinyfish_elapsed_seconds": run.elapsed_seconds,
            "tinyfish_delayed": run.delayed,
            "tinyfish_last_heartbeat_at": run.last_heartbeat_at.isoformat() if run.last_heartbeat_at else None,
            "tinyfish_last_progress_at": run.last_progress_at.isoformat() if run.last_progress_at else None,
        }

    @staticmethod
    def _search_summary(comparison_sites: list[str]) -> str:
        return (
            f"Searching {len(comparison_sites)} marketplace target"
            f"{'' if len(comparison_sites) == 1 else 's'}."
        )

    @staticmethod
    def _candidate_summary(candidate_count: int) -> str:
        if candidate_count == 0:
            return "No candidate listings found. Moving to ranking and summary."
        return (
            f"Triaging {candidate_count} candidate listing"
            f"{'' if candidate_count == 1 else 's'}."
        )

    @staticmethod
    def _triage_summary(candidate_count: int, shortlisted_count: int | None = None) -> str:
        if shortlisted_count is None:
            return (
                f"Triaging {candidate_count} discovered candidate listing"
                f"{'' if candidate_count == 1 else 's'} with OpenAI."
            )
        return (
            f"Shortlisted {shortlisted_count} candidate listing"
            f"{'' if shortlisted_count == 1 else 's'} for parallel TinyFish extraction."
        )

    @staticmethod
    def _comparison_summary(total_candidates: int) -> str:
        return (
            f"Running parallel TinyFish extraction across {total_candidates} shortlisted candidate"
            f"{'' if total_candidates == 1 else 's'}."
        )

    @staticmethod
    def _evidence_summary(total_candidates: int) -> str:
        return (
            f"Collecting evidence across {total_candidates} shortlisted candidate"
            f"{'' if total_candidates == 1 else 's'}."
        )

    @staticmethod
    def _reasoning_enrichment_summary(total_candidates: int) -> str:
        return (
            f"Refining reasoning across {total_candidates} shortlisted candidate"
            f"{'' if total_candidates == 1 else 's'} with OpenAI."
        )

    @staticmethod
    def _find_task(
        task_log: list[AgentTaskState],
        agent_name: str,
        *,
        identifier_key: str | None = None,
        identifier_value: str | None = None,
        statuses: set[TaskStatus] | None = None,
    ) -> AgentTaskState | None:
        for task in reversed(task_log):
            if task.agent_name != agent_name:
                continue
            if identifier_key is not None and task.input_payload.get(identifier_key) != identifier_value:
                continue
            if statuses is not None and task.status not in statuses:
                continue
            return task
        return None

    @staticmethod
    def _load_source_product(
        report: InvestigationReport,
        task_log: list[AgentTaskState],
    ) -> SourceProduct | None:
        if report.extracted_source_product is not None:
            return report.extracted_source_product
        source_task = InvestigationOrchestrator._find_task(
            task_log,
            "source_extraction",
            statuses={TaskStatus.completed},
        )
        source_payload = source_task.output_payload.get("source_product") if source_task else None
        if source_payload is None:
            return None
        return SourceProduct.model_validate(source_payload)

    @staticmethod
    def _load_candidates_from_task(task: AgentTaskState) -> list[CandidateProduct]:
        return [
            CandidateProduct.model_validate(candidate)
            for candidate in task.output_payload.get("candidates", [])
        ]

    @staticmethod
    def _load_comparison_from_task(task: AgentTaskState) -> ComparisonResult:
        return ComparisonResult.model_validate(task.output_payload["comparison"])

    @staticmethod
    def _load_evidence_from_task(task: AgentTaskState) -> list[EvidenceItem]:
        return [
            EvidenceItem.model_validate(item)
            for item in task.output_payload.get("evidence", [])
        ]

    @staticmethod
    def _load_triage_from_task(task: AgentTaskState) -> CandidateTriageAssessment:
        return CandidateTriageAssessment.model_validate(task.output_payload["triage"])

    @staticmethod
    def _load_reasoning_enrichment_from_task(task: AgentTaskState) -> ComparisonReasoningEnrichment:
        return ComparisonReasoningEnrichment.model_validate(task.output_payload["enrichment"])

    @staticmethod
    def _prepare_task_for_retry(
        task: AgentTaskState,
        *,
        clear_provider_state: bool = True,
    ) -> None:
        task.status = TaskStatus.running
        task.error = None
        task.output_payload = {}
        task.started_at = utc_now()
        task.completed_at = None
        if clear_provider_state:
            task.provider_run_id = None
            task.provider_status = None
            task.last_heartbeat_at = None
            task.last_progress_at = None

    @staticmethod
    def _report_is_complete(report: InvestigationReport) -> bool:
        if any(task.status in InvestigationOrchestrator.ACTIVE_TASK_STATUSES for task in report.raw_agent_outputs):
            return False
        if report.error is not None:
            return True
        return (
            InvestigationOrchestrator._find_task(
                report.raw_agent_outputs,
                "research_summary",
                statuses={TaskStatus.completed},
            )
            is not None
        )

    async def _apply_task_update(
        self,
        investigation: InvestigationResponse,
        report_index: int,
        report: InvestigationReport,
        task_log: list[AgentTaskState],
        task: AgentTaskState,
        run: TinyFishRun,
        running_summary: str,
        delayed_summary: str | None = None,
    ) -> None:
        task.provider_run_id = run.run_id
        task.provider_status = run.status
        task.last_heartbeat_at = run.last_heartbeat_at
        task.last_progress_at = run.last_progress_at
        task.status = TaskStatus.delayed if run.delayed else TaskStatus.running
        task.output_payload = {"runtime": self._runtime_payload(run)}

        investigation.status = (
            InvestigationStatus.delayed if run.delayed else InvestigationStatus.running
        )
        report.summary = delayed_summary if run.delayed and delayed_summary else running_summary
        report.raw_agent_outputs = task_log
        report.error = None
        await self._save_report_progress(investigation, report_index, report)

    async def run_investigation(self, investigation_id: str) -> None:
        request = await self.store.get_request(investigation_id)
        investigation = await self.store.get(investigation_id)
        if investigation is None or investigation.status in {InvestigationStatus.completed, InvestigationStatus.failed}:
            return

        source_urls = [str(source_url) for source_url in request.source_urls]
        investigation.status = InvestigationStatus.running
        investigation.updated_at = utc_now()
        investigation.error = None
        investigation.reports = self._merge_reports(investigation.reports, source_urls)
        await self.store.save(investigation)

        try:
            comparison_sites = [str(site) for site in request.comparison_sites] or settings.ecommerce_store_urls
            if not comparison_sites:
                raise ValueError(
                    "No comparison sites were provided in the request or ECOMMERCE_STORE_URLS."
                )
            for report_index, source_url in enumerate(source_urls):
                report = investigation.reports[report_index]
                if self._report_is_complete(report):
                    continue
                report = await self._run_for_source(
                    investigation,
                    report_index,
                    source_url,
                    comparison_sites,
                    request.max_candidates_per_site,
                    request.max_shortlisted_candidates,
                )
                investigation.reports[report_index] = report
            investigation.status = InvestigationStatus.completed
        except Exception as exc:  # pragma: no cover
            investigation.status = InvestigationStatus.failed
            investigation.error = str(exc)
        await self.store.save(investigation)

    async def _ensure_source_product(
        self,
        investigation: InvestigationResponse,
        report_index: int,
        report: InvestigationReport,
        task_log: list[AgentTaskState],
        source_url: str,
        search_summary: str,
    ) -> SourceProduct:
        source_product = self._load_source_product(report, task_log)
        source_task = self._find_task(task_log, "source_extraction")
        if source_task is not None and source_task.status == TaskStatus.completed and source_product is not None:
            report.extracted_source_product = source_product
            return source_product

        should_resume = (
            source_task is not None
            and source_task.status in self.ACTIVE_TASK_STATUSES
            and bool(source_task.provider_run_id)
        )
        if source_task is None:
            source_task = AgentTaskState(
                agent_name="source_extraction",
                status=TaskStatus.running,
                input_payload={"source_url": source_url},
                started_at=utc_now(),
            )
            task_log.append(source_task)
        elif not should_resume:
            self._prepare_task_for_retry(source_task)

        report.summary = "Extracting official product details."
        report.raw_agent_outputs = task_log
        report.error = None
        investigation.status = InvestigationStatus.running
        await self._save_report_progress(investigation, report_index, report)

        if should_resume:
            source_product, source_raw_output = await self.runtime.run_agent(
                lambda: self.source_agent.resume(
                    source_url,
                    source_task.provider_run_id or "",
                    started_at=source_task.started_at,
                    last_progress_at=source_task.last_progress_at,
                    on_update=lambda run: self._apply_task_update(
                        investigation,
                        report_index,
                        report,
                        task_log,
                        source_task,
                        run,
                        "Extracting official product details.",
                        "Extracting official product details. TinyFish is still working on the source page.",
                    ),
                )
            )
        else:
            source_product, source_raw_output = await self.runtime.run_agent(
                lambda: self._run_with_optional_update(
                    self.source_agent.run,
                    source_url,
                    on_update=lambda run: self._apply_task_update(
                        investigation,
                        report_index,
                        report,
                        task_log,
                        source_task,
                        run,
                        "Extracting official product details.",
                        "Extracting official product details. TinyFish is still working on the source page.",
                    ),
                )
            )

        source_task.status = TaskStatus.completed
        source_task.provider_status = source_raw_output.get("tinyfish_status")
        source_task.provider_run_id = source_raw_output.get("tinyfish_run_id")
        source_task.output_payload = {
            "source_product": source_product.model_dump(),
            "runtime": source_raw_output,
        }
        source_task.completed_at = utc_now()
        report.extracted_source_product = source_product
        report.summary = search_summary
        investigation.status = InvestigationStatus.running
        await self._save_report_progress(investigation, report_index, report)
        return source_product

    async def _ensure_candidates(
        self,
        investigation: InvestigationResponse,
        report_index: int,
        report: InvestigationReport,
        task_log: list[AgentTaskState],
        source_product: SourceProduct,
        comparison_sites: list[str],
        max_candidates_per_site: int,
        search_summary: str,
    ) -> list[CandidateProduct]:
        legacy_discovery_task = self._find_task(
            task_log,
            "candidate_discovery",
            statuses={TaskStatus.completed},
        )
        if (
            legacy_discovery_task is not None
            and "comparison_sites" in legacy_discovery_task.input_payload
        ):
            return self._load_candidates_from_task(legacy_discovery_task)

        def merge_candidates(
            candidates_by_url: dict[str, CandidateProduct],
            new_candidates: list[CandidateProduct],
        ) -> None:
            for candidate in new_candidates:
                candidate_url = str(candidate.product_url)
                existing = candidates_by_url.get(candidate_url)
                if existing is None:
                    candidates_by_url[candidate_url] = candidate
                    continue
                existing.discovery_queries = list(
                    dict.fromkeys(existing.discovery_queries + candidate.discovery_queries)
                )

        candidates_by_url: dict[str, CandidateProduct] = {}
        pending_queries: list[tuple[AgentTaskState, str, str, bool]] = []
        build_search_queries = getattr(self.discovery_agent, "build_search_queries", None)
        if callable(build_search_queries):
            search_queries = build_search_queries(source_product)
        else:
            search_queries = [
                value
                for value in (
                    source_product.product_name,
                    source_product.model,
                    source_product.brand,
                    str(source_product.source_url),
                )
                if value
            ][:1]

        for comparison_site in comparison_sites:
            for search_query in search_queries:
                discovery_key = f"{comparison_site}|{search_query}"
                discovery_task = self._find_task(
                    task_log,
                    "candidate_discovery",
                    identifier_key="discovery_key",
                    identifier_value=discovery_key,
                )
                if discovery_task is not None and discovery_task.status == TaskStatus.completed:
                    merge_candidates(candidates_by_url, self._load_candidates_from_task(discovery_task))
                    continue

                should_resume = (
                    discovery_task is not None
                    and discovery_task.status in self.ACTIVE_TASK_STATUSES
                    and bool(discovery_task.provider_run_id)
                )
                if discovery_task is None:
                    discovery_task = AgentTaskState(
                        agent_name="candidate_discovery",
                        status=TaskStatus.running,
                        input_payload={
                            "comparison_site": comparison_site,
                            "search_query": search_query,
                            "discovery_key": discovery_key,
                            "top_n": max_candidates_per_site,
                        },
                        started_at=utc_now(),
                    )
                    task_log.append(discovery_task)
                elif not should_resume:
                    self._prepare_task_for_retry(discovery_task)

                pending_queries.append((discovery_task, comparison_site, search_query, should_resume))

        if not pending_queries:
            return list(candidates_by_url.values())

        report.raw_agent_outputs = task_log
        report.summary = search_summary
        report.error = None
        investigation.status = InvestigationStatus.running
        await self._save_report_progress(investigation, report_index, report)

        async def run_query(
            discovery_task: AgentTaskState,
            comparison_site: str,
            search_query: str,
            should_resume: bool,
        ) -> tuple[AgentTaskState, str, str, list[CandidateProduct], dict[str, Any]]:
            update_callback = lambda run: self._apply_task_update(
                investigation,
                report_index,
                report,
                task_log,
                discovery_task,
                run,
                search_summary,
                "Searching marketplace targets. TinyFish is still actively working through the queries.",
            )
            if should_resume:
                resume_for_site = self.discovery_agent.resume_for_site
                resume_kwargs: dict[str, Any] = {
                    "search_query": search_query,
                    "top_n": max_candidates_per_site,
                    "started_at": discovery_task.started_at,
                    "last_progress_at": discovery_task.last_progress_at,
                    "on_update": update_callback,
                }
                resume_params = inspect.signature(resume_for_site).parameters
                resume_kwargs = {
                    key: value for key, value in resume_kwargs.items() if key in resume_params
                }
                site_candidates, discovery_raw_output = await self.runtime.run_agent(
                    lambda: resume_for_site(
                        source_product,
                        comparison_site,
                        discovery_task.provider_run_id or "",
                        **resume_kwargs,
                    )
                )
            else:
                run_for_site = self.discovery_agent.run_for_site
                run_kwargs: dict[str, Any] = {
                    "search_query": search_query,
                    "top_n": max_candidates_per_site,
                    "on_update": update_callback,
                }
                run_params = inspect.signature(run_for_site).parameters
                run_kwargs = {
                    key: value for key, value in run_kwargs.items() if key in run_params
                }
                site_candidates, discovery_raw_output = await self.runtime.run_agent(
                    lambda: run_for_site(
                        source_product,
                        comparison_site,
                        **run_kwargs,
                    )
                )
            return discovery_task, comparison_site, search_query, site_candidates, discovery_raw_output

        query_results = await asyncio.gather(
            *[
                run_query(discovery_task, comparison_site, search_query, should_resume)
                for discovery_task, comparison_site, search_query, should_resume in pending_queries
            ]
        )

        for discovery_task, comparison_site, search_query, site_candidates, discovery_raw_output in query_results:
            discovery_task.status = TaskStatus.completed
            discovery_task.provider_status = discovery_raw_output.get("tinyfish_status")
            discovery_task.provider_run_id = discovery_raw_output.get("tinyfish_run_id")
            discovery_task.output_payload = {
                "comparison_site": comparison_site,
                "search_query": search_query,
                "candidate_count": len(site_candidates),
                "candidates": [candidate.model_dump() for candidate in site_candidates],
                "runtime": discovery_raw_output,
            }
            discovery_task.completed_at = utc_now()
            merge_candidates(candidates_by_url, site_candidates)

        report.summary = self._candidate_summary(len(candidates_by_url))
        investigation.status = InvestigationStatus.running
        await self._save_report_progress(investigation, report_index, report)
        return list(candidates_by_url.values())

    async def _ensure_triage(
        self,
        investigation: InvestigationResponse,
        report_index: int,
        report: InvestigationReport,
        task_log: list[AgentTaskState],
        source_product: SourceProduct,
        candidates: list[CandidateProduct],
        max_shortlisted_candidates: int,
    ) -> list[CandidateProduct]:
        if not candidates:
            return []

        triaged_candidates: list[tuple[CandidateProduct, CandidateTriageAssessment]] = []
        pending: list[tuple[AgentTaskState, CandidateProduct]] = []

        for candidate in candidates:
            product_url = str(candidate.product_url)
            triage_task = self._find_task(
                task_log,
                "candidate_triage",
                identifier_key="product_url",
                identifier_value=product_url,
            )
            if triage_task is not None and triage_task.status == TaskStatus.completed:
                triaged_candidates.append((candidate, self._load_triage_from_task(triage_task)))
                continue

            if triage_task is None:
                triage_task = AgentTaskState(
                    agent_name="candidate_triage",
                    status=TaskStatus.running,
                    input_payload={"product_url": product_url},
                    started_at=utc_now(),
                )
                task_log.append(triage_task)
            else:
                self._prepare_task_for_retry(triage_task, clear_provider_state=False)

            pending.append((triage_task, candidate))

        if pending:
            report.raw_agent_outputs = task_log
            report.summary = self._triage_summary(len(candidates))
            report.error = None
            investigation.status = InvestigationStatus.running
            await self._save_report_progress(investigation, report_index, report)

            async def run_triage(
                triage_task: AgentTaskState,
                candidate: CandidateProduct,
            ) -> tuple[AgentTaskState, CandidateProduct, CandidateTriageAssessment]:
                assessment = await self.runtime.run_agent(
                    lambda candidate=candidate: self.triage_agent.run(source_product, candidate)
                )
                return triage_task, candidate, assessment

            triage_results = await asyncio.gather(
                *[run_triage(triage_task, candidate) for triage_task, candidate in pending]
            )

            for triage_task, candidate, assessment in triage_results:
                triage_task.status = TaskStatus.completed
                triage_task.output_payload = {
                    "triage": assessment.model_dump(),
                    "candidate": candidate.model_dump(),
                }
                triage_task.completed_at = utc_now()
                triaged_candidates.append((candidate, assessment))

        shortlist_limit = max(1, min(max_shortlisted_candidates, settings.openai_shortlist_limit, len(candidates)))
        sorted_candidates = sorted(
            triaged_candidates,
            key=lambda item: (
                item[1].investigation_priority_score,
                item[1].suspicion_score,
            ),
            reverse=True,
        )
        shortlisted = [candidate for candidate, assessment in sorted_candidates if assessment.should_shortlist]
        if not shortlisted:
            shortlisted = [candidate for candidate, _ in sorted_candidates[:shortlist_limit]]
        else:
            shortlisted = shortlisted[:shortlist_limit]

        report.summary = self._triage_summary(len(candidates), len(shortlisted))
        investigation.status = InvestigationStatus.running
        await self._save_report_progress(investigation, report_index, report)
        return shortlisted

    async def _ensure_comparisons(
        self,
        investigation: InvestigationResponse,
        report_index: int,
        report: InvestigationReport,
        task_log: list[AgentTaskState],
        source_product: SourceProduct,
        candidates: list[CandidateProduct],
    ) -> list[ComparisonResult]:
        if not candidates:
            return []

        comparison_summary = self._comparison_summary(len(candidates))
        comparisons_by_url: dict[str, ComparisonResult] = {}
        pending_comparisons: list[tuple[AgentTaskState, CandidateProduct, bool]] = []

        for candidate in candidates:
            product_url = str(candidate.product_url)
            comparison_task = self._find_task(
                task_log,
                "product_comparison",
                identifier_key="product_url",
                identifier_value=product_url,
            )
            if comparison_task is not None and comparison_task.status == TaskStatus.completed:
                comparisons_by_url[product_url] = self._load_comparison_from_task(comparison_task)
                continue

            should_resume = (
                comparison_task is not None
                and comparison_task.status in self.ACTIVE_TASK_STATUSES
                and bool(comparison_task.provider_run_id)
            )
            if comparison_task is None:
                comparison_task = AgentTaskState(
                    agent_name="product_comparison",
                    status=TaskStatus.running,
                    input_payload={"product_url": product_url},
                    started_at=utc_now(),
                )
                task_log.append(comparison_task)
            elif not should_resume:
                self._prepare_task_for_retry(comparison_task)

            pending_comparisons.append((comparison_task, candidate, should_resume))

        if pending_comparisons:
            report.raw_agent_outputs = task_log
            report.summary = comparison_summary
            report.error = None
            investigation.status = InvestigationStatus.running
            await self._save_report_progress(investigation, report_index, report)

            async def run_comparison(
                comparison_task: AgentTaskState,
                candidate: CandidateProduct,
                should_resume: bool,
            ) -> tuple[AgentTaskState, CandidateProduct, ComparisonResult, dict[str, Any]]:
                if should_resume:
                    comparison, comparison_raw_output = await self.runtime.run_agent(
                        lambda candidate=candidate: self.comparison_agent.resume(
                            source_product,
                            candidate,
                            comparison_task.provider_run_id or "",
                            started_at=comparison_task.started_at,
                            last_progress_at=comparison_task.last_progress_at,
                            on_update=lambda run: self._apply_task_update(
                                investigation,
                                report_index,
                                report,
                                task_log,
                                comparison_task,
                                run,
                                comparison_summary,
                                "Running parallel TinyFish extraction across shortlisted candidates.",
                            ),
                        )
                    )
                else:
                    comparison, comparison_raw_output = await self.runtime.run_agent(
                        lambda candidate=candidate: self._run_with_optional_update(
                            self.comparison_agent.run,
                            source_product,
                            candidate,
                            on_update=lambda run: self._apply_task_update(
                                investigation,
                                report_index,
                                report,
                                task_log,
                                comparison_task,
                                run,
                                comparison_summary,
                                "Running parallel TinyFish extraction across shortlisted candidates.",
                            ),
                        )
                    )
                return comparison_task, candidate, comparison, comparison_raw_output

            comparison_results = await asyncio.gather(
                *[
                    run_comparison(comparison_task, candidate, should_resume)
                    for comparison_task, candidate, should_resume in pending_comparisons
                ]
            )

            for comparison_task, candidate, comparison, comparison_raw_output in comparison_results:
                product_url = str(candidate.product_url)
                comparison_task.status = TaskStatus.completed
                comparison_task.provider_status = comparison_raw_output.get("tinyfish_status")
                comparison_task.provider_run_id = comparison_raw_output.get("tinyfish_run_id")
                comparison_task.output_payload = {
                    "comparison": comparison.model_dump(),
                    "runtime": comparison_raw_output,
                }
                comparison_task.completed_at = utc_now()
                comparisons_by_url[product_url] = comparison

            investigation.status = InvestigationStatus.running
            await self._save_report_progress(investigation, report_index, report)

        evidence_summary = self._evidence_summary(len(candidates))
        pending_evidence: list[tuple[AgentTaskState, ComparisonResult]] = []

        for candidate in candidates:
            product_url = str(candidate.product_url)
            comparison = comparisons_by_url[product_url]
            evidence_task = self._find_task(
                task_log,
                "evidence",
                identifier_key="product_url",
                identifier_value=product_url,
            )
            if evidence_task is not None and evidence_task.status == TaskStatus.completed:
                comparison.evidence = self._load_evidence_from_task(evidence_task)
                continue

            if evidence_task is None:
                evidence_task = AgentTaskState(
                    agent_name="evidence",
                    status=TaskStatus.running,
                    input_payload={"product_url": product_url},
                    started_at=utc_now(),
                )
                task_log.append(evidence_task)
            else:
                self._prepare_task_for_retry(evidence_task, clear_provider_state=False)
            pending_evidence.append((evidence_task, comparison))

        if pending_evidence:
            report.raw_agent_outputs = task_log
            report.summary = evidence_summary
            report.error = None
            investigation.status = InvestigationStatus.running
            await self._save_report_progress(investigation, report_index, report)

            async def run_evidence(
                evidence_task: AgentTaskState,
                comparison: ComparisonResult,
            ) -> tuple[AgentTaskState, ComparisonResult, list[EvidenceItem]]:
                evidence = await self.runtime.run_agent(
                    lambda comparison=comparison: self.evidence_agent.run(source_product, comparison)
                )
                return evidence_task, comparison, evidence

            evidence_results = await asyncio.gather(
                *[run_evidence(evidence_task, comparison) for evidence_task, comparison in pending_evidence]
            )

            for evidence_task, comparison, evidence in evidence_results:
                evidence_task.status = TaskStatus.completed
                evidence_task.output_payload = {"evidence": [item.model_dump() for item in evidence]}
                evidence_task.completed_at = utc_now()
                comparison.evidence = evidence

            await self._save_report_progress(investigation, report_index, report)

        return [comparisons_by_url[str(candidate.product_url)] for candidate in candidates]

    async def _ensure_reasoning_enrichment(
        self,
        investigation: InvestigationResponse,
        report_index: int,
        report: InvestigationReport,
        task_log: list[AgentTaskState],
        source_product: SourceProduct,
        comparisons: list[ComparisonResult],
    ) -> list[ComparisonResult]:
        if not comparisons:
            return []

        comparisons_by_url = {
            str(comparison.product_url): comparison for comparison in comparisons
        }
        pending: list[tuple[AgentTaskState, ComparisonResult]] = []

        for comparison in comparisons:
            product_url = str(comparison.product_url)
            enrichment_task = self._find_task(
                task_log,
                "reasoning_enrichment",
                identifier_key="product_url",
                identifier_value=product_url,
            )
            if enrichment_task is not None and enrichment_task.status == TaskStatus.completed:
                enrichment = self._load_reasoning_enrichment_from_task(enrichment_task)
                enriched = self.reasoning_enrichment_agent.apply(comparison, enrichment)
                comparisons_by_url[product_url] = enriched
                comparison_task = self._find_task(
                    task_log,
                    "product_comparison",
                    identifier_key="product_url",
                    identifier_value=product_url,
                    statuses={TaskStatus.completed},
                )
                if comparison_task is not None:
                    comparison_task.output_payload["comparison"] = enriched.model_dump()
                continue

            if enrichment_task is None:
                enrichment_task = AgentTaskState(
                    agent_name="reasoning_enrichment",
                    status=TaskStatus.running,
                    input_payload={"product_url": product_url},
                    started_at=utc_now(),
                )
                task_log.append(enrichment_task)
            else:
                self._prepare_task_for_retry(enrichment_task, clear_provider_state=False)
            pending.append((enrichment_task, comparison))

        if pending:
            report.raw_agent_outputs = task_log
            report.summary = self._reasoning_enrichment_summary(len(comparisons))
            report.error = None
            investigation.status = InvestigationStatus.running
            await self._save_report_progress(investigation, report_index, report)

            async def run_enrichment(
                enrichment_task: AgentTaskState,
                comparison: ComparisonResult,
            ) -> tuple[AgentTaskState, ComparisonResult, ComparisonReasoningEnrichment]:
                enrichment = await self.runtime.run_agent(
                    lambda comparison=comparison: self.reasoning_enrichment_agent.run(
                        source_product,
                        comparison,
                    )
                )
                return enrichment_task, comparison, enrichment

            enrichment_results = await asyncio.gather(
                *[
                    run_enrichment(enrichment_task, comparison)
                    for enrichment_task, comparison in pending
                ]
            )

            for enrichment_task, comparison, enrichment in enrichment_results:
                product_url = str(comparison.product_url)
                enrichment_task.status = TaskStatus.completed
                enrichment_task.output_payload = {"enrichment": enrichment.model_dump()}
                enrichment_task.completed_at = utc_now()
                enriched = self.reasoning_enrichment_agent.apply(comparison, enrichment)
                comparisons_by_url[product_url] = enriched
                comparison_task = self._find_task(
                    task_log,
                    "product_comparison",
                    identifier_key="product_url",
                    identifier_value=product_url,
                    statuses={TaskStatus.completed},
                )
                if comparison_task is not None:
                    comparison_task.output_payload["comparison"] = enriched.model_dump()

            await self._save_report_progress(investigation, report_index, report)

        return [comparisons_by_url[str(comparison.product_url)] for comparison in comparisons]

    async def _ensure_ranking(
        self,
        investigation: InvestigationResponse,
        report_index: int,
        report: InvestigationReport,
        task_log: list[AgentTaskState],
        comparisons: list[ComparisonResult],
    ) -> list[ComparisonResult]:
        ranking_task = self._find_task(task_log, "ranking")
        if ranking_task is not None and ranking_task.status == TaskStatus.completed:
            return report.top_matches

        filtered_comparisons = [
            comparison for comparison in comparisons if not comparison.is_official_store
        ]
        excluded_official_store_count = len(comparisons) - len(filtered_comparisons)

        if ranking_task is None:
            ranking_task = AgentTaskState(
                agent_name="ranking",
                status=TaskStatus.running,
                input_payload={
                    "comparison_count": len(comparisons),
                    "excluded_official_store_count": excluded_official_store_count,
                },
                started_at=utc_now(),
            )
            task_log.append(ranking_task)
        else:
            self._prepare_task_for_retry(ranking_task, clear_provider_state=False)

        report.raw_agent_outputs = task_log
        report.summary = "Ranking suspicious listings."
        report.error = None
        investigation.status = InvestigationStatus.running
        await self._save_report_progress(investigation, report_index, report)
        top_matches = await self.runtime.run_agent(
            lambda: self.ranking_agent.run(filtered_comparisons)
        )
        ranking_task.status = TaskStatus.completed
        ranking_task.output_payload = {
            "ranked_product_urls": [str(item.product_url) for item in top_matches],
            "excluded_official_store_urls": [
                str(item.product_url) for item in comparisons if item.is_official_store
            ],
        }
        ranking_task.completed_at = utc_now()
        report.top_matches = top_matches
        report.excluded_official_store_count = excluded_official_store_count
        report.summary = "Writing the final investigation summary."
        investigation.status = InvestigationStatus.running
        await self._save_report_progress(investigation, report_index, report)
        return top_matches

    async def _ensure_summary(
        self,
        investigation: InvestigationResponse,
        report_index: int,
        report: InvestigationReport,
        task_log: list[AgentTaskState],
        source_product: SourceProduct,
        top_matches: list[ComparisonResult],
        excluded_official_store_count: int,
    ) -> str:
        summary_task = self._find_task(task_log, "research_summary")
        if summary_task is not None and summary_task.status == TaskStatus.completed:
            return report.summary

        if summary_task is None:
            summary_task = AgentTaskState(
                agent_name="research_summary",
                status=TaskStatus.running,
                input_payload={"top_match_count": len(top_matches)},
                started_at=utc_now(),
            )
            task_log.append(summary_task)
        else:
            self._prepare_task_for_retry(summary_task, clear_provider_state=False)

        report.raw_agent_outputs = task_log
        report.error = None
        investigation.status = InvestigationStatus.running
        await self._save_report_progress(investigation, report_index, report)
        summary_run_kwargs: dict[str, Any] = {}
        if "excluded_official_store_count" in inspect.signature(self.summary_agent.run).parameters:
            summary_run_kwargs["excluded_official_store_count"] = excluded_official_store_count
        summary = await self.runtime.run_agent(
            lambda: self.summary_agent.run(
                source_product,
                top_matches,
                **summary_run_kwargs,
            )
        )
        summary_task.status = TaskStatus.completed
        summary_task.output_payload = {"summary": summary}
        summary_task.completed_at = utc_now()
        report.summary = summary
        report.raw_agent_outputs = task_log
        investigation.status = InvestigationStatus.running
        await self._save_report_progress(investigation, report_index, report)
        return summary

    async def _run_for_source(
        self,
        investigation: InvestigationResponse,
        report_index: int,
        source_url: str,
        comparison_sites: list[str],
        max_candidates_per_site: int,
        max_shortlisted_candidates: int,
    ) -> InvestigationReport:
        report = investigation.reports[report_index]
        task_log = report.raw_agent_outputs
        source_product = self._load_source_product(report, task_log)
        try:
            search_summary = self._search_summary(comparison_sites)
            source_product = await self._ensure_source_product(
                investigation,
                report_index,
                report,
                task_log,
                source_url,
                search_summary,
            )
            candidates = await self._ensure_candidates(
                investigation,
                report_index,
                report,
                task_log,
                source_product,
                comparison_sites,
                max_candidates_per_site,
                search_summary,
            )
            shortlisted_candidates = await self._ensure_triage(
                investigation,
                report_index,
                report,
                task_log,
                source_product,
                candidates,
                max_shortlisted_candidates,
            )
            comparisons = await self._ensure_comparisons(
                investigation,
                report_index,
                report,
                task_log,
                source_product,
                shortlisted_candidates,
            )
            comparisons = await self._ensure_reasoning_enrichment(
                investigation,
                report_index,
                report,
                task_log,
                source_product,
                comparisons,
            )
            top_matches = await self._ensure_ranking(
                investigation,
                report_index,
                report,
                task_log,
                comparisons,
            )
            await self._ensure_summary(
                investigation,
                report_index,
                report,
                task_log,
                source_product,
                top_matches,
                report.excluded_official_store_count,
            )
            return report
        except Exception as exc:
            active_task = next(
                (
                    task
                    for task in reversed(task_log)
                    if task.status in self.ACTIVE_TASK_STATUSES
                ),
                None,
            )
            if active_task is not None:
                active_task.status = TaskStatus.failed
                active_task.error = str(exc)
                active_task.completed_at = utc_now()
            else:
                task_log.append(
                    AgentTaskState(
                        agent_name="research_summary",
                        status=TaskStatus.failed,
                        input_payload={"source_url": source_url},
                        error=str(exc),
                        started_at=utc_now(),
                        completed_at=utc_now(),
                    )
                )
            summary = await self.summary_agent.run(source_product, [], error=str(exc))
            report.extracted_source_product = source_product
            report.top_matches = []
            report.summary = summary
            report.raw_agent_outputs = task_log
            report.error = str(exc)
            await self._save_report_progress(investigation, report_index, report)
            return report

