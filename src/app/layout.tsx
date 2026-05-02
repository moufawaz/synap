import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import '@/app/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SYNAP — The Intelligence of Sport',
  description: 'Meet Ion — your AI personal trainer. Adaptive diet plans, personalized workouts, and a coach that actually follows up with you.',
  keywords: ['AI personal trainer', 'fitness app', 'workout plan', 'diet plan', 'Ion trainer', 'SYNAP'],
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
    title: 'SYNAP — The Intelligence of Sport',
    description: 'Meet Ion — your AI personal trainer. Adaptive diet plans, personalized workouts, and a coach that actually follows up with you.',
    url: 'https://synapfit.app',
    siteName: 'SYNAP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SYNAP — The Intelligence of Sport',
    description: 'Meet Ion — your AI personal trainer.',
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
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body style={{ backgroundColor: '#0D0D1A', color: '#F0F0FF' }} className="antialiased">
        {children}
      </body>
    </html>
  )
}
