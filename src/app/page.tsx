"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Clapperboard,
  FileText,
  Users,
  Video,
  ArrowRight,
  Star,
  Check,
  DollarSign,
  Mail,
  BarChart3,
} from "lucide-react"

export default function LandingPage() {
  const [annual, setAnnual] = useState(true)

  return (
    <div className="flex flex-col min-h-screen bg-bg text-paper font-[family-name:var(--font-inter)]">
      {/* ── Nav ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-rule bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Clapperboard className="h-6 w-6 text-amber" />
            <span className="text-xl font-semibold tracking-tight">Actor OS</span>
          </div>
          <nav className="hidden md:flex gap-8">
            <a href="#features" className="text-sm text-paper-dim hover:text-paper transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-paper-dim hover:text-paper transition-colors">Pricing</a>
            <a href="#universities" className="text-sm text-paper-dim hover:text-paper transition-colors">Universities</a>
          </nav>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="text-sm text-paper-dim hover:text-paper transition-colors px-3 py-2"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium bg-paper text-bg px-4 py-2 rounded-[10px] hover:bg-paper/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          {/* Subtle radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(232,167,85,0.12),transparent)]" />
          <div className="relative mx-auto max-w-4xl px-6 py-28 md:py-40 text-center">
            <span className="inline-block mb-6 font-[family-name:var(--font-jetbrains-mono)] text-xs tracking-widest uppercase text-amber border border-amber/30 rounded-full px-4 py-1.5">
              Built by a working actor in Tokyo
            </span>
            <h1 className="font-[family-name:var(--font-instrument-serif)] text-5xl md:text-7xl leading-[1.1] mb-6">
              Your Acting Career,{" "}
              <span className="text-amber">Organized</span>
            </h1>
            <p className="text-lg md:text-xl text-paper-dim max-w-2xl mx-auto mb-10 leading-relaxed">
              The career command center for student and emerging actors.
              Track auditions, manage self-tapes, read contracts with AI,
              and never miss a callback.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-amber text-bg font-semibold text-base px-8 py-3.5 rounded-[12px] hover:bg-amber/90 transition-colors"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 border border-rule-strong text-paper font-medium text-base px-8 py-3.5 rounded-[12px] hover:bg-bg3 transition-colors"
              >
                Log In
              </Link>
            </div>
            <p className="mt-5 text-sm text-paper-faint">
              No credit card required. 14-day free trial.
            </p>
          </div>
        </section>

        {/* ── Features Grid ── */}
        <section id="features" className="bg-bg2 py-24 md:py-32">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-16">
              <h2 className="font-[family-name:var(--font-instrument-serif)] text-3xl md:text-4xl mb-4">
                Everything you need to book more roles
              </h2>
              <p className="text-paper-dim max-w-xl mx-auto">
                Stop juggling spreadsheets, emails, and sticky notes.
                One dashboard for your entire career.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  icon: Clapperboard,
                  title: "Casting Pipeline",
                  desc: "Track every audition from submission to booking. Agenda view, calendar view, and real-time stats on your callback rate.",
                  color: "text-amber",
                },
                {
                  icon: Video,
                  title: "Self-Tape Partner",
                  desc: "Upload from camera roll or record on the spot. Track deadlines, manage takes, note scene partners. Never miss a submission.",
                  color: "text-blue",
                },
                {
                  icon: FileText,
                  title: "Contract Reader",
                  desc: "AI analyzes any contract in 60 seconds. Red flags, key clauses, plain-English summary, and a letter grade from A to F.",
                  color: "text-green",
                },
                {
                  icon: Users,
                  title: "Outreach CRM",
                  desc: "Contacts auto-populate from your Gmail. Log touchpoints with casting directors and agents. Stay top of mind.",
                  color: "text-purple",
                },
                {
                  icon: DollarSign,
                  title: "Earnings & Tax Keeper",
                  desc: "See your career P&L at a glance. Set income goals, track overtime, and estimate taxes across jurisdictions.",
                  color: "text-green",
                },
                {
                  icon: Mail,
                  title: "Email Ingestion",
                  desc: "Connect Gmail and let AI detect casting emails. One-tap approval turns them into tracked auditions automatically.",
                  color: "text-amber",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="rounded-[14px] border border-rule bg-bg p-6 hover:border-rule-strong transition-colors"
                >
                  <f.icon className={`h-7 w-7 ${f.color} mb-4`} />
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-paper-dim leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Social proof strip ── */}
        <section className="border-y border-rule py-10">
          <div className="mx-auto max-w-4xl px-6 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 text-center">
            <div>
              <div className="font-[family-name:var(--font-instrument-serif)] text-3xl text-amber">$5</div>
              <div className="text-xs text-paper-faint mt-1">per month</div>
            </div>
            <div>
              <div className="font-[family-name:var(--font-instrument-serif)] text-3xl text-amber">6</div>
              <div className="text-xs text-paper-faint mt-1">modules built-in</div>
            </div>
            <div>
              <div className="font-[family-name:var(--font-instrument-serif)] text-3xl text-amber">60s</div>
              <div className="text-xs text-paper-faint mt-1">contract analysis</div>
            </div>
            <div>
              <div className="font-[family-name:var(--font-instrument-serif)] text-3xl text-amber">0</div>
              <div className="text-xs text-paper-faint mt-1">missed callbacks</div>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="py-24 md:py-32">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center mb-12">
              <h2 className="font-[family-name:var(--font-instrument-serif)] text-3xl md:text-4xl mb-4">
                Simple pricing
              </h2>
              <p className="text-paper-dim">
                Less than the cost of one headshot. Built for working actors.
              </p>
            </div>

            {/* Toggle */}
            <div className="flex justify-center mb-10">
              <div className="flex items-center gap-1 bg-bg2 border border-rule rounded-[12px] p-1">
                <button
                  onClick={() => setAnnual(false)}
                  className={`px-5 py-2 rounded-[10px] text-sm font-medium transition-all ${
                    !annual ? "bg-paper text-bg" : "text-paper-faint hover:text-paper"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setAnnual(true)}
                  className={`px-5 py-2 rounded-[10px] text-sm font-medium transition-all flex items-center gap-2 ${
                    annual ? "bg-paper text-bg" : "text-paper-faint hover:text-paper"
                  }`}
                >
                  Annual
                  <span className="text-[10px] bg-amber text-bg font-bold px-2 py-0.5 rounded-full">
                    SAVE 25%
                  </span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Annual */}
              <div
                className={`rounded-[14px] border p-6 transition-all ${
                  annual
                    ? "border-amber bg-bg2 shadow-[0_0_30px_rgba(232,167,85,0.08)]"
                    : "border-rule bg-bg"
                }`}
              >
                {annual && (
                  <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-widest uppercase text-amber mb-4 block">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-semibold mb-1">Annual</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-[family-name:var(--font-instrument-serif)] text-5xl">$45</span>
                  <span className="text-paper-dim">/year</span>
                </div>
                <p className="text-sm text-paper-faint mb-6">${(45 / 12).toFixed(2)}/month — save $15</p>
                <ul className="space-y-3 mb-6">
                  {[
                    "Unlimited auditions & self-tapes",
                    "AI contract analysis (10/month)",
                    "Gmail email ingestion",
                    "Outreach CRM",
                    "Earnings & Tax Keeper",
                    "Priority support",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup?plan=annual"
                  className={`block w-full text-center py-3 rounded-[10px] font-medium text-sm transition-colors ${
                    annual
                      ? "bg-amber text-bg hover:bg-amber/90"
                      : "bg-bg3 text-paper hover:bg-rule-strong"
                  }`}
                >
                  Start 14-day trial
                </Link>
              </div>

              {/* Monthly */}
              <div
                className={`rounded-[14px] border p-6 transition-all ${
                  !annual
                    ? "border-amber bg-bg2 shadow-[0_0_30px_rgba(232,167,85,0.08)]"
                    : "border-rule bg-bg"
                }`}
              >
                <h3 className="text-xl font-semibold mb-1 mt-5">Monthly</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-[family-name:var(--font-instrument-serif)] text-5xl">$5</span>
                  <span className="text-paper-dim">/month</span>
                </div>
                <p className="text-sm text-paper-faint mb-6">Cancel anytime. No questions asked.</p>
                <ul className="space-y-3 mb-6">
                  {[
                    "Unlimited auditions & self-tapes",
                    "AI contract analysis (5/month)",
                    "Gmail email ingestion",
                    "Outreach CRM",
                    "Earnings & Tax Keeper",
                    "Email support",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup?plan=monthly"
                  className={`block w-full text-center py-3 rounded-[10px] font-medium text-sm transition-colors ${
                    !annual
                      ? "bg-amber text-bg hover:bg-amber/90"
                      : "bg-bg3 text-paper hover:bg-rule-strong"
                  }`}
                >
                  Start 14-day trial
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Universities ── */}
        <section id="universities" className="bg-bg2 py-24 md:py-32">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <span className="inline-block mb-6 font-[family-name:var(--font-jetbrains-mono)] text-xs tracking-widest uppercase text-blue border border-blue/30 rounded-full px-4 py-1.5">
              Phase 2 — Fall 2026
            </span>
            <h2 className="font-[family-name:var(--font-instrument-serif)] text-3xl md:text-4xl mb-4">
              University Licensing
            </h2>
            <p className="text-paper-dim max-w-xl mx-auto mb-12">
              Actor OS for every student in your department.
              Bulk pricing, admin dashboards, and career tracking
              from freshman year to graduation.
            </p>

            <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
              {[
                { name: "Standard", price: "$500", sub: "/year", note: "Up to 50 students" },
                { name: "Premium", price: "$1,200", sub: "/year", note: "Up to 150 students + analytics" },
                { name: "Enterprise", price: "Custom", sub: "", note: "Full drama school + integrations" },
              ].map((t) => (
                <div key={t.name} className="rounded-[14px] border border-rule bg-bg p-6">
                  <h3 className="font-semibold mb-2">{t.name}</h3>
                  <div className="font-[family-name:var(--font-instrument-serif)] text-3xl mb-1">
                    {t.price}
                    {t.sub && <span className="text-base text-paper-dim">{t.sub}</span>}
                  </div>
                  <p className="text-sm text-paper-faint">{t.note}</p>
                </div>
              ))}
            </div>

            <a
              href="mailto:hatcher.actor@gmail.com?subject=Actor%20OS%20University%20Licensing"
              className="inline-block mt-10 border border-rule-strong text-paper font-medium text-sm px-6 py-3 rounded-[10px] hover:bg-bg3 transition-colors"
            >
              Contact for University Pilot
            </a>
          </div>
        </section>

        {/* ── Testimonial ── */}
        <section className="py-24">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <div className="flex justify-center mb-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-amber text-amber" />
              ))}
            </div>
            <blockquote className="font-[family-name:var(--font-instrument-serif)] text-2xl md:text-3xl italic leading-relaxed mb-5">
              &ldquo;I went from missing callbacks to booking 4 jobs in 3 months.
              Actor OS keeps my entire career organized in one place.&rdquo;
            </blockquote>
            <cite className="text-sm text-paper-faint not-italic font-[family-name:var(--font-jetbrains-mono)]">
              — Christian Hatcher, Actor / Stuntman, Tokyo
            </cite>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="border-t border-rule py-20">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="font-[family-name:var(--font-instrument-serif)] text-3xl md:text-4xl mb-4">
              Ready to take control of your career?
            </h2>
            <p className="text-paper-dim mb-8">
              Join actors who use Actor OS to stay organized, hit every deadline, and book more roles.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-amber text-bg font-semibold text-base px-8 py-3.5 rounded-[12px] hover:bg-amber/90 transition-colors"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-rule py-10">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-amber" />
            <span className="font-semibold">Actor OS</span>
          </div>
          <p className="text-sm text-paper-faint">
            &copy; 2026 At Home Reelz K.K. &bull; Built in Tokyo
          </p>
          <div className="flex gap-6">
            <a href="mailto:hatcher.actor@gmail.com" className="text-sm text-paper-faint hover:text-paper transition-colors">Support</a>
            <a href="#" className="text-sm text-paper-faint hover:text-paper transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
