import {
  commitFile,
  discardAgentBranch,
  readAgentProposal,
  readRepoFile,
} from "@/lib/github"
import { respondWithResultOrError } from "@/lib/respond"
import { agentBranchFor, buildCommitMessage, type Rule } from "@/lib/rules"

type RouteParams = { params: Promise<{ id: string }> }

const REJECTED_RULES_PATH = "lessons/REJECTED.md"

function rejectedRuleEntry(rule: Rule) {
  const today = new Date().toISOString().slice(0, 10)
  return `- ${today}: rejected ${rule.id} (${rule.insurer} · ${rule.when} → ${rule.require})\n`
}

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
      await commitFile(
        REJECTED_RULES_PATH,
        (rejectedRulesFile?.text ?? "# Rejected rules\n\n") +
          rejectedRuleEntry(proposedRule),
        buildCommitMessage("desk", `reject rule ${proposedRule.id}`)
      )
    }
    return { rejected: branch }
  })
}
