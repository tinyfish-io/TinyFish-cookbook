---
name: npm-package-comparator
description: Compare two or more npm packages side by side using live data — downloads, bundle size, GitHub stars, last update, known vulnerabilities, and community sentiment. Use this skill when a user asks "zustand vs jotai vs redux", "compare react-query and swr", "which state management library should I use", "what's the difference between X and Y", "is X better than Y for my use case", "help me choose between these packages", or any request to compare npm packages or decide between JavaScript libraries.
---

# npm Package Comparator

Compare any set of npm packages side by side using live data from npm, GitHub, Bundlephobia, and Snyk — then give a clear recommendation based on what you actually need.

## Pre-flight Check (REQUIRED)

Before making any TinyFish call, always run BOTH checks:

**1. CLI installed?**
```bash
which tinyfish && tinyfish --version || echo "TINYFISH_CLI_NOT_INSTALLED"
```

If not installed, stop and tell the user:
> Install the TinyFish CLI: `npm install -g @tiny-fish/cli`

**2. Authenticated?**
```bash
tinyfish auth status
```

If not authenticated, stop and tell the user:
> You need a TinyFish API key. Get one at: https://agent.tinyfish.ai/api-keys
>
> Then authenticate:
> ```
> tinyfish auth login
> ```

Do NOT proceed until both checks pass.

---

## Step 1 — Gather inputs

You need:
- **Package names** — 2 to 4 packages to compare (e.g. `zustand`, `jotai`, `redux`)
- **Use case** (optional but improves recommendation) — e.g. "small React app", "large enterprise codebase", "need SSR support"

If the user hasn't specified a use case, ask:
> "What are you building with it? (e.g. small side project, large team codebase, performance-critical app)"

If they don't know, proceed without it and give a general recommendation.

---

## Step 2 — Parallel data fetch

For each package, fire agents across npm, GitHub, Bundlephobia, and Snyk simultaneously. Run ALL agents for ALL packages in parallel — one agent per package per source.

```bash
# ── For each PACKAGE, run all 4 agents in parallel ───────────

# npm stats
tinyfish agent run \
  --url "https://www.npmjs.com/package/{PACKAGE}" \
  "You are on the npm page for the package {PACKAGE}.
   Extract:
   - current version
   - weekly downloads (exact number shown)
   - total downloads if shown
   - last publish date
   - license
   - number of dependencies
   - TypeScript support (yes/no — check if types are listed)
   - maintainers count
   - repository URL
   STRICT RULES:
   - Do NOT click any links
   - Read only what is visible on this page
   - If a field is not shown, return null
   Return JSON: {package, version, weekly_downloads, last_published, license, dependency_count, typescript_support, maintainer_count, repo_url}" \
  --sync > /tmp/npm_{PACKAGE_SAFE}.json &

# GitHub stats
tinyfish agent run \
  --url "https://github.com/{OWNER}/{REPO}" \
  "You are on the GitHub repository page for {PACKAGE}.
   Extract:
   - star count
   - fork count
   - open issues count
   - last commit date
   - number of contributors (from sidebar or Insights)
   - latest release tag and date
   - whether the repo is actively maintained (check: last commit within 6 months)
   STRICT RULES:
   - Do NOT click any tabs or links
   - Read only what is visible on the main repo page
   Return JSON: {package, stars, forks, open_issues, last_commit, contributors, latest_release, latest_release_date, is_active}" \
  --sync > /tmp/gh_{PACKAGE_SAFE}.json &

# Bundle size
tinyfish agent run \
  --url "https://bundlephobia.com/package/{PACKAGE}" \
  "You are on the Bundlephobia page for {PACKAGE}.
   Extract:
   - minified size (in KB)
   - minified + gzipped size (in KB)
   - download time on slow 3G (if shown)
   - tree-shakeable (yes/no)
   - side-effect free (yes/no)
   STRICT RULES:
   - Do NOT click any links
   - Read only what is visible on this page
   - If the page hasn't loaded sizes yet, note it
   Return JSON: {package, minified_kb, gzipped_kb, tree_shakeable, side_effect_free}" \
  --sync > /tmp/bp_{PACKAGE_SAFE}.json &

# Known vulnerabilities
tinyfish agent run \
  --url "https://security.snyk.io/package/npm/{PACKAGE}" \
  "You are on the Snyk security page for the npm package {PACKAGE}.
   Extract:
   - total number of known vulnerabilities
   - number by severity: critical, high, medium, low
   - most recent vulnerability title and date (if shown)
   STRICT RULES:
   - Do NOT click any vulnerability links
   - Read only the summary visible on this page
   - If the page shows 'no vulnerabilities', return {total: 0}
   Return JSON: {package, total_vulns, critical, high, medium, low, latest_vuln_title, latest_vuln_date}" \
  --sync > /tmp/snyk_{PACKAGE_SAFE}.json &

# Repeat the above 4 agents for each additional package
# All backgrounded with & — fire everything at once then:
wait

# Collect all results
for p in {PACKAGE_LIST}; do
  echo "=== $p ===" 
  cat /tmp/npm_${p}.json
  cat /tmp/gh_${p}.json
  cat /tmp/bp_${p}.json
  cat /tmp/snyk_${p}.json
done
```

**Before running**, replace:
- `{PACKAGE}` — exact npm package name e.g. `zustand`
- `{PACKAGE_SAFE}` — safe filename version e.g. `zustand`
- `{OWNER}/{REPO}` — GitHub repo e.g. `pmndrs/zustand`
- `{PACKAGE_LIST}` — space-separated list of all packages

Use your knowledge to find the correct GitHub repo for well-known packages. For unknown packages, check the `repository` field on their npm page first.

---

## Step 3 — Synthesize comparison

Combine all data into a side-by-side comparison.

```
## Package Comparison: {PACKAGE_1} vs {PACKAGE_2} vs ...

*Data fetched live — {date}*

---

### 📊 At a Glance

| | {pkg1} | {pkg2} | {pkg3} |
|---|---|---|---|
| **Version** | {v} | {v} | {v} |
| **Weekly Downloads** | {n} | {n} | {n} |
| **GitHub Stars** | {n} | {n} | {n} |
| **Bundle (gzipped)** | {n}kb | {n}kb | {n}kb |
| **Tree-shakeable** | ✅/❌ | ✅/❌ | ✅/❌ |
| **TypeScript** | ✅/❌ | ✅/❌ | ✅/❌ |
| **Last Published** | {date} | {date} | {date} |
| **Known Vulns** | {n} | {n} | {n} |
| **License** | {l} | {l} | {l} |

---

### 📈 Popularity & Health

{2-3 sentences comparing download trends, GitHub activity, and community size}

---

### 📦 Bundle Size

{Comparison of bundle impact — important for frontend packages}
{Flag if any package is significantly larger than alternatives}

---

### 🔒 Security

{Note any packages with known vulnerabilities}
{If all clean: "No known vulnerabilities found for any of these packages."}

---

### ⚙️ Maintenance

{Compare last commit dates, contributor counts, release cadence}
{Flag any package that looks abandoned (no commits in 12+ months)}

---

### 🎯 Recommendation

{Use case}: {user's stated use case or "general use"}

**Best pick: {PACKAGE}**

{2-3 sentences explaining why this package wins for this use case, and what trade-offs you're making}

**When to pick {PACKAGE_2} instead:**
{1-2 sentences on when the runner-up is the better choice}

**Avoid {PACKAGE_3} if:**
{Any specific reasons to avoid a package in certain contexts}
```

---

## Edge Cases

- **Package not on npm** — check if it's a GitHub-only package and scrape the repo directly
- **Bundlephobia doesn't have it** — note "bundle size unavailable" and skip that row
- **GitHub repo not found from npm page** — search `https://github.com/search?q={PACKAGE}&type=repositories` to find the canonical repo
- **One of the packages is deprecated** — flag it clearly at the top of the comparison: "⚠️ {package} is deprecated — the maintainers recommend {replacement}"
- **Comparing more than 4 packages** — ask the user to narrow to their top 3, as more becomes hard to compare meaningfully
- **Packages serve slightly different purposes** — note the distinction upfront before comparing (e.g. "react-query handles server state, zustand handles client state — you may actually need both")
