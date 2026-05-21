"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold">Something went wrong</h2>
        <p className="text-muted-foreground max-w-md">{error.message}</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}
