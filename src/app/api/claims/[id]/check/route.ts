import { runAgent } from "@/lib/agent"
import { mergeIntoMain, readClaim } from "@/lib/github"
import { respondWithJson } from "@/lib/respond"
import { commitMessage } from "@/lib/rules"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: claimId } = await params
  return respondWithJson(async () => {
    await readClaim(claimId)
    const { branch } = await runAgent(
      `Use the packet-check skill for claim ${claimId}.`
    )
    // A check is analysis, not a proposal, so it goes straight to main.
    await mergeIntoMain(
      branch,
      commitMessage("agent", `check claim ${claimId}`)
    )
    return { branch }
  })
}
