---
name: impact-preview
description: Show which open claims a proposed playbook rule would flag, before the desk approves it.
---

# Impact preview

**Input:** the request names the claims to check, for example `CLM-902, CLM-903`. The proposed rule is the last line of Section B in `RULES.md`.
**Output:** `lessons/<rule>-impact.json`, for example `lessons/R-042-impact.json`. No other file changes.

## Steps

1. Take the last rule in Section B. Its ID names the output file.
2. For each named claim, read `claims/<claim>/claim.json`. If one is missing, leave it out and mention it in your reply.
3. For each claim, decide whether the rule applies, using "How to apply a rule" in `RULES.md`.
4. A claim is flagged when the rule applies and the required document is not present.
5. Write the impact file (format below), then reply with one sentence naming the flagged claims.

## Format

Valid JSON only, no comments. One entry per claim, in the order named. The example below is fictional, only to show the shape.

```json
[
  { "claim": "CLM-902", "flagged": true, "reason": "Cataract surgery; no biometry report in the documents." },
  { "claim": "CLM-903", "flagged": false, "reason": "Knee replacement, not cataract surgery; the rule does not apply." }
]
```

- `reason` is one sentence using facts from the claim: why the rule applies or not, and which document is missing.

## Check before writing

- Every named claim that exists has exactly one entry.
- `flagged` is true only when the rule applies and the document is missing.
- `RULES.md` and `claims/` are unchanged.
