import { runAgentSkill } from "@/lib/agent"
import { readClaim, readRepoFile } from "@/lib/github"
import { respondWithResultOrError } from "@/lib/respond"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: claimId } = await params
  return respondWithResultOrError(async () => {
    await readClaim(claimId)
    const insurerQuery = await readRepoFile(`claims/${claimId}/query.json`)
    if (!insurerQuery) throw new Error("There is no insurer query to reply to.")
    return runAgentSkill(`Use the query-reply skill for claim ${claimId}.`)
  })
}
