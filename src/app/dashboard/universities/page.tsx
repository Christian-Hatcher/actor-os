"use client"

import { useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="rounded-full bg-primary/10 p-4">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">Add a new university</p>
              <p className="text-sm text-muted-foreground">
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
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{uni.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{uni.department}</p>
                    </div>
                  </div>
                  <Badge className={uni.active ? "bg-green-100 text-green-800" : "bg-gray-100"}>
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
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{uni.student_count} students</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{uni.contact_name}</span>
                  </div>
                  <div>
                    <Badge variant="outline">{uni.license_tier}</Badge>
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
