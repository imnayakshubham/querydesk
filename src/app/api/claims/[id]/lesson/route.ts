import { runAgent } from "@/lib/agent"
import { findPendingLesson, readClaim, readFile } from "@/lib/github"
import { respondWithJson } from "@/lib/respond"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: claimId } = await params
  return respondWithJson(async () => {
    await readClaim(claimId)
    const approvedReply = await readFile(`claims/${claimId}/reply.json`)
    if (!approvedReply) throw new Error("Approve a reply for this claim first.")
    if (await findPendingLesson()) {
      throw new Error("A proposed rule is already waiting for review.")
    }
    return runAgent(`Use the propose-lesson skill for claim ${claimId}.`)
  })
}
