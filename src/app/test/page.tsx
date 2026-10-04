"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function TestPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState("")

  async function runSpike() {
    setIsRunning(true)
    try {
      const response = await fetch("/api/spike", { method: "POST" })
      setResult(JSON.stringify(await response.json(), null, 2))
    } catch (error) {
      setResult(String(error))
    }
    setIsRunning(false)
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-start gap-4 p-8">
      <h1 className="text-xl font-semibold">GitAgent spike test</h1>
      <Button onClick={runSpike} disabled={isRunning}>
        {isRunning ? "Running agent…" : "Run test"}
      </Button>
      {result && (
        <pre className="w-full overflow-x-auto rounded-lg border bg-muted p-3 text-xs">
          {result}
        </pre>
      )}
    </main>
  )
}
