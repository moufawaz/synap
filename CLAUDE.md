# SYNAP — Project Reference for Claude

> Keep this file up to date. Every time a significant architectural decision is
> made, a new native plugin is added, a CI quirk is discovered, or a recurring
> bug is fixed, update the relevant section here **before** closing the PR.

---

## 1. What Is SYNAP?

SYNAP is an AI-powered fitness and nutrition app.  
**Ion** is the AI coach persona — a conversational assistant that manages
training, nutrition, recovery, and progress tracking.

- **Web** → Next.js 16 app hosted on Vercel (`synapfit.app`)
- **iOS** → Capacitor 8 WebView wrapper around the Vercel deployment
- **Android** → same Capacitor wrapper (CI pipeline wired but disabled for
  daily pushes; manual dispatch only)

The native apps do **not** ship a static bundle — they load
`https://synapfit.app/dashboard` live in a WebView. The Vercel deployment is
therefore the single source of truth for every platform.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| Language | TypeScript 6 |
| Styling | Tailwind CSS 3 |
| Animation | Framer Motion 12 |
| Auth / DB | Supabase (Postgres + RLS + Auth) |
| AI | Anthropic Claude via `@anthropic-ai/sdk` |
| Payments | LemonSqueezy (webhooks) |
| Email | Resend |
| Push (web) | OneSignal Web SDK |
| Push (native) | OneSignal Capacitor plugin |
| Native shell | Capacitor 8.3.4 |
| iOS deploy | Fastlane + match → TestFlight |
| Android deploy | Fastlane + supply → Play Internal Track |
| CI | GitHub Actions (macos-26 for iOS, ubuntu for web) |
| Hosting | Vercel (region: iad1) |

---

## 3. Repository Layout

```
.
├── src/
│   ├── app/                   Next.js App Router pages + API routes
│   │   ├── (app)/             Authenticated app shell (layout gated by auth)
│   │   │   ├── layout.tsx     → auth check, Sidebar, NotificationManager, etc.
│   │   │   ├── dashboard/     Home screen
│   │   │   ├── workout/       Workout + today session
│   │   │   ├── nutrition/     Macro logging
│   │   │   ├── plan/          AI-generated training plan
│   │   │   ├── progress/      Body measurements + charts
│   │   │   ├── settings/      Notifications, Apple Health, account
│   │   │   ├── chat/          Ion AI chat
│   │   │   ├── measurements/  Body measurement logging
│   │   │   ├── community/     Social feed
│   │   │   ├── grocery-list/  AI grocery list
│   │   │   ├── eating-out/    Restaurant meal suggestions
│   │   │   └── more/          Secondary navigation
│   │   ├── api/               Server-side Route Handlers
│   │   │   ├── chat/          Ion AI (Claude streaming)
│   │   │   ├── generate-plan/ AI plan generation
│   │   │   ├── log-meal/      Nutrition logging
│   │   │   ├── log-workout/   Session logging
│   │   │   ├── barcode/       Barcode + photo food scan
│   │   │   ├── billing/       LemonSqueezy subscription mgmt
│   │   │   ├── cron/          Scheduled jobs (macro adjustment, reminders, etc.)
│   │   │   └── ...            ~30 API routes total
│   │   ├── auth/              Login, signup, reset, callback
│   │   └── layout.tsx         Root layout — fonts, theme script, SplashHider
│   ├── components/
│   │   ├── dashboard/         Sidebar, MobileNav, AdaptationChecker, TrialBanner
│   │   ├── auth/              AuthCard, SessionPersistenceGate
│   │   ├── ui/                Shared UI components
│   │   ├── landing/           Marketing landing page components
│   │   ├── i18n/              ArabicUiTranslator (RTL support)
│   │   ├── NotificationManager.tsx   Re-applies schedule on every app open
│   │   ├── SplashHider.tsx           Hides Capacitor splash screen
│   │   ├── OneSignalInit.tsx         Registers push token with OneSignal
│   │   └── DeepLinkHandler.tsx       Routes notification taps to the right page
│   └── lib/
│       ├── platform.ts        isNativePlatform() / getPlatform() / isIOSWeb()
│       ├── healthkit.ts       Apple Health bridge (registerPlugin wrapper)
│       ├── notifications.ts   Full local notification scheduler
│       ├── notification-prefs.ts  localStorage pref store for notifications
│       ├── supabase.ts        Browser Supabase client
│       ├── supabase-server.ts Server Supabase client (RSC + admin)
│       ├── auth-session.ts    Session persistence flag keys
│       ├── subscription.ts    Plan resolution + trial logic
│       ├── feature-access.ts  Per-route subscription gating
│       ├── anthropic.ts       Claude API wrapper
│       └── ...
├── scripts/
│   └── setup-ios.mjs          The critical iOS CI setup script (see §7)
├── fastlane/
│   ├── Fastfile               iOS beta + Android beta lanes
│   └── Appfile
├── capacitor.config.ts        Capacitor plugin config (not used in web bundle)
├── vercel.json                Vercel deployment config + cron schedules
├── .github/workflows/
│   ├── ios.yml                iOS CI — generates ios/ fresh on each run
│   └── android.yml            Android CI — manual dispatch only
└── CLAUDE.md                  ← you are here
```

---

## 4. Development Commands

```bash
npm run dev          # Next.js dev server (http://localhost:3000)
npm run build        # Production build (Turbopack)
npm run lint         # ESLint

npm run cap:sync     # npx cap sync — copy web assets into ios/ and android/
npm run cap:ios      # npx cap open ios — open Xcode
npm run cap:android  # npx cap open android — open Android Studio

# iOS CI (runs automatically on push to main):
node scripts/setup-ios.mjs   # patches plist, entitlements, pbxproj, storyboard
bundle exec fastlane ios beta

# Generate app icons from resources/icon.png:
npx @capacitor/assets generate --ios
npx @capacitor/assets generate --android
```

---

## 5. Environment Variables

### Required (Vercel + local `.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server only) |
| `ANTHROPIC_API_KEY` | Claude API key |
| `RESEND_API_KEY` | Transactional email (Resend) |
| `ONESIGNAL_APP_ID` | Push notifications |
| `ONESIGNAL_REST_API_KEY` | Server-side push sending |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | Client-side OneSignal init |
| `LEMON_SQUEEZY_API_KEY` | Subscription management |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | Webhook signature verification |
| `ADMIN_EMAIL` | Grants admin panel access |
| `LAUNCH_MODE` | `"true"` disables subscription gating site-wide |
| `NEXT_PUBLIC_LAUNCH_MODE` | Client-side launch mode flag |

### GitHub Secrets (iOS CI)

| Secret | Purpose |
|---|---|
| `APPLE_ID` | Apple ID email |
| `APPLE_TEAM_ID` | Team ID: `82KX629P83` |
| `ITC_TEAM_ID` | App Store Connect numeric team ID |
| `APP_STORE_CONNECT_API_KEY_ID` | ASC API key ID |
| `APP_STORE_CONNECT_ISSUER_ID` | ASC issuer UUID |
| `APP_STORE_CONNECT_API_KEY_P8` | Full `.p8` file contents |
| `MATCH_GIT_URL` | `https://github.com/moufawaz/synap-certs` |
| `MATCH_GIT_TOKEN` | `base64(username:PAT)` |
| `MATCH_PASSWORD` | Certs repo encryption password |
| `MATCH_KEYCHAIN_PASSWORD` | Temporary CI keychain password |
| `SLACK_WEBHOOK_URL` | (optional) Build notifications |

---

## 6. Authentication & Sessions

- **Supabase Auth** with PKCE (SSR browser client) for all normal flows.
- Password recovery uses `createImplicitAuthClient()` instead — PKCE breaks
  cross-device reset links.
- **"Remember me" logic**: `SessionPersistenceGate` (mounts in root layout)
  checks `localStorage.synap_session_mode`. If it's `'session'` and
  `sessionStorage.synap_session_active` is absent (i.e. new tab/session),
  it calls `signOut()` — this implements "log out when browser closes."
- Session keys: `SESSION_MODE_KEY = 'synap_session_mode'`,
  `SESSION_ACTIVE_KEY = 'synap_session_active'`.

---

## 7. iOS Native Build

### Overview

The `ios/` folder is **never committed**. On each CI run:

1. `npx cap add ios` → generates fresh Capacitor iOS project
2. `npx cap sync ios` → copies Vercel URL + plugin config
3. `npx @capacitor/assets generate --ios` → writes icon/splash assets
4. `node scripts/setup-ios.mjs` → applies all customisations (see below)
5. Fastlane `ios beta` → signs + uploads to TestFlight

### What `scripts/setup-ios.mjs` Does (in order)

| Step | What | Why |
|---|---|---|
| 1 | Patches `Package.swift` for 6 Capacitor plugins | Capacitor 8 binary uses `$NonescapableTypes`; plugins need the flag to compile |
| 2 | Writes 7 `Info.plist` permission strings | NSCamera, NSPhotoLibrary, NSHealthShare/Update, NSUserNotification, etc. |
| 3 | Writes `App.entitlements` | Associated Domains, Push Notifications, HealthKit |
| 4 | Writes `SynapHealthKitPlugin.swift` | Custom HealthKit bridge (`CAPBridgedPlugin` conformance) |
| 5 | Writes `SynapHealthKitPlugin.m` (empty stub) | Avoids linker warnings; the macro-based registration is NOT used |
| 6 | Writes / patches `ViewController.swift` | Subclasses `CAPBridgeViewController` to register HealthKit plugin via `capacitorDidLoad()` |
| 7 | **Patches `Main.storyboard`** | Changes `customClass="CAPBridgeViewController" customModule="Capacitor"` → `customClass="ViewController"` so the subclass is actually instantiated |
| 8 | Adds all new files to `project.pbxproj` | PBXBuildFile + PBXFileReference + PBXSourcesBuildPhase entries |
| 9 | Links `HealthKit.framework` | PBXFrameworksBuildPhase entry |
| 10 | Sets `CODE_SIGN_ENTITLEMENTS` + `OTHER_SWIFT_FLAGS` | Build settings for both Debug and Release targets |

### Capacitor 8 Plugin Registration — Critical Notes

**Capacitor 8 does NOT use `CAP_PLUGIN` ObjC macros for registration.**
The bridge reads only from `packageClassList` in `capacitor.config.json`.
Custom bundled plugins MUST use `CAPBridgedPlugin` conformance:

```swift
// CORRECT — Capacitor 8
@objc(SynapHealthKitPlugin)
public class SynapHealthKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SynapHealthKitPlugin"
    public let jsName = "SynapHealthKit"
    public let pluginMethods: [CAPPluginMethod] = [...]
    // ...
}

// In ViewController.swift:
override func capacitorDidLoad() {
    bridge?.registerPluginInstance(SynapHealthKitPlugin())
}
```

**`instancePlugins` does NOT exist** in `CAPBridgeViewController` in
Capacitor 8.3.4. Using it causes a compile error:
`property does not override any property from its superclass`.

**`Main.storyboard` must be patched.** Capacitor 8's default template
instantiates `CAPBridgeViewController` directly from the Capacitor module.
Any `ViewController.swift` subclass in the App target is silently ignored
unless the storyboard is updated to reference `customClass="ViewController"`
(with no `customModule`).

### CI Runner

- **`macos-26`** — Xcode 26.4.1, iOS 26 SDK (required by App Store Connect).
- Do **not** run `xcode-select` to override the active Xcode installation —
  secondary installs lack the iOS platform files and `xcodebuild` will fail.

---

## 8. Splash Screen (Black Screen Prevention)

`capacitor.config.ts` settings:
```typescript
SplashScreen: {
  launchAutoHide: true,      // fallback: auto-hides after launchShowDuration
  launchShowDuration: 3000,  // 3-second auto-hide if JS never executes
  backgroundColor: '#0A0A0F',
}
```

`SplashHider.tsx` (mounted in root layout):
- Attempt 1: hides immediately on React mount
- Attempt 2: 2-second `setTimeout` fallback (covers slow plugin init)

**Never** set `launchAutoHide: false` with a dark `backgroundColor` unless
`SplashScreen.hide()` is guaranteed to execute. If the WebView fails to
load or React crashes, the app will show a permanent black screen.

---

## 9. Notification System

### Architecture

- **`NotificationManager`** (mounted in authenticated layout) — re-applies
  the full schedule on every app open; guards with `isNativePlatform()`.
- **`notifications.ts`** — the scheduler: channels, IDs, schedule logic,
  `withTimeout` wrapper to prevent UI hangs.
- **`notification-prefs.ts`** — `localStorage` persistence for per-user prefs.
- **`DeepLinkHandler`** — listens for `localNotificationActionPerformed` and
  routes `extra.url` to the Next.js router.

### Notification IDs

| ID | Type |
|---|---|
| 1001 | Workout reminder |
| 2001–2003 | Breakfast / Lunch / Dinner |
| 3001–3008 | Hydration (08:00–22:00, every 2h) |
| 4001 | Ion coaching nudge |
| 5001 | Streak protection |

### Timeouts (prevents Settings page hangs)

| Operation | Timeout |
|---|---|
| `checkPermissions()` | 1 500 ms |
| `cancel({ notifications })` | 1 500 ms |
| `schedule({ notifications })` | 2 000 ms |

---

## 10. Apple Health (HealthKit)

- **JS side**: `src/lib/healthkit.ts` — `registerPlugin<NativeHealthKitPlugin>('SynapHealthKit')`
- **Swift side**: `SynapHealthKitPlugin.swift` — written by `setup-ios.mjs`
- **Methods**: `isAvailable()`, `requestAuthorization()`, `readSummary()`
- **Summary fields**: `stepsToday`, `activeEnergyKcalToday`,
  `latestHeartRateBpm`, `latestWeightKg`, `latestWeightDate`, `latestHeartRateDate`
- **Guard**: `canUseAppleHealth()` returns `true` only on `isNativePlatform() && getPlatform() === 'ios'`

If you see **"HealthKit bridge not loaded — rebuild required"**: the native
plugin is not registered. This happens when:
1. `Main.storyboard` still uses `CAPBridgeViewController` (storyboard not patched), **or**
2. `ViewController.swift` doesn't call `bridge?.registerPluginInstance(SynapHealthKitPlugin())` in `capacitorDidLoad()`, **or**
3. A new native build hasn't been installed yet (old TestFlight build).

---

## 11. Subscription & Billing

- **LemonSqueezy** for web payments (`/api/checkout`, `/api/billing/`)
- **Apple In-App Purchase** — not yet wired (native builds use LemonSqueezy
  checkout gated away on native via `isNativePlatform()` check)
- Plans: `starter` (5 AI calls/day), `trial`/`free_trial` (unlimited, 7 days),
  `pro` (unlimited), `elite` (unlimited)
- `isLaunchMode()` bypasses all subscription gates — useful for beta

---

## 12. Internationalisation

- Language stored in `users.language` column (`'en'` | `'ar'`)
- `ArabicUiTranslator` component applies RTL (`dir="rtl"`) + translates
  static UI strings client-side when `lang === 'ar'`
- `layout.tsx` sets `dir` attribute on the outer div

---

## 13. Supabase Tables (Key)

| Table | Purpose |
|---|---|
| `users` | Auth mirror: `id`, `email`, `language`, `ion_gender` |
| `profiles` | Full user profile, measurements, goals |
| `subscriptions` | LemonSqueezy subscription records |
| `measurements` | Body measurement history |

Full Row/Insert/Update types in `src/lib/supabase.ts`.

---

## 14. Vercel Deployment

- **Auto-deploy**: every push to `main` triggers a Vercel production deploy.
- **Crons** (defined in `vercel.json`):
  - Daily 10:00 UTC — onboarding reminder emails
  - Daily 09:00 UTC — trial expiry reminder emails
  - Fridays 08:00 UTC — weekly progress report emails
  - Mondays 07:00 UTC — macro auto-adjustment
- **Security headers**: `X-Content-Type-Options`, `X-Frame-Options`,
  `X-XSS-Protection`, `Referrer-Policy` on all routes; `Cache-Control: no-store`
  on `/api/`.
- **Build command**: `npm run build` (Turbopack, ~4s compile, ~7s TypeScript check).
- If build fails, run `npm run build` locally first — errors surface immediately.
  TypeScript: `npx tsc --noEmit`.

---

## 15. Common Issues & Fixes

### Black screen on app open
**Cause**: `launchAutoHide: false` with dark background — splash never hides.  
**Fix**: `launchAutoHide: true` + `SplashHider.tsx` 2s fallback.  
**New native build required** to deploy capacitor.config.ts changes.

### "HealthKit bridge not loaded — rebuild required"
**Cause**: `ViewController.swift` subclass not instantiated (storyboard not patched).  
**Fix**: `setup-ios.mjs` patches `Main.storyboard` to `customClass="ViewController"`.  
Requires a new native build.

### "property does not override any property from its superclass"
**Cause**: `instancePlugins` doesn't exist in Capacitor 8's `CAPBridgeViewController`.  
**Fix**: Use `capacitorDidLoad()` + `bridge?.registerPluginInstance(...)`.

### iOS CI not triggering
**Check**: GitHub → Settings → Actions → General → ensure Actions is enabled.  
**Manual trigger**: Actions tab → "iOS — Build & Deploy" → Run workflow.

### Notifications "Applying schedule…" hangs
**Cause**: Capacitor plugin calls blocking the UI thread indefinitely.  
**Fix**: All plugin calls wrapped in `withTimeout()` — max 2s for schedule, 1.5s for cancel/check.

### Vercel build error (TypeScript)
**Diagnose locally**: `npm run build` — errors print immediately.  
**TypeScript only**: `npx tsc --noEmit`.  
The `notifications.ts` schedule array is typed `any[]` intentionally to avoid
Capacitor's conditional types failing Vercel's TypeScript check.

### `Build input file cannot be found` (Xcode)
**Cause**: `sourceTree = "<group>"` in pbxproj resolves relative to group, not project root.  
**Fix**: Use `sourceTree = SOURCE_ROOT; path = App/FileName.swift`.

---

## 16. Keeping This File Updated

Update CLAUDE.md when:
- A new Capacitor plugin is added (update §7 and §10)
- A new environment variable is required (update §5)
- A new Supabase table is added (update §13)
- A CI bug is fixed (add to §15)
- The subscription model changes (update §11)
- The iOS CI runner or Xcode version changes (update §7)

Last updated: 2026-05-22
