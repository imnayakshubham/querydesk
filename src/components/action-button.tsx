"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"

type ActionButtonProps = {
  endpoint: string
  label: string
  workingLabel: string
  successMessage: string
  variant?: "default" | "outline" | "destructive"
  requestBody?: object
}

// Posts to one of the desk's API routes, then refreshes the page to show the new state.
export function ActionButton({
  endpoint,
  label,
  workingLabel,
  successMessage,
  variant = "default",
  requestBody,
}: ActionButtonProps) {
  const router = useRouter()
  const [isWorking, setIsWorking] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [confirmation, setConfirmation] = useState("")

  async function runAction() {
    setIsWorking(true)
    setErrorMessage("")
    setConfirmation("")
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setConfirmation(successMessage)
      router.refresh()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    }
    setIsWorking(false)
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button variant={variant} onClick={runAction} disabled={isWorking}>
        {isWorking ? workingLabel : label}
      </Button>
      {errorMessage && (
        <p className="max-w-md text-xs text-destructive">{errorMessage}</p>
      )}
      {confirmation && <p className="text-xs text-success">{confirmation}</p>}
    </div>
  )
}
