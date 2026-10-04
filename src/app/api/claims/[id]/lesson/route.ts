import { runAgentSkill } from "@/lib/agent"
import { readClaimState } from "@/lib/desk"
import { DeskError } from "@/lib/desk-error"
import {
  findRuleAwaitingReview,
  listAgentProposals,
  readClaim,
} from "@/lib/github"
import { respondWithResultOrError } from "@/lib/respond"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: claimId } = await params
  return respondWithResultOrError(async () => {
    await readClaim(claimId)
    const { queryIsAnswered } = await readClaimState(claimId)
    if (!queryIsAnswered) {
      throw new DeskError("Approve a reply to the insurer's query first.")
    }
    if (findRuleAwaitingReview(await listAgentProposals())) {
      throw new DeskError("A proposed rule is already waiting for review.")
    }
    return runAgentSkill(`Use the propose-lesson skill for claim ${claimId}.`)
  })
}
