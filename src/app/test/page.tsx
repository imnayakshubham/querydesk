"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

const actions = ["packet-check", "query-reply", "propose-lesson", "impact-preview"]

export default function TestPage() {
  const [running, setRunning] = useState("")
  const [branch, setBranch] = useState("")
  const [result, setResult] = useState("")

  async function run(action: string) {
    setRunning(action)
    try {
      const response = await fetch("/api/spike", {
        method: "POST",
        body: JSON.stringify({ action, branch: action === "impact-preview" ? branch : "" }),
      })
      setResult(JSON.stringify(await response.json(), null, 2))
    } catch (error) {
      setResult(String(error))
    }
    setRunning("")
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-start gap-4 p-8">
      <h1 className="text-xl font-semibold">GitAgent action test</h1>
      <input
        className="w-full rounded-lg border px-3 py-1.5 text-sm"
        placeholder="Lesson branch for impact-preview, e.g. gitagent/session-1a2b3c4d"
        value={branch}
        onChange={(event) => setBranch(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button key={action} onClick={() => run(action)} disabled={!!running}>
            {running === action ? "Running…" : action}
          </Button>
        ))}
      </div>
      {result && (
        <pre className="w-full overflow-x-auto rounded-lg border bg-muted p-3 text-xs">
          {result}
        </pre>
      )}
    </main>
  )
}
