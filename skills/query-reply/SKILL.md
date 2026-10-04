---
name: query-reply
description: Draft the desk's reply to the insurer's latest query on one claim, with the documents to attach.
---

# Query reply

**Input:** the request names one claim, for example `CLM-001`.
**Output:** `claims/<claim>/reply.json`, replacing any earlier one. No other file changes.

## Steps

1. Read `claims/<claim>/claim.json` and `claims/<claim>/query.json`. If either is missing, write nothing and reply `Cannot draft: <file> is missing.`
2. Work out exactly what the query asks for, and which document answers it.
3. Draft the reply (rules below).
4. List the documents to attach. A document is `present: true` only if the claim lists it with `present: true`; otherwise `present: false`, meaning the desk must obtain it before sending.
5. Write the reply file (format below), then reply with one sentence saying what must be attached.

## Writing the reply

- Address it to the insurer's claims team, name the claim ID and patient, answer the query, and list the attachments. Three to five sentences. Sign off as `Insurance desk`.
- Use only facts from `claim.json`. Do not add clinical details, dates or numbers that are not there.
- Do not argue that treatment was medically necessary. The answer to a justification query is the treating doctor's signed note, so attach it.
- If the query asks for something the claim files cannot answer, say the desk will send it, and list it with `present: false`.

## Format

Valid JSON only, no comments. The example below is fictional, only to show the shape.

```json
{
  "query": "Please send the biometry report for the cataract surgery.",
  "reply": "Dear Example Health claims team, ... Insurance desk",
  "attach": [
    { "document": "biometry report", "present": false }
  ],
  "rules": []
}
```

- `query` is the `query` field of `query.json`, copied exactly.
- `rules` lists the Section B rule IDs that require an attached document. Empty list when none does.

## Check before writing

- The reply answers the query that was asked, and nothing else.
- Every attachment marked `present: true` is listed as present in `claim.json`.
- No fact appears in the reply that is not in the claim files.
