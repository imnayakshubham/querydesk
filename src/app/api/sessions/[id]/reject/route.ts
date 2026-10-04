import {
  deleteBranch,
  readFile,
  readSessionProposal,
  writeFile,
} from "@/lib/github"
import { respondWithJson } from "@/lib/respond"
import { commitMessage, formatRule, sessionBranchName } from "@/lib/rules"

type RouteParams = { params: Promise<{ id: string }> }

const REJECTED_RULES_PATH = "lessons/REJECTED.md"

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: sessionId } = await params
  return respondWithJson(async () => {
    const branch = sessionBranchName(sessionId)
    const { proposedRule } = await readSessionProposal(branch)
    await deleteBranch(branch)

    // Rejected replies just disappear; rejected rules are logged, because
    // the rulebook's history is what the desk audits.
    if (proposedRule) {
      const rejectedRulesFile = await readFile(REJECTED_RULES_PATH)
      const today = new Date().toISOString().slice(0, 10)
      const ruleWithoutBullet = formatRule(proposedRule).slice(2)
      await writeFile(
        REJECTED_RULES_PATH,
        (rejectedRulesFile?.text ?? "# Rejected rules\n\n") +
          `- ${today}: ${ruleWithoutBullet}\n`,
        commitMessage("desk", `reject rule ${proposedRule.id}`)
      )
    }
    return { rejected: branch }
  })
}
