import Link from "next/link"
import { Clapperboard } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TermsOfService() {
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
        <h1 className="text-2xl sm:text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-10">
          Last updated: June 6, 2026
        </p>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>1. Service Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Actor OS is a career management platform for actors, provided by At Home Reelz K.K. ("we," "us," "our"). The service includes audition tracking, self-tape management, outreach CRM, AI-powered contract analysis, and Gmail integration for casting email detection.
              </p>
              <p>
                By creating an account or using Actor OS, you agree to these Terms of Service. If you do not agree, do not use the service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Eligibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                You must be at least 16 years old to use Actor OS. By using the service, you represent that you meet this age requirement and have the legal capacity to enter into these terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Account and User Responsibilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ul className="list-disc pl-6 space-y-2">
                <li>You are responsible for maintaining the security of your account and any connected Google account.</li>
                <li>You must provide accurate information when creating your account.</li>
                <li>You may not share your account credentials or allow others to access your account.</li>
                <li>You are responsible for all activity that occurs under your account.</li>
                <li>You may not use Actor OS for any unlawful purpose or in violation of any applicable law or regulation.</li>
                <li>You may not attempt to reverse-engineer, decompile, or otherwise extract the source code of Actor OS.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Subscription and Payment Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ul className="list-disc pl-6 space-y-2">
                <li>Actor OS offers a 14-day free trial. No credit card is required to start.</li>
                <li>After the trial, you may subscribe to a monthly plan ($5/month) or an annual plan ($45/year).</li>
                <li>All payments are processed by Stripe. We do not store your credit card information.</li>
                <li>Subscriptions renew automatically at the end of each billing period unless you cancel before the renewal date.</li>
                <li>You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period.</li>
                <li>We do not offer refunds for partial billing periods. If you cancel an annual plan mid-term, you retain access until the end of the paid period.</li>
                <li>We reserve the right to change pricing with 30 days' notice. Existing subscribers will be notified by email before any price change takes effect on their account.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Gmail Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Actor OS requests read-only access to your Gmail account to detect audition and casting-related emails. By connecting your Gmail:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You authorize us to read email metadata and content for the purpose of identifying casting communications.</li>
                <li>Email content may be sent to our AI provider (Groq) for parsing. We do not use your email data to train AI models.</li>
                <li>You may disconnect Gmail access at any time from your Actor OS settings or from your Google Account permissions page.</li>
                <li>Our use of data received from Google APIs complies with the{" "}
                  <a href="https://developers.google.com/terms/api-services-user-data-policy" className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. AI-Powered Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Actor OS uses AI (via Groq) to parse emails and analyze contracts. You acknowledge that:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>AI-generated analysis is provided for informational purposes only and does not constitute legal, financial, or professional advice.</li>
                <li>You should consult a qualified professional (such as an entertainment attorney) before making decisions based on contract analysis.</li>
                <li>AI outputs may contain errors or omissions. We do not guarantee the accuracy or completeness of any AI-generated content.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-foreground">Our property:</strong> The Actor OS platform, including its design, code, features, and branding, is the intellectual property of At Home Reelz K.K. You may not copy, modify, or redistribute any part of the platform.
                </li>
                <li>
                  <strong className="text-foreground">Your content:</strong> You retain ownership of all data you enter into Actor OS, including audition records, contacts, contracts, and notes. We claim no ownership over your content.
                </li>
                <li>
                  <strong className="text-foreground">License to us:</strong> By uploading content, you grant us a limited license to process, store, and display it as necessary to provide the service. This license terminates when you delete your account.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                To the maximum extent permitted by applicable law:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Actor OS is provided "as is" and "as available" without warranties of any kind, whether express or implied.</li>
                <li>We do not warrant that the service will be uninterrupted, error-free, or secure.</li>
                <li>We are not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.</li>
                <li>Our total liability to you for any claim arising from these terms or your use of Actor OS shall not exceed the amount you paid us in the 12 months preceding the claim.</li>
                <li>We are not responsible for any decisions you make based on AI-generated contract analysis or email parsing results.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Termination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ul className="list-disc pl-6 space-y-2">
                <li>You may close your account at any time by contacting us at <a href="mailto:hatcher.actor@gmail.com" className="underline hover:text-foreground">hatcher.actor@gmail.com</a> or through your account settings.</li>
                <li>We may suspend or terminate your account if you violate these terms, engage in abusive behavior, or use the service in a way that threatens the security or integrity of the platform.</li>
                <li>Upon termination, your data will be retained for 90 days in case you wish to reactivate, after which it is permanently deleted.</li>
                <li>You may request immediate data deletion at any time.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Indemnification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                You agree to indemnify and hold harmless At Home Reelz K.K., its officers, and employees from any claims, damages, or expenses arising from your use of the service, your violation of these terms, or your violation of any third party's rights.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Changes to These Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                We may update these terms from time to time. When we make material changes, we will notify you by email or by posting a notice in the application at least 30 days before the changes take effect. Your continued use of Actor OS after the updated terms take effect constitutes acceptance.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12. Governing Law and Dispute Resolution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                These terms are governed by and construed in accordance with the laws of Japan, without regard to conflict of law principles.
              </p>
              <p>
                Any dispute arising from these terms or your use of Actor OS shall be subject to the exclusive jurisdiction of the Tokyo District Court, Tokyo, Japan.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>13. Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                For questions about these terms, contact us at:
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
