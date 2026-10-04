import { ActorBadge } from "@/components/badges"
import { repoUrl, type Actor } from "@/lib/desk"

type HistoryCommit = {
  sha: string
  message: string
  date?: string
  actor: Actor
}

const indianDateTime = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
})

export function CommitHistory({
  commits,
  emptyMessage,
}: {
  commits: HistoryCommit[]
  emptyMessage: string
}) {
  if (commits.length === 0) {
    return <p className="text-muted-foreground">{emptyMessage}</p>
  }
  return (
    <ol className="flex flex-col gap-3">
      {commits.map((commit) => (
        <li key={commit.sha} className="flex items-start gap-3">
          <ActorBadge actor={commit.actor} />
          <div className="flex min-w-0 flex-col">
            <a
              href={`${repoUrl}/commit/${commit.sha}`}
              className="truncate hover:underline"
            >
              {commit.message.split("\n")[0]}
            </a>
            <span className="text-xs text-muted-foreground">
              {commit.date && indianDateTime.format(new Date(commit.date))} ·{" "}
              <span className="font-mono">{commit.sha.slice(0, 7)}</span>
            </span>
          </div>
        </li>
      ))}
    </ol>
  )
}
