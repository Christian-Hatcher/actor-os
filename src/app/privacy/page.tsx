import Link from "next/link"
import { Clapperboard } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PrivacyPolicy() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Clapperboard className="h-6 w-6" />
            <span className="text-xl font-bold">Actor OS</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 sm:px-6 py-10 sm:py-16 max-w-3xl">
        <h1 className="text-2xl sm:text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">
          Last updated: June 6, 2026
        </p>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>1. Who We Are</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Actor OS is operated by At Home Reelz K.K., a company registered in Tokyo, Japan.
                When this policy refers to "we," "us," or "our," it means At Home Reelz K.K.
              </p>
              <p>
                Contact: <a href="mailto:hatcher.actor@gmail.com" className="underline hover:text-foreground">hatcher.actor@gmail.com</a>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Data We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>We collect the following categories of personal data:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-foreground">Account information:</strong> your name and email address, collected when you sign up or sign in via Google OAuth.
                </li>
                <li>
                  <strong className="text-foreground">Email data:</strong> email metadata and content from your connected Gmail account, used to detect audition notices, callbacks, and casting communications. Access is granted through Google OAuth with your explicit consent.
                </li>
                <li>
                  <strong className="text-foreground">Audition and career data:</strong> information you enter about auditions, self-tapes, contacts, and earnings.
                </li>
                <li>
                  <strong className="text-foreground">Contract text:</strong> contract content you upload or paste for AI-powered analysis.
                </li>
                <li>
                  <strong className="text-foreground">Payment information:</strong> billing details processed by Stripe. We do not store your credit card number on our servers.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. How We Use Your Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ul className="list-disc pl-6 space-y-2">
                <li>To provide and operate the Actor OS service, including audition tracking, self-tape management, and outreach CRM features.</li>
                <li>To parse your Gmail messages for casting-related emails and surface them in your dashboard.</li>
                <li>To analyze contracts using AI and present summaries, red flags, and key clauses.</li>
                <li>To process subscription payments and manage your billing.</li>
                <li>To send transactional emails such as trial reminders and account notifications.</li>
                <li>To improve the service based on aggregated, anonymized usage patterns.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Third-Party Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>We rely on the following third-party services to operate Actor OS:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-foreground">Google (Gmail OAuth):</strong> We request read-only access to your Gmail to detect audition and casting emails. You can revoke access at any time from your{" "}
                  <a href="https://myaccount.google.com/permissions" className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">Google Account permissions</a>.
                </li>
                <li>
                  <strong className="text-foreground">Stripe:</strong> Handles all payment processing. Stripe's privacy policy governs payment data:{" "}
                  <a href="https://stripe.com/privacy" className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">stripe.com/privacy</a>.
                </li>
                <li>
                  <strong className="text-foreground">Groq:</strong> Contract text and email content are sent to Groq's large language model API for analysis. Groq processes data per their{" "}
                  <a href="https://groq.com/privacy-policy/" className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">privacy policy</a>. We do not use your data to train AI models.
                </li>
                <li>
                  <strong className="text-foreground">Supabase:</strong> Our database and authentication provider. Data is stored in Supabase-hosted PostgreSQL with row-level security (RLS) ensuring you can only access your own data.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Data Storage and Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Your data is stored in Supabase-hosted PostgreSQL databases with row-level security (RLS) policies. Each user can only read and write their own records.
              </p>
              <p>
                OAuth tokens for Gmail are stored in our database, protected by RLS. All communication between your browser and our servers uses HTTPS/TLS encryption in transit.
              </p>
              <p>
                While we implement industry-standard security measures, no system is perfectly secure. We encourage you to use a strong, unique password for your Google account.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Data Retention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                We retain your data for as long as your account is active. If you cancel your subscription, your data remains accessible in read-only mode for 90 days, after which it is permanently deleted.
              </p>
              <p>
                You may request immediate deletion at any time (see Your Rights below).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Your Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-foreground">Access:</strong> Request a copy of all personal data we hold about you.
                </li>
                <li>
                  <strong className="text-foreground">Export:</strong> Download your audition data, contacts, and earnings in a standard format.
                </li>
                <li>
                  <strong className="text-foreground">Deletion:</strong> Request permanent deletion of your account and all associated data.
                </li>
                <li>
                  <strong className="text-foreground">Revoke Gmail access:</strong> Disconnect your Gmail at any time from your Actor OS settings or your Google Account permissions page.
                </li>
                <li>
                  <strong className="text-foreground">Correction:</strong> Update or correct any inaccurate personal data.
                </li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, email us at{" "}
                <a href="mailto:hatcher.actor@gmail.com" className="underline hover:text-foreground">hatcher.actor@gmail.com</a>.
                We will respond within 30 days.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Cookies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Actor OS uses essential cookies only, required for authentication and session management. We do not use advertising cookies, tracking pixels, or analytics cookies.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Children</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Actor OS is not directed at children under 16. We do not knowingly collect data from anyone under 16 years of age. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Changes to This Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                We may update this policy from time to time. When we make material changes, we will notify you by email or by posting a notice in the application. Your continued use of Actor OS after changes take effect constitutes acceptance of the updated policy.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                For questions about this privacy policy or your personal data, contact us at:
              </p>
              <p>
                At Home Reelz K.K.<br />
                Tokyo, Japan<br />
                <a href="mailto:hatcher.actor@gmail.com" className="underline hover:text-foreground">hatcher.actor@gmail.com</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t py-12">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Clapperboard className="h-5 w-5" />
            <span className="font-bold">Actor OS</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; 2026 At Home Reelz K.K.
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
