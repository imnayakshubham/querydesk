import { Octokit } from "@octokit/rest"
import {
  findRulebookChangeError,
  isPathAgentMayChange,
  isClaimId,
  parseRuleLine,
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
  if (!claimFile) throw new Error(`Unknown claim ${claimId}.`)
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

// What an agent branch proposes: the claim it worked on, and the rule it adds, if any.
export async function readAgentProposal(branch: string) {
  const changedFiles = await listFilesChangedByAgent(branch)
  const rulesDiff = changedFiles.find(
    (file) => file.filename === "RULES.md"
  )?.patch
  const addedRuleLine = rulesDiff
    ?.split("\n")
    .find((diffLine) => diffLine.startsWith("+- ["))
  const claimId = changedFiles
    .map((file) => file.filename.match(/^claims\/(CLM-\d{3})\//)?.[1])
    .find(Boolean)
  return {
    changedFiles,
    claimId,
    proposedRule: addedRuleLine ? parseRuleLine(addedRuleLine.slice(1)) : null,
  }
}

export async function findRuleAwaitingReview() {
  for (const branch of await listAgentBranches()) {
    const { proposedRule } = await readAgentProposal(branch)
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

export async function approveAgentBranch(branch: string, message: string) {
  for (const file of await listFilesChangedByAgent(branch)) {
    for (const path of [file.filename, file.previous_filename]) {
      if (path && !isPathAgentMayChange(path)) {
        throw new Error(`The agent changed ${path}, which it may not change.`)
      }
    }
  }

  const [mainRulesFile, branchRulesFile] = await Promise.all([
    readRepoFile("RULES.md"),
    readRepoFile("RULES.md", branch),
  ])
  const rulesChangeProblem = findRulebookChangeError(
    mainRulesFile!.text,
    branchRulesFile!.text
  )
  if (rulesChangeProblem) throw new Error(rulesChangeProblem)

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
      throw new Error("This proposal is out of date. Run it again.")
    }
    throw error
  }
  await discardAgentBranch(branch)
}
