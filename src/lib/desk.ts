import {
  findRuleAwaitingReview,
  listAgentBranches,
  listClaimIds,
  listFilesChangedByAgent,
  listRecentCommitsOnMain,
  readAgentProposal,
  readClaim,
  readRepoFile,
  type Claim,
} from "@/lib/github"
import { parseRuleLine, type Rule } from "@/lib/rules"

export type Checklist = {
  items: { document: string; rule: string; present: boolean }[]
  missing: string[]
  summary: string
}
export type InsurerQuery = { query: string }
export type Reply = {
  query: string
  reply: string
  attach: { document: string; present: boolean }[]
  rules: string[]
}
export type Lesson = {
  rule: string
  sourceClaim: string
  query: string
  rationale: string
}
export type ImpactPreview = {
  claim: string
  flagged: boolean
  reason: string
}[]

export type Actor = "agent" | "desk" | "system" | "dev"
export type ClaimStatus =
  | "Not checked"
  | "Documents missing"
  | "Ready to send"
  | "Query open"
  | "Reply waiting for review"

export const repoUrl = `https://github.com/${process.env.GITHUB_REPO}`

async function readRepoJson<T>(path: string, branch = "main") {
  const file = await readRepoFile(path, branch)
  return file ? (JSON.parse(file.text) as T) : null
}

// GitAgent's own commits ("gitagent: auto-commit", memory notes) carry no prefix of ours.
export function actorOf(commitMessage: string): Actor {
  const prefix = commitMessage.split(":")[0]
  return prefix === "desk" || prefix === "system" || prefix === "dev"
    ? prefix
    : "agent"
}

function claimStatusOf(
  checklist: Checklist | null,
  insurerQuery: InsurerQuery | null,
  approvedReply: Reply | null,
  replyBranch: string | undefined
): ClaimStatus {
  if (replyBranch) return "Reply waiting for review"
  if (insurerQuery && approvedReply?.query !== insurerQuery.query) {
    return "Query open"
  }
  if (!checklist) return "Not checked"
  if (checklist.missing.length > 0) return "Documents missing"
  return "Ready to send"
}

// An agent branch that changes a claim's reply.json is a draft waiting for review.
async function findReplyBranchesByClaimId() {
  const replyBranchByClaimId = new Map<string, string>()
  for (const branch of await listAgentBranches()) {
    const { claimId, changedFiles } = await readAgentProposal(branch)
    const changesReply = changedFiles.some(
      (file) => file.filename === `claims/${claimId}/reply.json`
    )
    if (claimId && changesReply) replyBranchByClaimId.set(claimId, branch)
  }
  return replyBranchByClaimId
}

// Git hides merge commits (approvals) from a path-filtered history, so the
// history is the path's commits plus every recent commit that names the subject.
async function historyOf(path: string, subject: RegExp) {
  const [pathCommits, recentCommits] = await Promise.all([
    listRecentCommitsOnMain(path),
    listRecentCommitsOnMain(),
  ])
  const commitsBySha = new Map(
    [
      ...pathCommits,
      ...recentCommits.filter((commit) => subject.test(commit.message)),
    ].map((commit) => [commit.sha, commit])
  )
  return [...commitsBySha.values()]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .map((commit) => ({ ...commit, actor: actorOf(commit.message) }))
}

async function readClaimFiles(claimId: string) {
  const [checklist, insurerQuery, approvedReply] = await Promise.all([
    readRepoJson<Checklist>(`claims/${claimId}/checklist.json`),
    readRepoJson<InsurerQuery>(`claims/${claimId}/query.json`),
    readRepoJson<Reply>(`claims/${claimId}/reply.json`),
  ])
  return { checklist, insurerQuery, approvedReply }
}

export async function loadQueue() {
  const [claimIds, replyBranchByClaimId] = await Promise.all([
    listClaimIds(),
    findReplyBranchesByClaimId(),
  ])
  return Promise.all(
    claimIds.map(async (claimId) => {
      const [claim, claimFiles, queryCommits] = await Promise.all([
        readClaim(claimId),
        readClaimFiles(claimId),
        listRecentCommitsOnMain(`claims/${claimId}/query.json`),
      ])
      const status = claimStatusOf(
        claimFiles.checklist,
        claimFiles.insurerQuery,
        claimFiles.approvedReply,
        replyBranchByClaimId.get(claimId)
      )
      return { claim, status, queryCount: queryCommits.length }
    })
  )
}

// Returns null when the claim doesn't exist, so the page can show "not found".
export async function loadClaim(claimId: string) {
  const claim = await readRepoJson<Claim>(`claims/${claimId}/claim.json`)
  if (!claim) return null
  const [claimFiles, replyBranchByClaimId, ruleAwaitingReview, timeline] =
    await Promise.all([
      readClaimFiles(claimId),
      findReplyBranchesByClaimId(),
      findRuleAwaitingReview(),
      historyOf(`claims/${claimId}`, new RegExp(`\\b${claimId}\\b`)),
    ])
  const replyBranch = replyBranchByClaimId.get(claimId)
  const draftReply = replyBranch
    ? await readRepoJson<Reply>(`claims/${claimId}/reply.json`, replyBranch)
    : null
  const replyAnswersCurrentQuery =
    !!claimFiles.approvedReply &&
    claimFiles.approvedReply.query === claimFiles.insurerQuery?.query

  return {
    claim,
    ...claimFiles,
    status: claimStatusOf(
      claimFiles.checklist,
      claimFiles.insurerQuery,
      claimFiles.approvedReply,
      replyBranch
    ),
    replyBranch,
    draftReply,
    replyAnswersCurrentQuery,
    ruleAwaitingReview,
    timeline,
  }
}

export async function loadRules() {
  const [rulesFile, ruleAwaitingReview, history] = await Promise.all([
    readRepoFile("RULES.md"),
    findRuleAwaitingReview(),
    historyOf("RULES.md", /\brule R-\d{3}\b/),
  ])
  const rules = rulesFile!.text
    .split("\n")
    .map(parseRuleLine)
    .filter((rule): rule is Rule => rule !== null)

  if (!ruleAwaitingReview) return { rules, history, proposal: null }

  const { branch, proposedRule } = ruleAwaitingReview
  const [changedFiles, lesson, impactPreview] = await Promise.all([
    listFilesChangedByAgent(branch),
    readRepoJson<Lesson>(`lessons/${proposedRule.id}.json`, branch),
    readRepoJson<ImpactPreview>(
      `lessons/${proposedRule.id}-impact.json`,
      branch
    ),
  ])
  const rulesDiff =
    changedFiles.find((file) => file.filename === "RULES.md")?.patch ?? ""
  return {
    rules,
    history,
    proposal: { branch, proposedRule, rulesDiff, lesson, impactPreview },
  }
}
