import { NextRequest, NextResponse } from 'next/server'

// Vercel automatically injects x-vercel-ip-country on all requests.
// This is the most reliable way to get a user's country — no external API,
// no rate limits, no VPN false-positives on a paid plan.
export async function GET(req: NextRequest) {
  const country =
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cf-ipcountry') ||   // Cloudflare fallback
    ''

  return NextResponse.json({ country: country.toUpperCase() })
}
