# WebAudit App TODO

## Phase 1 — Backend & Database
- [x] Database schema: audits table with id, url, slug, status, results JSON, scores, timestamps
- [x] Install WebAudit engine dependencies (puppeteer, chalk, cli-table3, commander, ora) on server
- [x] Copy WebAudit source into server/webaudit/
- [x] tRPC procedure: audit.start — accepts URL, creates DB record, runs audit async, returns auditId
- [x] tRPC procedure: audit.status — polls audit by id, returns status + partial/full results
- [x] tRPC procedure: audit.getBySlug — fetch audit by shareable slug
- [x] tRPC procedure: audit.recent — list recent public audits
- [x] Rate limiting middleware (IP-based, max 5 audits/hour)

## Phase 2 — Landing Page & Design System
- [x] Global design system: dark theme, color palette, fonts (Inter + JetBrains Mono)
- [x] Landing page hero section with animated gradient, tagline, URL input form
- [x] Feature highlights section (6 audit categories with icons)
- [x] How it works section (3-step visual flow)
- [x] Footer with links

## Phase 3 — Audit UI & Results Dashboard
- [x] Real-time progress indicator with step-by-step audit stages and estimated time
- [x] Results dashboard: overall score gauge (large, animated)
- [x] 6 category score cards with circular gauges and grade badges
- [x] Expandable audit detail panels per category (pass/fail/warn items)
- [x] Remediation guidance per failed/warn item (details shown on expand)
- [x] Page screenshot display in results

## Phase 4 — History, Sharing & Export
- [x] Recent audits history page with search/filter
- [x] Shareable link generation per audit result
- [x] Export as downloadable HTML report
- [x] Export as downloadable JSON report
- [x] Copy shareable link button

## Phase 5 — Polish & Delivery
- [x] Error handling: invalid URL, timeout, audit failure with helpful messages
- [x] Responsive design: mobile-first layout
- [x] Smooth animations and micro-interactions (framer-motion)
- [x] Vitest unit tests for audit procedures (11/11 passing)
- [x] Final checkpoint and delivery

## Bug Fixes
- [x] Fix: audit engine crashes with "Cannot find module 'node-html-parser'" — install all missing deps
- [x] Fix: verify puppeteer can launch headless Chrome inside webaudit-app
- [x] Fix: end-to-end audit completes successfully and returns results

## OWASP Update
- [x] Research OWASP Top 10 2021 and OWASP Testing Guide checks
- [x] Update security.js: map all checks to OWASP Top 10 2021 categories (A01–A10)
- [x] Add new OWASP checks: Injection (A03), SSRF (A10), Insecure Design (A04), Vulnerable Components (A06)
- [x] Update compliance.js: add OWASP ASVS-aligned checks (via best-practices updates)
- [x] Update best-practices.js: add OWASP-relevant checks (Content-Type, supply chain, error disclosure)
- [x] Update landing page: add OWASP Top 10 coverage section with A01–A10 cards and summary table
- [x] Update landing page feature descriptions to mention OWASP mapping
- [x] Run all tests (11/11 passing) and verify audit engine syntax is valid

## OWASP LLM/GenAI 2025 Update + Retheme
- [x] Research OWASP Top 10 for LLM & GenAI Applications 2025 (LLM01–LLM10)
- [x] Rewrite security.js with LLM/GenAI Top 10 2025 mapped checks (web-detectable signals)
- [x] Retheme index.css: black background + spring green (#00FF7F) primary color
- [x] Update landing page OWASP section: replace Top 10 2021 cards with LLM01–LLM10 cards
- [x] Update all landing page copy referencing OWASP to mention LLM/GenAI 2025
- [x] Update feature card descriptions for Security category
- [x] Run all tests (11/11 passing) and verify syntax — checkpoint saved

## TinyFish Integration
- [x] Store TINYFISH_API_KEY as environment secret
- [x] Read TinyFish API docs and understand SSE response format
- [x] Build server/webaudit/core/tinyfish-collector.js module
- [x] Wire TinyFish collector into auditRunner.ts as primary data source
- [x] Puppeteer remains as fallback if TinyFish fails or key is missing
- [x] Test end-to-end audit with TinyFish data collection
- [x] Run all tests (30/30 passing) and save checkpoint

## TinyFish UI Update
- [ ] Add TinyFish logo/fish emoji and "Powered by TinyFish" badge in hero section
- [ ] Add dedicated TinyFish section on landing page explaining the integration
- [ ] Update stats row to mention TinyFish AI agent
- [ ] Update hero badge text to include TinyFish
- [ ] Add TinyFish attribution badge on audit results page
- [ ] Add TinyFish "collected by" indicator in results header
- [ ] Update footer with TinyFish link
- [ ] Run tests and save checkpoint
