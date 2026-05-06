import type { Metadata, Viewport } from 'next'
import { Exo_2, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

// ─── SYNAP — Brand Typography System ─────────────────
//  • Exo 2  → headings, display, UI labels
//  • Inter  → long-form body
//  • JetBrains Mono → numerals, metrics
// ──────────────────────────────────────────────────────

const exo2 = Exo_2({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Synap — Performance Connected.',
  description:
    'Your body is a system. Synap is the OS. AI-powered training, nutrition, and recovery — orchestrated by Ion.',
  keywords: ['fitness', 'AI trainer', 'nutrition', 'workout', 'performance', 'Ion', 'Synap'],
  authors: [{ name: 'Synap' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.jpg',
    shortcut: '/icon.jpg',
    apple: '/icon.jpg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SYNAP',
  },
  openGraph: {
    title: 'Synap — Performance Connected.',
    description: 'The operating system for your body.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Synap — Performance Connected.',
    description: 'The operating system for your body.',
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${exo2.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className="font-body antialiased bg-[#0A0A0A] text-[#E2E8F0] min-h-screen overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}
