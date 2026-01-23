---
id: review-undocumented
summary: Detects undocumented code changes by comparing diff against history entries.
---

TASK: Verify that code changes are documented.

FILES:

- DIFF.txt: All changes (code and documentation)
- HISTORY_ENTRIES.txt: Existing documentation (history entries)

RULE: Every code change should be covered by at least one history entry in HISTORY_ENTRIES.txt.

MATCHING:

- An "umbrella" entry (e.g., "Harness Latency Optimization") covers ALL related sub-changes (e.g., "parallel execution", "nano model", "caching").
- If an entry's title or content MENTIONS or RELATES to the code change, it is DOCUMENTED.
- Be LENIENT: only flag a change as undocumented if there is absolutely NO entry that discusses the topic.

MANDATORY: Create RESULT.json:
{
"change_clusters_found": ["brief list of major code/config changes in diff"],
"documented_clusters": ["which ones have related entries"],
"undocumented_clusters": ["which ones have NO related entries at all"],
"all_documented": true
}

If HISTORY_ENTRIES.txt contains entries that reasonably cover the changes, set all_documented to true and undocumented_clusters to [].

Run: Output ONLY the JSON object.
