"use client"

import { useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Building2, Mail, ExternalLink } from "lucide-react"

export default function SettingsPage() {
  const [agencyName, setAgencyName] = useState("BAYSIDE / Liliana Models")
  const [agencyEmail, setAgencyEmail] = useState("info@bay-side.biz")
  const [loading, setLoading] = useState(false)

  const subscription = {
    tier: "monthly",
    status: "active",
    currentPeriodEnd: "2026-06-21",
    price: "$5",
  }

  async function handleUpdateProfile() {
    setLoading(true)
    // TODO: Supabase update
    setTimeout(() => setLoading(false), 500)
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Settings"
        text="Manage your profile, agency info, and subscription."
      />

      <div className="grid gap-6 max-w-2xl">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input value="Christian Hatcher" disabled />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input value="hatcher.actor@gmail.com" disabled />
            </div>
          </CardContent>
        </Card>

        {/* Agency */}
        <Card>
          <CardHeader>
            <CardTitle>Agency Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Agency Name</label>
              <div className="relative">
                <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Agency Email</label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={agencyEmail}
                  onChange={(e) => setAgencyEmail(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleUpdateProfile} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Subscription</CardTitle>
              <Badge
                className={
                  subscription.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }
              >
                {subscription.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Actor OS {subscription.tier}</p>
                <p className="text-sm text-muted-foreground">
                  Renews on {subscription.currentPeriodEnd}
                </p>
              </div>
              <div className="text-2xl font-bold">{subscription.price}</div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <CreditCard className="mr-2 h-4 w-4" />
                Update Payment
              </Button>
              <Button variant="outline" className="flex-1">
                <ExternalLink className="mr-2 h-4 w-4" />
                Billing Portal
              </Button>
            </div>

            <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">
              Cancel Subscription
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
