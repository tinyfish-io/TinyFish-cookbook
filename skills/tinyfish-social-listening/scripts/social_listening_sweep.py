"""
Social Listening Sweep — single execute_code block template.

Usage: Copy this into one execute_code block. Replace {BRAND}, {BRAND_HANDLE},
{MONTH_YEAR}, and {YEAR} with actual values. Runs all searches, dedup,
relevance filter, date gating (X snowflake, LinkedIn prefix heuristic,
YouTube curl), and outputs the IN-window sources ready for the report.

This avoids the multi-block sprawl that kills latency.
"""

import json
import re
from datetime import datetime, timedelta
from hermes_tools import terminal

# === CONFIG (edit these) ===
BRAND = "tinyfish"
BRAND_QUOTED = '"tinyfish" OR "tinyfish.ai"'
BRAND_HANDLE = "Tiny_Fish"
MONTH_YEAR = "May 2026"
YEAR = "2026"
TODAY = datetime(2026, 5, 25)  # set to actual today
CUTOFF = TODAY - timedelta(days=7)

# Relevance filter: brand-name match ONLY (no quality/signal-word gating).
# Disambiguation belongs in search queries, not post-search filtering.
# If someone mentions the brand without saying "AI" or "agent", it's still valid.

# LinkedIn prefix heuristic calibration (update periodically):
# 74572 ≈ May 4 2026, 74601 ≈ May 13 2026, ~3.2 units/day
LI_RATE = 3.2
LI_CAL_PREFIX = 74601
LI_CAL_DATE = datetime(2026, 5, 13)

# === QUERIES ===
# --- X/Twitter queries: NO date strings (snowflake-decode dates after) ---
x_queries = [
    f'x.com/{BRAND_HANDLE}/status',
    f'site:x.com/{BRAND_HANDLE}/status',
    f'"@{BRAND_HANDLE}" site:x.com',
    f'@{BRAND_HANDLE} site:x.com',
    f'site:x.com {BRAND_QUOTED}',
    f'site:x.com "{BRAND}.ai"',
    f'"powered by" OR "built with" OR "using" {BRAND} site:x.com',
]

# --- All other platforms: date strings OK ---
other_queries = [
    f'{BRAND_QUOTED} AI agent web {MONTH_YEAR}',
    f'site:reddit.com {BRAND_QUOTED} AI {YEAR}',
    f'site:news.ycombinator.com {BRAND_QUOTED} {YEAR}',
    f'{BRAND_QUOTED} AI web agent news {MONTH_YEAR}',
    f'{BRAND_QUOTED} developer API feedback {MONTH_YEAR}',
    f'{BRAND_QUOTED} problems issues complaints {YEAR}',
    f'site:linkedin.com {BRAND_QUOTED} {MONTH_YEAR}',
    f'site:youtube.com {BRAND_QUOTED} {YEAR}',
    f'site:github.com {BRAND_QUOTED} {YEAR}',
]

queries = x_queries + other_queries

# === SEARCH ===
all_results = []
for i, q in enumerate(queries):
    escaped = q.replace('"', '\\"')
    r = terminal(f'tinyfish search query "{escaped}"', timeout=30)
    try:
        data = json.loads(r["output"])
        results = data if isinstance(data, list) else data.get("results", [])
        for item in results:
            item["_qi"] = i
        all_results.extend(results)
    except:
        pass

# === DEDUP ===
seen = set()
deduped = []
for r in all_results:
    url = r.get("url", "")
    if url and url not in seen:
        seen.add(url)
        deduped.append(r)

# === RELEVANCE FILTER (brand-name match only, NO quality gating) ===
def is_relevant(item):
    text = (item.get("title", "") + " " + item.get("snippet", "") + " " + item.get("url", "")).lower()
    # Only check: does it mention the brand at all?
    return BRAND in text or f"{BRAND}.ai" in text

relevant = [r for r in deduped if is_relevant(r)]

# === DATE GATING ===
def li_prefix_to_date(prefix_5):
    days_diff = (prefix_5 - LI_CAL_PREFIX) / LI_RATE
    return LI_CAL_DATE + timedelta(days=days_diff)

in_window = []
out_window = []
youtube_to_check = []

for item in relevant:
    url = item.get("url", "")
    snippet = item.get("snippet", "") + " " + item.get("title", "")

    # X/Twitter snowflake
    tweet_m = re.search(r'x\.com/\w+/status/(\d+)', url)
    if tweet_m:
        tid = int(tweet_m.group(1))
        dt = datetime.utcfromtimestamp(((tid >> 22) + 1288834974657) / 1000)
        item["_date"] = dt.isoformat()
        (in_window if dt >= CUTOFF else out_window).append(item)
        continue

    # X profile pages (no /status/) — undateable, discard
    if re.match(r'https?://x\.com/\w+/?$', url):
        out_window.append(item)
        continue

    # LinkedIn activity ID prefix heuristic
    li_m = re.search(r'activity-(\d+)', url)
    if li_m:
        prefix = int(str(li_m.group(1))[:5])
        est_date = li_prefix_to_date(prefix)
        item["_date"] = est_date.isoformat()
        (in_window if est_date >= CUTOFF else out_window).append(item)
        continue

    # YouTube — queue for curl-based date check
    if "youtube.com" in url:
        youtube_to_check.append(item)
        continue

    # URL path date /YYYY/MM/DD/
    url_d = re.search(r'/(\d{4})/(\d{2})/(\d{2})/', url)
    if url_d:
        try:
            dt = datetime(int(url_d.group(1)), int(url_d.group(2)), int(url_d.group(3)))
            item["_date"] = dt.isoformat()
            (in_window if dt >= CUTOFF else out_window).append(item)
            continue
        except:
            pass

    # Snippet date patterns
    for pat, fmt in [
        (r'(\w+ \d{1,2},?\s*\d{4})', '%B %d %Y'),
        (r'(\d{4}-\d{2}-\d{2})', '%Y-%m-%d'),
    ]:
        m = re.search(pat, snippet)
        if m:
            try:
                dt = datetime.strptime(m.group(1).replace(",", ""), fmt)
                item["_date"] = dt.isoformat()
                (in_window if dt >= CUTOFF else out_window).append(item)
                break
            except:
                continue
    else:
        # Reddit relative dates
        rd = re.search(r'(\d+)\s*(d|day|days)\s*ago', snippet, re.I)
        if rd:
            dt = TODAY - timedelta(days=int(rd.group(1)))
            item["_date"] = dt.isoformat()
            (in_window if dt >= CUTOFF else out_window).append(item)
        else:
            out_window.append(item)  # no date = OUT

# === YOUTUBE DATE CHECK (curl, no grep -P on macOS) ===
for item in youtube_to_check:
    url = item.get("url", "")
    r = terminal(f'curl -s "{url}" | grep -o \'"publishDate":"[^"]*"\' | head -1', timeout=15)
    pd_m = re.search(r'"publishDate":"(\d{4}-\d{2}-\d{2})', r["output"])
    if pd_m:
        dt = datetime.strptime(pd_m.group(1), "%Y-%m-%d")
        item["_date"] = dt.isoformat()
        (in_window if dt >= CUTOFF else out_window).append(item)
    else:
        out_window.append(item)

# === SUMMARY ===
print(f"📅 7-day filter: {len(in_window)} of {len(relevant)} sources passed.")
print(f"   (deduped: {len(deduped)}, relevant: {len(relevant)}, out: {len(out_window)})\n")

for item in in_window:
    print(f"  ✓ [{item.get('_date', '?')[:10]}] {item.get('title', 'N/A')[:80]}")
    print(f"    URL: {item.get('url', '')}")
    print(f"    Snippet: {item.get('snippet', '')[:150]}")
    print()
