"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Clapperboard, FileText, Users, Video, ArrowRight, Star, Mail, Calendar } from "lucide-react"

export default function LandingPage() {
  const [annual, setAnnual] = useState(true)

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Clapperboard className="h-6 w-6" />
            <span className="text-xl font-bold">Actor OS</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</a>
            <a href="#universities" className="text-sm text-muted-foreground hover:text-foreground">Universities</a>
          </nav>
          <div className="flex gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-24 text-center">
          <Badge className="mb-4">Built by a working actor in Tokyo</Badge>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-6">
            Auditions from your email,
            <br />
            <span className="text-primary">automatically</span>
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Connect Gmail and Actor OS builds your audition pipeline for you.
            Every casting email becomes a tracked audition with deadlines,
            callbacks, and self-tape due dates. No more spreadsheets.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/dashboard">See Demo</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required. 14-day free trial.
          </p>
        </section>

        {/* Features */}
        <section id="features" className="bg-muted py-12 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">The spreadsheet dies here</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Actor OS does what spreadsheets can&apos;t: it fills itself in.
                Connect your email and your pipeline builds automatically.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-primary">
                <CardHeader>
                  <Mail className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Email Auto-Import</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Connect Gmail. Casting emails are automatically parsed
                    into auditions with project name, role, deadline, and casting director.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary">
                <CardHeader>
                  <Clapperboard className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Casting Pipeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Every audition tracked from received to booked.
                    See your full pipeline at a glance. Never lose track of a callback.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary">
                <CardHeader>
                  <Calendar className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Deadline Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Self-tape due dates, callback times, and shoot dates
                    all in one place. Know what&apos;s coming up today, this week, this month.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Video className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Self-Tape Partner</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Track takes, manage deadlines, and organize
                    every self-tape submission in one place.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <FileText className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>AI Contract Reader</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Paste any contract. AI spots red flags, explains key clauses,
                    and tells you what to ask your agent. 60 seconds.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Users className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Outreach CRM</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Track casting directors, agents, and collaborators.
                    Log every interaction. Stay top of mind.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="container mx-auto px-4 sm:px-6 py-12 sm:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple pricing</h2>
            <p className="text-muted-foreground">
              Less than the cost of one headshot. Built for working actors.
            </p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3 bg-muted rounded-lg p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  !annual ? "bg-background shadow" : "text-muted-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  annual ? "bg-background shadow" : "text-muted-foreground"
                }`}
              >
                Annual
                <Badge variant="secondary" className="ml-2">Save 25%</Badge>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <Card className={`${annual ? "border-primary" : ""}`}>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Annual</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$90</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  $7.50/month — save $30
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Unlimited auditions",
                    "Self-tape deadline tracker",
                    "Unlimited AI contract analysis",
                    "Outreach CRM",
                    "Priority support",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full mt-6" size="lg" asChild>
                  <Link href="/signup?plan=annual">Start 14-day trial</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className={`${!annual ? "border-primary" : ""}`}>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Monthly</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$10</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Cancel anytime. No questions asked.
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Unlimited auditions",
                    "Self-tape deadline tracker",
                    "Unlimited AI contract analysis",
                    "Outreach CRM",
                    "Email support",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full mt-6" variant="outline" size="lg" asChild>
                  <Link href="/signup?plan=monthly">Start 14-day trial</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Universities */}
        <section id="universities" className="bg-muted py-12 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 text-center">
            <Badge className="mb-4">Phase 2 — Coming Fall 2026</Badge>
            <h2 className="text-3xl font-bold mb-4">University Licensing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Actor OS for every student in your department.
              Bulk pricing, admin dashboards, and career tracking
              from freshman year to graduation.
            </p>

            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Standard</CardTitle>
                  <div className="text-2xl font-bold">$500</div>
                  <p className="text-sm text-muted-foreground">/year per department</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Up to 50 students</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Premium</CardTitle>
                  <div className="text-2xl font-bold">$1,200</div>
                  <p className="text-sm text-muted-foreground">/year per department</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Up to 150 students + admin analytics</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Enterprise</CardTitle>
                  <div className="text-2xl font-bold">Custom</div>
                  <p className="text-sm text-muted-foreground">Full drama school</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Unlimited + custom integrations</p>
                </CardContent>
              </Card>
            </div>

            <Button className="mt-8" variant="outline" asChild>
              <Link href="mailto:hatcher.actor@gmail.com?subject=Actor%20OS%20University%20Licensing">
                Contact for University Pilot
              </Link>
            </Button>
          </div>
        </section>

        {/* Testimonial */}
        <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-24 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <blockquote className="text-base sm:text-xl italic mb-4">
              "I went from missing callbacks to booking 4 jobs in 3 months.
              Actor OS keeps my entire career organized in one place."
            </blockquote>
            <cite className="text-sm text-muted-foreground not-italic">
              — Christian Hatcher, Actor / Stuntman, Tokyo
            </cite>
          </div>
        </section>
      </main>

      <footer className="border-t py-12">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Clapperboard className="h-5 w-5" />
            <span className="font-bold">Actor OS</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 At Home Reelz K.K. • Built in Tokyo 🇯🇵
          </p>
          <div className="flex gap-4">
            <a href="mailto:hatcher.actor@gmail.com" className="text-sm text-muted-foreground hover:text-foreground">Support</a>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
