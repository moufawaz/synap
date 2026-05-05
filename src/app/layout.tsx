import type { Metadata } from 'next'
import { Inter, Exo_2, JetBrains_Mono } from 'next/font/google'
import '@/app/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// SYNAP brand display font — wide-set, "digital and fast" with letter cuts.
// Replaces Space Grotesk per the brand spec.
const exo2 = Exo_2({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-exo',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SYNAP — Performance Connected.',
  description: 'Your body is a system. SYNAP is the OS. Meet ION — the AI agent that bridges biological potential and artificial intelligence through data-driven training, nutrition, and recovery.',
  keywords: ['AI personal trainer', 'fitness app', 'workout plan', 'diet plan', 'ION', 'SYNAP', 'performance'],
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
    title: 'SYNAP — Performance Connected.',
    description: 'Your body is a system. SYNAP is the OS.',
    url: 'https://synapfit.app',
    siteName: 'SYNAP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SYNAP — Performance Connected.',
    description: 'Your body is a system. SYNAP is the OS.',
  },
}

export const viewport = {
  themeColor: '#7C3AED',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${exo2.variable} ${jetbrainsMono.variable}`}>
      <body style={{ backgroundColor: '#0D0D1A', color: '#F0F0FF' }} className="antialiased">
        {children}
      </body>
    </html>
  )
}
