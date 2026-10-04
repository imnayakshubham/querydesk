# Rules

## Section A: protected rules

These rules never change. Never edit this section.

- Never contact an insurer, submit a claim, or send a reply. The desk does that.
- Never decide whether treatment was medically necessary. Only the treating doctor can.
- Use only facts from the claim files. If a fact or document is missing, say so.
- Cite a rule ID for every document you ask for.
- Write only to `claims/`, `lessons/`, `memory/`, and Section B of this file.
- Change Section B only through the `propose-lesson` skill, one line at a time.

## Section B: insurer playbook

One rule per line, in this exact format:

`- [R-001] Insurer: <insurer or Any> | When: <case> | Require: <document> | Source: <where it came from>`

How to apply a rule to a claim in `claims/<id>/claim.json`:

- `Insurer` matches when it equals the claim's `insurer` exactly, or is `Any`.
- `When` is read against the claim's fields: `any inpatient claim` and `any cashless claim` match every claim; `any surgical claim` matches when `procedure` is not null; an ICU stay means `icuDays` is more than 0; a named illness or operation matches `diagnosis` or `procedure`.
- A required document is present when the claim lists a document with the same meaning and `present: true`. Use the rule's `Require` text as the document name in everything you write.

- [R-001] Insurer: Suraksha General | When: any inpatient claim | Require: itemised pharmacy bill | Source: starting rulebook
- [R-002] Insurer: Suraksha General | When: any surgical claim | Require: operation theatre notes | Source: starting rulebook
- [R-003] Insurer: Suraksha General | When: dengue | Require: lab reports confirming dengue (NS1 antigen or IgM) | Source: starting rulebook
- [R-004] Insurer: Suraksha General | When: appendectomy or other surgery that removes tissue | Require: histopathology report | Source: starting rulebook
- [R-005] Insurer: Meridian Health Cover | When: any inpatient claim | Require: itemised pharmacy bill | Source: starting rulebook
- [R-006] Insurer: Meridian Health Cover | When: joint replacement | Require: implant sticker and invoice | Source: starting rulebook
- [R-007] Insurer: Meridian Health Cover | When: joint replacement | Require: pre- and post-operative X-ray reports | Source: starting rulebook
- [R-008] Insurer: Any | When: any inpatient claim | Require: discharge summary signed by the treating doctor | Source: starting rulebook
- [R-009] Insurer: Any | When: any cashless claim | Require: pre-authorisation approval letter | Source: starting rulebook
- [R-010] Insurer: Any | When: any cashless claim | Require: copy of the policy card and patient photo ID | Source: starting rulebook
