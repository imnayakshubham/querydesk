---
name: propose-lesson
description: Turn an answered insurer query into one new playbook rule, for the desk to approve or reject.
---

# Propose lesson

**Input:** the request names one claim, for example `CLM-001`.
**Output:** exactly one new line in Section B of `RULES.md`, and `lessons/<rule>.json`. No other file changes.

## Steps

1. Read `claims/<claim>/claim.json`, `claims/<claim>/query.json` and `claims/<claim>/reply.json`. If any is missing, change nothing and reply `Cannot propose: <file> is missing.`
2. Decide the one document that, had it been sent with the claim, would have stopped this query. It is usually an attachment in `reply.json` with `present: false`.
3. If a Section B rule already requires that document for this insurer and this kind of case, change nothing and reply `No new rule needed: <rule ID> already covers this.`
4. Write the rule (below). Its number is the highest rule number in Section B plus one, written with three digits: if the highest is `R-041`, the new rule is `R-042`.
5. Use `edit` to add the rule as a new line directly after the last rule in Section B. Do not change any other line.
6. Write `lessons/<rule>.json` (format below), then reply with the new rule line.

## Writing the rule

Fictional example, only to show the format:

`- [R-042] Insurer: Example Health | When: cataract surgery | Require: biometry report | Source: CLM-901 query`

- `Insurer` is the claim's `insurer`, exactly. Use `Any` only if the query is clearly not insurer-specific.
- `When` is as narrow as this case and uses words that can be checked against claim fields (diagnosis, procedure, ICU stay). Never `any claim`.
- `Require` is one document the desk can obtain, named the same way as in `reply.json`.
- `Source` is `<claim> query`.

## Format

Valid JSON only, no comments.

```json
{
  "rule": "R-042",
  "sourceClaim": "CLM-901",
  "query": "Please send the biometry report for the cataract surgery.",
  "rationale": "Example Health asked for the biometry report on a cataract claim. Sending it with every cataract claim avoids the query and the wait at discharge."
}
```

## Check before writing

- `RULES.md` differs from before by exactly one added line, in Section B, in the exact rule format.
- The rule ID is not already used.
- Section A is unchanged.
