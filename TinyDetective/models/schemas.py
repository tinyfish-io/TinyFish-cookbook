"""Pydantic schemas for the counterfeit research MVP."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field, HttpUrl


def utc_now() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class InvestigationStatus(str, Enum):
    queued = "queued"
    running = "running"
    delayed = "delayed"
    completed = "completed"
    failed = "failed"


class TaskStatus(str, Enum):
    queued = "queued"
    running = "running"
    delayed = "delayed"
    completed = "completed"
    failed = "failed"


class SourceProduct(BaseModel):
    source_url: HttpUrl | str
    brand: str | None = None
    product_name: str | None = None
    category: str | None = None
    subcategory: str | None = None
    price: float | None = None
    currency: str | None = None
    color: str | None = None
    size: str | None = None
    material: str | None = None
    model: str | None = None
    sku: str | None = None
    features: list[str] = Field(default_factory=list)
    description: str | None = None
    image_urls: list[str] = Field(default_factory=list)
    extraction_confidence: float = 0.0


class CandidateProduct(BaseModel):
    product_url: HttpUrl | str
    marketplace: str
    discovery_queries: list[str] = Field(default_factory=list)
    seller_name: str | None = None
    seller_store_url: HttpUrl | str | None = None
    seller_id: str | None = None
    title: str | None = None
    price: float | None = None
    currency: str | None = None
    brand: str | None = None
    color: str | None = None
    size: str | None = None
    material: str | None = None
    model: str | None = None
    sku: str | None = None
    description: str | None = None
    image_urls: list[str] = Field(default_factory=list)


class CandidateTriageAssessment(BaseModel):
    source_url: HttpUrl | str
    product_url: HttpUrl | str
    investigation_priority_score: float
    suspicion_score: float
    should_shortlist: bool
    rationale: str
    suspicious_signals: list[str] = Field(default_factory=list)


class ComparisonReasoningEnrichment(BaseModel):
    source_url: HttpUrl | str
    product_url: HttpUrl | str
    enriched_reason: str
    reasoning_notes: list[str] = Field(default_factory=list)
    additional_suspicious_signals: list[str] = Field(default_factory=list)
    risk_adjustment: float = 0.0
    match_adjustment: float = 0.0


class EvidenceItem(BaseModel):
    type: str
    field: str
    source_value: str | float | None = None
    candidate_value: str | float | None = None
    confidence: float = 0.0
    note: str


class ComparisonResult(BaseModel):
    source_url: HttpUrl | str
    product_url: HttpUrl | str
    marketplace: str
    match_score: float
    is_exact_match: bool
    is_official_store: bool = False
    official_store_confidence: float = 0.0
    official_store_signals: list[str] = Field(default_factory=list)
    counterfeit_risk_score: float
    suspicious_signals: list[str] = Field(default_factory=list)
    reason: str
    reasoning_notes: list[str] = Field(default_factory=list)
    reasoning_enrichment_source: str | None = None
    comparison_basis_source_url: HttpUrl | str | None = None
    comparison_basis_label: str | None = None
    comparison_basis_reason: str | None = None
    comparison_basis_confidence: float = 0.0
    triage_priority_score: float = 0.0
    triage_suspicion_score: float = 0.0
    evidence: list[EvidenceItem] = Field(default_factory=list)
    candidate_product: CandidateProduct


class AgentTaskState(BaseModel):
    task_id: str = Field(default_factory=lambda: str(uuid4()))
    agent_name: str
    status: TaskStatus = TaskStatus.queued
    input_payload: dict[str, Any] = Field(default_factory=dict)
    output_payload: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    provider_run_id: str | None = None
    provider_status: str | None = None
    last_heartbeat_at: datetime | None = None
    last_progress_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None


class ActivityLogEntry(BaseModel):
    timestamp: datetime = Field(default_factory=utc_now)
    level: str = "info"
    agent_name: str
    message: str
    source_url: HttpUrl | str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class InvestigationReport(BaseModel):
    source_url: HttpUrl | str
    extracted_source_product: SourceProduct | None = None
    top_matches: list[ComparisonResult] = Field(default_factory=list)
    excluded_official_store_count: int = 0
    summary: str
    raw_agent_outputs: list[AgentTaskState] = Field(default_factory=list)
    error: str | None = None


class InvestigationCreateRequest(BaseModel):
    source_urls: list[HttpUrl | str]
    comparison_sites: list[HttpUrl | str] = Field(default_factory=list)
    max_candidates_per_site: int = Field(default=5, ge=1, le=10)
    max_shortlisted_candidates: int = Field(default=6, ge=1, le=20)


class InvestigationResponse(BaseModel):
    investigation_id: str
    status: InvestigationStatus
    reports: list[InvestigationReport] = Field(default_factory=list)
    activity_log: list[ActivityLogEntry] = Field(default_factory=list)
    error: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class InvestigationListItem(BaseModel):
    investigation_id: str
    status: InvestigationStatus
    primary_source_url: str | None = None
    primary_source_title: str | None = None
    source_count: int = 0
    error: str | None = None
    created_at: datetime
    updated_at: datetime
