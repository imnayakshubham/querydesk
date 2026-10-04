import { runAgentSkill } from "@/lib/agent"
import { findRuleAwaitingReview, readClaim, readRepoFile } from "@/lib/github"
import { respondWithResultOrError } from "@/lib/respond"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: claimId } = await params
  return respondWithResultOrError(async () => {
    await readClaim(claimId)
    const approvedReply = await readRepoFile(`claims/${claimId}/reply.json`)
    if (!approvedReply) throw new Error("Approve a reply for this claim first.")
    if (await findRuleAwaitingReview()) {
      throw new Error("A proposed rule is already waiting for review.")
    }
    return runAgentSkill(`Use the propose-lesson skill for claim ${claimId}.`)
  })
}
