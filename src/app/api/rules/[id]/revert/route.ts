import { listRecentCommitsOnMain, readRepoFile, commitFile } from "@/lib/github"
import { respondWithResultOrError } from "@/lib/respond"
import { buildCommitMessage, isRuleId, parseRuleLine } from "@/lib/rules"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: ruleId } = await params
  return respondWithResultOrError(async () => {
    if (!isRuleId(ruleId)) throw new Error(`Unknown rule ${ruleId}.`)

    const rulesFile = await readRepoFile("RULES.md")
    const ruleLine = rulesFile!.text
      .split("\n")
      .find((line) => parseRuleLine(line)?.id === ruleId)
    const rule = ruleLine ? parseRuleLine(ruleLine) : null
    if (!ruleLine || !rule) {
      throw new Error(`Rule ${ruleId} is not in the rulebook.`)
    }
    if (rule.source === "starting rulebook") {
      throw new Error("Rules from the starting rulebook cannot be reverted.")
    }

    // Searched across all of main: git hides a merge commit from a
    // path-filtered history when main itself didn't touch the file.
    const approvalCommit = (await listRecentCommitsOnMain()).find((commit) =>
      commit.message.startsWith(`desk: approve rule ${ruleId}`)
    )
    const undoesNote = approvalCommit
      ? ` (undoes ${approvalCommit.sha.slice(0, 7)})`
      : ""

    await commitFile(
      "RULES.md",
      rulesFile!.text.replace(`${ruleLine}\n`, ""),
      buildCommitMessage("desk", `revert rule ${ruleId}${undoesNote}`)
    )
    return { reverted: ruleId }
  })
}
