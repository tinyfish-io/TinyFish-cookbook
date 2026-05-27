"""
agents.py — GitPaid 3-tier TinyFish agent orchestration
Uses the official TinyFish Python SDK: pip install tinyfish
"""
from __future__ import annotations

import asyncio
import json
import re
import time
from typing import Any

from tinyfish import AsyncTinyFish, CompleteEvent, EventType, RunStatus, StreamingUrlEvent

from models import (
    Opportunity,
    SourceMeta,
    AgentStartedEvent,
    AgentCompleteEvent,
    AgentErrorEvent,
    Tier2StatusEvent,
    Tier2RepoDoneEvent,
)

# ── Awesome-list registry ──────────────────────────────────────────────────────
AWESOME_LISTS: dict[str, str] = {
    "Rust":       "https://github.com/rust-unofficial/awesome-rust",
    "Go":         "https://github.com/avelino/awesome-go",
    "Python":     "https://github.com/vinta/awesome-python",
    "TypeScript": "https://github.com/dzharii/awesome-typescript",
    "JavaScript": "https://github.com/sorrycc/awesome-javascript",
    "C++":        "https://github.com/fffaraz/awesome-cpp",
    "Java":       "https://github.com/akullpp/awesome-java",
    "Zig":        "https://github.com/catdevnull/awesome-zig",
    "Elixir":     "https://github.com/h4cc/awesome-elixir",
    "Swift":      "https://github.com/matteocrippa/awesome-swift",
    "Ruby":       "https://github.com/markets/awesome-ruby",
    "Haskell":    "https://github.com/krispo/awesome-haskell",
}

# ── Tier 3 grant sources ───────────────────────────────────────────────────────
GRANT_SOURCES = [
    SourceMeta(id="nlnet",     label="NLNet / NGI Zero",      tier=3, url="https://nlnet.nl/thema/"),
    SourceMeta(id="stf",       label="Sovereign Tech Fund",   tier=3, url="https://www.sovereigntechfund.de/programs"),
    SourceMeta(id="moss",      label="Mozilla MOSS",          tier=3, url="https://www.mozilla.org/en-US/moss/"),
    SourceMeta(id="lfx",       label="LFX Mentorship",        tier=3, url="https://lfx.linuxfoundation.org/tools/mentorship/"),
    SourceMeta(id="gsoc",      label="Google Summer of Code", tier=3, url="https://summerofcode.withgoogle.com/"),
    SourceMeta(id="outreachy", label="Outreachy",             tier=3, url="https://www.outreachy.org/apply/"),
]

# ── Core TinyFish SDK call ─────────────────────────────────────────────────────

async def run_tinyfish_agent(
    url: str,
    goal: str,
    source_id: str | None = None,
    queue: asyncio.Queue | None = None,
) -> Any:
    """
    Call TinyFish using the official Python SDK (AsyncTinyFish).
    Reads TINYFISH_API_KEY automatically from the environment.

    If source_id and queue are provided, streaming_url events are forwarded
    to the queue so the frontend can show a live browser preview iframe.

    Returns result_json on COMPLETE, raises on failure.
    """
    print(f"[TinyFish] -> {url[:80]}")

    # AsyncTinyFish() reads TINYFISH_API_KEY from env automatically
    async with AsyncTinyFish() as client:
        async with client.agent.stream(url=url, goal=goal) as stream:
            async for event in stream:

                # ── Live preview: forward streaming URL to frontend ──────────
                if isinstance(event, StreamingUrlEvent) and source_id and queue:
                    print(f"[TinyFish] streaming_url for {source_id}: {event.streaming_url}")
                    await queue.put({
                        "type": "streaming_url",
                        "source_id": source_id,
                        "url": event.streaming_url,
                    })

                elif isinstance(event, CompleteEvent):
                    if event.status == RunStatus.COMPLETED:
                        print(f"[TinyFish] COMPLETE {url[:60]} | result type={type(event.result_json).__name__} | preview={str(event.result_json)[:200]}")
                        return event.result_json
                    else:
                        raise RuntimeError(f"Run ended with status: {event.status}")

    return None


# ── Amount normaliser ──────────────────────────────────────────────────────────

def _normalise_amount(val: Any) -> float | None:
    if val is None:
        return None
    try:
        cleaned = re.sub(r"[^\d.]", "", str(val).replace(",", "").split()[0])
        return float(cleaned) if cleaned else None
    except (ValueError, TypeError):
        return None


# ── Opportunity parser ─────────────────────────────────────────────────────────

ENVELOPE_KEYS = [
    "opportunities", "bounties", "grants", "issues", "items",
    "results", "result",
    "repos", "data", "listings", "programs",
    "bounty_listings", "open_bounty_listings",
    "open_bounties", "open_issues", "projects",
]


def parse_opportunities(
    raw: Any,
    source_id: str,
    source_label: str,
    tier: int,
    opp_type: str = "bounty",
) -> list[Opportunity]:
    """Normalise raw TinyFish result_json into typed Opportunity objects."""
    if raw is None:
        print(f"[Parser] {source_id}: raw is None")
        return []

    print(f"[Parser] {source_id}: type={type(raw).__name__} | preview={str(raw)[:200]}")

    # Unwrap string-encoded JSON
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return []

    # Unwrap dict envelope
    if isinstance(raw, dict):
        for key in ENVELOPE_KEYS:
            if key in raw and isinstance(raw[key], list):
                print(f"[Parser] {source_id}: unwrapped key='{key}' -> {len(raw[key])} items")
                raw = raw[key]
                break
        else:
            print(f"[Parser] {source_id}: dict keys={list(raw.keys())}, wrapping as single item")
            raw = [raw]

    if not isinstance(raw, list):
        return []

    print(f"[Parser] {source_id}: parsing {len(raw)} items")
    opps: list[Opportunity] = []
    ts = int(time.time() * 1000)

    for i, item in enumerate(raw):
        if not isinstance(item, dict):
            continue

        title = (
            item.get("title") or item.get("name") or item.get("bounty_title") or
            item.get("issue_title") or item.get("program") or item.get("heading") or
            item.get("project_title") or ""
        )
        if not title:
            print(f"[Parser] {source_id}[{i}]: no title — keys: {list(item.keys())[:10]}")
            continue

        url = (
            item.get("url") or item.get("link") or item.get("href") or
            item.get("issue_url") or item.get("bounty_url") or item.get("apply_url") or ""
        )
        amount = _normalise_amount(
            item.get("bountyAmount") or item.get("bounty_amount") or
            item.get("amount") or item.get("reward") or item.get("prize") or
            item.get("maxFunding") or item.get("max_funding") or
            item.get("funding") or item.get("stipend") or item.get("value") or
            item.get("total_amount")
        )
        currency = item.get("currency") or ("USD" if amount else None)

        skills_raw = (
            item.get("skills") or item.get("tags") or item.get("languages") or
            item.get("tech_stack") or item.get("technologies") or []
        )
        if isinstance(skills_raw, str):
            skills_raw = [s.strip() for s in skills_raw.split(",") if s.strip()]
        skills = [str(s) for s in skills_raw if s]

        labels_raw = item.get("labels") or item.get("label") or []
        if isinstance(labels_raw, str):
            labels_raw = [labels_raw]
        labels = [str(l) for l in labels_raw if l]

        repo = (
            item.get("repo") or item.get("repository") or
            item.get("github_repo") or item.get("project") or None
        )
        determined_type = "grant" if (tier == 3 or "grant" in " ".join(labels).lower()) else opp_type

        print(f"[Parser] {source_id}[{i}]: '{title[:50]}' amount={amount} url={str(url)[:50]}")
        opps.append(Opportunity(
            id=f"{source_id}-{i}-{ts}",
            type=determined_type,
            tier=tier,
            source=source_id,
            source_label=source_label,
            title=str(title),
            repo=repo,
            url=str(url),
            bounty_amount=amount,
            currency=currency,
            skills=skills,
            difficulty=item.get("difficulty"),
            deadline=item.get("deadline"),
            description=item.get("description"),
            labels=labels,
        ))

    print(f"[Parser] {source_id}: produced {len(opps)} opportunities")
    return opps


# ── Tier 1 sources & prompts ───────────────────────────────────────────────────

def build_tier1_sources(stack: str, keywords: str) -> list[SourceMeta]:
    kw = f" {keywords}" if keywords else ""
    return [
        SourceMeta(id="algora",       label="Algora",       tier=1, url=f"https://algora.io/bounties?lang={stack.lower()}{kw}"),
        SourceMeta(id="issuehunt",    label="IssueHunt",    tier=1, url=f"https://issuehunt.io/repos?language={stack.lower()}"),
        SourceMeta(id="gitcoin",      label="Gitcoin",      tier=1, url=f"https://gitcoin.co/explorer?keywords={stack.lower()}{kw.replace(' ', '+')}"),
        SourceMeta(id="bountysource", label="Bountysource", tier=1, url=f"https://www.bountysource.com/trackers?language={stack.lower()}"),
    ]


def build_tier1_prompts(stack: str, keywords: str) -> dict[str, str]:
    """Generate prompts with stack/keyword filters baked in."""
    kw_clause = f" or mention '{keywords}'" if keywords else ""
    filter_clause = (
        f"IMPORTANT: Only include bounties relevant to {stack}{kw_clause}. "
        f"Skip any bounty that is clearly for a different language or stack "
        f"(e.g. if searching for Python, skip Scala/Java/Rust/Go bounties). "
    )
    return {
        "algora": (
            f"This is Algora.io, a paid OSS bounty platform filtered for {stack}. "
            f"Extract open bounty listings. {filter_clause}"
            "Return a JSON array where each item has: "
            "title, repo (owner/repo), url, bountyAmount (number only), "
            "currency (USD), skills (array), difficulty (null), labels ([])."
        ),
        "issuehunt": (
            f"This is IssueHunt, a paid OSS bounty platform filtered for {stack}. "
            f"Extract open bounty listings. {filter_clause}"
            "Return a JSON array where each item has: "
            "title, repo (owner/repo), url (GitHub issue URL), "
            "bountyAmount (number), currency (USD), skills (array), difficulty (null), labels ([])."
        ),
        "gitcoin": (
            f"This is Gitcoin, a bounty platform filtered for {stack}. "
            f"Extract open bounties. {filter_clause}"
            "Return a JSON array where each item has: "
            "title, repo, url, bountyAmount (number), currency, skills (array), difficulty (null), labels ([])."
        ),
        "bountysource": (
            f"This is Bountysource, an OSS bounty platform filtered for {stack}. "
            f"Extract open bounties. {filter_clause}"
            "Return a JSON array where each item has: "
            "title, repo (owner/repo), url, bountyAmount (number), "
            "currency (USD), skills ([]), difficulty (null), labels ([])."
        ),
    }

TIER2A_PROMPT = (
    "This is a GitHub awesome list page (curated list of quality repos). "
    "Extract GitHub repository URLs from the README. "
    "Return JSON: {\"repos\": [\"https://github.com/owner/repo\", ...]} "
    "Rules: only owner/repo paths (2 segments), skip wikis/gists/topics, "
    "skip the awesome list repo itself, return first 25 unique repos."
)

TIER2B_PROMPT = (
    "This is a GitHub issues page showing open issues related to bounties or paid work. "
    "Extract ALL visible issues that mention bounty, reward, paid, or prize in title or labels. "
    "Return a JSON array where each item has: "
    "title, repo (owner/repo), url (full GitHub issue URL), labels (array), "
    "bountyAmount (dollar/euro amount as plain number or null), currency (USD/EUR or null), "
    "skills (languages/tech mentioned), difficulty (beginner/intermediate/advanced). "
    "Return [] if the page is empty."
)


def _extract_repo_urls(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, dict):
        raw = raw.get("repos") or raw.get("results") or []
    if not isinstance(raw, list):
        return []
    pattern = re.compile(r"https?://github\.com/([^/\s\"']+)/([^/\s\"'#?]+)")
    seen: set[str] = set()
    out: list[str] = []
    for item in raw:
        text = item if isinstance(item, str) else str(item)
        for m in pattern.finditer(text):
            url = m.group(0).rstrip("/.")
            if url not in seen:
                seen.add(url)
                out.append(url)
    return out[:25]


# ── Relevance filter ──────────────────────────────────────────────────────────

# Map of stacks to languages/terms that are clearly NOT that stack
UNRELATED_STACKS: dict[str, list[str]] = {
    "Python":     ["scala", "java", "rust", "golang", "swift", "kotlin", "clojure", "haskell", "erlang", "zio", "dotnet", "c#"],
    "Rust":       ["python", "scala", "java", "swift", "kotlin", "ruby", "golang", "clojure", "zio"],
    "Go":         ["python", "scala", "java", "swift", "kotlin", "rust", "ruby", "zio", "dotnet"],
    "TypeScript": ["python", "scala", "java", "rust", "swift", "kotlin", "ruby", "golang", "zio"],
    "JavaScript": ["python", "scala", "java", "rust", "swift", "kotlin", "ruby", "golang", "zio"],
    "Java":       ["python", "rust", "swift", "golang", "ruby", "typescript", "javascript"],
    "Swift":      ["python", "rust", "golang", "java", "kotlin", "ruby", "scala"],
}

def _filter_by_relevance(opps: list[Opportunity], stack: str, keywords: str) -> list[Opportunity]:
    """
    Remove opportunities that are clearly for a different stack.
    Grants (tier 3) are always kept since they are language-agnostic.
    """
    unrelated = [t.lower() for t in UNRELATED_STACKS.get(stack, [])]
    if not unrelated:
        return opps

    stack_lower = stack.lower()
    kw_lower = keywords.lower() if keywords else ""
    kept = []

    for opp in opps:
        if opp.tier == 3:          # grants are always relevant
            kept.append(opp)
            continue

        # Build a searchable text blob from the opportunity
        blob = " ".join([
            opp.title or "",
            opp.repo or "",
            " ".join(opp.skills),
            " ".join(opp.labels),
            opp.description or "",
        ]).lower()

        # If the blob explicitly mentions an unrelated stack, skip it
        if any(u in blob for u in unrelated):
            print(f"[Filter] Dropping '{opp.title[:50]}' — unrelated to {stack}")
            continue

        kept.append(opp)

    print(f"[Filter] {len(kept)}/{len(opps)} opportunities kept for stack={stack}")
    return kept


# ── Agent runners ──────────────────────────────────────────────────────────────

async def _run_tier1_agent(source: SourceMeta, queue: asyncio.Queue, stack: str, keywords: str) -> None:
    await queue.put(AgentStartedEvent(source_id=source.id))
    try:
        prompts = build_tier1_prompts(stack, keywords)
        prompt = prompts.get(source.id, prompts["algora"])
        # Pass source_id + queue so streaming_url events reach the frontend
        raw = await run_tinyfish_agent(source.url, prompt, source_id=source.id, queue=queue)
        opps = parse_opportunities(raw, source.id, source.label, tier=1)
        # Post-filter: remove results that don't match the stack at all
        opps = _filter_by_relevance(opps, stack, keywords)
        await queue.put(AgentCompleteEvent(source_id=source.id, count=len(opps), opportunities=opps))
    except Exception as exc:
        print(f"[Agent] {source.id} ERROR: {exc}")
        await queue.put(AgentErrorEvent(source_id=source.id, error=str(exc)))


async def _run_tier3_agent(source: SourceMeta, queue: asyncio.Queue) -> None:
    prompt = (
        f"This is the {source.label} grants page listing open funding programs. "
        "Extract all currently open programs. Return a JSON array where each item has: "
        "title, url (absolute URL), bountyAmount (max grant as number), "
        "currency (EUR or USD), skills (tech areas array), deadline, "
        "description (one sentence), labels ([\"grant\"])."
    )
    await queue.put(AgentStartedEvent(source_id=source.id))
    try:
        # Pass source_id + queue so streaming_url events reach the frontend
        raw = await run_tinyfish_agent(source.url, prompt, source_id=source.id, queue=queue)
        opps = parse_opportunities(raw, source.id, source.label, tier=3, opp_type="grant")
        await queue.put(AgentCompleteEvent(source_id=source.id, count=len(opps), opportunities=opps))
    except Exception as exc:
        print(f"[Agent] {source.id} ERROR: {exc}")
        await queue.put(AgentErrorEvent(source_id=source.id, error=str(exc)))


async def _run_tier2(stack: str, queue: asyncio.Queue) -> None:
    awesome_url = AWESOME_LISTS.get(stack)
    if not awesome_url:
        await queue.put(Tier2StatusEvent(phase="skipped"))
        return

    await queue.put(Tier2StatusEvent(phase="discovering", lang=stack, url=awesome_url))
    try:
        raw = await run_tinyfish_agent(awesome_url, TIER2A_PROMPT)
        repo_urls = _extract_repo_urls(raw)
        print(f"[Tier2] Discovered {len(repo_urls)} repos")
    except Exception as exc:
        print(f"[Tier2] Discovery error: {exc}")
        await queue.put(Tier2StatusEvent(phase="error", error=str(exc)))
        return

    if not repo_urls:
        await queue.put(Tier2StatusEvent(phase="done", total=0))
        return

    repo_urls = repo_urls[:20]
    total = len(repo_urls)
    await queue.put(Tier2StatusEvent(phase="scanning", total=total))

    # Pre-register all T2 repo sources so Live View can show tiles immediately
    for ru in repo_urls:
        owner_repo = "/".join(ru.rstrip("/").split("/")[-2:])
        sid = f"tier2-{owner_repo.replace('/', '-')}"
        await queue.put({
            "type": "repo_source_registered",
            "source_id": sid,
            "label": owner_repo,
            "tier": 2,
        })

    scanned_count = 0
    lock = asyncio.Lock()

    async def _check_repo(repo_url: str) -> None:
        nonlocal scanned_count
        owner_repo = "/".join(repo_url.rstrip("/").split("/")[-2:])
        source_id  = f"tier2-{owner_repo.replace('/', '-')}"
        issues_url = (
            f"{repo_url}/issues?q=is%3Aopen+"
            "label%3Abounty+OR+bounty+in%3Atitle+OR+reward+in%3Atitle+OR+paid+in%3Atitle"
        )
        # Notify frontend this repo agent has started (enables Live View tile)
        await queue.put(AgentStartedEvent(source_id=source_id))
        try:
            # Pass source_id + queue so streaming_url events reach the frontend
            raw2 = await run_tinyfish_agent(
                issues_url, TIER2B_PROMPT,
                source_id=source_id, queue=queue,
            )
            opps = parse_opportunities(raw2, source_id, owner_repo, tier=2)
        except Exception as exc:
            print(f"[Tier2] {owner_repo} error: {exc}")
            opps = []
        async with lock:
            scanned_count += 1
            sc = scanned_count
        await queue.put(Tier2RepoDoneEvent(
            repo=owner_repo, count=len(opps),
            scanned=sc, total=total, opportunities=opps,
        ))

    await asyncio.gather(*[_check_repo(u) for u in repo_urls])
    await queue.put(Tier2StatusEvent(phase="done", total=total))


# ── Main orchestrator ──────────────────────────────────────────────────────────

async def run_search(stack: str, keywords: str, min_amount: float):
    """Async generator that yields SSE-ready dicts as agents complete."""
    tier1_sources = build_tier1_sources(stack, keywords)
    all_sources = tier1_sources + list(GRANT_SOURCES)

    yield {"type": "sources", "sources": [s.model_dump() for s in all_sources]}

    queue: asyncio.Queue = asyncio.Queue()
    _SENTINEL = object()

    async def _run_all():
        tasks = (
            [_run_tier1_agent(s, queue, stack, keywords) for s in tier1_sources] +
            [_run_tier2(stack, queue)] +
            [_run_tier3_agent(s, queue) for s in GRANT_SOURCES]
        )
        await asyncio.gather(*tasks, return_exceptions=True)
        await queue.put(_SENTINEL)

    runner = asyncio.create_task(_run_all())

    while True:
        item = await queue.get()
        if item is _SENTINEL:
            break
        payload = item.model_dump() if hasattr(item, "model_dump") else item
        if "opportunities" in payload and min_amount > 0:
            payload["opportunities"] = [
                o for o in payload["opportunities"]
                if (o.get("bounty_amount") or 0) >= min_amount
            ]
            payload["count"] = len(payload["opportunities"])
        yield payload

    await runner
    yield {"type": "done"}
