import { runAgent } from "@/lib/agent"
import {
  listFolderNames,
  readClaim,
  readFile,
  readSessionProposal,
} from "@/lib/github"
import { respondWithJson } from "@/lib/respond"
import { sessionBranchName } from "@/lib/rules"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: sessionId } = await params
  return respondWithJson(async () => {
    const branch = sessionBranchName(sessionId)
    const { proposedRule } = await readSessionProposal(branch)
    if (!proposedRule) throw new Error("This session has no proposed rule.")

    const lessonFile = await readFile(`lessons/${proposedRule.id}.json`, branch)
    if (!lessonFile) {
      throw new Error(`The lesson file for ${proposedRule.id} is missing.`)
    }
    const { sourceClaim } = JSON.parse(lessonFile.text)

    const otherClaimIds = (await listFolderNames("claims")).filter(
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

    await runAgent(
      `Use the impact-preview skill for claims ${claimIdsToPreview.join(", ")}.`,
      branch
    )
    return { branch, claimIds: claimIdsToPreview }
  })
}
