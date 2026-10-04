import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  buildCommitMessage,
  findRulebookChangeError,
  formatRuleLine,
  isPathAgentMayChange,
  isClaimId,
  isRuleId,
  isSessionId,
  parseRuleLine,
} from "./rules.ts"

const startingRulesText = readFileSync("RULES.md", "utf8")
const proposedRuleLine =
  "- [R-005] Insurer: Suraksha General | When: dengue with ICU stay | Require: signed ICU justification note from the treating doctor | Source: CLM-001 query"
const lastStartingRuleLine = startingRulesText
  .split("\n")
  .findLast((line) => parseRuleLine(line))!
const sectionARuleLine =
  "- Never contact an insurer, submit a claim, or send a reply. The desk does that."

function insertLineAfter(text: string, existingLine: string, newLine: string) {
  return text.replace(existingLine, `${existingLine}\n${newLine}`)
}

function rulesWithAddedLine(newLine: string) {
  return insertLineAfter(startingRulesText, lastStartingRuleLine, newLine)
}

test("buildCommitMessage prefixes the actor", () => {
  assert.equal(
    buildCommitMessage("desk", "approve rule R-005"),
    "desk: approve rule R-005"
  )
  assert.equal(
    buildCommitMessage("system", "insurer query received for CLM-001"),
    "system: insurer query received for CLM-001"
  )
})

test("parseRuleLine reads every starting rule", () => {
  const startingRuleIds = startingRulesText
    .split("\n")
    .map(parseRuleLine)
    .filter((rule) => rule !== null)
    .map((rule) => rule.id)
  assert.deepEqual(startingRuleIds, ["R-001", "R-002", "R-003", "R-004"])

  assert.deepEqual(parseRuleLine(proposedRuleLine), {
    id: "R-005",
    insurer: "Suraksha General",
    when: "dengue with ICU stay",
    require: "signed ICU justification note from the treating doctor",
    source: "CLM-001 query",
  })
})

test("parseRuleLine rejects lines not in the rule format", () => {
  assert.equal(
    parseRuleLine("- [R-5] Insurer: Any | When: x | Require: y | Source: z"),
    null
  )
  assert.equal(
    parseRuleLine("- [R-005] Insurer: Any | Require: y | Source: z"),
    null
  )
  assert.equal(parseRuleLine("Never contact an insurer."), null)
})

test("formatRuleLine writes back the line parseRuleLine read", () => {
  assert.equal(
    formatRuleLine(parseRuleLine(proposedRuleLine)!),
    proposedRuleLine
  )
})

test("ID checks accept only the exact formats", () => {
  assert.equal(isClaimId("CLM-001"), true)
  assert.equal(isClaimId("../CLM-001"), false)
  assert.equal(isSessionId("6b714f93"), true)
  assert.equal(isSessionId("6b714f93/../main"), false)
  assert.equal(isRuleId("R-005"), true)
  assert.equal(isRuleId("R-5"), false)
})

test("isPathAgentMayChange allows only the agent's folders and RULES.md", () => {
  const allowedPaths = [
    "claims/CLM-001/checklist.json",
    "lessons/R-005.json",
    "memory/MEMORY.md",
    "RULES.md",
  ]
  const protectedPaths = [
    "src/app/page.tsx",
    "agent.yaml",
    "SOUL.md",
    ".gitignore",
    "skills/packet-check/SKILL.md",
  ]
  for (const path of allowedPaths)
    assert.equal(isPathAgentMayChange(path), true, path)
  for (const path of protectedPaths) {
    assert.equal(isPathAgentMayChange(path), false, path)
  }
})

test("findRulebookChangeError accepts no change and one new Section B rule", () => {
  assert.equal(
    findRulebookChangeError(startingRulesText, startingRulesText),
    null
  )
  assert.equal(
    findRulebookChangeError(
      startingRulesText,
      rulesWithAddedLine(proposedRuleLine)
    ),
    null
  )
})

test("findRulebookChangeError rejects anything else", () => {
  const editedSectionA = startingRulesText.replace(
    sectionARuleLine,
    "- Contact the insurer."
  )
  const ruleAddedToSectionA = insertLineAfter(
    startingRulesText,
    sectionARuleLine,
    proposedRuleLine
  )
  const twoRulesAdded = rulesWithAddedLine(
    `${proposedRuleLine}\n${proposedRuleLine.replace("R-005", "R-006")}`
  )
  const malformedRuleAdded = rulesWithAddedLine("- ICU notes are needed.")
  const reusedRuleIdAdded = rulesWithAddedLine(
    proposedRuleLine.replace("R-005", "R-004")
  )

  const problemWith = (branchText: string) =>
    findRulebookChangeError(startingRulesText, branchText)!

  assert.match(problemWith(editedSectionA), /exactly one added line/)
  assert.match(problemWith(ruleAddedToSectionA), /Section B/)
  assert.match(problemWith(twoRulesAdded), /exactly one added line/)
  assert.match(problemWith(malformedRuleAdded), /rule format/)
  assert.match(problemWith(reusedRuleIdAdded), /already exists/)
})
