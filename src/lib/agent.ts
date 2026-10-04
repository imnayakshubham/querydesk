import { randomUUID } from "node:crypto"
import { rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { initLocalSession, query } from "@open-gitagent/gitagent"
import { discardAgentBranch, listFilesChangedByAgent } from "@/lib/github"

const githubToken = process.env.GITHUB_TOKEN!
const MODEL_BUSY_OR_OUT_OF_QUOTA = /"code":\s*(429|503)/

async function runAgentInClone(prompt: string, cloneDir: string) {
  let modelError = ""
  let finalReply = ""
  const agentRun = query({
    prompt,
    dir: cloneDir,
    allowedTools: ["read", "write", "edit", "memory"],
    maxTurns: 8,
  })
  for await (const message of agentRun) {
    if (message.type === "system" && message.subtype === "error") {
      modelError = message.content
    }
    if (message.type === "assistant") {
      if (message.stopReason === "error") {
        modelError ||= message.errorMessage ?? "The model request failed."
      } else if (message.content) {
        finalReply = message.content
      }
    }
  }
  return { modelError, finalReply }
}

function describeModelError(modelError: string) {
  const statusCode = modelError.match(MODEL_BUSY_OR_OUT_OF_QUOTA)?.[1]
  if (statusCode === "429") return "Demo agent limit reached. Try again later."
  if (statusCode === "503") return "The model is busy. Try again in a minute."
  return modelError
}

// Runs one GitAgent session and pushes its branch only if the agent succeeded.
export async function runAgentSkill(prompt: string, branchToResume?: string) {
  const cloneDir = join(tmpdir(), `querydesk-${randomUUID()}`)
  try {
    const session = initLocalSession({
      url: `https://github.com/${process.env.GITHUB_REPO}`,
      token: githubToken,
      dir: cloneDir,
      session: branchToResume,
    })

    let agentResult = await runAgentInClone(prompt, session.dir)
    if (MODEL_BUSY_OR_OUT_OF_QUOTA.test(agentResult.modelError)) {
      agentResult = await runAgentInClone(prompt, session.dir)
    }
    if (agentResult.modelError) {
      throw new Error(describeModelError(agentResult.modelError))
    }

    session.finalize()
    const agentChangedNothing =
      !branchToResume &&
      (await listFilesChangedByAgent(session.branch)).length === 0
    if (agentChangedNothing) {
      await discardAgentBranch(session.branch)
      throw new Error(agentResult.finalReply || "The agent made no changes.")
    }
    return { branch: session.branch, agentReply: agentResult.finalReply }
  } catch (error) {
    // git errors echo the clone URL, which contains the token
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(message.replaceAll(githubToken, "[token]"))
  } finally {
    await rm(cloneDir, { recursive: true, force: true })
  }
}
