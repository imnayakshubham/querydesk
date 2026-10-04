import Link from "next/link"
import { connection } from "next/server"
import { ActionButton } from "@/components/action-button"
import { CommitHistory } from "@/components/commit-history"
import { RuleEditor } from "@/components/rule-editor"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { loadRules, repoUrl } from "@/lib/desk"
import { isLearnedRule, sessionIdOf, type Rule } from "@/lib/rules"
import { cn } from "@/lib/utils"

export default async function RulesPage() {
  await connection()
  const { ruleGroups, history, proposal } = await loadRules()

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Rulebook</h1>
      <p className="mb-6 text-muted-foreground">
        What each insurer asks for. The agent proposes rules; the desk decides
        which ones become permanent.
      </p>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Proposed rule</CardTitle>
          </CardHeader>
          <CardContent>
            {proposal ? (
              <ProposalReview proposal={proposal} />
            ) : (
              <p className="text-muted-foreground">
                No rule is waiting for review. Propose one from a claim with an
                approved reply.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-[3fr_2fr] gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Current rules</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {ruleGroups.map((group) => (
                <section key={group.title} className="flex flex-col gap-3">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    {group.title} · {group.rules.length}{" "}
                    {group.rules.length === 1 ? "rule" : "rules"}
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {group.rules.map((rule) => (
                      <RuleRow key={rule.id} rule={rule} />
                    ))}
                  </ul>
                </section>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <CommitHistory
                commits={history}
                emptyMessage="No rule changes yet."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

function RuleRow({ rule }: { rule: Rule }) {
  const isLearned = isLearnedRule(rule)
  return (
    <li className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <span>
          <span className="mr-2 font-mono text-xs text-muted-foreground">
            {rule.id}
          </span>
          {capitalise(rule.when)} → {rule.require}
        </span>
        {isLearned && (
          <span className="self-start rounded-md bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
            Learned from {rule.source}
          </span>
        )}
      </div>
      {isLearned && (
        <ActionButton
          endpoint={`/api/rules/${rule.id}/revert`}
          variant="destructive"
          label="Revert"
          workingLabel="Reverting…"
          successMessage="Reverted on main."
        />
      )}
    </li>
  )
}

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

type Proposal = NonNullable<Awaited<ReturnType<typeof loadRules>>["proposal"]>

function ProposalReview({ proposal }: { proposal: Proposal }) {
  const { branch, proposedRule, rulesDiff, lesson, impactPreview } = proposal
  const sessionId = sessionIdOf(branch)
  const changedLines = rulesDiff
    .split("\n")
    .filter((diffLine) => diffLine.startsWith("+") || diffLine.startsWith("-"))

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        Proposed by the agent on{" "}
        <a
          href={`${repoUrl}/tree/${branch}`}
          className="font-mono text-primary hover:underline"
        >
          {branch}
        </a>
        {lesson && (
          <>
            {" "}
            from{" "}
            <Link
              href={`/claims/${lesson.sourceClaim}`}
              className="text-primary hover:underline"
            >
              {lesson.sourceClaim}
            </Link>
          </>
        )}
      </p>

      <pre className="overflow-x-auto rounded-lg border bg-muted p-3 font-mono text-xs">
        {changedLines.map((diffLine) => (
          <div
            key={diffLine}
            className={cn(
              diffLine.startsWith("+") ? "text-success" : "text-destructive"
            )}
          >
            {diffLine}
          </div>
        ))}
      </pre>

      {lesson && <p>{lesson.rationale}</p>}

      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">
          Impact on open claims
        </span>
        {impactPreview ? (
          <ul className="flex flex-col gap-1">
            {impactPreview.map((claimImpact) => (
              <li key={claimImpact.claim}>
                <span className="font-mono">{claimImpact.claim}</span>{" "}
                <span
                  className={
                    claimImpact.flagged
                      ? "text-warning"
                      : "text-muted-foreground"
                  }
                >
                  {claimImpact.flagged ? "would be flagged" : "not affected"}
                </span>{" "}
                · {claimImpact.reason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Not previewed yet.</p>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <ActionButton
          endpoint={`/api/sessions/${sessionId}/impact`}
          variant="outline"
          label={impactPreview ? "Preview again" : "Preview impact"}
          workingLabel="Agent is checking open claims…"
          successMessage="Impact preview ready."
        />
        <RuleEditor sessionId={sessionId} rule={proposedRule} />
        <ActionButton
          endpoint={`/api/sessions/${sessionId}/approve`}
          label="Approve"
          workingLabel="Merging into main…"
          successMessage="Rule added to the rulebook."
        />
        <ActionButton
          endpoint={`/api/sessions/${sessionId}/reject`}
          variant="destructive"
          label="Reject"
          workingLabel="Discarding the proposal…"
          successMessage="Proposal rejected and logged."
        />
      </div>
    </div>
  )
}
