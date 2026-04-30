"""Pydantic schemas for seller-case generation."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field, HttpUrl

from models.schemas import (
    ActivityLogEntry,
    AgentTaskState,
    ComparisonResult,
    SourceProduct,
    utc_now,
)


class SellerCaseStatus(str, Enum):
    queued = "queued"
    running = "running"
    delayed = "delayed"
    completed = "completed"
    failed = "failed"
    reviewed = "reviewed"
    exported = "exported"


class SellerProfile(BaseModel):
    seller_name: str | None = None
    seller_id: str | None = None
    seller_url: HttpUrl | str | None = None
    marketplace: str | None = None
    rating: float | None = None
    rating_count: int | None = None
    follower_count: int | None = None
    joined_date: str | None = None
    location: str | None = None
    badges: list[str] = Field(default_factory=list)
    profile_text: str | None = None
    storefront_summary: str | None = None
    official_store_claims: list[str] = Field(default_factory=list)
    image_urls: list[str] = Field(default_factory=list)
    entry_urls: list[str] = Field(default_factory=list)
    storefront_shard_urls: list[str] = Field(default_factory=list)
    extraction_confidence: float = 0.0


class SellerListing(BaseModel):
    product_url: HttpUrl | str
    marketplace: str
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
    discovery_entry_url: HttpUrl | str | None = None
    discovery_shard_url: HttpUrl | str | None = None
    discovery_source: str | None = None


class SellerListingTriageAssessment(BaseModel):
    product_url: HttpUrl | str
    investigation_priority_score: float
    suspicion_score: float
    should_shortlist: bool
    rationale: str
    suspicious_signals: list[str] = Field(default_factory=list)


class OfficialProductMatch(BaseModel):
    product_url: HttpUrl | str
    official_product_url: HttpUrl | str | None = None
    official_product: SourceProduct | None = None
    match_confidence: float = 0.0
    rationale: str = ""
    search_queries: list[str] = Field(default_factory=list)


class SellerCaseEvidenceItem(BaseModel):
    evidence_id: str = Field(default_factory=lambda: str(uuid4()))
    type: str
    title: str
    note: str
    reference_url: HttpUrl | str | None = None
    source_value: str | float | None = None
    candidate_value: str | float | None = None
    confidence: float = 0.0
    subject: str | None = None
    supporting_signals: list[str] = Field(default_factory=list)


class ActionRequestDraft(BaseModel):
    case_title: str
    summary: str
    reasoning: str
    suspected_violation_type: str
    recommended_action: str
    request_text: str
    evidence_references: list[str] = Field(default_factory=list)
    confidence: float = 0.0


class SellerCaseCreateRequest(BaseModel):
    investigation_id: str
    source_url: HttpUrl | str
    product_url: HttpUrl | str
    max_listings_to_analyze: int = Field(default=8, ge=1, le=20)
    max_shortlisted_listings: int = Field(default=6, ge=1, le=20)
    max_storefront_shards: int = Field(default=3, ge=1, le=8)


class SellerCaseResponse(BaseModel):
    case_id: str
    investigation_id: str
    source_url: HttpUrl | str
    product_url: HttpUrl | str
    marketplace: str | None = None
    seller_name: str | None = None
    seller_store_url: HttpUrl | str | None = None
    status: SellerCaseStatus
    summary: str = "Queued for seller case generation."
    source_product: SourceProduct | None = None
    selected_listing: ComparisonResult | None = None
    seller_profile: SellerProfile | None = None
    discovered_listings: list[SellerListing] = Field(default_factory=list)
    triage_assessments: list[SellerListingTriageAssessment] = Field(default_factory=list)
    shortlisted_listing_urls: list[str] = Field(default_factory=list)
    official_product_matches: list[OfficialProductMatch] = Field(default_factory=list)
    suspect_listings: list[ComparisonResult] = Field(default_factory=list)
    evidence: list[SellerCaseEvidenceItem] = Field(default_factory=list)
    action_request_draft: ActionRequestDraft | None = None
    raw_agent_outputs: list[AgentTaskState] = Field(default_factory=list)
    activity_log: list[ActivityLogEntry] = Field(default_factory=list)
    error: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class SellerCaseListItem(BaseModel):
    case_id: str
    status: SellerCaseStatus
    seller_name: str | None = None
    marketplace: str | None = None
    source_url: str
    product_url: str
    error: str | None = None
    created_at: datetime
    updated_at: datetime
