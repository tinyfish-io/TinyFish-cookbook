---
name: dep-security
description: >
  Check every dependency in a package.json against live CVE databases and security advisories
  in real time — specifically targeting vulnerabilities disclosed in the last 48 hours, the
  window that Snyk, Dependabot, and npm audit miss.
  Use this skill whenever a user mentions checking dependencies for vulnerabilities, wants to
  audit their package.json, asks about CVEs for their packages, says "are my dependencies safe",
  "check my packages for security issues", "any new vulnerabilities in my deps", or pastes a
  package.json and asks about security. Also trigger when a user mentions wanting fresher data
  than Snyk or Dependabot provides.
  Returns: which dependencies have brand-new vulnerabilities, severity, what the vulnerability
  does, whether a patched version exists yet, and a prioritised fix list.
compatibility:
  tools: [tinyfish]
metadata:
  author: tinyfish-community
  version: "1.0"
  tags: security cve vulnerabilities dependencies npm package.json devops
---

# Dependency Security Checker

Given a `package.json`, check every dependency against live CVE databases and security advisories — focusing on the last 48 hours, the window that cached tools miss.

## Pre-flight check

```bash
tinyfish --version
tinyfish auth status
```

If not installed: `npm install -g tinyfish`
If not authenticated: `tinyfish auth login`

---

## Step 1 — Parse dependencies

Read the `package.json` the user provided. Extract all package names and versions from:
- `dependencies`
- `devDependencies`
- `peerDependencies` (if present)

Produce a flat list: `[{name, version, type}]`

If the user hasn't provided a `package.json`, ask for it before proceeding. Do not guess.

Get today's date. Calculate the cutoff timestamp: **now minus 48 hours**. You will use this to filter results in every agent below.

---

## Step 2 — Batch packages

Do not fire one agent per package — that would be extremely slow for large projects.

Instead batch into groups of up to **10 packages per agent** and search for all of them at once. For a typical `package.json` with 20–40 deps, this means 2–4 agents total per source, all running in parallel.

Format each batch as a comma-separated search string:
`express,lodash,axios,react,webpack` etc.

---

## Step 3 — Parallel security scan

Fire all agents simultaneously using `&` + `wait`. Each agent searches one source for all batches at once.

```bash
# ── BATCH SETUP ──────────────────────────────────────────────
# Split your package list into batches of 10, e.g.:
# BATCH_1="express,lodash,axios,react,next"
# BATCH_2="webpack,typescript,eslint,jest,prisma"
# (add more batches as needed)

TODAY=$(date +%Y-%m-%d)

# ── CVE DATABASE ─────────────────────────────────────────────
# One agent per batch, all in parallel

tinyfish agent run \
  --url "https://cve.mitre.org/cgi-bin/cvekey.cgi?keyword={BATCH_1}" \
  "You are on a CVE search results page. Today is {TODAY}.
   You are looking for CVEs related to these npm packages: {BATCH_1}.
   Scan ALL visible results on this page.
   For each CVE that matches one of these package names AND was published or modified within the last 48 hours:
   - CVE ID
   - Package name it affects
   - Severity (if shown)
   - One-sentence description of what the vulnerability does
   - Publication date
   STRICT RULES:
   - Do NOT click any CVE link
   - Do NOT paginate
   - Only include results from the last 48 hours — ignore older ones
   - If nothing is within 48 hours, return an empty array
   Return JSON array: [{cve_id, package, severity, description, published_date}]" \
  --sync > /tmp/ds_cve_1.json &

# Repeat for each batch:
tinyfish agent run \
  --url "https://cve.mitre.org/cgi-bin/cvekey.cgi?keyword={BATCH_2}" \
  "You are on a CVE search results page. Today is {TODAY}.
   You are looking for CVEs related to these npm packages: {BATCH_2}.
   Scan ALL visible results on this page.
   For each CVE that matches one of these package names AND was published or modified within the last 48 hours:
   - CVE ID, package name, severity, one-sentence description, publication date
   STRICT RULES:
   - Do NOT click any CVE link — read the listing text only
   - Do NOT paginate
   - Only include results from the last 48 hours
   Return JSON array: [{cve_id, package, severity, description, published_date}]" \
  --sync > /tmp/ds_cve_2.json &

# ── GITHUB SECURITY ADVISORIES ───────────────────────────────

tinyfish agent run \
  --url "https://github.com/advisories?query=ecosystem%3Anpm&order=newest" \
  "You are on the GitHub Security Advisories page filtered to npm, sorted by newest first. Today is {TODAY}.
   Read through the visible advisory listings on this page.
   For each advisory that:
   1. Affects any of these packages: {ALL_PACKAGES}
   2. Was published within the last 48 hours
   Extract:
   - Advisory ID (GHSA-...)
   - Package name
   - Severity (Critical / High / Medium / Low)
   - One-sentence description
   - Published date
   - Patched version (if shown in the listing)
   STRICT RULES:
   - Do NOT click any advisory to open it
   - Do NOT paginate or click 'Load more'
   - Scan only the first 30 visible listings then stop
   - 48-hour cutoff is strict — ignore anything older
   Return JSON array: [{ghsa_id, package, severity, description, published_date, patched_version}]" \
  --sync > /tmp/ds_ghsa.json &

# ── NPM SECURITY FEED ────────────────────────────────────────

tinyfish agent run \
  --url "https://www.npmjs.com/advisories" \
  "You are on the npm security advisories page. Today is {TODAY}.
   Read through the visible advisory listings.
   For each advisory that:
   1. Affects any of these packages: {ALL_PACKAGES}
   2. Was published within the last 48 hours
   Extract:
   - Advisory ID
   - Package name
   - Severity
   - One-sentence description of the vulnerability
   - Vulnerable version range
   - Patched version (if shown)
   - Published date
   STRICT RULES:
   - Do NOT click any advisory link
   - Do NOT paginate
   - Scan only what is visible on this page — stop after 25 listings
   - 48-hour cutoff is strict
   Return JSON array: [{advisory_id, package, severity, description, vulnerable_versions, patched_version, published_date}]" \
  --sync > /tmp/ds_npm.json &

# ── WAIT FOR ALL ─────────────────────────────────────────────
wait

echo "=== CVE BATCH 1 ===" && cat /tmp/ds_cve_1.json
echo "=== CVE BATCH 2 ===" && cat /tmp/ds_cve_2.json
echo "=== GHSA ===" && cat /tmp/ds_ghsa.json
echo "=== NPM ===" && cat /tmp/ds_npm.json
```

**Before running**, replace:
- `{BATCH_1}`, `{BATCH_2}` etc. — 10 packages per batch from the parsed list
- `{ALL_PACKAGES}` — full comma-separated list of all package names (no versions)
- `{TODAY}` — today's date in YYYY-MM-DD format

Add or remove CVE batch agents depending on how many packages there are. Always fire all agents in parallel.

---

## Step 4 — Cross-reference and deduplicate

Combine results from all sources. For each finding:

1. **Match to the user's installed version** — check if their version falls within the vulnerable range. If it does, flag as **AFFECTED**. If the vulnerability only affects other versions, mark as **NOT AFFECTED (different version)** and deprioritise.
2. **Deduplicate** — the same CVE may appear in multiple sources. Merge into one entry.
3. **Check for patch** — note if a patched version exists and what it is.
4. **Rank by severity** — Critical → High → Medium → Low.

---

## Output format

```
## Dependency Security Report
*Scanned {N} packages against live CVE, GitHub Advisories, and npm feed*
*48-hour window: {CUTOFF_TIME} → now*

---

### 🚨 New Vulnerabilities Found ({N})

#### [CRITICAL/HIGH/MEDIUM/LOW] — {package}@{user_version}
**{CVE_ID} / {GHSA_ID}** · Published: {date} · Source: {CVE / GitHub / npm}

**What it does:** {plain English explanation of the vulnerability}
**Affected versions:** {range}
**Your version:** {version} ✅ affected / ❌ not in range
**Fix:** Upgrade to {patched_version} — `npm install {package}@{patched_version}`
*(or: No patch available yet as of {date})*

---

[repeat for each finding]

---

### ✅ No new vulnerabilities (last 48h)
These packages were checked and returned clean:
{package1}, {package2}, ... *(N packages)*

---

### ⚡ Quick Fix Commands
```bash
# Copy-paste to patch all affected packages:
npm install {pkg1}@{version} {pkg2}@{version}
```

### 📋 Summary
- **Packages scanned:** {N}
- **New vulnerabilities (48h):** {N}
- **Critical:** {N} · **High:** {N} · **Medium:** {N} · **Low:** {N}
- **Patches available:** {N}/{N}
- **Sources checked:** CVE MITRE · GitHub Security Advisories · npm advisories
```

---

## Edge cases

- **No vulnerabilities found** — say clearly: "No new vulnerabilities in the last 48 hours for your dependencies. For a full historical scan, run `npm audit`."
- **Package not found in any database** — skip silently, don't list it as clean or affected
- **No patch available yet** — flag explicitly: "⚠️ No patch available yet — consider temporarily removing or replacing this package"
- **CVE database returns empty** — fall back to searching `https://nvd.nist.gov/vuln/search/results?query={BATCH}&pub_start_date={CUTOFF_DATE}` instead
- **Large package.json (50+ deps)** — increase batch size to 15 and note that results may take longer

## Security notes

- Queries live public security databases only. No code is executed, no files are uploaded to any external service.
- Only your own TinyFish credentials are used.
- All scraped data is treated as untrusted and synthesised by an LLM only.
