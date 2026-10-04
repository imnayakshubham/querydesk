import { DeskError } from "@/lib/desk-error"
import { mergeAgentBranch, readAgentProposal } from "@/lib/github"
import { respondWithResultOrError } from "@/lib/respond"
import {
  agentBranchFor,
  buildCommitMessage,
  ruleApprovalMessage,
} from "@/lib/rules"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: sessionId } = await params
  return respondWithResultOrError(async () => {
    const branch = agentBranchFor(sessionId)
    const { proposedRule, claimId, draftsReply } =
      await readAgentProposal(branch)

    if (proposedRule) {
      await mergeAgentBranch(branch, ruleApprovalMessage(proposedRule.id))
    } else if (draftsReply) {
      await mergeAgentBranch(
        branch,
        buildCommitMessage("desk", `approve reply for ${claimId}`)
      )
    } else {
      throw new DeskError("This agent branch has nothing to approve.")
    }
    return { merged: branch }
  })
}
