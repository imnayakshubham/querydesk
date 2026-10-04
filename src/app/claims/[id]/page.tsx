import { connection } from "next/server"
import { notFound } from "next/navigation"
import { ActionButton } from "@/components/action-button"
import { DocumentBadge, StatusBadge } from "@/components/badges"
import { CommitHistory } from "@/components/commit-history"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { loadClaim, repoUrl, type Reply } from "@/lib/desk"
import { isClaimId } from "@/lib/rules"

type PageParams = { params: Promise<{ id: string }> }

export default async function ClaimPage({ params }: PageParams) {
  await connection()
  const { id: claimId } = await params
  const claimView = isClaimId(claimId) ? await loadClaim(claimId) : null
  if (!claimView) notFound()

  const {
    claim,
    status,
    checklist,
    insurerQuery,
    approvedReply,
    replyBranch,
    draftReply,
    replyAnswersCurrentQuery,
    ruleAwaitingReview,
    timeline,
  } = claimView
  const sessionId = replyBranch?.replace("gitagent/session-", "")

  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-semibold">{claim.patient}</h1>
        <StatusBadge status={status} />
      </div>
      <p className="mb-6 text-muted-foreground">
        <span className="font-mono">{claim.id}</span> · {claim.insurer} ·{" "}
        {claim.diagnosis}
        {claim.procedure && ` · ${claim.procedure}`}
        {claim.icuDays > 0 && ` · ICU ${claim.icuDays} days`} · {claim.admitted}{" "}
        to {claim.discharged}
      </p>

      <div className="grid grid-cols-[2fr_3fr] gap-6">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Checklist</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {checklist ? (
                <>
                  <p>{checklist.summary}</p>
                  <ul className="flex flex-col gap-2">
                    {checklist.items.map((item) => (
                      <li key={item.rule} className="flex items-center gap-2">
                        <DocumentBadge present={item.present} />
                        <span>{item.document}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {item.rule}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-muted-foreground">Not checked yet.</p>
              )}
              <ActionButton
                endpoint={`/api/claims/${claim.id}/check`}
                label={checklist ? "Check again" : "Check claim"}
                workingLabel={`Checking ${claim.id} against the rulebook…`}
                successMessage="Check saved to main."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <CommitHistory
                commits={timeline}
                emptyMessage="Nothing has happened on this claim yet."
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Insurer query and reply</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {insurerQuery ? (
              <blockquote className="border-l-2 pl-3">
                {insurerQuery.query}
              </blockquote>
            ) : (
              <p className="text-muted-foreground">
                No insurer query yet. Simulate one from the queue.
              </p>
            )}

            {draftReply && sessionId && (
              <div className="flex flex-col gap-3 rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">
                  Draft reply, waiting for review on{" "}
                  <a
                    href={`${repoUrl}/tree/${replyBranch}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {replyBranch}
                  </a>
                </p>
                <ReplyDetails reply={draftReply} />
                <div className="flex gap-2">
                  <ActionButton
                    endpoint={`/api/sessions/${sessionId}/approve`}
                    label="Approve"
                    workingLabel="Merging into main…"
                    successMessage="Merged into main."
                  />
                  <ActionButton
                    endpoint={`/api/sessions/${sessionId}/reject`}
                    variant="destructive"
                    label="Reject"
                    workingLabel="Discarding the draft…"
                    successMessage="Draft discarded."
                  />
                </div>
              </div>
            )}

            {!draftReply && replyAnswersCurrentQuery && approvedReply && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-success">Approved reply</p>
                <ReplyDetails reply={approvedReply} />
              </div>
            )}

            {insurerQuery && !draftReply && !replyAnswersCurrentQuery && (
              <ActionButton
                endpoint={`/api/claims/${claim.id}/reply`}
                label="Draft reply"
                workingLabel="Agent is drafting the reply…"
                successMessage="Draft ready for review."
              />
            )}

            {replyAnswersCurrentQuery && !ruleAwaitingReview && (
              <ActionButton
                endpoint={`/api/claims/${claim.id}/lesson`}
                variant="outline"
                label="Propose lesson"
                workingLabel="Agent is proposing a rule…"
                successMessage="Rule proposed. Review it on the Rules page."
              />
            )}
            {replyAnswersCurrentQuery && ruleAwaitingReview && (
              <p className="text-muted-foreground">
                A proposed rule is waiting on the Rules page.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function ReplyDetails({ reply }: { reply: Reply }) {
  return (
    <>
      <p className="whitespace-pre-line">{reply.reply}</p>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">Attach</span>
        {reply.attach.map((attachment) => (
          <div key={attachment.document} className="flex items-center gap-2">
            <DocumentBadge present={attachment.present} />
            <span>{attachment.document}</span>
          </div>
        ))}
      </div>
    </>
  )
}
