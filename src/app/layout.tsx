import type { Metadata, Viewport } from 'next'
import { Exo_2, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import ThemeToggle from '@/components/ui/ThemeToggle'
import SessionPersistenceGate from '@/components/auth/SessionPersistenceGate'
import InstallPrompt from '@/components/ui/InstallPrompt'
import SplashHider from '@/components/SplashHider'

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
    icon: '/icon.png',
    shortcut: '/icon.png',
    // 180×180 PNG required — iOS silently ignores JPEG for home screen icons
    apple: '/apple-touch-icon.png',
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
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // Required for env(safe-area-inset-*) to work on notched iPhones
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${exo2.variable} ${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
try {
  var stored = localStorage.getItem('synap_theme');
  var theme = stored === 'light' || stored === 'dark'
    ? stored
    : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
} catch (_) {
  document.documentElement.dataset.theme = 'dark';
}
            `.trim(),
          }}
        />
      </head>
      <body className="font-body antialiased min-h-screen overflow-x-hidden">
        <SessionPersistenceGate />
        <SplashHider />
        {children}
        <InstallPrompt />
        <ThemeToggle />
      </body>
    </html>
  )
}
