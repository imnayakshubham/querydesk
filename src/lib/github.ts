import { Octokit } from "@octokit/rest"
import { checkRulesChange, isAllowedPath } from "@/lib/rules"

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
const [owner, repo] = process.env.GITHUB_REPO!.split("/")
const committer = {
  name: process.env.GIT_AUTHOR_NAME!,
  email: process.env.GIT_AUTHOR_EMAIL!,
}

function statusOf(error: unknown) {
  return (error as { status?: number }).status
}

export async function readFile(path: string, ref = "main") {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref })
    if (Array.isArray(data) || data.type !== "file") return null
    return {
      text: Buffer.from(data.content, "base64").toString("utf8"),
      sha: data.sha,
    }
  } catch (error) {
    if (statusOf(error) === 404) return null
    throw error
  }
}

export async function listCommits(path: string) {
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
  return data.map((ref) => ref.ref.replace("refs/heads/", ""))
}

export async function compareWithMain(branch: string) {
  const { data } = await octokit.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead: `main...${branch}`,
  })
  return data.files ?? []
}

// Passing null as text deletes the file.
export async function writeFile(
  path: string,
  text: string | null,
  message: string,
  branch = "main"
) {
  const existing = await readFile(path, branch)
  if (text === null) {
    if (!existing) return
    await octokit.repos.deleteFile({
      owner,
      repo,
      path,
      message,
      branch,
      sha: existing.sha,
      committer,
      author: committer,
    })
    return
  }
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    branch,
    content: Buffer.from(text).toString("base64"),
    sha: existing?.sha,
    committer,
    author: committer,
  })
}

export async function deleteBranch(branch: string) {
  await octokit.git.deleteRef({ owner, repo, ref: `heads/${branch}` })
}

export async function mergeIntoMain(branch: string, message: string) {
  for (const file of await compareWithMain(branch)) {
    for (const path of [file.filename, file.previous_filename]) {
      if (path && !isAllowedPath(path)) {
        throw new Error(`The agent changed ${path}, which it may not change.`)
      }
    }
  }

  const [mainRules, branchRules] = await Promise.all([
    readFile("RULES.md"),
    readFile("RULES.md", branch),
  ])
  const problem = checkRulesChange(mainRules!.text, branchRules!.text)
  if (problem) throw new Error(problem)

  try {
    await octokit.repos.merge({
      owner,
      repo,
      base: "main",
      head: branch,
      commit_message: message,
    })
  } catch (error) {
    if (statusOf(error) === 409) {
      throw new Error("This proposal is out of date. Run it again.")
    }
    throw error
  }
  await deleteBranch(branch)
}
