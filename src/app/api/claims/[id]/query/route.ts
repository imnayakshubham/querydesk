import { DeskError } from "@/lib/desk-error"
import {
  commitFile,
  listRecentCommitsOnMain,
  readClaim,
  readRepoFile,
} from "@/lib/github"
import { respondWithResultOrError } from "@/lib/respond"
import { buildCommitMessage } from "@/lib/rules"

type RouteParams = { params: Promise<{ id: string }> }

async function readScriptedQueries(claimId: string) {
  const seedFile = await readRepoFile("seed/queries.json")
  const queriesByClaimId: Record<string, string[]> = seedFile
    ? JSON.parse(seedFile.text)
    : {}
  const scriptedQueries = queriesByClaimId[claimId] ?? []
  if (scriptedQueries.length === 0) {
    throw new DeskError(`No scripted insurer queries for ${claimId}.`)
  }
  return scriptedQueries
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: claimId } = await params
  return respondWithResultOrError(async () => {
    await readClaim(claimId)
    const scriptedQueries = await readScriptedQueries(claimId)

    // Cycle through the scripted queries so the demo never runs out.
    const queryPath = `claims/${claimId}/query.json`
    const queriesAskedSoFar = (await listRecentCommitsOnMain(queryPath)).length
    const nextQuery =
      scriptedQueries[queriesAskedSoFar % scriptedQueries.length]

    await commitFile(
      queryPath,
      JSON.stringify({ query: nextQuery }, null, 2) + "\n",
      buildCommitMessage("system", `insurer query received for ${claimId}`)
    )
    return { query: nextQuery }
  })
}
