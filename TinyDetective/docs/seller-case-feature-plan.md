# Seller Case Feature Plan

## Goal

Add a post-investigation workflow that lets an analyst select a suspicious seller from counterfeit analysis results and build a seller-level enforcement case.

The seller case workflow should:

- Reuse the original counterfeit investigation context.
- Use TinyFish agents to inspect the selected seller page and the seller's other listings.
- Gather structured, reviewable evidence about suspicious behavior.
- Generate a draft case for manual review.
- Produce a marketplace-facing request for action backed by evidence.

## Product Intent

The counterfeit scan identifies suspicious listings.

The seller case workflow answers a second question:

> Is this seller operating in a way that justifies escalation to the marketplace trust and safety team?

This feature should remain human-in-the-loop in V1. The system may draft a case and request for action, but it must not auto-submit reports to marketplace authorities.

## Scope

### In Scope

- Build a seller case from a selected suspicious listing.
- Deep-dive the seller profile/storefront.
- Discover and analyze additional listings from the same seller.
- Identify repeated suspicious patterns.
- Collect structured evidence with references.
- Draft a reviewable seller case.
- Draft a marketplace-facing action request.
- Persist case state and progress.
- Display live progress and evidence in the frontend.

### Out of Scope for V1

- Auto-submission to marketplaces.
- Legal conclusions beyond evidence-backed suspicion.
- Full case-management workflow with approvals and assignments.
- Cross-marketplace seller identity resolution.
- Automated image-matching infrastructure beyond hooks and placeholders.

## User Flow

1. User runs counterfeit analysis.
2. User reviews ranked suspicious listings.
3. User clicks `Build Seller Case` on a specific listing.
4. Backend creates a `SellerCase` linked to the originating investigation result.
5. TinyFish agents inspect the seller page and the seller's listings.
6. Evidence is collected and structured.
7. A case draft agent produces:
   - seller summary
   - suspicious listing summary
   - evidence-backed reasoning
   - recommended action
   - marketplace-facing request text
8. User reviews the draft and exports or copies it for manual submission.

## High-Level Architecture

### Existing System Reuse

The feature should build on the existing investigation stack:

- TinyFish runtime and client integration
- agent task state and progress tracking
- orchestrator pattern
- storage layer
- frontend polling and live activity UI

### New Workflow

Add a separate seller-case pipeline rather than folding this into the base counterfeit investigation flow.

Recommended new orchestrator:

- `services/seller_case_orchestrator.py`

Recommended new agents:

- `agents/seller_profile_agent.py`
- `agents/seller_listing_discovery_agent.py`
- `agents/seller_listing_analysis_agent.py`
- `agents/seller_evidence_agent.py`
- `agents/case_draft_agent.py`

Recommended adapters:

- `adapters/seller_page_adapter.py`
- `adapters/seller_listing_adapter.py`

Recommended models:

- `models/case_schemas.py`

## Core Workflow Steps

### Step 1: Case Creation

The selected suspicious listing is used to create a seller case seed.

Inputs:

- originating `investigation_id`
- `source_url`
- selected suspicious `ComparisonResult`
- `seller_name`
- `seller/storefront URL` if available
- `marketplace`

Outputs:

- new `SellerCase`
- initial progress state

### Step 2: Seller Profile Research

Inspect the seller page/storefront and extract:

- seller/store name
- seller/store URL
- seller ID if present
- rating
- follower count
- response rate if present
- join date or store age
- location
- profile text
- seller badges
- official/authorized claims
- storefront screenshots

### Step 3: Seller Listing Discovery

Discover the seller's listings from the seller storefront.

Extract:

- listing URLs
- listing titles
- prices
- thumbnails
- visible categories
- seller metadata on listing cards

This should support pagination and partial progress persistence.

### Step 4: Seller Listing Analysis

Analyze the seller's discovered listings and identify which ones are likely relevant to the protected brand or product family.

Signals to inspect:

- brand references
- title similarity
- product family overlap
- repeated pricing anomalies
- copied or near-copied descriptions
- repeated suspicious materials or colorways
- storefront claims that mimic official branding

This step should fan out in parallel per relevant listing.

### Step 5: Evidence Synthesis

Convert seller-level and listing-level findings into structured evidence.

Each evidence item should include:

- evidence type
- source URL
- related listing URL if applicable
- extracted fact
- source value
- candidate value
- confidence
- note
- screenshot path or artifact reference when available
- timestamp

### Step 6: Case Drafting

The case draft agent should produce:

- concise seller-level summary
- suspect listing summary
- evidence-backed reasoning
- recommendation for action
- marketplace-facing draft request

The draft should use cautious language such as:

- `suspected counterfeit activity`
- `suspected infringement`
- `requires manual review`

## Data Model Tasks

### Task Group: Seller Case Models

- [ ] Add `SellerCase`
- [ ] Add `SellerProfile`
- [ ] Add `SellerListing`
- [ ] Add `SellerCaseEvidenceItem`
- [ ] Add `ActionRequestDraft`
- [ ] Add `SellerCaseListItem`

### Suggested Model Fields

#### SellerCase

- `case_id`
- `investigation_id`
- `source_url`
- `selected_product_url`
- `marketplace`
- `seller_name`
- `seller_url`
- `status`
- `summary`
- `seller_profile`
- `suspect_listings`
- `evidence`
- `draft_action_request`
- `raw_agent_outputs`
- `error`
- `created_at`
- `updated_at`

#### SellerProfile

- `seller_name`
- `seller_url`
- `seller_id`
- `marketplace`
- `rating`
- `follower_count`
- `store_age`
- `location`
- `badges`
- `profile_text`
- `official_claims`
- `screenshot_urls`

#### SellerListing

- `listing_url`
- `title`
- `price`
- `currency`
- `brand`
- `category`
- `seller_name`
- `image_urls`
- `signals`
- `analysis_summary`

#### SellerCaseEvidenceItem

- `type`
- `field`
- `source_url`
- `listing_url`
- `source_value`
- `candidate_value`
- `confidence`
- `note`
- `artifact_refs`
- `captured_at`

#### ActionRequestDraft

- `title`
- `summary`
- `suspected_violation_type`
- `reasoning`
- `recommended_action`
- `marketplace_request_text`
- `evidence_refs`

## Backend API Tasks

### Task Group: Case Endpoints

- [ ] Add `POST /cases`
- [ ] Add `GET /cases/:id`
- [ ] Add `GET /cases`
- [ ] Add `POST /cases/:id/redraft`
- [ ] Add export endpoint later

### Endpoint Behavior

#### `POST /cases`

Creates a seller case from an investigation result.

Request should include:

- `investigation_id`
- `source_url`
- `product_url`
- `marketplace`
- `seller_name`
- `seller_url` if available

Response should include:

- `case_id`
- `status`

#### `GET /cases/:id`

Returns:

- current case status
- seller profile
- suspect listings
- evidence
- draft action request
- raw task states

#### `GET /cases`

Returns recent seller cases for dashboard/history use.

## Agent Tasks

### Task Group: SellerProfileAgent

- [ ] Create `SellerProfileAgent`
- [ ] Create seller profile extraction prompt
- [ ] Extract structured seller metadata
- [ ] Capture profile/storefront screenshots
- [ ] Normalize official claim signals

Definition of done:

- Agent returns a validated `SellerProfile`
- Missing fields degrade gracefully
- Output contains enough metadata for downstream reasoning

### Task Group: SellerListingDiscoveryAgent

- [ ] Create `SellerListingDiscoveryAgent`
- [ ] Support seller-storefront listing enumeration
- [ ] Support pagination
- [ ] Return listing URLs and lightweight metadata
- [ ] Persist progress while paging

Definition of done:

- Agent can enumerate seller listings from a storefront page
- Partial failures do not crash the whole case
- Result is structured and deduplicated

### Task Group: SellerListingAnalysisAgent

- [ ] Create `SellerListingAnalysisAgent`
- [ ] Compare seller listings against source product and brand family
- [ ] Score suspiciousness per listing
- [ ] Identify repeated suspicious patterns
- [ ] Return explainable listing-level findings

Definition of done:

- Agent returns structured suspiciousness output for each analyzed listing
- Results are explainable and evidence-friendly
- Parallel execution is supported

### Task Group: SellerEvidenceAgent

- [ ] Create `SellerEvidenceAgent`
- [ ] Convert findings into audit-friendly evidence objects
- [ ] Include artifact references when available
- [ ] Group evidence by seller-level and listing-level patterns

Definition of done:

- Evidence can be rendered directly in the UI
- Each evidence item includes source URL, note, and confidence
- Evidence objects can be cited by the case draft agent

### Task Group: CaseDraftAgent

- [ ] Create `CaseDraftAgent`
- [ ] Draft seller-level summary
- [ ] Draft platform-facing request
- [ ] Reference specific evidence items
- [ ] Use cautious enforcement language

Definition of done:

- Draft includes reasoning backed by evidence references
- Draft is suitable for analyst review
- Draft does not overstate unsupported conclusions

## Orchestration Tasks

### Task Group: SellerCaseOrchestrator

- [ ] Create `SellerCaseOrchestrator`
- [ ] Persist case state through all stages
- [ ] Reuse existing agent task state structure
- [ ] Reuse existing progress update patterns
- [ ] Support async execution and partial progress

### Required Pipeline

1. create case
2. seller profile extraction
3. seller listing discovery
4. relevant listing selection
5. parallel listing analysis
6. evidence synthesis
7. case draft generation

### Parallelism Requirements

The following must run in parallel where possible:

- analysis of seller listings
- listing detail extraction for relevant listings
- evidence preparation for independent listings if architecture permits

Definition of done:

- The seller-case workflow persists progress like investigations do
- Independent listing analysis tasks run concurrently
- Failures in one listing do not invalidate the entire case

## Storage Tasks

### Task Group: Persistence

- [ ] Extend storage to persist seller cases
- [ ] Link seller cases to investigations
- [ ] Persist evidence and case drafts
- [ ] Persist raw agent task outputs
- [ ] Persist activity logs for seller-case runs

Definition of done:

- Cases survive server restarts
- Case history can be queried
- Raw and derived outputs remain linked

## Frontend Tasks

### Task Group: Results Page Integration

- [ ] Add `Build Seller Case` button to suspicious results
- [ ] Only show action for appropriate results
- [ ] Pass selected listing and seller metadata into case creation flow

Definition of done:

- User can start a seller case from the investigation results page
- Action is visible only when seller context exists

### Task Group: Seller Case Page

- [ ] Add seller case detail route/page
- [ ] Show progress and live activity
- [ ] Show seller profile summary
- [ ] Show suspect listings table/cards
- [ ] Show evidence list
- [ ] Show draft action request
- [ ] Add reviewer notes field

Definition of done:

- User can inspect the full seller case in one place
- Progress updates while the case is running
- Evidence and draft are readable and actionable

### Task Group: Export UX

- [ ] Add copy-to-clipboard export
- [ ] Add markdown export
- [ ] Add PDF/HTML export later

Definition of done:

- Analyst can export a case draft for manual submission

## Evidence Standards

Every evidence item should be:

- traceable to a source URL
- time-stamped
- confidence-scored
- understandable without reading raw model output
- renderable in UI and export

Recommended evidence categories:

- `brand_misuse`
- `repeated_suspicious_listing`
- `suspicious_price_pattern`
- `copied_description`
- `image_reuse`
- `official_store_mimicry`
- `policy_badge_mismatch`
- `repeat_product_family_pattern`

## Safety and Policy Constraints

- Human review is mandatory in V1.
- No automatic report submission.
- No claims stronger than the evidence supports.
- Use cautious and review-friendly language.
- Preserve raw evidence and provenance for auditability.

## Suggested Delivery Order

### Phase 1: MVP Seller Case Flow

- [ ] Add case models
- [ ] Add storage and endpoints
- [ ] Add `Build Seller Case` UI action
- [ ] Add seller profile extraction
- [ ] Add seller listing discovery
- [ ] Add parallel listing analysis
- [ ] Add evidence synthesis
- [ ] Add draft case generation

Phase 1 definition of done:

- Analyst can create a seller case from a suspicious result
- TinyFish agents analyze seller profile and listings
- Seller listing analysis runs in parallel
- Evidence and draft are persisted and viewable

### Phase 2: Stronger Evidence and Review

- [ ] Add screenshots and artifact persistence
- [ ] Add richer repeated-pattern detection
- [ ] Add stronger export support
- [ ] Add reviewer notes and redraft workflow

Phase 2 definition of done:

- Case output is exportable
- Reviewer can edit or annotate before submission
- Evidence quality is suitable for manual enforcement escalation

### Phase 3: Operational Workflow

- [ ] Add case history dashboard
- [ ] Add reviewer states and assignment
- [ ] Add marketplace-specific draft templates
- [ ] Add audit trail improvements

Phase 3 definition of done:

- Seller cases are manageable as a repeatable analyst workflow

## Global Definition of Done

This feature is complete when all of the following are true:

- User can create a seller case from a counterfeit analysis result.
- Seller page and seller listings are analyzed with TinyFish agents.
- Listing analysis executes in parallel.
- Evidence is structured, persisted, and tied to source URLs.
- Draft case reasoning references concrete evidence.
- UI shows case progress, evidence, and the final draft.
- Case output is suitable for manual submission to marketplace authorities.
- Workflow is resilient to partial failures.
- Tests cover core agents, orchestrator flow, and API creation/fetch behavior.

## Codex Implementation Notes

### Keep This Separate From the Base Investigation

Do not overload the counterfeit investigation endpoint with seller-case logic.

Preferred pattern:

- investigation flow stays focused on counterfeit analysis
- seller-case flow is launched from a selected result

### Preserve Explainability

Do not optimize for opaque scoring. Every seller-level conclusion should be backed by evidence items and source references.

### Preserve Human Review

Do not implement automatic submission logic unless explicitly requested in a later phase.

### Reuse Existing Patterns

Prefer reusing:

- TinyFish client and runtime
- `AgentTaskState`
- existing polling/progress model
- storage conventions
- current frontend activity log and progress sections

