import { approveAgentBranch, readAgentProposal } from "@/lib/github"
import { respondWithResultOrError } from "@/lib/respond"
import { buildCommitMessage, agentBranchFor } from "@/lib/rules"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: sessionId } = await params
  return respondWithResultOrError(async () => {
    const branch = agentBranchFor(sessionId)
    const { proposedRule, claimId } = await readAgentProposal(branch)
    const approvalText = proposedRule
      ? `approve rule ${proposedRule.id}`
      : `approve reply for ${claimId}`
    await approveAgentBranch(branch, buildCommitMessage("desk", approvalText))
    return { merged: branch }
  })
}
