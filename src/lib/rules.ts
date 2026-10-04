export type Rule = {
  id: string
  insurer: string
  when: string
  require: string
  source: string
}

const RULE_LINE =
  /^- \[(R-\d{3})\] Insurer: (.+?) \| When: (.+?) \| Require: (.+?) \| Source: (.+)$/

export function commitMessage(actor: "desk" | "system", text: string) {
  return `${actor}: ${text}`
}

export function parseRule(line: string): Rule | null {
  const match = line.match(RULE_LINE)
  if (!match) return null
  const [, id, insurer, when, require, source] = match
  return { id, insurer, when, require, source }
}

export function isAllowedPath(path: string) {
  return (
    ["claims/", "lessons/", "memory/"].some((folder) =>
      path.startsWith(folder)
    ) || path === "RULES.md"
  )
}

// Returns why the change is not allowed, or null if it is.
export function checkRulesChange(mainText: string, branchText: string) {
  if (mainText === branchText) return null

  const before = mainText.split("\n")
  const after = branchText.split("\n")
  if (after.length !== before.length + 1) {
    return "RULES.md must change by exactly one added line."
  }

  const firstDifference = before.findIndex(
    (line, index) => line !== after[index]
  )
  const added = firstDifference === -1 ? before.length : firstDifference
  if (after.slice(added + 1).join("\n") !== before.slice(added).join("\n")) {
    return "RULES.md must change by exactly one added line."
  }

  const sectionB = before.findIndex((line) => line.startsWith("## Section B"))
  if (added <= sectionB) return "The new rule must be in Section B."

  const rule = parseRule(after[added])
  if (!rule) return "The new rule is not in the rule format."
  if (before.some((line) => parseRule(line)?.id === rule.id)) {
    return `Rule ${rule.id} already exists.`
  }
  return null
}
