export async function respondWithJson(handleRequest: () => Promise<object>) {
  try {
    return Response.json(await handleRequest())
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ error: message }, { status: 400 })
  }
}
