---
name: enrich-excel
description: Enrich a live Excel spreadsheet by researching missing data with TinyFish and writing results directly into the running Excel app via AppleScript. Use when a user says "fill in my spreadsheet", "enrich this Excel file", "research and fill missing data", "update my Excel sheet", "look up data for each row", or any request to populate empty cells in an open Excel workbook with web-sourced data. macOS only.
---

# Enrich Excel with TinyFish

Research missing data with TinyFish and write it directly into a live Excel workbook on macOS — cell by cell, in real time, via AppleScript. No file saves or reloads needed.

## Pre-flight Check (REQUIRED)

Run ALL three checks before doing anything else:

```bash
# 1. TinyFish CLI installed?
which tinyfish && tinyfish --version || echo "TINYFISH_CLI_NOT_INSTALLED"

# 2. Authenticated?
tinyfish auth status

# 3. Excel running with a workbook?
osascript -e 'tell application "Microsoft Excel" to get name of active workbook'
```

If any check fails, stop and tell the user what to fix. Do NOT proceed.

---

## Step 1 — Read the active workbook

Write a temporary AppleScript file and execute it. Do NOT use inline heredoc with osascript — it breaks in many shell environments. Always write to a temp file first.

```bash
cat > /tmp/tf_read_excel.scpt << 'APPLESCRIPT'
tell application "Microsoft Excel"
    set ws to active sheet of active workbook
    set output to ""
    repeat with r from 1 to 50
        set rv to ""
        set hasValue to false
        repeat with c from 1 to 15
            set cv to (value of cell r of column c of ws) as text
            if cv is not "missing value" and cv is not "" then
                set hasValue to true
                set rv to rv & c & ":" & cv & "|"
            else
                set rv to rv & c & ":|"
            end if
        end repeat
        if hasValue then set output to output & r & ">" & rv & linefeed
    end repeat
    return output
end tell
APPLESCRIPT
osascript /tmp/tf_read_excel.scpt
```

Parse the output format: `row_number>col_num:value|col_num:value|...`

If the sheet has more than 50 rows or 15 columns, increase the limits and re-run.

---

## Step 2 — Identify what needs enrichment

From the parsed output:

1. **Find the header row** — the first row where multiple cells have non-empty values. These are your column labels.
2. **Map columns** — associate each column number with its header text (e.g., column 2 = "Company", column 3 = "Revenue").
3. **Find data rows** — rows after the header with at least one non-empty cell.
4. **Find empty cells** — in each data row, identify which columns are blank. These are what we need to fill.
5. **Respect user instructions** — if the user specified which columns to fill or what to research, narrow the scope accordingly.

Tell the user what you found:
> Found 5 data rows. Headers: Company, Revenue, HQ, CEO. Missing data in: Revenue (3 rows), CEO (4 rows). Researching now...

---

## Step 3 — Research with TinyFish

CRITICAL: Use `tinyfish search` — it is fast (1-2s) and cheap. Do NOT use `tinyfish agent` or `tinyfish browser` — they are 10-60x slower and completely unnecessary for data lookups.

**For each row with missing data**, build a search query from the existing cell values + the column headers you need to fill:

```bash
tinyfish search query "Yann LeCun h-index latest paper company affiliation 2025"
```

The output is JSON: `{"results": [{"snippet": "...", "title": "...", "url": "..."}]}`. Extract the data points you need from the snippets.

**If snippets aren't detailed enough** for a specific value, fetch the full page content (still fast):

```bash
tinyfish fetch content get "https://some-result-url.com"
```

**Research all rows before writing.** Collect all the data first, then write it all in Step 4. This avoids interleaving slow network calls with fast AppleScript writes.

**Batch smartly:** If multiple rows need similar info (e.g. all are researchers, all are companies), you can sometimes combine queries:
```bash
tinyfish search query "Jeff Dean h-index Google Scholar 2025"
tinyfish search query "Demis Hassabis h-index latest paper 2025"
```

Run searches in parallel when possible (multiple Bash tool calls in one message).

---

## Step 4 — Write back live via AppleScript

After collecting ALL research results, write them into Excel using a Python script. This gives the user a live animation of cells filling in:

```python
import subprocess, time

def set_cell(cell, value):
    escaped = str(value).replace('\\', '\\\\').replace('"', '\\"')
    subprocess.run(["osascript", "-e",
        f'tell application "Microsoft Excel" to set value of cell "{cell}" of active sheet of active workbook to "{escaped}"'
    ], capture_output=True)

# Write all collected data row by row
rows = [
    # (cell_ref, value)
    ("C3", "LeJEPA: Provable and Scalable Self-Supervised Learning (2025)"),
    ("D3", "171"),
    ("E3", "Meta / Advanced Machine Intelligence Labs"),
    ("C4", "Gemini 2.5 (2025)"),
    ("D4", "134"),
    ("E4", "Google DeepMind (Chief Scientist)"),
]

for cell, value in rows:
    set_cell(cell, value)
    time.sleep(0.3)

print("Done")
```

**Column mapping:** 1=A, 2=B, 3=C, ..., 26=Z, 27=AA.

Go row by row with 0.2–0.4s delays between cells so the user sees the animation.

---

## Step 5 — Verify

Read back the updated cells to confirm everything landed:

```bash
cat > /tmp/tf_verify_excel.scpt << 'APPLESCRIPT'
tell application "Microsoft Excel"
    set ws to active sheet of active workbook
    set output to ""
    repeat with r from FIRST_ROW to LAST_ROW
        set rv to ""
        repeat with c from FIRST_COL to LAST_COL
            set cv to (value of cell r of column c of ws) as text
            set rv to rv & c & ":" & cv & "|"
        end repeat
        set output to output & r & ">" & rv & linefeed
    end repeat
    return output
end tell
APPLESCRIPT
osascript /tmp/tf_verify_excel.scpt
```

Show the user a summary:
> Done! Filled 12 cells across 4 rows. All values verified in the live workbook.

---

## Important Rules

- **Always read first** — never assume what's in the sheet.
- **Never overwrite** — only fill empty cells unless the user explicitly asks to overwrite.
- **Use `tinyfish search`, NOT `tinyfish agent`** — search is fast and cheap. Agent is for interactive browser automation and is massive overkill for data lookups. Only escalate to agent if search + fetch genuinely cannot get the data (e.g., behind a login wall).
- **Research first, write second** — collect all data before writing to Excel. Don't interleave slow network calls with AppleScript writes.
- **Write AppleScript to temp files** — do NOT use inline heredoc `osascript << 'EOF'`. It breaks. Always write to `/tmp/*.scpt` and run `osascript /tmp/file.scpt`.
- **Handle "missing value"** — Excel returns the string "missing value" for empty cells in AppleScript. Treat it as empty.
- **Rate limits** — if TinyFish rate-limits, wait 60 seconds and retry. If still limited, fall back to your own knowledge and note which values are from training data.
- **Show progress** — tell the user what you're researching. Don't go silent.
- **macOS only** — AppleScript only works on macOS with Microsoft Excel for Mac.
- **Escape values** — always escape `"` and `\` in cell values before passing to osascript.
- **Large sheets** — for 100+ rows, process in batches of 10–20 and show progress between batches.
