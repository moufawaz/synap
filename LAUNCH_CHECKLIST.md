# SYNAP — App Store Launch Checklist

**Current state:** SYNAP is **live on the App Store**.
- 1.0 (build 1097) — approved + released
- 1.0.1 (build 1117) — approved 2026-06-24 (post-launch update: renewal
  freshness gates + Ramadan mode + Sentry + Arabic listing)
- 1.0.2 (build 1119) — in CI, about to submit (workout renewal 2-phase
  reliability fix)

Demo account for App Review: apple-review@synapfit.app.

---

## The moment Apple responds

### If APPROVED ✅
1. **Release:** App Store Connect → version page. If release was set to
   *Manually release*, press **Release This Version** when you're ready (you
   control launch timing). If *Automatic*, it goes live within ~24h.
2. **Verify live:** search "SYNAP" on the App Store, install the production
   app (not TestFlight), sign up a fresh account end-to-end: onboarding →
   plan generation → paywall shows SAR/local prices → (optionally) one real
   purchase on your own card, then cancel from App Store settings.
3. **Watch the dashboards (first 48h):**
   - RevenueCat → Overview (purchases, trials)
   - Vercel → Logs (`/api/generate-plan`, `/api/webhooks/revenuecat` errors)
   - Supabase → `app_events` table for `plan_generation_failed`
4. **Announce:**
   - LinkedIn post (draft ready — change "very soon on the App Store" →
     "now live on the App Store" + add the App Store link).
   - Website: add the **Download on the App Store** badge linking to the
     store page (home + pricing pages).
5. **Ask early users for ratings** (in person / WhatsApp — no in-app nag yet).

### If REJECTED again ❌
1. Screenshot/copy the full rejection text → paste to Claude.
2. Don't reply to Apple before we diagnose — same loop as before: root-cause,
   fix, rebuild, evidence-based reply.

---

## Week 1 after launch (priority order)
1. **Crash reporting + analytics** (Sentry + simple analytics) — currently
   flying blind. Highest priority gap.
2. **Monitor AI spend** — Supabase `ai_usage` per user/day; consider capping
   plan regenerations during free trials if abused.
3. **App Store ratings prompt** (`SKStoreReviewController`) after a positive
   moment (e.g., 3rd completed workout).
4. Collect real-user feedback → fixpack cadence continues.

## Next feature (spec ready)
- **Ramadan mode** — see `RAMADAN_MODE_SPEC.md` (~2–3 days). Build well before
  Ramadan 2027 (Feb); ideally ship with an Arabic marketing push.
- Then: configurable reminders in Settings, voice chat with Ion, Live Activity
  in-workout tracking (native module already built), Android.

## Standing notes
- Web + app deploy from `main`; iOS builds via GitHub Actions (build # = 1000 +
  run #). Never commit credentials/profiles (gitignored, but stay vigilant).
- Vercel Hobby 60s limit: plan generation runs in 4 phases (workout → workout2
  → diet → videos). If moving to Vercel Pro, raise `maxDuration` to 300 and the
  split can be simplified.
- Subscription truth lives in Supabase `subscriptions` (webhooks: Lemon Squeezy
  for web, RevenueCat for iOS — RC webhook auth via `REVENUECAT_WEBHOOK_AUTH`).
