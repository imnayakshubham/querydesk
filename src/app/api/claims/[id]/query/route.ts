import {
  listRecentCommitsOnMain,
  readClaim,
  readRepoFile,
  commitFile,
} from "@/lib/github"
import { respondWithResultOrError } from "@/lib/respond"
import { buildCommitMessage } from "@/lib/rules"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: claimId } = await params
  return respondWithResultOrError(async () => {
    await readClaim(claimId)
    const seedQueriesFile = await readRepoFile("seed/queries.json")
    const scriptedQueries: string[] = JSON.parse(seedQueriesFile!.text)[claimId]

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
