from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    stack: str = "Python"
    keywords: str = ""
    min_amount: float = 0


class Opportunity(BaseModel):
    id: str
    type: Literal["bounty", "grant"]
    tier: Literal[1, 2, 3]
    source: str
    source_label: str
    title: str
    repo: Optional[str] = None
    url: str
    bounty_amount: Optional[float] = None
    currency: Optional[str] = None
    skills: list[str] = Field(default_factory=list)
    difficulty: Optional[str] = None
    deadline: Optional[str] = None
    description: Optional[str] = None
    labels: list[str] = Field(default_factory=list)


# ── SSE event payloads ─────────────────────────────────────────────────────────

class SourceMeta(BaseModel):
    id: str
    label: str
    tier: Literal[1, 2, 3]
    url: str


class SourcesEvent(BaseModel):
    type: Literal["sources"] = "sources"
    sources: list[SourceMeta]


class AgentStartedEvent(BaseModel):
    type: Literal["agent_started"] = "agent_started"
    source_id: str


class AgentCompleteEvent(BaseModel):
    type: Literal["agent_complete"] = "agent_complete"
    source_id: str
    count: int
    opportunities: list[Opportunity]


class AgentErrorEvent(BaseModel):
    type: Literal["agent_error"] = "agent_error"
    source_id: str
    error: str


class Tier2StatusEvent(BaseModel):
    type: Literal["tier2_status"] = "tier2_status"
    phase: Literal["discovering", "scanning", "done", "skipped", "error"]
    lang: Optional[str] = None
    url: Optional[str] = None
    total: Optional[int] = None
    error: Optional[str] = None


class Tier2RepoDoneEvent(BaseModel):
    type: Literal["tier2_repo_done"] = "tier2_repo_done"
    repo: str
    count: int
    scanned: int
    total: int
    opportunities: list[Opportunity]


class DoneEvent(BaseModel):
    type: Literal["done"] = "done"
