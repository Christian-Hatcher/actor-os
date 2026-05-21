"use client"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"

export function UserNav() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-medium">{user?.email?.split("@")[0] || "Guest"}</p>
          <p className="text-xs text-muted-foreground">Actor</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={signOut}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  )
}
