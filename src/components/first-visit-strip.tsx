"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"

const DISMISSED_KEY = "querydesk-intro-dismissed"

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange)
  return () => window.removeEventListener("storage", onChange)
}

export function FirstVisitStrip() {
  const isDismissed = useSyncExternalStore(
    subscribeToStorage,
    () => localStorage.getItem(DISMISSED_KEY) === "yes",
    () => true
  )
  if (isDismissed) return null

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "yes")
    window.dispatchEvent(new StorageEvent("storage"))
  }

  return (
    <div className="mb-8 flex items-start justify-between gap-6 rounded-lg border bg-primary/5 p-4">
      <div className="flex flex-col gap-2">
        <p>
          QueryDesk checks cashless claims against insurer rules, helps answer
          insurer queries, and lets your desk decide which agent-learned rules
          become permanent.
        </p>
        <ol className="flex gap-6 text-muted-foreground">
          <li>
            1. Open{" "}
            <Link href="/claims/CLM-001" className="text-primary underline">
              CLM-001
            </Link>{" "}
            and check it
          </li>
          <li>2. Simulate an insurer query and draft the reply</li>
          <li>
            3. Review the proposed rule on{" "}
            <Link href="/rules" className="text-primary underline">
              Rules
            </Link>
          </li>
        </ol>
      </div>
      <Button variant="outline" onClick={dismiss}>
        Got it
      </Button>
    </div>
  )
}
