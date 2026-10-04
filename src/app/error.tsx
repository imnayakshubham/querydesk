"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <Alert variant="destructive" className="flex flex-col gap-3">
      <AlertTitle>Could not load the desk from GitHub</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
      <Button variant="outline" className="self-start" onClick={reset}>
        Try again
      </Button>
    </Alert>
  )
}
