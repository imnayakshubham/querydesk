import { Octokit } from "@octokit/rest"
import {
  findRulesChangeProblem,
  isAllowedPath,
  isClaimId,
  parseRule,
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

export async function readFile(path: string, branch = "main") {
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

export async function listFolderNames(path: string) {
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref: "main",
  })
  return Array.isArray(data) ? data.map((entry) => entry.name) : []
}

export async function readClaim(claimId: string) {
  const claimFile = isClaimId(claimId)
    ? await readFile(`claims/${claimId}/claim.json`)
    : null
  if (!claimFile) throw new Error(`Unknown claim ${claimId}.`)
  return JSON.parse(claimFile.text) as Claim
}

// Without a path, lists every commit on main.
export async function listCommitsOnMain(path?: string) {
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

export async function listSessionBranches() {
  const { data } = await octokit.git.listMatchingRefs({
    owner,
    repo,
    ref: "heads/gitagent/session-",
  })
  return data.map((branchRef) => branchRef.ref.replace("refs/heads/", ""))
}

export async function listFilesChangedFromMain(branch: string) {
  const { data } = await octokit.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead: `main...${branch}`,
  })
  return data.files ?? []
}

// What a session branch proposes: the claim it worked on, and the rule it adds, if any.
export async function readSessionProposal(branch: string) {
  const changedFiles = await listFilesChangedFromMain(branch)
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
    proposedRule: addedRuleLine ? parseRule(addedRuleLine.slice(1)) : null,
  }
}

export async function findPendingLesson() {
  for (const branch of await listSessionBranches()) {
    const { proposedRule } = await readSessionProposal(branch)
    if (proposedRule) return { branch, proposedRule }
  }
  return null
}

// Passing null as contents deletes the file.
export async function writeFile(
  path: string,
  contents: string | null,
  message: string,
  branch = "main"
) {
  const existingFile = await readFile(path, branch)
  if (contents === null) {
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
    return
  }
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

export async function deleteBranch(branch: string) {
  await octokit.git.deleteRef({ owner, repo, ref: `heads/${branch}` })
}

export async function mergeIntoMain(branch: string, message: string) {
  for (const file of await listFilesChangedFromMain(branch)) {
    for (const path of [file.filename, file.previous_filename]) {
      if (path && !isAllowedPath(path)) {
        throw new Error(`The agent changed ${path}, which it may not change.`)
      }
    }
  }

  const [mainRulesFile, branchRulesFile] = await Promise.all([
    readFile("RULES.md"),
    readFile("RULES.md", branch),
  ])
  const rulesChangeProblem = findRulesChangeProblem(
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
  await deleteBranch(branch)
}
