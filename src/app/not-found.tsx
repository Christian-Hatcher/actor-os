import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Clapperboard, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-2">
          <Clapperboard className="h-8 w-8" />
          <span className="text-2xl font-bold">Actor OS</span>
        </div>
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-xl text-muted-foreground">
          This scene isn't in the script.
        </p>
        <Button asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
