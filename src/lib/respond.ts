import { DeskError } from "@/lib/desk-error"

export async function respondWithResultOrError(
  handleRequest: () => Promise<object>
) {
  try {
    return Response.json(await handleRequest())
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status = error instanceof DeskError ? 400 : 500
    return Response.json({ error: message }, { status })
  }
}
