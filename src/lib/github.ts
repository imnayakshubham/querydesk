import { Octokit } from "@octokit/rest"
import { DeskError } from "@/lib/desk-error"
import {
  findRulebookChangeError,
  isClaimId,
  isPathAgentMayChange,
  parseRulebook,
} from "@/lib/rules"

export type Claim = {
  id: string
  patient: string
  insurer: string
  diagnosis: string
  procedure: string | null
  admitted: string
  discharged: string
  icuDays: number
  documents: { name: string; present: boolean }[]
}

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
const [owner, repo] = process.env.GITHUB_REPO!.split("/")
const queryDeskIdentity = {
  name: process.env.GIT_AUTHOR_NAME!,
  email: process.env.GIT_AUTHOR_EMAIL!,
}

function httpStatusOf(error: unknown) {
  return (error as { status?: number }).status
}

export async function readRepoFile(path: string, branch = "main") {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    })
    if (Array.isArray(data) || data.type !== "file") return null
    return {
      text: Buffer.from(data.content, "base64").toString("utf8"),
      sha: data.sha,
    }
  } catch (error) {
    if (httpStatusOf(error) === 404) return null
    throw error
  }
}

export async function listClaimIds() {
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path: "claims",
    ref: "main",
  })
  return Array.isArray(data) ? data.map((entry) => entry.name) : []
}

export async function readClaim(claimId: string) {
  const claimFile = isClaimId(claimId)
    ? await readRepoFile(`claims/${claimId}/claim.json`)
    : null
  if (!claimFile) throw new DeskError(`Unknown claim ${claimId}.`)
  return JSON.parse(claimFile.text) as Claim
}

export async function listRecentCommitsOnMain(path?: string) {
  const { data } = await octokit.repos.listCommits({
    owner,
    repo,
    path,
    sha: "main",
    per_page: 100,
  })
  return data.map((commit) => ({
    sha: commit.sha,
    message: commit.commit.message,
    date: commit.commit.committer?.date,
  }))
}

export async function listAgentBranches() {
  const { data } = await octokit.git.listMatchingRefs({
    owner,
    repo,
    ref: "heads/gitagent/session-",
  })
  return data.map((branchRef) => branchRef.ref.replace("refs/heads/", ""))
}

export async function listFilesChangedByAgent(branch: string) {
  const { data } = await octokit.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead: `main...${branch}`,
  })
  return data.files ?? []
}

export async function readRulebook(branch = "main") {
  const rulebookFile = await readRepoFile("RULES.md", branch)
  if (!rulebookFile) throw new Error(`RULES.md is missing on ${branch}.`)
  return rulebookFile.text
}

async function listRuleIdsOnMain() {
  return new Set(parseRulebook(await readRulebook()).map((rule) => rule.id))
}

// What an agent branch proposes: the claim it worked on, whether it drafts a
// reply, and the rule it adds (the branch's rule whose ID main doesn't have).
async function readProposalAgainstMain(
  branch: string,
  ruleIdsOnMain: Set<string>
) {
  const changedFiles = await listFilesChangedByAgent(branch)
  const changedPaths = changedFiles.map((file) => file.filename)
  const claimId = changedPaths
    .map((path) => path.match(/^claims\/(CLM-\d{3})\//)?.[1])
    .find(Boolean)
  const proposedRule = changedPaths.includes("RULES.md")
    ? (parseRulebook(await readRulebook(branch)).find(
        (rule) => !ruleIdsOnMain.has(rule.id)
      ) ?? null)
    : null
  return {
    branch,
    changedFiles,
    claimId,
    draftsReply: changedPaths.includes(`claims/${claimId}/reply.json`),
    proposedRule,
  }
}

export async function readAgentProposal(branch: string) {
  return readProposalAgainstMain(branch, await listRuleIdsOnMain())
}

export async function listAgentProposals() {
  const [branches, ruleIdsOnMain] = await Promise.all([
    listAgentBranches(),
    listRuleIdsOnMain(),
  ])
  return Promise.all(
    branches.map((branch) => readProposalAgainstMain(branch, ruleIdsOnMain))
  )
}

export function findRuleAwaitingReview(
  proposals: Awaited<ReturnType<typeof listAgentProposals>>
) {
  for (const { branch, proposedRule } of proposals) {
    if (proposedRule) return { branch, proposedRule }
  }
  return null
}

export async function commitFileDeletion(
  path: string,
  message: string,
  branch = "main"
) {
  const existingFile = await readRepoFile(path, branch)
  if (!existingFile) return
  await octokit.repos.deleteFile({
    owner,
    repo,
    path,
    message,
    branch,
    sha: existingFile.sha,
    committer: queryDeskIdentity,
    author: queryDeskIdentity,
  })
}

export async function commitFile(
  path: string,
  contents: string,
  message: string,
  branch = "main"
) {
  const existingFile = await readRepoFile(path, branch)
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    branch,
    content: Buffer.from(contents).toString("base64"),
    sha: existingFile?.sha,
    committer: queryDeskIdentity,
    author: queryDeskIdentity,
  })
}

export async function discardAgentBranch(branch: string) {
  await octokit.git.deleteRef({ owner, repo, ref: `heads/${branch}` })
}

// Merges an agent branch into main, only if it changed what the agent may change.
export async function mergeAgentBranch(branch: string, message: string) {
  for (const file of await listFilesChangedByAgent(branch)) {
    for (const path of [file.filename, file.previous_filename]) {
      if (path && !isPathAgentMayChange(path)) {
        throw new DeskError(
          `The agent changed ${path}, which it may not change.`
        )
      }
    }
  }

  const [mainRulebook, branchRulebook] = await Promise.all([
    readRulebook(),
    readRulebook(branch),
  ])
  const rulebookChangeError = findRulebookChangeError(
    mainRulebook,
    branchRulebook
  )
  if (rulebookChangeError) throw new DeskError(rulebookChangeError)

  try {
    await octokit.repos.merge({
      owner,
      repo,
      base: "main",
      head: branch,
      commit_message: message,
    })
  } catch (error) {
    if (httpStatusOf(error) === 409) {
      throw new DeskError("This proposal is out of date. Run it again.")
    }
    throw error
  }
  await discardAgentBranch(branch)
}
