import {
  findRuleAwaitingReview,
  listAgentProposals,
  listClaimIds,
  listRecentCommitsOnMain,
  readClaim,
  readRepoFile,
  readRulebook,
  type Claim,
} from "@/lib/github"
import { parseRulebook, type Rule } from "@/lib/rules"

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

export type Actor = "agent" | "desk" | "system"
export type ClaimStatus =
  | "Not checked"
  | "Documents missing"
  | "Ready to send"
  | "Query open"
  | "Reply waiting for review"

type AgentProposals = Awaited<ReturnType<typeof listAgentProposals>>

export const repoUrl = `https://github.com/${process.env.GITHUB_REPO}`

async function readRepoJson<T>(path: string, branch = "main") {
  const file = await readRepoFile(path, branch)
  return file ? (JSON.parse(file.text) as T) : null
}

async function lastCommitDateOnMain(path: string) {
  const [latestCommit] = await listRecentCommitsOnMain(path)
  return latestCommit?.date ?? null
}

// GitAgent's own commits ("gitagent: auto-commit", memory notes) carry no prefix of ours.
export function actorOf(commitMessage: string): Actor {
  const prefix = commitMessage.split(":")[0]
  return prefix === "desk" || prefix === "system" ? prefix : "agent"
}

function claimStatusOf(
  checklist: Checklist | null,
  queryIsOpen: boolean,
  hasDraftReply: boolean
): ClaimStatus {
  if (hasDraftReply) return "Reply waiting for review"
  if (queryIsOpen) return "Query open"
  if (!checklist) return "Not checked"
  if (checklist.missing.length > 0) return "Documents missing"
  return "Ready to send"
}

function findReplyBranch(proposals: AgentProposals, claimId: string) {
  return proposals.find(
    (proposal) => proposal.claimId === claimId && proposal.draftsReply
  )?.branch
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
  // Commits from building the app (dev:) are not desk activity.
  return [...commitsBySha.values()]
    .filter((commit) => !commit.message.startsWith("dev:"))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .map((commit) => ({ ...commit, actor: actorOf(commit.message) }))
}

// A query is answered when a reply was committed to main after it arrived.
export async function readClaimState(claimId: string) {
  const [checklist, insurerQuery, approvedReply, queryDate, replyDate] =
    await Promise.all([
      readRepoJson<Checklist>(`claims/${claimId}/checklist.json`),
      readRepoJson<InsurerQuery>(`claims/${claimId}/query.json`),
      readRepoJson<Reply>(`claims/${claimId}/reply.json`),
      lastCommitDateOnMain(`claims/${claimId}/query.json`),
      lastCommitDateOnMain(`claims/${claimId}/reply.json`),
    ])
  const queryIsAnswered =
    !!queryDate && !!replyDate && replyDate.localeCompare(queryDate) > 0
  return {
    checklist,
    insurerQuery,
    approvedReply,
    openQuery: queryIsAnswered ? null : (insurerQuery?.query ?? null),
    queryIsAnswered,
  }
}

// The queue shows the desk's most urgent work first.
const STATUSES_BY_URGENCY: ClaimStatus[] = [
  "Reply waiting for review",
  "Query open",
  "Documents missing",
  "Not checked",
  "Ready to send",
]

function nextStepFor(status: ClaimStatus, missingDocuments: string[]) {
  switch (status) {
    case "Reply waiting for review":
      return "Review the draft reply"
    case "Query open":
      return "Draft a reply"
    case "Documents missing":
      return `Collect: ${missingDocuments.join(", ")}`
    case "Not checked":
      return "Check the claim"
    case "Ready to send":
      return "Ready to send to the insurer"
  }
}

export async function loadQueue() {
  const [claimIds, proposals] = await Promise.all([
    listClaimIds(),
    listAgentProposals(),
  ])
  const queue = await Promise.all(
    claimIds.map(async (claimId) => {
      const [claim, { checklist, openQuery }] = await Promise.all([
        readClaim(claimId),
        readClaimState(claimId),
      ])
      const status = claimStatusOf(
        checklist,
        openQuery !== null,
        !!findReplyBranch(proposals, claimId)
      )
      return {
        claim,
        status,
        openQuery,
        nextStep: nextStepFor(status, checklist?.missing ?? []),
      }
    })
  )
  return queue.sort(
    (a, b) =>
      STATUSES_BY_URGENCY.indexOf(a.status) -
        STATUSES_BY_URGENCY.indexOf(b.status) ||
      a.claim.id.localeCompare(b.claim.id)
  )
}

// Returns null when the claim doesn't exist, so the page can show "not found".
export async function loadClaim(claimId: string) {
  const claim = await readRepoJson<Claim>(`claims/${claimId}/claim.json`)
  if (!claim) return null
  const [claimState, proposals, timeline] = await Promise.all([
    readClaimState(claimId),
    listAgentProposals(),
    historyOf(`claims/${claimId}`, new RegExp(`\\b${claimId}\\b`)),
  ])
  const replyBranch = findReplyBranch(proposals, claimId)
  const draftReply = replyBranch
    ? await readRepoJson<Reply>(`claims/${claimId}/reply.json`, replyBranch)
    : null

  return {
    claim,
    ...claimState,
    status: claimStatusOf(
      claimState.checklist,
      claimState.openQuery !== null,
      !!replyBranch
    ),
    replyBranch,
    draftReply,
    ruleAwaitingReview: findRuleAwaitingReview(proposals),
    timeline,
  }
}

// Insurers in the order the rulebook lists them; rules for any insurer last.
function groupRulesByInsurer(rules: Rule[]) {
  const rulesByInsurer = Map.groupBy(rules, (rule) => rule.insurer)
  const insurerGroups = [...rulesByInsurer]
    .filter(([insurer]) => insurer !== "Any")
    .map(([insurer, insurerRules]) => ({ title: insurer, rules: insurerRules }))
  const rulesForAnyInsurer = rulesByInsurer.get("Any")
  return rulesForAnyInsurer
    ? [...insurerGroups, { title: "All insurers", rules: rulesForAnyInsurer }]
    : insurerGroups
}

export async function loadRules() {
  const [rulebook, proposals, history] = await Promise.all([
    readRulebook(),
    listAgentProposals(),
    historyOf("RULES.md", /\brule R-\d{3}\b/),
  ])
  const ruleGroups = groupRulesByInsurer(parseRulebook(rulebook))
  const ruleProposal = proposals.find((proposal) => proposal.proposedRule)
  if (!ruleProposal?.proposedRule) {
    return { ruleGroups, history, proposal: null }
  }

  const { branch, proposedRule, changedFiles } = ruleProposal
  const [lesson, impactPreview] = await Promise.all([
    readRepoJson<Lesson>(`lessons/${proposedRule.id}.json`, branch),
    readRepoJson<ImpactPreview>(
      `lessons/${proposedRule.id}-impact.json`,
      branch
    ),
  ])
  const rulesDiff =
    changedFiles.find((file) => file.filename === "RULES.md")?.patch ?? ""
  return {
    ruleGroups,
    history,
    proposal: { branch, proposedRule, rulesDiff, lesson, impactPreview },
  }
}
