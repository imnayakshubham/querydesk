import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  checkRulesChange,
  commitMessage,
  isAllowedPath,
  parseRule,
} from "./rules.ts"

const rules = readFileSync("RULES.md", "utf8")
const newRule =
  "- [R-005] Insurer: Suraksha General | When: dengue with ICU stay | Require: signed ICU justification note from the treating doctor | Source: CLM-001 query"
const lastRule = rules.split("\n").findLast((line) => parseRule(line))!

function addLineAfter(text: string, existingLine: string, line: string) {
  return text.replace(existingLine, `${existingLine}\n${line}`)
}

test("commitMessage prefixes the actor", () => {
  assert.equal(
    commitMessage("desk", "approve rule R-005"),
    "desk: approve rule R-005"
  )
  assert.equal(
    commitMessage("system", "insurer query received for CLM-001"),
    "system: insurer query received for CLM-001"
  )
})

test("parseRule reads every starting rule", () => {
  const parsed = rules
    .split("\n")
    .map(parseRule)
    .filter((rule) => rule !== null)
  assert.deepEqual(
    parsed.map((rule) => rule.id),
    ["R-001", "R-002", "R-003", "R-004"]
  )
  assert.deepEqual(parseRule(newRule), {
    id: "R-005",
    insurer: "Suraksha General",
    when: "dengue with ICU stay",
    require: "signed ICU justification note from the treating doctor",
    source: "CLM-001 query",
  })
})

test("parseRule rejects lines not in the rule format", () => {
  assert.equal(
    parseRule("- [R-5] Insurer: Any | When: x | Require: y | Source: z"),
    null
  )
  assert.equal(
    parseRule("- [R-005] Insurer: Any | Require: y | Source: z"),
    null
  )
  assert.equal(parseRule("Never contact an insurer."), null)
})

test("isAllowedPath allows only the agent's folders and RULES.md", () => {
  for (const path of [
    "claims/CLM-001/checklist.json",
    "lessons/R-005.json",
    "memory/MEMORY.md",
    "RULES.md",
  ]) {
    assert.equal(isAllowedPath(path), true, path)
  }
  for (const path of [
    "src/app/page.tsx",
    "agent.yaml",
    "SOUL.md",
    ".gitignore",
    "skills/packet-check/SKILL.md",
  ]) {
    assert.equal(isAllowedPath(path), false, path)
  }
})

test("checkRulesChange accepts no change and one new Section B rule", () => {
  assert.equal(checkRulesChange(rules, rules), null)
  assert.equal(
    checkRulesChange(rules, addLineAfter(rules, lastRule, newRule)),
    null
  )
})

test("checkRulesChange rejects anything else", () => {
  const sectionALine =
    "- Never contact an insurer, submit a claim, or send a reply. The desk does that."
  assert.match(
    checkRulesChange(
      rules,
      rules.replace(sectionALine, "- Contact the insurer.")
    )!,
    /exactly one added line/
  )
  assert.match(
    checkRulesChange(rules, addLineAfter(rules, sectionALine, newRule))!,
    /Section B/
  )
  assert.match(
    checkRulesChange(
      rules,
      addLineAfter(
        rules,
        lastRule,
        `${newRule}\n${newRule.replace("R-005", "R-006")}`
      )
    )!,
    /exactly one added line/
  )
  assert.match(
    checkRulesChange(
      rules,
      addLineAfter(rules, lastRule, "- ICU notes are needed.")
    )!,
    /rule format/
  )
  assert.match(
    checkRulesChange(
      rules,
      addLineAfter(rules, lastRule, newRule.replace("R-005", "R-004"))
    )!,
    /already exists/
  )
})
