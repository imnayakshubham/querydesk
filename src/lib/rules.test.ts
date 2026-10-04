import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  buildCommitMessage,
  findRulebookChangeError,
  formatRuleLine,
  isClaimId,
  isLearnedRule,
  isPathAgentMayChange,
  isRuleId,
  isSessionId,
  parseRuleLine,
  parseRulebook,
  ruleApprovalMessage,
  sessionIdOf,
  agentBranchFor,
} from "./rules.ts"

// Fixtures come from the real rulebook, so adding a rule needs no test change.
const rulebookText = readFileSync("RULES.md", "utf8")
const rulebookLines = rulebookText.split("\n")
const startingRules = parseRulebook(rulebookText)
const lastRuleLine = rulebookLines.findLast((line) => parseRuleLine(line))!
const sectionARuleLine = rulebookLines
  .slice(rulebookLines.findIndex((line) => line.startsWith("## Section A")))
  .find((line) => line.startsWith("- "))!

const ruleIdAfter = (ruleId: string) =>
  `R-${String(Number(ruleId.slice(2)) + 1).padStart(3, "0")}`
const nextRuleId = ruleIdAfter(startingRules.at(-1)!.id)

// Fictional, so the tests never encode the demo's expected rule.
const proposedRuleLine = `- [${nextRuleId}] Insurer: Any | When: cataract surgery | Require: biometry report | Source: test query`

function insertLineAfter(text: string, existingLine: string, newLine: string) {
  return text.replace(existingLine, `${existingLine}\n${newLine}`)
}

function rulebookWithAddedLine(newLine: string) {
  return insertLineAfter(rulebookText, lastRuleLine, newLine)
}

test("every rule-looking line in RULES.md parses", () => {
  const ruleLookingLines = rulebookLines.filter((line) =>
    line.startsWith("- [")
  )
  assert.equal(startingRules.length, ruleLookingLines.length)
})

test("starting rules are numbered R-001 upwards with no gaps or repeats", () => {
  startingRules.forEach((rule, index) => {
    assert.equal(rule.id, `R-${String(index + 1).padStart(3, "0")}`)
    assert.equal(isLearnedRule(rule), false, rule.id)
  })
})

test("parseRuleLine and formatRuleLine round-trip a rule", () => {
  const rule = parseRuleLine(proposedRuleLine)!
  assert.deepEqual(rule, {
    id: nextRuleId,
    insurer: "Any",
    when: "cataract surgery",
    require: "biometry report",
    source: "test query",
  })
  assert.equal(formatRuleLine(rule), proposedRuleLine)
  assert.equal(isLearnedRule(rule), true)
})

test("parseRuleLine rejects lines not in the rule format", () => {
  assert.equal(
    parseRuleLine("- [R-5] Insurer: Any | When: x | Require: y | Source: z"),
    null
  )
  assert.equal(
    parseRuleLine("- [R-001] Insurer: Any | Require: y | Source: z"),
    null
  )
  assert.equal(parseRuleLine(sectionARuleLine), null)
})

test("commit messages name the actor", () => {
  assert.equal(
    buildCommitMessage("system", "insurer query received for CLM-001"),
    "system: insurer query received for CLM-001"
  )
  assert.equal(ruleApprovalMessage("R-001"), "desk: approve rule R-001")
})

test("ID checks accept only the exact formats", () => {
  assert.equal(isClaimId("CLM-001"), true)
  assert.equal(isClaimId("../CLM-001"), false)
  assert.equal(isSessionId("6b714f93"), true)
  assert.equal(isSessionId("6b714f93/../main"), false)
  assert.equal(isRuleId("R-001"), true)
  assert.equal(isRuleId("R-5"), false)
  assert.equal(sessionIdOf(agentBranchFor("6b714f93")), "6b714f93")
})

test("isPathAgentMayChange allows only the agent's folders and RULES.md", () => {
  const allowedPaths = [
    "claims/CLM-001/checklist.json",
    "lessons/R-001.json",
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
  for (const path of allowedPaths) {
    assert.equal(isPathAgentMayChange(path), true, path)
  }
  for (const path of protectedPaths) {
    assert.equal(isPathAgentMayChange(path), false, path)
  }
})

test("findRulebookChangeError accepts no change and one new Section B rule", () => {
  assert.equal(findRulebookChangeError(rulebookText, rulebookText), null)
  assert.equal(
    findRulebookChangeError(
      rulebookText,
      rulebookWithAddedLine(proposedRuleLine)
    ),
    null
  )
})

test("findRulebookChangeError rejects anything else", () => {
  const editedSectionA = rulebookText.replace(
    sectionARuleLine,
    "- Contact the insurer."
  )
  const ruleAddedToSectionA = insertLineAfter(
    rulebookText,
    sectionARuleLine,
    proposedRuleLine
  )
  const twoRulesAdded = rulebookWithAddedLine(
    `${proposedRuleLine}\n${proposedRuleLine.replace(nextRuleId, ruleIdAfter(nextRuleId))}`
  )
  const malformedRuleAdded = rulebookWithAddedLine("- ICU notes are needed.")
  const reusedRuleIdAdded = rulebookWithAddedLine(
    proposedRuleLine.replace(nextRuleId, startingRules.at(-1)!.id)
  )

  const errorFor = (branchText: string) =>
    findRulebookChangeError(rulebookText, branchText)!

  assert.match(errorFor(editedSectionA), /exactly one added line/)
  assert.match(errorFor(ruleAddedToSectionA), /Section B/)
  assert.match(errorFor(twoRulesAdded), /exactly one added line/)
  assert.match(errorFor(malformedRuleAdded), /rule format/)
  assert.match(errorFor(reusedRuleIdAdded), /already exists/)
})
