export type Rule = {
  id: string
  insurer: string
  when: string
  require: string
  source: string
}

const RULE_LINE_PATTERN =
  /^- \[(R-\d{3})\] Insurer: (.+?) \| When: (.+?) \| Require: (.+?) \| Source: (.+)$/

export const isClaimId = (id: string) => /^CLM-\d{3}$/.test(id)
export const isSessionId = (id: string) => /^[0-9a-f]{8}$/.test(id)
export const isRuleId = (id: string) => /^R-\d{3}$/.test(id)

export function agentBranchFor(sessionId: string) {
  if (!isSessionId(sessionId)) throw new Error(`Unknown session ${sessionId}.`)
  return `gitagent/session-${sessionId}`
}

export function buildCommitMessage(
  actor: "agent" | "desk" | "system",
  text: string
) {
  return `${actor}: ${text}`
}

export function parseRuleLine(line: string): Rule | null {
  const match = line.match(RULE_LINE_PATTERN)
  if (!match) return null
  const [, id, insurer, when, require, source] = match
  return { id, insurer, when, require, source }
}

export function formatRuleLine(rule: Rule) {
  return `- [${rule.id}] Insurer: ${rule.insurer} | When: ${rule.when} | Require: ${rule.require} | Source: ${rule.source}`
}

export function isPathAgentMayChange(path: string) {
  const agentFolders = ["claims/", "lessons/", "memory/"]
  return (
    agentFolders.some((folder) => path.startsWith(folder)) ||
    path === "RULES.md"
  )
}

// Returns why the change to RULES.md is not allowed, or null if it is.
export function findRulebookChangeError(mainText: string, branchText: string) {
  if (mainText === branchText) return null

  const mainLines = mainText.split("\n")
  const branchLines = branchText.split("\n")
  if (branchLines.length !== mainLines.length + 1) {
    return "RULES.md must change by exactly one added line."
  }

  const firstChangedIndex = mainLines.findIndex(
    (line, index) => line !== branchLines[index]
  )
  const addedLineIndex =
    firstChangedIndex === -1 ? mainLines.length : firstChangedIndex
  const linesAfterAddedOnBranch = branchLines.slice(addedLineIndex + 1)
  const linesAfterAddedOnMain = mainLines.slice(addedLineIndex)
  if (linesAfterAddedOnBranch.join("\n") !== linesAfterAddedOnMain.join("\n")) {
    return "RULES.md must change by exactly one added line."
  }

  const sectionBHeadingIndex = mainLines.findIndex((line) =>
    line.startsWith("## Section B")
  )
  if (addedLineIndex <= sectionBHeadingIndex) {
    return "The new rule must be in Section B."
  }

  const addedRule = parseRuleLine(branchLines[addedLineIndex])
  if (!addedRule) return "The new rule is not in the rule format."
  if (mainLines.some((line) => parseRuleLine(line)?.id === addedRule.id)) {
    return `Rule ${addedRule.id} already exists.`
  }
  return null
}
