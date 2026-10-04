import { listCommitsOnMain, readClaim, readFile, writeFile } from "@/lib/github"
import { respondWithJson } from "@/lib/respond"
import { commitMessage } from "@/lib/rules"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: claimId } = await params
  return respondWithJson(async () => {
    await readClaim(claimId)
    const seedQueriesFile = await readFile("seed/queries.json")
    const scriptedQueries: string[] = JSON.parse(seedQueriesFile!.text)[claimId]

    // Cycle through the scripted queries so the demo never runs out.
    const queryPath = `claims/${claimId}/query.json`
    const queriesAskedSoFar = (await listCommitsOnMain(queryPath)).length
    const nextQuery =
      scriptedQueries[queriesAskedSoFar % scriptedQueries.length]

    await writeFile(
      queryPath,
      JSON.stringify({ query: nextQuery }, null, 2) + "\n",
      commitMessage("system", `insurer query received for ${claimId}`)
    )
    return { query: nextQuery }
  })
}
