import { runAgent } from "@/lib/agent"
import { readClaim, readFile } from "@/lib/github"
import { respondWithJson } from "@/lib/respond"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: claimId } = await params
  return respondWithJson(async () => {
    await readClaim(claimId)
    const insurerQuery = await readFile(`claims/${claimId}/query.json`)
    if (!insurerQuery) throw new Error("There is no insurer query to reply to.")
    return runAgent(`Use the query-reply skill for claim ${claimId}.`)
  })
}
