"""Seller-case orchestration for post-investigation enforcement workflows."""

from __future__ import annotations

import asyncio
from typing import Any

from agents.case_draft_agent import CaseDraftAgent
from agents.official_product_match_agent import OfficialProductMatchAgent
from agents.seller_evidence_agent import SellerEvidenceAgent
from agents.seller_listing_analysis_agent import SellerListingAnalysisAgent
from agents.seller_listing_discovery_agent import SellerListingDiscoveryAgent
from agents.seller_listing_triage_agent import SellerListingTriageAgent
from agents.seller_profile_agent import SellerProfileAgent
from models.case_schemas import (
    ActionRequestDraft,
    OfficialProductMatch,
    SellerCaseEvidenceItem,
    SellerCaseResponse,
    SellerCaseStatus,
    SellerListing,
    SellerListingTriageAssessment,
    SellerProfile,
)
from models.schemas import (
    ActivityLogEntry,
    AgentTaskState,
    ComparisonResult,
    InvestigationResponse,
    InvestigationStatus,
    SourceProduct,
    TaskStatus,
    utc_now,
)
from services.investigation_orchestrator import InvestigationOrchestrator
from services.investigation_store import InvestigationStore
from services.settings import settings
from services.tinyfish_client import TinyFishRun
from services.tinyfish_runtime import TinyFishRuntime


class SellerCaseOrchestrator:
    """Build a seller-focused case from a suspicious investigation result."""

    ACTIVE_TASK_STATUSES = {TaskStatus.running, TaskStatus.delayed}

    def __init__(
        self,
        store: InvestigationStore,
        runtime: TinyFishRuntime | None = None,
        seller_profile_agent: SellerProfileAgent | None = None,
        seller_listing_discovery_agent: SellerListingDiscoveryAgent | None = None,
        seller_listing_triage_agent: SellerListingTriageAgent | None = None,
        official_product_match_agent: OfficialProductMatchAgent | None = None,
        seller_listing_analysis_agent: SellerListingAnalysisAgent | None = None,
        seller_evidence_agent: SellerEvidenceAgent | None = None,
        case_draft_agent: CaseDraftAgent | None = None,
    ) -> None:
        self.store = store
        self.runtime = runtime or TinyFishRuntime()
        self.seller_profile_agent = seller_profile_agent or SellerProfileAgent()
        self.seller_listing_discovery_agent = (
            seller_listing_discovery_agent or SellerListingDiscoveryAgent()
        )
        self.seller_listing_triage_agent = seller_listing_triage_agent or SellerListingTriageAgent()
        self.official_product_match_agent = official_product_match_agent or OfficialProductMatchAgent()
        self.seller_listing_analysis_agent = (
            seller_listing_analysis_agent or SellerListingAnalysisAgent()
        )
        self.seller_evidence_agent = seller_evidence_agent or SellerEvidenceAgent()
        self.case_draft_agent = case_draft_agent or CaseDraftAgent()

    async def _save_case_progress(self, seller_case: SellerCaseResponse) -> None:
        await self.store.save_case(seller_case)

    async def _log_activity(
        self,
        seller_case: SellerCaseResponse,
        agent_name: str,
        message: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        await self.store.append_case_activity(
            seller_case.case_id,
            ActivityLogEntry(
                agent_name=agent_name,
                message=message,
                source_url=seller_case.source_url,
                metadata=metadata or {},
            ),
        )

    async def _apply_task_update(
        self,
        seller_case: SellerCaseResponse,
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
        task.output_payload = {"runtime": InvestigationOrchestrator._runtime_payload(run)}

        seller_case.status = SellerCaseStatus.delayed if run.delayed else SellerCaseStatus.running
        seller_case.summary = delayed_summary if run.delayed and delayed_summary else running_summary
        seller_case.raw_agent_outputs = task_log
        seller_case.error = None
        await self._save_case_progress(seller_case)

    @staticmethod
    def _load_profile(seller_case: SellerCaseResponse, task_log: list[AgentTaskState]) -> SellerProfile | None:
        if seller_case.seller_profile is not None:
            return seller_case.seller_profile
        task = InvestigationOrchestrator._find_task(
            task_log,
            "seller_profile",
            statuses={TaskStatus.completed},
        )
        profile_payload = task.output_payload.get("seller_profile") if task else None
        if profile_payload is None:
            return None
        return SellerProfile.model_validate(profile_payload)

    @staticmethod
    def _load_discovered_listings(
        seller_case: SellerCaseResponse,
        task_log: list[AgentTaskState],
    ) -> list[SellerListing]:
        if seller_case.discovered_listings:
            return seller_case.discovered_listings
        task = InvestigationOrchestrator._find_task(
            task_log,
            "seller_listing_discovery",
            statuses={TaskStatus.completed},
        )
        if task is None:
            return []
        return [
            SellerListing.model_validate(item)
            for item in task.output_payload.get("discovered_listings", [])
        ]

    @staticmethod
    def _load_analysis(task: AgentTaskState) -> ComparisonResult:
        return ComparisonResult.model_validate(task.output_payload["comparison"])

    @staticmethod
    def _load_case_evidence(task_log: list[AgentTaskState]) -> list[SellerCaseEvidenceItem]:
        task = InvestigationOrchestrator._find_task(
            task_log,
            "seller_case_evidence",
            statuses={TaskStatus.completed},
        )
        if task is None:
            return []
        return [
            SellerCaseEvidenceItem.model_validate(item)
            for item in task.output_payload.get("evidence", [])
        ]

    @staticmethod
    def _load_case_draft(task_log: list[AgentTaskState]) -> ActionRequestDraft | None:
        task = InvestigationOrchestrator._find_task(
            task_log,
            "case_draft",
            statuses={TaskStatus.completed},
        )
        if task is None or "draft" not in task.output_payload:
            return None
        return ActionRequestDraft.model_validate(task.output_payload["draft"])

    @staticmethod
    def _load_triage_assessment(task: AgentTaskState) -> SellerListingTriageAssessment:
        return SellerListingTriageAssessment.model_validate(task.output_payload["triage"])

    @staticmethod
    def _load_official_match(task: AgentTaskState) -> OfficialProductMatch:
        return OfficialProductMatch.model_validate(task.output_payload["official_match"])

    @staticmethod
    def _resolve_source_report(
        investigation: InvestigationResponse,
        source_url: str,
    ) -> tuple[SourceProduct, list[ComparisonResult]]:
        for report in investigation.reports:
            if str(report.source_url) != source_url:
                continue
            source_product = report.extracted_source_product
            if source_product is None:
                raise ValueError("The selected investigation report does not contain extracted source-product data.")

            comparisons: list[ComparisonResult] = list(report.top_matches)
            if not comparisons:
                comparisons = [
                    ComparisonResult.model_validate(task.output_payload["comparison"])
                    for task in report.raw_agent_outputs
                    if task.agent_name == "product_comparison" and "comparison" in task.output_payload
                ]
            return source_product, comparisons
        raise ValueError("The selected source URL was not found in the originating investigation.")

    @staticmethod
    def _resolve_selected_listing(
        comparisons: list[ComparisonResult],
        product_url: str,
    ) -> ComparisonResult:
        for comparison in comparisons:
            if str(comparison.product_url) == product_url:
                return comparison
        raise ValueError("The selected listing was not found in the originating investigation results.")

    @staticmethod
    def _listing_from_comparison(comparison: ComparisonResult) -> SellerListing:
        candidate = comparison.candidate_product
        return SellerListing(
            product_url=comparison.product_url,
            marketplace=comparison.marketplace,
            seller_name=candidate.seller_name,
            seller_store_url=candidate.seller_store_url,
            seller_id=candidate.seller_id,
            title=candidate.title,
            price=candidate.price,
            currency=candidate.currency,
            brand=candidate.brand,
            color=candidate.color,
            size=candidate.size,
            material=candidate.material,
            model=candidate.model,
            sku=candidate.sku,
            description=candidate.description,
            image_urls=list(candidate.image_urls),
        )

    @staticmethod
    def _merge_discovered_listings(
        selected_listing: ComparisonResult,
        discovered_listings: list[SellerListing],
    ) -> list[SellerListing]:
        listings_by_url: dict[str, SellerListing] = {
            str(selected_listing.product_url): SellerCaseOrchestrator._listing_from_comparison(selected_listing)
        }
        for listing in discovered_listings:
            listings_by_url[str(listing.product_url)] = listing
        return list(listings_by_url.values())

    @staticmethod
    def _sort_suspect_listings(
        selected_listing: ComparisonResult,
        comparisons: list[ComparisonResult],
    ) -> list[ComparisonResult]:
        filtered = [
            item
            for item in comparisons
            if item.counterfeit_risk_score >= 0.45
            or bool(item.suspicious_signals)
            or item.match_score >= 0.55
        ]
        if not any(str(item.product_url) == str(selected_listing.product_url) for item in filtered):
            filtered.append(selected_listing)
        deduped: dict[str, ComparisonResult] = {}
        for item in sorted(
            filtered,
            key=lambda result: (
                result.counterfeit_risk_score,
                result.match_score,
                1 if result.is_exact_match else 0,
            ),
            reverse=True,
        ):
            deduped.setdefault(str(item.product_url), item)
        return list(deduped.values())

    @staticmethod
    def _unique_urls(*values: str | None) -> list[str]:
        seen: set[str] = set()
        urls: list[str] = []
        for value in values:
            if not value:
                continue
            normalized = str(value).strip()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            urls.append(normalized)
        return urls

    @staticmethod
    def _merge_profiles(profiles: list[SellerProfile], fallback_marketplace: str) -> SellerProfile:
        merged = SellerProfile(marketplace=fallback_marketplace)
        entry_urls: list[str] = []
        shard_urls: list[str] = []
        badges: list[str] = []
        official_claims: list[str] = []
        image_urls: list[str] = []

        for profile in profiles:
            if not merged.seller_name and profile.seller_name:
                merged.seller_name = profile.seller_name
            if not merged.seller_id and profile.seller_id:
                merged.seller_id = profile.seller_id
            if not merged.seller_url and profile.seller_url:
                merged.seller_url = profile.seller_url
            if not merged.marketplace and profile.marketplace:
                merged.marketplace = profile.marketplace
            if merged.rating is None and profile.rating is not None:
                merged.rating = profile.rating
            if merged.rating_count is None and profile.rating_count is not None:
                merged.rating_count = profile.rating_count
            if merged.follower_count is None and profile.follower_count is not None:
                merged.follower_count = profile.follower_count
            if not merged.joined_date and profile.joined_date:
                merged.joined_date = profile.joined_date
            if not merged.location and profile.location:
                merged.location = profile.location
            if not merged.profile_text and profile.profile_text:
                merged.profile_text = profile.profile_text
            if not merged.storefront_summary and profile.storefront_summary:
                merged.storefront_summary = profile.storefront_summary
            merged.extraction_confidence = max(merged.extraction_confidence, profile.extraction_confidence)
            badges.extend(profile.badges)
            official_claims.extend(profile.official_store_claims)
            image_urls.extend(profile.image_urls)
            entry_urls.extend(profile.entry_urls)
            shard_urls.extend(profile.storefront_shard_urls)

        merged.badges = list(dict.fromkeys(badges))
        merged.official_store_claims = list(dict.fromkeys(official_claims))
        merged.image_urls = list(dict.fromkeys(image_urls))
        merged.entry_urls = list(dict.fromkeys(entry_urls))
        merged.storefront_shard_urls = list(dict.fromkeys(shard_urls))
        return merged

    @staticmethod
    def _build_profile_entry_urls(selected_listing: ComparisonResult) -> list[str]:
        candidate = selected_listing.candidate_product
        return SellerCaseOrchestrator._unique_urls(
            str(candidate.seller_store_url) if candidate.seller_store_url else None,
            str(selected_listing.product_url),
        )

    @staticmethod
    def _build_storefront_shards(
        seller_profile: SellerProfile,
        selected_listing: ComparisonResult,
        max_storefront_shards: int,
    ) -> list[str]:
        shard_urls = SellerCaseOrchestrator._unique_urls(
            *(seller_profile.storefront_shard_urls or []),
            *(seller_profile.entry_urls or []),
            str(seller_profile.seller_url) if seller_profile.seller_url else None,
            str(selected_listing.candidate_product.seller_store_url)
            if selected_listing.candidate_product.seller_store_url
            else None,
            str(selected_listing.product_url),
        )
        return shard_urls[:max_storefront_shards]

    async def run_case(self, case_id: str) -> None:
        request = await self.store.get_case_request(case_id)
        seller_case = await self.store.get_case(case_id)
        if seller_case is None or seller_case.status in {
            SellerCaseStatus.completed,
            SellerCaseStatus.failed,
            SellerCaseStatus.reviewed,
            SellerCaseStatus.exported,
        }:
            return

        seller_case.status = SellerCaseStatus.running
        seller_case.updated_at = utc_now()
        seller_case.error = None
        await self._save_case_progress(seller_case)

        try:
            investigation = await self.store.get(request.investigation_id)
            if investigation is None or investigation.status != InvestigationStatus.completed:
                raise ValueError("The source investigation is not available or has not completed yet.")

            source_product, comparisons = self._resolve_source_report(
                investigation,
                str(request.source_url),
            )
            selected_listing = self._resolve_selected_listing(comparisons, str(request.product_url))
            seller_case.source_product = source_product
            seller_case.selected_listing = selected_listing
            seller_case.marketplace = selected_listing.marketplace
            seller_case.seller_name = (
                selected_listing.candidate_product.seller_name or seller_case.seller_name
            )
            seller_case.seller_store_url = (
                selected_listing.candidate_product.seller_store_url or seller_case.seller_store_url
            )
            await self._save_case_progress(seller_case)

            task_log = seller_case.raw_agent_outputs
            seller_profile = await self._ensure_seller_profile(
                seller_case,
                task_log,
                selected_listing,
            )
            discovered_listings = await self._ensure_discovered_listings(
                seller_case,
                task_log,
                source_product,
                seller_profile,
                selected_listing,
                request.max_listings_to_analyze,
                request.max_storefront_shards,
            )
            triage_assessments, shortlisted_listings = await self._ensure_listing_triage(
                seller_case,
                task_log,
                source_product,
                seller_profile,
                selected_listing,
                discovered_listings,
                request.max_shortlisted_listings,
            )
            official_matches = await self._ensure_official_product_matches(
                seller_case,
                task_log,
                source_product,
                shortlisted_listings,
            )
            suspect_listings = await self._ensure_listing_analysis(
                seller_case,
                task_log,
                source_product,
                selected_listing,
                shortlisted_listings,
                triage_assessments,
                official_matches,
            )
            evidence = await self._ensure_case_evidence(
                seller_case,
                task_log,
                source_product,
                seller_profile,
                selected_listing,
                suspect_listings,
                official_matches,
            )
            draft = await self._ensure_case_draft(
                seller_case,
                task_log,
                source_product,
                seller_profile,
                selected_listing,
                suspect_listings,
                evidence,
                official_matches,
            )

            seller_case.status = SellerCaseStatus.completed
            seller_case.summary = draft.summary
        except Exception as exc:  # pragma: no cover
            active_task = next(
                (task for task in reversed(seller_case.raw_agent_outputs) if task.status in self.ACTIVE_TASK_STATUSES),
                None,
            )
            if active_task is not None:
                active_task.status = TaskStatus.failed
                active_task.error = str(exc)
                active_task.completed_at = utc_now()
            else:
                seller_case.raw_agent_outputs.append(
                    AgentTaskState(
                        agent_name="case_draft",
                        status=TaskStatus.failed,
                        input_payload={"product_url": str(request.product_url)},
                        error=str(exc),
                        started_at=utc_now(),
                        completed_at=utc_now(),
                    )
                )
            seller_case.status = SellerCaseStatus.failed
            seller_case.error = str(exc)
            seller_case.summary = f"Seller case failed: {exc}"
            await self._log_activity(
                seller_case,
                "seller_case",
                "Seller case failed during execution.",
                {"error": str(exc)},
            )

        await self._save_case_progress(seller_case)

    async def _ensure_seller_profile(
        self,
        seller_case: SellerCaseResponse,
        task_log: list[AgentTaskState],
        selected_listing: ComparisonResult,
    ) -> SellerProfile:
        existing_profile = self._load_profile(seller_case, task_log)
        if existing_profile is not None and existing_profile.entry_urls:
            seller_case.seller_profile = existing_profile
            return existing_profile

        entry_urls = self._build_profile_entry_urls(selected_listing)
        completed_profiles: list[SellerProfile] = []
        pending: list[tuple[AgentTaskState, str, bool]] = []

        for entry_url in entry_urls:
            task = InvestigationOrchestrator._find_task(
                task_log,
                "seller_profile",
                identifier_key="entry_url",
                identifier_value=entry_url,
            )
            if task is not None and task.status == TaskStatus.completed and "seller_profile" in task.output_payload:
                completed_profiles.append(SellerProfile.model_validate(task.output_payload["seller_profile"]))
                continue

            should_resume = (
                task is not None
                and task.status in self.ACTIVE_TASK_STATUSES
                and bool(task.provider_run_id)
            )
            if task is None:
                task = AgentTaskState(
                    agent_name="seller_profile",
                    status=TaskStatus.running,
                    input_payload={
                        "entry_url": entry_url,
                        "product_url": str(selected_listing.product_url),
                        "seller_name": selected_listing.candidate_product.seller_name,
                        "seller_store_url": selected_listing.candidate_product.seller_store_url,
                    },
                    started_at=utc_now(),
                )
                task_log.append(task)
            elif not should_resume:
                InvestigationOrchestrator._prepare_task_for_retry(task)

            pending.append((task, entry_url, should_resume))

        if not pending and completed_profiles:
            merged_profile = self._merge_profiles(completed_profiles, selected_listing.marketplace)
            seller_case.seller_profile = merged_profile
            return merged_profile

        seller_case.summary = "Inspecting seller storefront entry points in parallel."
        seller_case.raw_agent_outputs = task_log
        seller_case.error = None
        seller_case.status = SellerCaseStatus.running
        await self._save_case_progress(seller_case)
        await self._log_activity(
            seller_case,
            "seller_profile",
            "Launching parallel seller profile research.",
            {"entry_url_count": len(entry_urls)},
        )

        async def run_profile(
            task: AgentTaskState,
            entry_url: str,
            should_resume: bool,
        ) -> tuple[AgentTaskState, SellerProfile | None, dict[str, Any] | None, Exception | None]:
            try:
                if should_resume:
                    profile, raw_output = await self.runtime.run_agent(
                        lambda: self.seller_profile_agent.resume(
                            entry_url,
                            selected_listing.marketplace,
                            task.provider_run_id or "",
                            seller_name=selected_listing.candidate_product.seller_name,
                            seller_url=(
                                str(selected_listing.candidate_product.seller_store_url)
                                if selected_listing.candidate_product.seller_store_url
                                else None
                            ),
                            started_at=task.started_at,
                            last_progress_at=task.last_progress_at,
                            on_update=lambda run: self._apply_task_update(
                                seller_case,
                                task_log,
                                task,
                                run,
                                "Inspecting seller storefront entry points in parallel.",
                                "Inspecting seller storefront entry points in parallel. TinyFish is still traversing the seller pages.",
                            ),
                        )
                    )
                else:
                    profile, raw_output = await self.runtime.run_agent(
                        lambda: self.seller_profile_agent.run(
                            entry_url,
                            selected_listing.marketplace,
                            seller_name=selected_listing.candidate_product.seller_name,
                            seller_url=(
                                str(selected_listing.candidate_product.seller_store_url)
                                if selected_listing.candidate_product.seller_store_url
                                else None
                            ),
                            on_update=lambda run: self._apply_task_update(
                                seller_case,
                                task_log,
                                task,
                                run,
                                "Inspecting seller storefront entry points in parallel.",
                                "Inspecting seller storefront entry points in parallel. TinyFish is still traversing the seller pages.",
                            ),
                        )
                    )
                return task, profile, raw_output, None
            except Exception as exc:  # pragma: no cover
                return task, None, None, exc

        profile_results = await asyncio.gather(
            *[run_profile(task, entry_url, should_resume) for task, entry_url, should_resume in pending]
        )

        for task, profile, raw_output, error in profile_results:
            if error is not None:
                task.status = TaskStatus.failed
                task.error = str(error)
                task.completed_at = utc_now()
                await self._log_activity(
                    seller_case,
                    "seller_profile",
                    "A seller profile entry-point task failed and was skipped.",
                    {"entry_url": task.input_payload.get("entry_url"), "error": str(error)},
                )
                continue

            assert profile is not None and raw_output is not None
            task.status = TaskStatus.completed
            task.provider_status = raw_output.get("tinyfish_status")
            task.provider_run_id = raw_output.get("tinyfish_run_id")
            task.output_payload = {
                "seller_profile": profile.model_dump(),
                "runtime": raw_output,
            }
            task.completed_at = utc_now()
            completed_profiles.append(profile)

        if not completed_profiles:
            raise ValueError("Seller profile extraction did not return any usable storefront data.")

        merged_profile = self._merge_profiles(completed_profiles, selected_listing.marketplace)
        merged_profile.entry_urls = self._unique_urls(
            *(merged_profile.entry_urls or []),
            *entry_urls,
            str(merged_profile.seller_url) if merged_profile.seller_url else None,
        )
        seller_case.seller_profile = merged_profile
        seller_case.seller_name = merged_profile.seller_name or seller_case.seller_name
        seller_case.seller_store_url = merged_profile.seller_url or seller_case.seller_store_url
        seller_case.summary = "Enumerating related listings from seller storefront shards."
        await self._save_case_progress(seller_case)
        await self._log_activity(
            seller_case,
            "seller_profile",
            "Seller profile extraction completed.",
            {
                "seller_name": merged_profile.seller_name,
                "seller_url": str(merged_profile.seller_url or ""),
                "entry_url_count": len(merged_profile.entry_urls),
                "shard_url_count": len(merged_profile.storefront_shard_urls),
            },
        )
        return merged_profile

    async def _ensure_discovered_listings(
        self,
        seller_case: SellerCaseResponse,
        task_log: list[AgentTaskState],
        source_product: SourceProduct,
        seller_profile: SellerProfile,
        selected_listing: ComparisonResult,
        max_listings_to_analyze: int,
        max_storefront_shards: int,
    ) -> list[SellerListing]:
        discovered = self._load_discovered_listings(seller_case, task_log)
        shard_urls = self._build_storefront_shards(
            seller_profile,
            selected_listing,
            max_storefront_shards,
        )
        completed_listings: list[SellerListing] = list(discovered)
        pending: list[tuple[AgentTaskState, str, bool]] = []

        for shard_url in shard_urls:
            task = InvestigationOrchestrator._find_task(
                task_log,
                "seller_listing_discovery",
                identifier_key="shard_url",
                identifier_value=shard_url,
            )
            if task is not None and task.status == TaskStatus.completed and "discovered_listings" in task.output_payload:
                completed_listings.extend(
                    [
                        SellerListing.model_validate(item)
                        for item in task.output_payload.get("discovered_listings", [])
                    ]
                )
                continue

            should_resume = (
                task is not None
                and task.status in self.ACTIVE_TASK_STATUSES
                and bool(task.provider_run_id)
            )
            if task is None:
                task = AgentTaskState(
                    agent_name="seller_listing_discovery",
                    status=TaskStatus.running,
                    input_payload={
                        "seller_url": seller_profile.seller_url,
                        "product_url": str(selected_listing.product_url),
                        "shard_url": shard_url,
                        "top_n": max_listings_to_analyze,
                    },
                    started_at=utc_now(),
                )
                task_log.append(task)
            elif not should_resume:
                InvestigationOrchestrator._prepare_task_for_retry(task)

            pending.append((task, shard_url, should_resume))

        if not pending and completed_listings:
            seller_case.discovered_listings = self._merge_discovered_listings(selected_listing, completed_listings)
            return seller_case.discovered_listings

        seller_case.summary = "Enumerating related listings from seller storefront shards."
        seller_case.raw_agent_outputs = task_log
        seller_case.error = None
        seller_case.status = SellerCaseStatus.running
        await self._save_case_progress(seller_case)
        await self._log_activity(
            seller_case,
            "seller_listing_discovery",
            "Launching parallel seller inventory discovery.",
            {"shard_count": len(shard_urls)},
        )

        async def run_discovery(
            task: AgentTaskState,
            shard_url: str,
            should_resume: bool,
        ) -> tuple[AgentTaskState, list[SellerListing] | None, dict[str, Any] | None, Exception | None]:
            try:
                if should_resume:
                    shard_listings, raw_output = await self.runtime.run_agent(
                        lambda: self.seller_listing_discovery_agent.resume(
                            source_product,
                            seller_profile,
                            selected_listing,
                            shard_url,
                            task.provider_run_id or "",
                            top_n=max_listings_to_analyze,
                            started_at=task.started_at,
                            last_progress_at=task.last_progress_at,
                            on_update=lambda run: self._apply_task_update(
                                seller_case,
                                task_log,
                                task,
                                run,
                                "Enumerating seller storefront shards in parallel.",
                                "Enumerating seller storefront shards in parallel. TinyFish is still traversing storefront pages.",
                            ),
                        )
                    )
                else:
                    shard_listings, raw_output = await self.runtime.run_agent(
                        lambda: self.seller_listing_discovery_agent.run(
                            source_product,
                            seller_profile,
                            selected_listing,
                            shard_url,
                            top_n=max_listings_to_analyze,
                            on_update=lambda run: self._apply_task_update(
                                seller_case,
                                task_log,
                                task,
                                run,
                                "Enumerating seller storefront shards in parallel.",
                                "Enumerating seller storefront shards in parallel. TinyFish is still traversing storefront pages.",
                            ),
                        )
                    )
                return task, shard_listings, raw_output, None
            except Exception as exc:  # pragma: no cover
                return task, None, None, exc

        discovery_results = await asyncio.gather(
            *[run_discovery(task, shard_url, should_resume) for task, shard_url, should_resume in pending]
        )

        for task, shard_listings, raw_output, error in discovery_results:
            if error is not None:
                task.status = TaskStatus.failed
                task.error = str(error)
                task.completed_at = utc_now()
                await self._log_activity(
                    seller_case,
                    "seller_listing_discovery",
                    "A storefront shard discovery task failed and was skipped.",
                    {"shard_url": task.input_payload.get("shard_url"), "error": str(error)},
                )
                continue

            assert shard_listings is not None and raw_output is not None
            task.status = TaskStatus.completed
            task.provider_status = raw_output.get("tinyfish_status")
            task.provider_run_id = raw_output.get("tinyfish_run_id")
            task.output_payload = {
                "discovered_count": len(shard_listings),
                "discovered_listings": [item.model_dump() for item in shard_listings],
                "runtime": raw_output,
            }
            task.completed_at = utc_now()
            completed_listings.extend(shard_listings)

        merged = self._merge_discovered_listings(selected_listing, completed_listings)
        seller_case.discovered_listings = merged
        seller_case.summary = (
            f"Triaging {len(merged)} seller listing{'s' if len(merged) != 1 else ''} with OpenAI."
        )
        await self._save_case_progress(seller_case)
        await self._log_activity(
            seller_case,
            "seller_listing_discovery",
            "Seller inventory discovery completed.",
            {"listing_count": len(merged), "shard_count": len(shard_urls)},
        )
        return merged

    async def _ensure_listing_triage(
        self,
        seller_case: SellerCaseResponse,
        task_log: list[AgentTaskState],
        source_product: SourceProduct,
        seller_profile: SellerProfile,
        selected_listing: ComparisonResult,
        discovered_listings: list[SellerListing],
        max_shortlisted_listings: int,
    ) -> tuple[list[SellerListingTriageAssessment], list[SellerListing]]:
        assessments: list[SellerListingTriageAssessment] = list(seller_case.triage_assessments)
        pending: list[tuple[AgentTaskState, SellerListing]] = []

        for listing in discovered_listings:
            product_url = str(listing.product_url)
            task = InvestigationOrchestrator._find_task(
                task_log,
                "seller_listing_triage",
                identifier_key="product_url",
                identifier_value=product_url,
            )
            if task is not None and task.status == TaskStatus.completed and "triage" in task.output_payload:
                assessments.append(self._load_triage_assessment(task))
                continue

            if task is None:
                task = AgentTaskState(
                    agent_name="seller_listing_triage",
                    status=TaskStatus.running,
                    input_payload={"product_url": product_url},
                    started_at=utc_now(),
                )
                task_log.append(task)
            else:
                InvestigationOrchestrator._prepare_task_for_retry(task, clear_provider_state=False)
            pending.append((task, listing))

        if pending:
            seller_case.summary = (
                f"Triaging {len(discovered_listings)} seller listing{'s' if len(discovered_listings) != 1 else ''} with OpenAI."
            )
            seller_case.raw_agent_outputs = task_log
            seller_case.error = None
            seller_case.status = SellerCaseStatus.running
            await self._save_case_progress(seller_case)
            await self._log_activity(
                seller_case,
                "seller_listing_triage",
                "Launching parallel OpenAI triage over seller listings.",
                {"listing_count": len(discovered_listings)},
            )

            triage_results = await asyncio.gather(
                *[
                    self.runtime.run_agent(
                        lambda listing=listing: self.seller_listing_triage_agent.run(
                            source_product,
                            seller_profile,
                            selected_listing,
                            listing,
                        )
                    )
                    for _, listing in pending
                ],
                return_exceptions=True,
            )

            for (task, listing), result in zip(pending, triage_results, strict=True):
                if isinstance(result, Exception):
                    task.status = TaskStatus.failed
                    task.error = str(result)
                    task.completed_at = utc_now()
                    await self._log_activity(
                        seller_case,
                        "seller_listing_triage",
                        "A seller listing triage task failed and was skipped.",
                        {"product_url": str(listing.product_url), "error": str(result)},
                    )
                    continue

                task.status = TaskStatus.completed
                task.output_payload = {"triage": result.model_dump()}
                task.completed_at = utc_now()
                assessments.append(result)

        deduped_assessments: dict[str, SellerListingTriageAssessment] = {}
        for assessment in sorted(
            assessments,
            key=lambda item: (item.investigation_priority_score, item.suspicion_score),
            reverse=True,
        ):
            deduped_assessments.setdefault(str(assessment.product_url), assessment)
        triage_assessments = list(deduped_assessments.values())
        shortlist_limit = min(max_shortlisted_listings, settings.openai_shortlist_limit)
        assessments_by_url = {str(item.product_url): item for item in triage_assessments}
        shortlisted = [
            listing
            for listing in discovered_listings
            if assessments_by_url.get(str(listing.product_url), None)
            and assessments_by_url[str(listing.product_url)].should_shortlist
        ]
        shortlisted.sort(
            key=lambda listing: (
                assessments_by_url[str(listing.product_url)].investigation_priority_score,
                assessments_by_url[str(listing.product_url)].suspicion_score,
            ),
            reverse=True,
        )
        if not shortlisted and discovered_listings:
            shortlisted = sorted(
                discovered_listings,
                key=lambda listing: (
                    assessments_by_url.get(str(listing.product_url), SellerListingTriageAssessment(
                        product_url=listing.product_url,
                        investigation_priority_score=0.0,
                        suspicion_score=0.0,
                        should_shortlist=False,
                        rationale="Fallback shortlist.",
                        suspicious_signals=[],
                    )).investigation_priority_score,
                    assessments_by_url.get(str(listing.product_url), SellerListingTriageAssessment(
                        product_url=listing.product_url,
                        investigation_priority_score=0.0,
                        suspicion_score=0.0,
                        should_shortlist=False,
                        rationale="Fallback shortlist.",
                        suspicious_signals=[],
                    )).suspicion_score,
                ),
                reverse=True,
            )[: max(1, shortlist_limit)]
        else:
            shortlisted = shortlisted[: max(1, shortlist_limit)]

        seller_case.triage_assessments = triage_assessments
        seller_case.shortlisted_listing_urls = [str(item.product_url) for item in shortlisted]
        seller_case.summary = (
            f"Matching {len(shortlisted)} shortlisted seller listing{'s' if len(shortlisted) != 1 else ''} to official product pages."
        )
        await self._save_case_progress(seller_case)
        return triage_assessments, shortlisted

    async def _ensure_official_product_matches(
        self,
        seller_case: SellerCaseResponse,
        task_log: list[AgentTaskState],
        source_product: SourceProduct,
        shortlisted_listings: list[SellerListing],
    ) -> list[OfficialProductMatch]:
        matches: list[OfficialProductMatch] = list(seller_case.official_product_matches)
        pending: list[tuple[AgentTaskState, SellerListing]] = []

        for listing in shortlisted_listings:
            product_url = str(listing.product_url)
            task = InvestigationOrchestrator._find_task(
                task_log,
                "official_product_match",
                identifier_key="product_url",
                identifier_value=product_url,
            )
            if task is not None and task.status == TaskStatus.completed and "official_match" in task.output_payload:
                matches.append(self._load_official_match(task))
                continue

            should_resume = (
                task is not None
                and task.status in self.ACTIVE_TASK_STATUSES
                and bool(task.provider_run_id)
            )
            if task is None:
                task = AgentTaskState(
                    agent_name="official_product_match",
                    status=TaskStatus.running,
                    input_payload={"product_url": product_url},
                    started_at=utc_now(),
                )
                task_log.append(task)
            elif not should_resume:
                InvestigationOrchestrator._prepare_task_for_retry(task)
            pending.append((task, listing))

        if pending:
            seller_case.summary = (
                f"Matching {len(shortlisted_listings)} shortlisted seller listing{'s' if len(shortlisted_listings) != 1 else ''} to official product pages."
            )
            seller_case.raw_agent_outputs = task_log
            seller_case.error = None
            seller_case.status = SellerCaseStatus.running
            await self._save_case_progress(seller_case)
            await self._log_activity(
                seller_case,
                "official_product_match",
                "Launching parallel official-site matching for shortlisted seller listings.",
                {"listing_count": len(shortlisted_listings)},
            )

            async def run_match(
                task: AgentTaskState,
                listing: SellerListing,
                should_resume: bool,
            ) -> tuple[AgentTaskState, OfficialProductMatch | None, dict[str, Any] | None, Exception | None]:
                try:
                    if should_resume:
                        match, raw_output = await self.runtime.run_agent(
                            lambda: self.official_product_match_agent.resume(
                                source_product,
                                listing,
                                task.provider_run_id or "",
                                started_at=task.started_at,
                                last_progress_at=task.last_progress_at,
                                on_update=lambda run: self._apply_task_update(
                                    seller_case,
                                    task_log,
                                    task,
                                    run,
                                    "Matching seller listings to official product pages in parallel.",
                                    "Matching seller listings to official product pages in parallel. TinyFish is still traversing the official site.",
                                ),
                            )
                        )
                    else:
                        match, raw_output = await self.runtime.run_agent(
                            lambda: self.official_product_match_agent.run(
                                source_product,
                                listing,
                                on_update=lambda run: self._apply_task_update(
                                    seller_case,
                                    task_log,
                                    task,
                                    run,
                                    "Matching seller listings to official product pages in parallel.",
                                    "Matching seller listings to official product pages in parallel. TinyFish is still traversing the official site.",
                                ),
                            )
                        )
                    return task, match, raw_output, None
                except Exception as exc:  # pragma: no cover
                    return task, None, None, exc

            match_results = await asyncio.gather(
                *[run_match(task, listing, bool(task.provider_run_id)) for task, listing in pending]
            )

            for task, match, raw_output, error in match_results:
                if error is not None:
                    task.status = TaskStatus.failed
                    task.error = str(error)
                    task.completed_at = utc_now()
                    await self._log_activity(
                        seller_case,
                        "official_product_match",
                        "An official-site matching task failed and was skipped.",
                        {"product_url": task.input_payload.get("product_url"), "error": str(error)},
                    )
                    continue

                assert match is not None and raw_output is not None
                task.status = TaskStatus.completed
                task.provider_status = raw_output.get("discovery_runtime", {}).get("tinyfish_status")
                task.provider_run_id = raw_output.get("discovery_runtime", {}).get("tinyfish_run_id")
                task.output_payload = {
                    "official_match": match.model_dump(),
                    "runtime": raw_output,
                }
                task.completed_at = utc_now()
                matches.append(match)

        deduped_matches: dict[str, OfficialProductMatch] = {}
        for match in sorted(matches, key=lambda item: item.match_confidence, reverse=True):
            deduped_matches.setdefault(str(match.product_url), match)
        official_matches = list(deduped_matches.values())
        seller_case.official_product_matches = official_matches
        seller_case.summary = (
            f"Deep-analyzing {len(shortlisted_listings)} shortlisted seller listing{'s' if len(shortlisted_listings) != 1 else ''} against official references."
        )
        await self._save_case_progress(seller_case)
        return official_matches

    async def _ensure_listing_analysis(
        self,
        seller_case: SellerCaseResponse,
        task_log: list[AgentTaskState],
        source_product: SourceProduct,
        selected_listing: ComparisonResult,
        discovered_listings: list[SellerListing],
        triage_assessments: list[SellerListingTriageAssessment],
        official_matches: list[OfficialProductMatch],
    ) -> list[ComparisonResult]:
        comparisons: list[ComparisonResult] = []
        pending: list[tuple[AgentTaskState, SellerListing, bool]] = []
        triage_by_url = {str(item.product_url): item for item in triage_assessments}
        official_match_by_url = {str(item.product_url): item for item in official_matches}

        for listing in discovered_listings:
            product_url = str(listing.product_url)
            task = InvestigationOrchestrator._find_task(
                task_log,
                "seller_listing_analysis",
                identifier_key="product_url",
                identifier_value=product_url,
            )
            if task is not None and task.status == TaskStatus.completed:
                comparisons.append(self._load_analysis(task))
                continue

            should_resume = (
                task is not None
                and task.status in self.ACTIVE_TASK_STATUSES
                and bool(task.provider_run_id)
            )
            if task is None:
                task = AgentTaskState(
                    agent_name="seller_listing_analysis",
                    status=TaskStatus.running,
                    input_payload={"product_url": product_url},
                    started_at=utc_now(),
                )
                task_log.append(task)
            elif not should_resume:
                InvestigationOrchestrator._prepare_task_for_retry(task)

            pending.append((task, listing, should_resume))

        if not pending:
            seller_case.suspect_listings = self._sort_suspect_listings(selected_listing, comparisons)
            return seller_case.suspect_listings

        seller_case.summary = (
            f"Analyzing {len(discovered_listings)} shortlisted seller listing{'s' if len(discovered_listings) != 1 else ''} in parallel."
        )
        seller_case.raw_agent_outputs = task_log
        seller_case.error = None
        seller_case.status = SellerCaseStatus.running
        await self._save_case_progress(seller_case)
        await self._log_activity(
            seller_case,
            "seller_listing_analysis",
            "Launching parallel seller listing analysis.",
            {"listing_count": len(discovered_listings)},
        )

        async def run_analysis(
            task: AgentTaskState,
            listing: SellerListing,
            should_resume: bool,
        ) -> tuple[AgentTaskState, SellerListing, ComparisonResult | None, dict[str, Any] | None, Exception | None]:
            try:
                official_match = official_match_by_url.get(str(listing.product_url))
                basis_source_product = official_match.official_product if official_match and official_match.official_product else source_product
                if should_resume:
                    comparison, raw_output = await self.runtime.run_agent(
                        lambda: self.seller_listing_analysis_agent.resume(
                            basis_source_product,
                            listing,
                            task.provider_run_id or "",
                            started_at=task.started_at,
                            last_progress_at=task.last_progress_at,
                            on_update=lambda run: self._apply_task_update(
                                seller_case,
                                task_log,
                                task,
                                run,
                                "Analyzing seller listings in parallel.",
                                "Analyzing seller listings in parallel. TinyFish is still inspecting individual listing pages.",
                            ),
                        )
                    )
                else:
                    comparison, raw_output = await self.runtime.run_agent(
                        lambda: self.seller_listing_analysis_agent.run(
                            basis_source_product,
                            listing,
                            on_update=lambda run: self._apply_task_update(
                                seller_case,
                                task_log,
                                task,
                                run,
                                "Analyzing seller listings in parallel.",
                                "Analyzing seller listings in parallel. TinyFish is still inspecting individual listing pages.",
                            ),
                        )
                    )
                if official_match is not None:
                    comparison.comparison_basis_source_url = (
                        official_match.official_product_url or source_product.source_url
                    )
                    comparison.comparison_basis_label = "official_product_match"
                    comparison.comparison_basis_reason = official_match.rationale
                    comparison.comparison_basis_confidence = official_match.match_confidence
                else:
                    comparison.comparison_basis_source_url = source_product.source_url
                    comparison.comparison_basis_label = "seed_source_product"
                    comparison.comparison_basis_reason = "Fell back to the originally selected official product."
                    comparison.comparison_basis_confidence = 0.35
                triage = triage_by_url.get(str(listing.product_url))
                if triage is not None:
                    comparison.triage_priority_score = triage.investigation_priority_score
                    comparison.triage_suspicion_score = triage.suspicion_score
                    for signal in triage.suspicious_signals:
                        if signal not in comparison.suspicious_signals:
                            comparison.suspicious_signals.append(signal)
                return task, listing, comparison, raw_output, None
            except Exception as exc:  # pragma: no cover
                return task, listing, None, None, exc

        analysis_results = await asyncio.gather(
            *[run_analysis(task, listing, should_resume) for task, listing, should_resume in pending]
        )

        for task, listing, comparison, raw_output, error in analysis_results:
            if error is not None:
                task.status = TaskStatus.failed
                task.error = str(error)
                task.completed_at = utc_now()
                await self._log_activity(
                    seller_case,
                    "seller_listing_analysis",
                    "A seller listing analysis task failed and was skipped.",
                    {"product_url": str(listing.product_url), "error": str(error)},
                )
                continue

            assert comparison is not None and raw_output is not None
            task.status = TaskStatus.completed
            task.provider_status = raw_output.get("tinyfish_status")
            task.provider_run_id = raw_output.get("tinyfish_run_id")
            task.output_payload = {
                "comparison": comparison.model_dump(),
                "runtime": raw_output,
            }
            task.completed_at = utc_now()
            comparisons.append(comparison)

        seller_case.suspect_listings = self._sort_suspect_listings(selected_listing, comparisons)
        seller_case.summary = "Synthesizing seller-level evidence."
        await self._save_case_progress(seller_case)
        await self._log_activity(
            seller_case,
            "seller_listing_analysis",
            "Seller listing analysis completed.",
            {"suspect_listing_count": len(seller_case.suspect_listings)},
        )
        return seller_case.suspect_listings

    async def _ensure_case_evidence(
        self,
        seller_case: SellerCaseResponse,
        task_log: list[AgentTaskState],
        source_product: SourceProduct,
        seller_profile: SellerProfile,
        selected_listing: ComparisonResult,
        suspect_listings: list[ComparisonResult],
        official_matches: list[OfficialProductMatch],
    ) -> list[SellerCaseEvidenceItem]:
        evidence = self._load_case_evidence(task_log)
        task = InvestigationOrchestrator._find_task(task_log, "seller_case_evidence")
        if task is not None and task.status == TaskStatus.completed and evidence:
            seller_case.evidence = evidence
            return evidence

        if task is None:
            task = AgentTaskState(
                agent_name="seller_case_evidence",
                status=TaskStatus.running,
                input_payload={"suspect_listing_count": len(suspect_listings)},
                started_at=utc_now(),
            )
            task_log.append(task)
        else:
            InvestigationOrchestrator._prepare_task_for_retry(task, clear_provider_state=False)

        seller_case.summary = "Synthesizing seller-level evidence."
        seller_case.raw_agent_outputs = task_log
        seller_case.error = None
        seller_case.status = SellerCaseStatus.running
        await self._save_case_progress(seller_case)
        await self._log_activity(
            seller_case,
            "seller_case_evidence",
            "Building seller-level evidence objects.",
            {"suspect_listing_count": len(suspect_listings)},
        )

        evidence = await self.runtime.run_agent(
            lambda: self.seller_evidence_agent.run(
                source_product,
                seller_profile,
                selected_listing,
                suspect_listings,
                official_matches,
            )
        )
        task.status = TaskStatus.completed
        task.output_payload = {"evidence": [item.model_dump() for item in evidence]}
        task.completed_at = utc_now()
        seller_case.evidence = evidence
        seller_case.summary = "Drafting the seller enforcement case."
        await self._save_case_progress(seller_case)
        return evidence

    async def _ensure_case_draft(
        self,
        seller_case: SellerCaseResponse,
        task_log: list[AgentTaskState],
        source_product: SourceProduct,
        seller_profile: SellerProfile,
        selected_listing: ComparisonResult,
        suspect_listings: list[ComparisonResult],
        evidence: list[SellerCaseEvidenceItem],
        official_matches: list[OfficialProductMatch],
    ) -> ActionRequestDraft:
        draft = self._load_case_draft(task_log)
        task = InvestigationOrchestrator._find_task(task_log, "case_draft")
        if task is not None and task.status == TaskStatus.completed and draft is not None:
            seller_case.action_request_draft = draft
            seller_case.summary = draft.summary
            return draft

        if task is None:
            task = AgentTaskState(
                agent_name="case_draft",
                status=TaskStatus.running,
                input_payload={"evidence_count": len(evidence)},
                started_at=utc_now(),
            )
            task_log.append(task)
        else:
            InvestigationOrchestrator._prepare_task_for_retry(task, clear_provider_state=False)

        seller_case.summary = "Drafting the seller enforcement case."
        seller_case.raw_agent_outputs = task_log
        seller_case.error = None
        seller_case.status = SellerCaseStatus.running
        await self._save_case_progress(seller_case)
        await self._log_activity(
            seller_case,
            "case_draft",
            "Drafting the marketplace action request.",
            {"evidence_count": len(evidence)},
        )

        draft = await self.runtime.run_agent(
            lambda: self.case_draft_agent.run(
                source_product,
                seller_profile,
                selected_listing,
                suspect_listings,
                evidence,
                official_matches,
            )
        )
        task.status = TaskStatus.completed
        task.output_payload = {"draft": draft.model_dump()}
        task.completed_at = utc_now()
        seller_case.action_request_draft = draft
        seller_case.summary = draft.summary
        await self._save_case_progress(seller_case)
        return draft
