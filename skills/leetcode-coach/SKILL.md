---
name: leetcode-coach
description: Find and set up coding practice problems tailored to your weak areas, then create local files so you can solve them right away. Use this skill when a user wants to practice coding, asks for a LeetCode problem, says "give me a coding challenge", "I want to practice DSA", "help me prep for coding interviews", "find me a problem to solve", "I'm weak at dynamic programming", "quiz me on algorithms", or any request to practice coding with a specific language or topic focus.
---

# LeetCode Coach

Find coding problems matched to your weak areas from LeetCode, HackerRank, and Codeforces — then set up local files so you can start solving immediately.

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

Ask for the following if not already provided:

**Required:**
- **Preferred language** — e.g. Python, JavaScript, Java, C++, Go, Rust

**Optional (but improves results):**
- **Weak areas / topics to focus on** — e.g. "dynamic programming", "graphs", "sliding window", "binary search", "recursion", "trees"
- **Difficulty** — Easy / Medium / Hard (default: Medium)

If the user isn't sure of their weak areas, ask:
> "What topics do you find yourself getting stuck on, or want to get better at?"

If they still aren't sure, default to: Arrays, Strings, and Hash Maps (the most commonly tested fundamentals).

---

## Step 2 — Find matching problems

Fire parallel TinyFish agents across LeetCode, HackerRank, and Codeforces to find real problems matching the topic and difficulty.

```bash
# Agent 1 — LeetCode problem search
tinyfish agent run \
  --url "https://leetcode.com/problemset/?difficulty={DIFFICULTY}&topicSlugs={TOPIC_SLUG}" \
  "You are on the LeetCode problem set page filtered by difficulty and topic.
   Find 3 problems that match the topic: {TOPIC}.
   For each problem extract:
   - title
   - difficulty (Easy/Medium/Hard)
   - acceptance rate
   - topic tags
   - direct URL to the problem (e.g. https://leetcode.com/problems/two-sum/)
   STRICT RULES:
   - Do NOT click any problem to open it
   - Read only the problem listing visible on this page
   - Return exactly 3 problems, no more
   - Skip premium-only problems (marked with a lock icon)
   Return JSON array: [{title, difficulty, acceptance_rate, tags, url}]" \
  --sync > /tmp/lc_leetcode.json &

# Agent 2 — HackerRank problem search
tinyfish agent run \
  --url "https://www.hackerrank.com/domains/algorithms?filters%5Bsubdomains%5D%5B%5D={TOPIC_SLUG}" \
  "You are on HackerRank's algorithms problem listing filtered by topic.
   Find 2 problems that match the topic: {TOPIC} at {DIFFICULTY} level.
   For each problem extract:
   - title
   - difficulty
   - score/points
   - topic tags
   - direct URL to the problem
   STRICT RULES:
   - Do NOT click any problem
   - Read only the visible listing
   - Return up to 2 problems
   - Skip problems requiring premium or contests
   Return JSON array: [{title, difficulty, score, tags, url}]" \
  --sync > /tmp/lc_hackerrank.json &

# Agent 3 — Codeforces problem search
tinyfish agent run \
  --url "https://codeforces.com/problemset?tags={TOPIC_SLUG}" \
  "You are on Codeforces problem set filtered by tag.
   Find 2 problems matching the topic: {TOPIC} at approximately {DIFFICULTY} level
   (Easy ≈ rating 800-1200, Medium ≈ 1300-1800, Hard ≈ 1900+).
   For each problem extract:
   - problem ID (e.g. 1A, 158B)
   - title
   - rating
   - tags
   - direct URL (e.g. https://codeforces.com/problemset/problem/1/A)
   STRICT RULES:
   - Do NOT click any problem
   - Read only the visible listing
   - Return up to 2 problems
   Return JSON array: [{id, title, rating, tags, url}]" \
  --sync > /tmp/lc_codeforces.json &

wait

echo "=== LEETCODE ===" && cat /tmp/lc_leetcode.json
echo "=== HACKERRANK ===" && cat /tmp/lc_hackerrank.json
echo "=== CODEFORCES ===" && cat /tmp/lc_codeforces.json
```

**Before running**, replace:
- `{DIFFICULTY}` — Easy / Medium / Hard
- `{TOPIC}` — human-readable topic e.g. `dynamic programming`
- `{TOPIC_SLUG}` — URL-friendly e.g. `dynamic-programming`

---

## Step 3 — Present problem options

From the results, pick the **3 best problems** across all sources. Prefer:
1. LeetCode problems (widest community support, best editorial availability)
2. Problems with clear descriptions visible from the listing
3. Problems with acceptance rates between 30-60% for Medium difficulty

Present them like this:

```
Here are 3 problems matched to your focus on **{TOPIC}** in **{LANGUAGE}**:

**Option 1 — {Title}** ({difficulty}) · {source}
Tags: {tags}
Acceptance: {rate}
🔗 {url}

**Option 2 — {Title}** ({difficulty}) · {source}
Tags: {tags}
🔗 {url}

**Option 3 — {Title}** ({difficulty}) · {source}
Tags: {tags}
🔗 {url}

Which one do you want to tackle? (1, 2, or 3)
```

Wait for the user to choose a problem before proceeding.

---

## Step 3b — Ask how they want to solve it

Once the user picks a problem, ask:

```
How do you want to solve it?

1. **On the website** — I'll give you the direct link and you solve it in the browser
2. **Locally** — I'll fetch the full problem and set up files on your machine so you can code in your editor

(1 or 2)
```

**If they choose option 1 (website):**
Give them the direct link to the problem and wish them luck:
```
Here you go: {problem_url}

Good luck! Come back and paste your solution when you're done — I'll review it.
```
Stop here. Do not create any files.

**If they choose option 2 (locally):**
Continue to Step 4.

---

## Step 4 — Fetch the full problem

Once the user picks, fetch the full problem description using TinyFish.

```bash
tinyfish agent run \
  --url "{CHOSEN_PROBLEM_URL}" \
  "You are on a coding problem page. Extract the complete problem details.
   Extract:
   - title
   - difficulty
   - full problem description (exactly as written — do not paraphrase)
   - constraints (exact list)
   - all example inputs and outputs with explanations
   - topic tags
   - any follow-up questions mentioned
   STRICT RULES:
   - Do NOT click any links
   - Extract the complete description verbatim — do not shorten it
   - If examples have visual diagrams described in text, include them
   Return JSON: {title, difficulty, description, constraints: [], examples: [{input, output, explanation}], tags: [], followup}" \
  --sync
```

---

## Step 5 — Create local files

Once you have the full problem, create these three files in the current working directory:

### `problem.md`

```markdown
# {Problem Title}

**Source:** {url}
**Difficulty:** {difficulty}
**Tags:** {tags}
**Language:** {language}

---

## Problem

{full problem description}

## Constraints

{constraints as bullet list}

## Examples

### Example 1
**Input:** {input}
**Output:** {output}
**Explanation:** {explanation}

### Example 2
...

---

## Notes
<!-- Add your approach notes here before coding -->
```

### `solution.{ext}`

Create a starter file with the correct extension for the chosen language and a function signature scaffold. Use the appropriate extension:

| Language | Extension | Starter |
|----------|-----------|---------|
| Python | `.py` | `def solution():` with docstring |
| JavaScript | `.js` | `function solution() {}` with JSDoc |
| TypeScript | `.ts` | typed function signature |
| Java | `.java` | class + method scaffold |
| C++ | `.cpp` | `#include` + function |
| Go | `.go` | package + func |
| Rust | `.rs` | `fn solution()` |

Include a comment at the top:
```
// Problem: {title}
// Source: {url}
// Difficulty: {difficulty}
// Your approach: (fill this in before coding)
```

Infer the function signature from the problem description if possible (e.g. if the problem says "given an array of integers, return..."). If unclear, use a generic starter.

### `test_cases.md`

```markdown
# Test Cases — {Problem Title}

## From the problem

| # | Input | Expected Output |
|---|-------|----------------|
| 1 | {input} | {output} |
| 2 | {input} | {output} |

## Edge cases to consider
<!-- Think about: empty input, single element, negative numbers, duplicates, max constraints -->
- [ ] Empty input
- [ ] Single element
- [ ] Already sorted / already valid
- [ ] Maximum constraint size
```

---

## Step 6 — Brief the user

Once the files are created, tell the user:

```
Files created:
- problem.md     ← full problem description
- solution.{ext} ← starter template in {language}
- test_cases.md  ← sample test cases + edge case checklist

Take your time and solve it. When you're done, paste your solution here and I'll review it — checking for correctness, edge cases, time complexity, and style.

Good luck!
```

---

## Edge Cases

- **LeetCode returns no results for topic** — fall back to searching `https://leetcode.com/problemset/?search={TOPIC}` without the filter
- **Problem URL is premium-only** — skip it and pick the next best option from the results
- **User doesn't know their weak areas** — default to Arrays + Hash Maps (Medium), which covers the widest range of interview fundamentals
- **User wants a specific problem by name** — skip Steps 2-3, go straight to fetching and creating files for that problem
- **Codeforces returns nothing** — skip it silently, present options from LeetCode and HackerRank only
- **User is a complete beginner** — suggest Easy difficulty and start with Two Sum (LeetCode #1) as a warm-up before moving to their topic of interest
