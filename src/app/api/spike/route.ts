import { tmpdir } from "node:os"
import { join } from "node:path"
import { initLocalSession, query } from "@open-gitagent/gitagent"

export const maxDuration = 60

const prompts: Record<string, string> = {
  "packet-check": "Use the packet-check skill for claim CLM-001.",
  "query-reply": "Use the query-reply skill for claim CLM-001.",
  "propose-lesson": "Use the propose-lesson skill for claim CLM-001.",
  "impact-preview": "Use the impact-preview skill for claims CLM-002 and CLM-003.",
}

export async function POST(request: Request) {
  const { action, branch } = await request.json()
  const prompt = prompts[action]
  if (!prompt) return Response.json({ error: "Unknown action" }, { status: 400 })

  const token = process.env.GITHUB_TOKEN!

  try {
    const session = initLocalSession({
      url: `https://github.com/${process.env.GITHUB_REPO}`,
      token,
      dir: join(tmpdir(), "querydesk-agent"),
      session: branch || undefined,
    })

    const events = []
    try {
      const run = query({
        prompt,
        dir: session.dir,
        allowedTools: ["read", "write", "edit", "memory"],
        maxTurns: 8,
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
