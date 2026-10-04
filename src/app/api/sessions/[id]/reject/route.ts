import {
  discardAgentBranch,
  readRepoFile,
  readAgentProposal,
  commitFile,
} from "@/lib/github"
import { respondWithResultOrError } from "@/lib/respond"
import { buildCommitMessage, formatRuleLine, agentBranchFor } from "@/lib/rules"

type RouteParams = { params: Promise<{ id: string }> }

const REJECTED_RULES_PATH = "lessons/REJECTED.md"

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: sessionId } = await params
  return respondWithResultOrError(async () => {
    const branch = agentBranchFor(sessionId)
    const { proposedRule } = await readAgentProposal(branch)
    await discardAgentBranch(branch)

    // Rejected replies just disappear; rejected rules are logged, because
    // the rulebook's history is what the desk audits.
    if (proposedRule) {
      const rejectedRulesFile = await readRepoFile(REJECTED_RULES_PATH)
      const today = new Date().toISOString().slice(0, 10)
      const ruleWithoutBullet = formatRuleLine(proposedRule).slice(2)
      await commitFile(
        REJECTED_RULES_PATH,
        (rejectedRulesFile?.text ?? "# Rejected rules\n\n") +
          `- ${today}: ${ruleWithoutBullet}\n`,
        buildCommitMessage("desk", `reject rule ${proposedRule.id}`)
      )
    }
    return { rejected: branch }
  })
}
