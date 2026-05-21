import Link from 'next/link'
import SynapLogo from '@/components/ui/SynapLogo'

export const metadata = {
  title: 'Privacy Policy — SYNAP',
  description: 'How SYNAP collects, uses, and protects your personal data.',
}

const LAST_UPDATED = 'May 7, 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: '#060606' }}>

      {/* Nav */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex items-center justify-between">
        <Link href="/"><SynapLogo size="sm" showTagline={false} /></Link>
        <Link href="/" className="font-heading text-xs tracking-widest transition-colors" style={{ color: '#475569' }}>
          ← Back
        </Link>
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <p className="font-heading text-xs tracking-widest uppercase mb-3" style={{ color: '#BB5CF6', letterSpacing: '0.2em' }}>LEGAL</p>
        <h1 className="font-heading font-black text-4xl text-white mb-3">Privacy Policy</h1>
        <p className="font-heading text-sm" style={{ color: '#475569' }}>Last updated: {LAST_UPDATED}</p>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose-synap">

          <Section title="1. Who We Are">
            <P>SYNAP (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the platform available at <strong>synapfit.app</strong>. We provide AI-powered personal training services, including adaptive diet plans, workout programming, body tracking, and nutrition logging through our AI trainer, Ion.</P>
            <P>For questions about this policy, contact us at <A href="mailto:ion@synapfit.app">ion@synapfit.app</A>.</P>
          </Section>

          <Section title="2. Information We Collect">
            <SubTitle>2.1 Information You Provide</SubTitle>
            <ul className="list-disc pl-6 space-y-1.5 text-sm" style={{ color: '#94A3B8' }}>
              <li><strong className="text-white">Account data:</strong> Name, email address, and password when you register.</li>
              <li><strong className="text-white">Profile data:</strong> Age, gender, height, weight, fitness goals, dietary preferences, and health conditions you choose to share.</li>
              <li><strong className="text-white">Body measurements:</strong> Up to 13 body measurements you log over time.</li>
              <li><strong className="text-white">Nutrition data:</strong> Meals, foods, and calories you log manually or via food photo scan.</li>
              <li><strong className="text-white">Workout data:</strong> Exercise completions, weights, sets, and reps you log.</li>
              <li><strong className="text-white">Progress photos:</strong> Images you voluntarily upload for progress tracking (Elite tier).</li>
              <li><strong className="text-white">Apple Health data:</strong> If you connect Apple Health in the iOS app, we may read steps, active calories, heart rate, and body weight with your permission. You can deny or revoke access in iOS Health settings.</li>
              <li><strong className="text-white">Communications:</strong> Messages you send to Ion, support inquiries, and contact form submissions.</li>
              <li><strong className="text-white">Payment data:</strong> Billing is handled by Lemon Squeezy. We do not store your card details.</li>
            </ul>

            <SubTitle>2.2 Information Collected Automatically</SubTitle>
            <ul className="list-disc pl-6 space-y-1.5 text-sm" style={{ color: '#94A3B8' }}>
              <li><strong className="text-white">Usage data:</strong> Pages visited, features used, session duration, and interaction patterns.</li>
              <li><strong className="text-white">Device data:</strong> Browser type, operating system, device type, and IP address.</li>
              <li><strong className="text-white">Log data:</strong> Server logs, error reports, and performance data.</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <P>We use your data to:</P>
            <ul className="list-disc pl-6 space-y-1.5 text-sm" style={{ color: '#94A3B8' }}>
              <li>Generate and adapt your personalized diet and workout plans.</li>
              <li>Power Ion&apos;s AI coaching, responses, and proactive check-ins.</li>
              <li>Track your progress and generate weekly reports (Elite).</li>
              <li>Use Apple Health data you choose to share to improve activity-aware coaching and measurement tracking.</li>
              <li>Process payments and manage your subscription.</li>
              <li>Send transactional emails (trial reminders, plan updates, weekly reports).</li>
              <li>Improve our AI models, product features, and service quality.</li>
              <li>Comply with legal obligations and enforce our Terms of Service.</li>
            </ul>
            <P>We do <strong>not</strong> sell your personal data to third parties. We do not use your data for advertising targeting outside the SYNAP platform.</P>
          </Section>

          <Section title="4. Data Sharing">
            <P>We share your data only with trusted service providers under strict data processing agreements, and only to the extent necessary to operate and improve the platform. These include:</P>
            <ul className="list-disc pl-6 space-y-1.5 text-sm" style={{ color: '#94A3B8' }}>
              <li><strong className="text-white">AI infrastructure providers:</strong> Your messages to Ion are processed by our AI systems to generate coaching responses. Their data processing policies apply.</li>
              <li><strong className="text-white">Cloud infrastructure and database providers:</strong> Your account and fitness data is stored securely on our cloud infrastructure.</li>
              <li><strong className="text-white">Payment processors:</strong> All billing is handled by our payment provider under PCI-DSS compliance. We never see or store your card number.</li>
              <li><strong className="text-white">Email delivery:</strong> Transactional emails are sent via a secure email delivery service.</li>
              <li><strong className="text-white">Hosting and CDN:</strong> Our platform is hosted on enterprise-grade cloud infrastructure.</li>
            </ul>
            <P>We may disclose your data if required by law, court order, or to protect the rights and safety of SYNAP and its users.</P>
          </Section>

          <Section title="5. Data Retention">
            <P>We retain your account data for as long as your account is active. If you delete your account, we remove your personal data within 30 days, except where we are required by law to retain it longer.</P>
            <P>Anonymised, aggregated data (used to improve Ion) may be retained indefinitely.</P>
          </Section>

          <Section title="6. Your Rights">
            <P>Depending on your location, you may have the following rights regarding your personal data:</P>
            <ul className="list-disc pl-6 space-y-1.5 text-sm" style={{ color: '#94A3B8' }}>
              <li><strong className="text-white">Access:</strong> Request a copy of the data we hold about you.</li>
              <li><strong className="text-white">Rectification:</strong> Correct inaccurate or incomplete data.</li>
              <li><strong className="text-white">Erasure:</strong> Request deletion of your personal data ("right to be forgotten").</li>
              <li><strong className="text-white">Portability:</strong> Receive your data in a machine-readable format.</li>
              <li><strong className="text-white">Objection:</strong> Object to certain types of processing.</li>
              <li><strong className="text-white">Withdrawal of consent:</strong> Withdraw consent at any time where processing is consent-based.</li>
            </ul>
            <P>To exercise any of these rights, email us at <A href="mailto:ion@synapfit.app">ion@synapfit.app</A>. We will respond within 30 days.</P>
          </Section>

          <Section title="7. Data Security">
            <P>We implement industry-standard security measures including:</P>
            <ul className="list-disc pl-6 space-y-1.5 text-sm" style={{ color: '#94A3B8' }}>
              <li>TLS/HTTPS encryption for all data in transit.</li>
              <li>Encrypted storage for sensitive fields at rest.</li>
              <li>Row-level access controls ensuring users can only access their own data.</li>
              <li>Secure secrets management — credentials are never exposed in client-side code.</li>
              <li>Server-side-only access for privileged operations.</li>
            </ul>
            <P>No system is completely secure. If you believe your account has been compromised, contact us immediately at <A href="mailto:ion@synapfit.app">ion@synapfit.app</A>.</P>
          </Section>

          <Section title="8. Cookies">
            <P>We use only essential cookies required for authentication (session tokens) and basic functionality. We do not use advertising cookies or third-party tracking cookies.</P>
          </Section>

          <Section title="9. Children's Privacy">
            <P>SYNAP is not intended for children under 16 years of age. We do not knowingly collect data from minors. If you believe a child has provided us with personal data, please contact us and we will promptly remove it.</P>
          </Section>

          <Section title="10. International Data Transfers">
            <P>Your data may be processed in countries outside your own. We ensure appropriate safeguards are in place for such transfers in accordance with applicable data protection laws, including standard contractual clauses or equivalent mechanisms where required.</P>
          </Section>

          <Section title="11. Changes to This Policy">
            <P>We may update this Privacy Policy from time to time. We will notify you of material changes via email or a prominent notice in the app. Continued use of SYNAP after the effective date of changes constitutes acceptance of the updated policy.</P>
          </Section>

          <Section title="12. Contact">
            <P>For any privacy-related questions, requests, or concerns:</P>
            <P><strong className="text-white">Email:</strong> <A href="mailto:ion@synapfit.app">ion@synapfit.app</A></P>
            <P><strong className="text-white">Website:</strong> <A href="https://synapfit.app">synapfit.app</A></P>
          </Section>

        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-between border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <p className="font-heading text-xs" style={{ color: '#334155' }}>© 2026 SYNAP. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="font-heading text-xs transition-colors" style={{ color: '#334155' }}
            onMouseEnter={undefined}>Terms</Link>
          <Link href="/contact" className="font-heading text-xs transition-colors" style={{ color: '#334155' }}>Contact</Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="font-heading font-black text-lg text-white mb-4" style={{ letterSpacing: '0.02em' }}>{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-heading font-bold text-sm text-white mt-3 mb-2">{children}</p>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-heading text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{children}</p>
  )
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="font-heading font-semibold transition-colors" style={{ color: '#BB5CF6' }}>{children}</a>
  )
}
