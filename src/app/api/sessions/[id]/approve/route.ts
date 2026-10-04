import { mergeIntoMain, readSessionProposal } from "@/lib/github"
import { respondWithJson } from "@/lib/respond"
import { commitMessage, sessionBranchName } from "@/lib/rules"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: sessionId } = await params
  return respondWithJson(async () => {
    const branch = sessionBranchName(sessionId)
    const { proposedRule, claimId } = await readSessionProposal(branch)
    const approvalText = proposedRule
      ? `approve rule ${proposedRule.id}`
      : `approve reply for ${claimId}`
    await mergeIntoMain(branch, commitMessage("desk", approvalText))
    return { merged: branch }
  })
}
