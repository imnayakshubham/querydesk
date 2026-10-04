import { tmpdir } from "node:os"
import { join } from "node:path"
import { initLocalSession, query } from "@open-gitagent/gitagent"

export const maxDuration = 60

export async function POST() {
  const token = process.env.GITHUB_TOKEN!

  try {
    const session = initLocalSession({
      url: `https://github.com/${process.env.GITHUB_REPO}`,
      token,
      dir: join(tmpdir(), "querydesk-agent"),
    })

    const events = []
    try {
      const run = query({
        prompt:
          "Use the memory tool to save this note: 'Phase 0 spike reached the agent.' Then reply with one short sentence.",
        model: "google:gemini-flash-latest",
        dir: session.dir,
        allowedTools: ["read", "write", "memory"],
        maxTurns: 4,
      })
      for await (const message of run) {
        if (message.type !== "delta") events.push(message)
      }
    } finally {
      session.finalize()
    }

    return Response.json({ branch: session.branch, events })
  } catch (error) {
    // git errors echo the clone URL, which contains the token
    const message = String(error).replaceAll(token, "[token]")
    return Response.json({ error: message }, { status: 500 })
  }
}
