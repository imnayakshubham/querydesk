import { runAgentSkill } from "@/lib/agent"
import { approveAgentBranch, readClaim } from "@/lib/github"
import { respondWithResultOrError } from "@/lib/respond"
import { buildCommitMessage } from "@/lib/rules"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: claimId } = await params
  return respondWithResultOrError(async () => {
    await readClaim(claimId)
    const { branch } = await runAgentSkill(
      `Use the packet-check skill for claim ${claimId}.`
    )
    // A check is analysis, not a proposal, so it goes straight to main.
    await approveAgentBranch(
      branch,
      buildCommitMessage("agent", `check claim ${claimId}`)
    )
    return { branch }
  })
}
