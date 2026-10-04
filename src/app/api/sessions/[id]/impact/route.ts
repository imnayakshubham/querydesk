import { runAgentSkill } from "@/lib/agent"
import {
  listClaimIds,
  readClaim,
  readRepoFile,
  readAgentProposal,
} from "@/lib/github"
import { respondWithResultOrError } from "@/lib/respond"
import { agentBranchFor } from "@/lib/rules"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: sessionId } = await params
  return respondWithResultOrError(async () => {
    const branch = agentBranchFor(sessionId)
    const { proposedRule } = await readAgentProposal(branch)
    if (!proposedRule) {
      throw new Error("This agent branch has no proposed rule.")
    }

    const lessonFile = await readRepoFile(
      `lessons/${proposedRule.id}.json`,
      branch
    )
    if (!lessonFile) {
      throw new Error(`The lesson file for ${proposedRule.id} is missing.`)
    }
    const { sourceClaim } = JSON.parse(lessonFile.text)

    const otherClaimIds = (await listClaimIds()).filter(
      (claimId) => claimId !== sourceClaim
    )
    const otherClaims = await Promise.all(otherClaimIds.map(readClaim))
    const claimIdsToPreview = otherClaims
      .filter(
        (claim) =>
          proposedRule.insurer === "Any" ||
          claim.insurer === proposedRule.insurer
      )
      .map((claim) => claim.id)
    if (claimIdsToPreview.length === 0) {
      throw new Error(`No other open claims for ${proposedRule.insurer}.`)
    }

    await runAgentSkill(
      `Use the impact-preview skill for claims ${claimIdsToPreview.join(", ")}.`,
      branch
    )
    return { branch, claimIds: claimIdsToPreview }
  })
}
