import { DeskError } from "@/lib/desk-error"
import { commitFile, listRecentCommitsOnMain, readRulebook } from "@/lib/github"
import { respondWithResultOrError } from "@/lib/respond"
import {
  buildCommitMessage,
  isLearnedRule,
  isRuleId,
  parseRuleLine,
  ruleApprovalMessage,
} from "@/lib/rules"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: ruleId } = await params
  return respondWithResultOrError(async () => {
    if (!isRuleId(ruleId)) throw new DeskError(`Unknown rule ${ruleId}.`)

    const rulebookLines = (await readRulebook()).split("\n")
    const rule = rulebookLines
      .map(parseRuleLine)
      .find((parsedRule) => parsedRule?.id === ruleId)
    if (!rule) throw new DeskError(`Rule ${ruleId} is not in the rulebook.`)
    if (!isLearnedRule(rule)) {
      throw new DeskError(
        "Rules from the starting rulebook cannot be reverted."
      )
    }

    // Searched across all of main: git hides a merge commit from a
    // path-filtered history when main itself didn't touch the file.
    const approvalCommit = (await listRecentCommitsOnMain()).find((commit) =>
      commit.message.startsWith(ruleApprovalMessage(ruleId))
    )
    const undoesNote = approvalCommit
      ? ` (undoes ${approvalCommit.sha.slice(0, 7)})`
      : ""

    await commitFile(
      "RULES.md",
      rulebookLines
        .filter((line) => parseRuleLine(line)?.id !== ruleId)
        .join("\n"),
      buildCommitMessage("desk", `revert rule ${ruleId}${undoesNote}`)
    )
    return { reverted: ruleId }
  })
}
