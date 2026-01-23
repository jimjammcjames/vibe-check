---
id: review-memory-coherence
summary: Validates history entry coherence (type correctness, topic unity, linking).
---

ENVIRONMENT: Use only cat/grep/echo. DO NOT run npm/node commands.

TASK: Check history entry coherence.

FILES:

- DIFF.txt: Code changes being committed
- ENTRIES.txt: History entries (marked as [TYPE])

RULES:

1. ENTRY TYPE CORRECTNESS:
   - "fix"/"incident" entries are for BUGS/FIXES (something broke, we fixed it)
   - "decision"/"feature"/"refactor"/"investigation"/"note"/"meta" are for FEATURES/CHANGES
   - If a fix/incident entry describes a NEW FEATURE → flag as "wrong_entry_type"
   - If a non-fix entry describes a BUG FIX → flag as "wrong_entry_type"

2. TOPIC COHERENCE:
   - Each entry should cover ONE logical change
   - If entry mixes multiple UNRELATED changes → flag as "multiple_topics"
   - Exception: Related changes (e.g., fix + test for that fix) are OK together
   - If multiple topics are properly linked via "## Related" section → OK

3. Check each entry and report issues.

MANDATORY: Produce COHERENCE.json as a JSON object (no extra text):
{
"entry_count": 5,
"issues": [
{
"file": "path/to/entry.md",
"issue_type": "wrong_entry_type | multiple_topics | missing_links",
"description": "brief description",
"suggestion": "brief fix"
}
],
"all_coherent": true
}

- entry_count: integer count of entries checked (DO NOT list file paths)
- If no issues found, set all_coherent=true and issues=[]
- Keep descriptions and suggestions BRIEF (under 50 chars each)
- Be pragmatic: minor bundling of closely-related fixes is fine
