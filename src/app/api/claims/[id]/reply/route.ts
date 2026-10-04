import { runAgentSkill } from "@/lib/agent"
import { readClaimState } from "@/lib/desk"
import { DeskError } from "@/lib/desk-error"
import { readClaim } from "@/lib/github"
import { respondWithResultOrError } from "@/lib/respond"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: claimId } = await params
  return respondWithResultOrError(async () => {
    await readClaim(claimId)
    const { openQuery } = await readClaimState(claimId)
    if (!openQuery) throw new DeskError("There is no open insurer query.")
    return runAgentSkill(`Use the query-reply skill for claim ${claimId}.`)
  })
}
