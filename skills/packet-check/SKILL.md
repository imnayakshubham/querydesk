---
name: packet-check
description: Check one claim's documents against the insurer playbook before the claim is sent to the insurer.
---

# Packet check

**Input:** the request names one claim, for example `CLM-001`.
**Output:** `claims/<claim>/checklist.json`, replacing any earlier one. No other file changes.

## Steps

1. Read `claims/<claim>/claim.json`. If it does not exist, write nothing and reply `Cannot check: claims/<claim>/claim.json is missing.`
2. Go through every rule in Section B of `RULES.md`, in order, and decide whether it applies to this claim, using "How to apply a rule" in `RULES.md`.
3. For each rule that applies, check whether the required document is present.
4. Write the checklist (format below).
5. Reply with the summary sentence.

## Format

Valid JSON only, no comments. One item per rule that applies, in rule order.

```json
{
  "items": [
    { "document": "itemised pharmacy bill", "rule": "R-001", "present": true },
    { "document": "discharge summary signed by the treating doctor", "rule": "R-004", "present": true }
  ],
  "missing": [],
  "summary": "Everything the playbook asks for is here (R-001, R-004)."
}
```

- `document` is the rule's `Require` text.
- `missing` lists the `document` of every item with `present: false`, in the same order. Empty list when nothing is missing.
- `summary` is one sentence for the desk. When something is missing, name the document and its rule, for example `The ICU justification note is missing (R-005).`

## Check before writing

- Every rule that applies has exactly one item, and no item comes from a rule that does not apply.
- Every `present` value comes from `claim.json`, never from assumption.
- `missing` matches the items with `present: false`.
