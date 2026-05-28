"use client"

import { useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, GraduationCap, Users, Mail, CheckCircle } from "lucide-react"

const MOCK_UNIVERSITIES = [
  {
    id: "1",
    name: "University of Alabama",
    department: "Department of Theatre & Dance",
    contact_name: "Prof. Sarah Mitchell",
    contact_email: "smitchell@ua.edu",
    license_tier: "standard",
    student_count: 45,
    active: true,
  },
  {
    id: "2",
    name: "NYU Tisch School",
    department: "Acting Program",
    contact_name: "James Rodriguez",
    contact_email: "j.rodriguez@nyu.edu",
    license_tier: "premium",
    student_count: 120,
    active: true,
  },
]

export default function UniversitiesPage() {
  const [universities] = useState(MOCK_UNIVERSITIES)

  return (
    <DashboardShell>
      <DashboardHeader
        heading="University Licensing"
        text="Manage institutional subscriptions and student access."
      />

      <div className="grid gap-6">
        <Card className="border-dashed border-rule-strong">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="rounded-full bg-amber/[0.12] p-4">
              <GraduationCap className="h-8 w-8 text-amber" />
            </div>
            <div className="text-center">
              <p className="font-medium text-paper">Add a new university</p>
              <p className="text-sm text-paper-dim">
                Create an institutional license for a drama department or school.
              </p>
            </div>
            <Button>Request Pilot Access</Button>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {universities.map((uni) => (
            <Card key={uni.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-paper-dim" />
                    <div>
                      <CardTitle className="text-base">{uni.name}</CardTitle>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-faint">
                        {uni.department}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={
                      uni.active
                        ? "border-green/40 bg-green/[0.12] text-green"
                        : "border-rule bg-bg3 text-paper-faint"
                    }
                  >
                    {uni.active ? (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Active
                      </>
                    ) : (
                      "Inactive"
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-paper-dim" />
                    <span className="text-sm text-paper">{uni.student_count} students</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-paper-dim" />
                    <span className="text-sm text-paper">{uni.contact_name}</span>
                  </div>
                  <div>
                    <Badge variant="outline" className="font-mono uppercase tracking-[0.12em]">
                      {uni.license_tier}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardShell>
  )
}
