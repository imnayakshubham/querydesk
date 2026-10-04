import { Badge } from "@/components/ui/badge"
import type { Actor, ClaimStatus } from "@/lib/desk"
import { cn } from "@/lib/utils"

type Tone = "neutral" | "accent" | "success" | "warning" | "dark"

const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  accent: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  dark: "bg-foreground text-background",
}

function ToneBadge({
  tone,
  children,
}: {
  tone: Tone
  children: React.ReactNode
}) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", toneClasses[tone])}
    >
      {children}
    </Badge>
  )
}

const statusTones: Record<ClaimStatus, Tone> = {
  "Not checked": "neutral",
  "Documents missing": "warning",
  "Ready to send": "success",
  "Query open": "warning",
  "Reply waiting for review": "accent",
}

export function StatusBadge({ status }: { status: ClaimStatus }) {
  return <ToneBadge tone={statusTones[status]}>{status}</ToneBadge>
}

const actorTones: Record<Actor, Tone> = {
  agent: "accent",
  desk: "dark",
  system: "neutral",
}

export function ActorBadge({ actor }: { actor: Actor }) {
  return <ToneBadge tone={actorTones[actor]}>{actor}</ToneBadge>
}

export function DocumentBadge({ present }: { present: boolean }) {
  return (
    <ToneBadge tone={present ? "success" : "warning"}>
      {present ? "present" : "missing"}
    </ToneBadge>
  )
}
