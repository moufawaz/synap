import type { Metadata } from 'next'
import { Inter, Exo_2 } from 'next/font/google'
import '@/app/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const exo2 = Exo_2({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-exo2',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SYNAP — Performance Connected.',
  description: 'Meet Ion — your AI personal trainer. Adaptive diet plans, personalized workouts, and a coach that actually follows up with you.',
  keywords: ['AI personal trainer', 'fitness app', 'workout plan', 'diet plan', 'Ion trainer', 'SYNAP'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SYNAP',
  },
  openGraph: {
    title: 'SYNAP — Performance Connected.',
    description: 'Meet Ion — your AI personal trainer. Adaptive diet plans, personalized workouts, and a coach that actually follows up with you.',
    url: 'https://synapfit.app',
    siteName: 'SYNAP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SYNAP — Performance Connected.',
    description: 'Meet Ion — your AI personal trainer.',
  },
}

export const viewport = {
  themeColor: '#BB5CF6',
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
    <html lang="en" className={`${inter.variable} ${exo2.variable}`}>
      <body className="bg-obsidian text-silver antialiased">
        {children}
      </body>
    </html>
  )
}
