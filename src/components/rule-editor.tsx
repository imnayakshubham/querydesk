"use client"

import { useState } from "react"
import { ActionButton } from "@/components/action-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Rule } from "@/lib/rules"

export function RuleEditor({
  sessionId,
  rule,
}: {
  sessionId: string
  rule: Rule
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [when, setWhen] = useState(rule.when)
  const [require, setRequire] = useState(rule.require)

  if (!isEditing) {
    return (
      <Button variant="outline" onClick={() => setIsEditing(true)}>
        Edit wording
      </Button>
    )
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border p-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">When</span>
        <Input
          value={when}
          maxLength={120}
          onChange={(event) => setWhen(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Require</span>
        <Input
          value={require}
          maxLength={120}
          onChange={(event) => setRequire(event.target.value)}
        />
      </label>
      <div className="flex gap-2">
        <ActionButton
          endpoint={`/api/sessions/${sessionId}/edit`}
          requestBody={{ when, require }}
          label="Save wording"
          workingLabel="Saving to the agent's branch…"
          successMessage="Saved as a desk commit on the agent's branch."
        />
        <Button variant="outline" onClick={() => setIsEditing(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
