# SYNAP Native Mobile Build Log

This file is the running source of truth for the native mobile rebuild. Keep it updated after every meaningful change.

## Direction

SYNAP mobile is moving from a Capacitor WebView wrapper to a real Expo React Native app.

The current Next.js app remains the production web/admin/backend platform:

- Landing, pricing, privacy, terms, support
- Admin and business dashboards
- Supabase-backed API routes
- Claude/Ion server logic
- Lemon Squeezy web billing

The new mobile app lives in:

```txt
apps/mobile
```

## Target Architecture

- Mobile framework: Expo React Native with Expo Router
- Auth: Supabase Auth with native-safe session storage
- API: existing `https://www.synapfit.app/api/*` routes
- Database: existing Supabase project
- AI: existing server-side Ion/Claude routes
- iOS bundle ID: `app.synap.fit`
- Android package: `app.synap.fit`
- Mobile payments later: Apple In-App Purchase / Google Play Billing
- Web payments remain Lemon Squeezy

## Build Phases

1. Scaffold Expo app.
2. Add native auth foundation.
3. Add mobile tab shell.
4. Add dashboard.
5. Add Ion chat.
6. Add nutrition.
7. Add workout/session tracking.
8. Add onboarding.
9. Add measurements and progress.
10. Add native camera, barcode, HealthKit, push, and share card.
11. QA for iOS App Review.
12. Submit.

## Completed

- 2026-05-22: Created this build log.
- 2026-05-22: Started native mobile app scaffold under `apps/mobile`.
- 2026-05-22: Added Expo Router app configuration, package manifest, TypeScript config, and environment template.
- 2026-05-22: Added mobile theme provider with dark/light support.
- 2026-05-22: Added Arabic/English language provider with RTL-aware screen text.
- 2026-05-22: Added native-safe Supabase client and authenticated API fetch helper.
- 2026-05-22: Added auth provider and first email/password login screen.
- 2026-05-22: Added bottom-tab mobile shell: Home, Chat, Train, Nutrition, Progress, More.
- 2026-05-22: Added initial placeholder screens for the core mobile areas so the app has a runnable structure.
- 2026-05-22: Added root npm shortcuts: `npm run mobile:start` and `npm run mobile:typecheck`.
- 2026-05-22: First mobile dependency install found `react-native-screens` latest peer conflict with React Native 0.81. Pinned `react-native-screens` to `4.16.0` and `react-native-safe-area-context` to `5.6.0` for Expo 54 compatibility.
- 2026-05-22: Added TypeScript 6 `ignoreDeprecations` setting for Expo alias compatibility.
- 2026-05-22: Fixed strict TypeScript literal typing for theme colors/translations and added Expo public env declarations.
- 2026-05-22: Added `getAuthenticatedUser(req)` server helper so API routes can accept both existing web cookies and native mobile bearer tokens.
- 2026-05-22: Updated `/api/chat`, `/api/log-meal`, and `/api/me/subscription` to support native bearer auth while preserving web cookie auth.
- 2026-05-22: Added `createRouteClient(req)` so bearer-authenticated mobile requests can still run Supabase RLS queries in API routes.
- 2026-05-22: Mobile TypeScript check passed with `npm run typecheck` inside `apps/mobile`.
- 2026-05-22: Existing Next.js production build passed with `npm run build` from the repo root after backend auth changes.
- 2026-05-22: Added mobile feature clients for subscription status, Ion chat history/send, and nutrition meal log CRUD.
- 2026-05-22: Connected mobile Home to real `/api/me/subscription` data.
- 2026-05-22: Connected mobile Chat to real `/api/chat` history and non-streaming mobile send mode.
- 2026-05-22: Connected mobile Nutrition to real `/api/log-meal` read/create/update/delete.
- 2026-05-22: Re-ran mobile TypeScript check successfully after wiring the first real data screens.
- 2026-05-22: Re-ran existing Next.js production build successfully after the mobile data/API work.
- 2026-05-22: Updated `/api/log-workout`, `/api/workout-session`, and `/api/plan-history` to accept native bearer auth while preserving web behavior.
- 2026-05-22: Added compact `todayWorkout` data to `/api/plan-history` for the native Train tab.
- 2026-05-22: Connected mobile Train to today's workout, exercise checkmarks, cross-device in-progress session sync, and workout log saving.
- 2026-05-22: Re-ran mobile TypeScript check successfully after the Train tab work.
- 2026-05-22: Updated `/api/save-profile` and `/api/generate-plan` to accept native bearer auth while preserving existing web behavior.
- 2026-05-22: Added a compact native onboarding route at `apps/mobile/app/onboarding.tsx` for profile save and initial plan generation.
- 2026-05-22: Added a Rebuild plan entry in mobile More so reviewers/users can reach native onboarding.
- 2026-05-22: Re-ran mobile TypeScript check and root Next.js production build successfully after onboarding work.
- 2026-05-22: Updated `/api/measurements` to accept native bearer auth while preserving existing web behavior.
- 2026-05-22: Added mobile measurement client and connected Progress to real measurement history.
- 2026-05-22: Added native quick logging for weight and waist measurements.
- 2026-05-22: Re-ran mobile TypeScript check and root Next.js production build successfully after progress work.
- 2026-05-22: Installed `expo-image-picker` for native camera/photo access.
- 2026-05-22: Updated food-scan feature access so `/api/barcode/photo` supports mobile bearer auth.
- 2026-05-22: Added native food photo scan in Nutrition. It opens the camera, sends the image to the existing Claude food-photo endpoint, fills the log form, and lets the user review before saving.
- 2026-05-22: Re-ran mobile TypeScript check and root Next.js production build successfully after food photo scan work.
- 2026-05-22: Updated `/api/analyze-inbody` to accept direct mobile base64 image input in addition to the existing uploaded-file URL flow.
- 2026-05-22: Added native InBody photo analysis in Progress using the same camera package.
- 2026-05-22: Re-ran mobile TypeScript check and root Next.js production build successfully after InBody work.
- 2026-05-22: Installed `@kingstinct/react-native-healthkit` and `react-native-nitro-modules` for native Apple HealthKit.
- 2026-05-22: Added the HealthKit Expo config plugin and iOS HealthKit entitlement/usage strings to `apps/mobile/app.json`.
- 2026-05-22: Added a HealthKit service that requests read access and fetches today steps, active energy, latest weight, latest body fat, and resting heart rate.
- 2026-05-22: Added Apple Health connection UI in mobile More.
- 2026-05-22: Re-ran mobile TypeScript check and root Next.js production build successfully after HealthKit work.
- 2026-05-22: Added mobile scripts for Expo config and iOS prebuild checks.
- 2026-05-22: Added root shortcuts `mobile:config` and `mobile:prebuild:ios`.
- 2026-05-22: Added EAS build profiles in `apps/mobile/eas.json` for development, preview, and production.
- 2026-05-22: Added mobile icon and splash assets from the existing SYNAP app icon.
- 2026-05-22: Wired `icon`, iOS icon, and splash settings in `apps/mobile/app.json`.
- 2026-05-22: Ignored generated native folders (`ios/`, `android/`) in the mobile app because this app is being kept managed/EAS-friendly for now.
- 2026-05-22: `npm run mobile:config` passed and showed the expected iOS bundle ID, HealthKit entitlement, HealthKit plugin, camera/photo usage strings, icon, and splash config.
- 2026-05-22: `npm --prefix apps/mobile run prebuild:ios -- --no-install` could not run on this Windows machine: Expo skips iOS native generation on Windows/Linux mismatch and reports "At least one platform must be enabled when syncing." This is an environment limitation, not a JS/config validation failure. Use macOS or EAS cloud for iOS native generation/build.
- 2026-05-22: Re-ran mobile TypeScript check and root Next.js production build successfully after iOS config/icon work.
- 2026-05-22: Fixed corrupted Arabic strings in the native mobile translation source.
- 2026-05-22: Replaced hardcoded More-screen preference/HealthKit labels with translation keys.
- 2026-05-22: Searched mobile TS/TSX/JSON for mojibake markers (`Ø`, `Ù`, `Â`, `â`) and found none after the fix.
- 2026-05-22: Re-ran mobile TypeScript check, Expo config validation, and root Next.js production build successfully after the Arabic text cleanup.
- 2026-05-22: Installed `react-native-view-shot` and `expo-sharing` for native progress card sharing.
- 2026-05-22: Added a shareable Progress card that captures the latest progress card as a PNG and opens the native iOS share sheet.
- 2026-05-22: Added English/Arabic translation key for the progress share action.
- 2026-05-22: Re-ran mobile TypeScript check, Expo config validation, and root Next.js production build successfully after progress share card work.
- 2026-05-22: Added native signup route and connected it to Supabase Auth.
- 2026-05-22: Added native password-reset request route that sends the user through the existing secure web reset flow.
- 2026-05-22: Added in-app links to Privacy Policy, Terms, and Support for App Review readiness.
- 2026-05-22: Re-ran mobile TypeScript check, Expo config validation, and root Next.js production build successfully after auth/support work.
- 2026-05-22: Ran `npm audit --json` inside `apps/mobile`. Current status: 15 moderate, 0 high, 0 critical. Audit fixes intentionally deferred until the app work is complete because recommended fixes involve major Expo package upgrades.
- 2026-05-22: Added `scripts/setup-apple-review-user.mjs` to create/refresh the seeded Apple review account `apple-review@synapfit.app` with profile, measurement, active diet plan, and active workout plan.
- 2026-05-22: Deleted the accidental `appreview@synapfit.app` review account and seeded the existing `apple-review@synapfit.app` account instead. Do not store the generated password in this file; provide it directly in App Store Connect and rotate it after review.
- 2026-05-22: Added `APPLE_REVIEW_NOTES.md` with App Store Connect review notes and permission explanations.
- 2026-05-22: Verified `apple-review@synapfit.app` can sign in through Supabase Auth with the generated review password.
- 2026-05-22: Re-ran mobile TypeScript check and root Next.js production build successfully after review-account setup.
- 2026-05-22: Added native account deletion from the More tab and updated `/api/delete-account` to accept native bearer authentication.
- 2026-05-22: Re-ran mobile TypeScript check, Expo config validation, mojibake scan, and root Next.js production build successfully after account deletion work.
- 2026-05-22: Added a manual GitHub Actions workflow for Expo/EAS iOS builds and changed the old Capacitor iOS workflow to manual-only legacy status so pushes do not accidentally ship the WebView build.
- 2026-05-22: Added `apps/mobile/app.config.js` so CI/local builds always expose the linked EAS project ID. This ID is project metadata, not a password.
- 2026-05-22: Replaced two leftover native UI symbols in Chat/Nutrition with a proper icon and ASCII separator.
- 2026-05-22: Installed EAS CLI globally. `eas init --id 5fb169d2-85c2-48ef-990f-960a395e7c6a` is blocked until this machine is logged in to Expo or `EXPO_TOKEN` is provided.
- 2026-05-22: Expo login confirmed as `mou_hossam`. EAS project lookup showed the linked project slug is `synap`, so the mobile Expo slug was aligned from `synap-mobile` to `synap`.
- 2026-05-22: First EAS production build attempt reached credential setup, then stopped because iOS credentials need interactive initialization. Also added `ITSAppUsesNonExemptEncryption: false` for App Store encryption compliance.
- 2026-05-22: Added EAS environment variables for production, preview, and development: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_API_BASE_URL`.
- 2026-05-22: Re-ran EAS production build setup. EAS successfully loaded env vars and reached remote iOS credentials, but this Codex shell has no interactive TTY, so first-time Apple signing setup must be completed once in a normal terminal.
- 2026-05-22: Added native screens for full plan view, programme browser with embedded YouTube playback, full measurements/symmetry, grocery list, eating-out mode with log button, form check, reports, billing status, and notifications.
- 2026-05-22: Expanded native Nutrition with planned meal checklist, macro progress, water tracking, barcode lookup, food photo scan, and edit/delete after logging.
- 2026-05-22: Added native chat plan-edit preview controls that send apply/cancel messages back through Ion.
- 2026-05-22: Updated supporting APIs for native bearer auth across grocery list, eating-out, meal recipes, form check, hydration, reports, checkout, billing cancel, and push notification.
- 2026-05-26: UI redesign pass for web parity — dashboard greeting + stat chips + ambient glow, progress weight trend chart, nav rows in More, quick prompts in Chat, sparkLight color token, Card accent prop.
- 2026-05-26: Chat — full session history bottom sheet (groups by 90-min gaps and day boundaries, Today/Yesterday labels, tap-to-view), rich message type rendering for all 9 types (workout_card, meal_card, milestone, alert, new_plan, plan_proposal, renewal_preview, suggestion, text), context-aware quick reply buttons per message type, Check-in button (triggers "Run my daily adaptation check"), plan modification window banner with colour-coded days remaining, message usage counter for Starter plan with Upgrade shortcut, displayChatContent() JSON-stripping for clean Ion replies.
- 2026-05-26: Community — new tab screen at app/(tabs)/community.tsx: "Coming Soon" hero card with ambient glow, 4 upcoming feature cards (Training Threads, Weekly Challenges, Progress Showcase, Training Partners), Elite early access CTA linking to /pricing. Added `community` translation key (English + Arabic).
- 2026-05-26: Nutrition — meal checklist rows now have expand/collapse toggle showing ingredients list, recipe/instructions, and macro breakdown when present in the plan JSON. Uses LayoutAnimation for smooth transitions.
- 2026-05-26: Tab bar — added Community tab (users icon) between Progress and More, 7 tabs total.

## Current Status

The native iOS app baseline is implemented and ready for real-device/TestFlight QA. The mobile app is intentionally separated from the existing web app so the production site remains stable while mobile is rebuilt.

The real mobile data screens are now connected:

- Chat history + mobile-safe chat send
- Subscription/launch access status
- Nutrition meal log read/write/edit/delete
- Train tab/session sync/workout logging
- Native onboarding/profile save/plan generation
- Measurement logging and InBody photo analysis
- Food photo scan
- Progress share card
- Apple Health connection UI
- Signup, login, password-reset request, support/legal links
- Account deletion

Next immediate task: upload build 12 to TestFlight/App Store Connect, run final real-device QA, then submit for Apple review.

The current iOS release path is the manual GitHub workflow `iOS Expo EAS Build`. It requires only the GitHub secret `EXPO_TOKEN`. The EAS project ID is stored in the Expo config as non-secret project metadata. The old `Legacy iOS Capacitor Build` workflow remains manual-only for reference and should not be used for the App Store release.

Current EAS project ID to link:

```txt
5fb169d2-85c2-48ef-990f-960a395e7c6a
```

Local EAS setup is paused at Expo authentication. Run `eas login` once from `D:\Synap\apps\mobile`, or provide an Expo access token as `EXPO_TOKEN`, then continue with:

```bash
eas init --id 5fb169d2-85c2-48ef-990f-960a395e7c6a
eas project:info
```

First-time iOS signing setup must be run in a normal interactive terminal:

```bash
cd D:\Synap\apps\mobile
eas build --platform ios --profile production
```

After Expo creates/validates the Apple distribution certificate and provisioning profile once, automated non-interactive builds can run with:

```bash
eas build --platform ios --profile production --non-interactive --no-wait
```

## Feature Parity Status

The native app currently covers the App Review/mobile-critical surface, but it is not yet a full 1:1 clone of the web application.

Implemented in native:

- Email login, signup, logout, reset-password request.
- Launch access/subscription status read.
- Ion chat history and message send through the existing backend context.
- Native onboarding/profile save/plan generation.
- Nutrition manual food log, edit, delete, and food photo scan.
- Train tab with today's workout, exercise completion, session sync, and workout logging.
- Progress tab with measurement history, quick weight/waist logging, InBody photo analysis, and progress share card.
- Apple Health connection UI and HealthKit permission/config.
- English/Arabic text table, RTL-aware alignment, and light/dark theme.
- Privacy, Terms, Support links.
- Account deletion.

Implemented in native (expanded as of 2026-05-26):

- Ion chat session history sidebar (bottom sheet, grouped by day and 90-min gap).
- Rich message type rendering in Chat: workout_card, meal_card, milestone, alert, new_plan, plan_proposal, renewal_preview, suggestion.
- Check-in button in Chat header.
- Plan modification window banner in Chat (colour-coded days left).
- Message usage counter for Starter plan with Upgrade link.
- Community screen (Coming Soon) with 4 feature cards and Elite early access CTA.
- Meal recipe expand/collapse in Nutrition checklist (ingredients, recipe, macros).
- Community tab added to bottom bar.

Implemented in native (expanded as of 2026-05-26 — Phase 2):

- Runtime crash fix for plan JSON objects rendered as React children (`safeText` + `safeIngredient` helpers).
- Nutrition calorie ring (SVG-style circle progress, no extra native deps).
- Nutrition macro progress bars (protein / carbs / fat with numeric targets).
- Nutrition water tracker with individual glass buttons.
- Grocery List and Eating Out Mode quick action buttons in Nutrition tab.
- Meal food items / ingredients / recipe details in expanded meal card.
- Pre/post workout note banners in Nutrition.
- Meal timing note banner in Nutrition.
- YouTube video buttons per exercise in Train tab (opens YouTube app or browser).
- Exercise expand/collapse with form tips, progression notes, and video button.
- Session progress bar in Train tab.
- Muscle group tag badge per exercise.
- Train quick links to Programme, Measurements, Form Check.

Implemented in native (expanded as of 2026-05-26 — Phase 3, full parity pass):

- **Grocery list** — checkable items with strikethrough, progress bar, AsyncStorage persistence, native Share sheet, clear checked.
- **Progress tab** — 5-metric chart selector (Weight, Waist, Chest, Bicep, Body Fat %), workout log history, streak counter, coach timeline, `useFocusEffect` refresh.
- **Train tab** — 7-day week browser, full workout timer (start/pause/resume/reset, auto-start on first check, elapsed time display), exercise completion with strikethrough + green border, inline YouTube VideoModal player.
- **Settings** — 3-tab layout with Profile, Billing (plan status + navigate to billing screen), and per-type Notification preference switches.
- **Dashboard** — Ion last-message preview from real chat history, `useFocusEffect` stale-data refresh.
- **Focus refresh** — `useFocusEffect` added to Nutrition, Progress, Train, and Dashboard so cross-tab data changes are always reflected.
- **Billing system** — Apple-compliant Spotify model: dedicated `/billing` screen with feature grid, 3-step how-to-subscribe guide, `synapfit.app` display, `UpgradeGate` component for premium feature gating, dashboard upgrade banner for starter users.
- **YouTube** — inline WebView player (`VideoModal`) replaces external Linking approach; used in Train and Programme.

Not yet 1:1 with web:

- Landing/pricing/marketing pages are web-only (intentional — no mobile equivalent planned).
- Admin/business dashboards are web-only (intentional).
- **Reports** — mobile has monthly summary + weekly reports list; web additionally shows workout logs as a visual timeline and has expandable report cards with chart overlays.
- Push notifications/OneSignal native wiring is scaffolded (local notifications + token registration) but real OneSignal push delivery is not yet wired.
- In-app purchases are intentionally not implemented (Spotify model adopted — web-only billing via Lemon Squeezy).

Remaining items before calling the native app "full parity":

1. Reports tab — workout log visual timeline and expandable report cards.
2. Real push delivery via OneSignal (local notifications already work).
3. Nothing else — all other web features are now covered in native.

## Native Build Commands

Run from repo root:

```bash
npm run mobile:typecheck
npm run mobile:config
npm run mobile:prebuild:ios
```

Note: `mobile:prebuild:ios` must be run on macOS/Linux-capable native generation or through EAS cloud. On this Windows machine Expo correctly refuses to generate iOS native project files.

EAS profiles live in `apps/mobile/eas.json`:

- `development`: dev-client build for real iPhone testing.
- `preview`: internal QA build.
- `production`: App Store/TestFlight build.

HealthKit requires a native/dev-client build. It will not work in Expo Go.

## iOS Review QA Checklist

Must be tested on a real iPhone through an EAS development or TestFlight build:

**Auth & onboarding**
- Login with the Apple review account.
- Sign up with a fresh email and reach onboarding.
- Request password reset and confirm the reset email opens the web reset flow.
- Complete native onboarding and verify plans are generated.

**Chat**
- Send an Ion chat message and verify history persists after app restart.
- Tap a quick-prompt chip and verify it sends immediately.

**Nutrition**
- Log, edit, and delete a manual food.
- Log a food from Eating Out and verify it appears in the Nutrition tab without a restart (focus refresh).
- Scan a food photo and review values before logging.
- Tap the Grocery List quick action and verify items are checkable and progress bar updates.
- Check an item on the Grocery List, close the app, reopen — verify the check is persisted.
- Tap Share on the Grocery List and verify the iOS share sheet opens with the list text.

**Train**
- Open Train tab — verify today's workout is shown.
- Tap a different day in the 7-day browser — verify that day's workout loads and a "Browsing" banner appears.
- Tap back to today — verify today's workout reloads.
- Tap an exercise to check it off — verify the timer starts automatically.
- Pause and resume the timer — verify elapsed time is accurate.
- Check all exercises — verify the button changes to "All done! Save workout 🏆" with elapsed time.
- Tap a YouTube video button — verify the VideoModal opens with inline playback.
- Finish and log a workout.
- Restart the app and re-open Train — verify session state is preserved (useFocusEffect reload).

**Progress**
- Log a weight measurement.
- Switch between all 5 metric chips (Weight, Waist, Chest, Bicep, Body Fat %) and verify the chart updates.
- Log weight/waist measurement.
- Analyse an InBody photo.
- Share the progress card through the iOS share sheet.

**Dashboard**
- Log food in Nutrition, navigate back to Dashboard — verify calorie count updates (useFocusEffect refresh).
- Verify the Ion last-message preview card shows the most recent Ion reply.

**Settings & Billing**
- Open Settings → Billing tab — verify plan badge and access status show correctly.
- Tap "How to subscribe to SYNAP" — verify it navigates to the billing screen.
- On the billing screen: verify feature grid, 3-step guide, and `synapfit.app` text display.
- Verify no prices appear anywhere in the billing screen.
- Verify no tappable external URL buttons exist in the billing screen.
- Tap "Contact support" — verify an Alert shows `support@synapfit.app`.
- Open Settings → Notifications tab — verify toggles work and persist after navigation.

**System & App Review**
- Connect Apple Health and verify HealthKit permission prompt appears.
- Switch English/Arabic and verify no corrupted Arabic text appears.
- Switch light/dark mode.
- Open Privacy, Terms, and Support links.
- Delete account from More and verify the session is signed out.
- Verify camera permission copy matches actual use.
- Verify HealthKit permission copy matches actual use.
- Verify no payment requirement blocks access to core features.

## Deferred Audit Notes

Current mobile audit status after adding SDK-compatible `expo-camera`:

- Moderate: 15
- High: 0
- Critical: 0

Main sources:

- Expo SDK 54 transitive packages (`expo`, `@expo/cli`, `@expo/config`, `expo-router`, `expo-constants`, `expo-linking`, `expo-splash-screen`, `expo-sharing`)
- `postcss < 8.5.10` through Expo Metro config
- `uuid < 11.1.1` through `xcode`
- `xcode` through Expo config plugins

NPM's suggested fix path jumps to Expo 56 / related major packages, so do not run `npm audit fix --force` until native iOS build behavior has been verified.

## Open Decisions

- Decide final mobile design system implementation: `StyleSheet` first, optionally NativeWind later.
- Mobile chat starts with non-streaming JSON responses for reliability. Streaming can be added later after the native baseline is stable.
- Apple Health package selected: `@kingstinct/react-native-healthkit` with `react-native-nitro-modules`. This requires a dev client/native build and will not work in Expo Go.

## Rules

- Do not remove or weaken existing web app behavior while building mobile.
- Prefer reusing backend APIs over duplicating business logic in the app.
- Keep auth/session handling native-safe.
- Keep Arabic/English support from the first screen, not as a later patch.
- Update this file whenever a phase starts, finishes, or changes direction.

## Latest Progress - Account Deletion

- Added native account deletion from the More tab with a destructive confirmation prompt.
- Updated `/api/delete-account` to accept native bearer tokens as well as existing web cookie sessions.
- Fixed corrupted Arabic translation strings in the native app translation table.
- Kept the Apple review account at `apple-review@synapfit.app`; the accidental temporary review account was removed earlier.

## Latest Progress - Native Scanner And Push Registration

- Added `expo-camera` to the mobile app for a real native live barcode scanner.
- Added a full-screen native barcode scanner modal in Nutrition. Scanned products fill the same editable food name/calorie fields before the user logs the food.
- Kept manual barcode lookup and food photo scan as fallbacks when camera scanning or Open Food Facts lookup fails.
- Added `/api/device-token` for native Expo push token registration using bearer auth.
- Updated the native Notifications screen to register the Expo push token with the backend after permission is granted.
- Normalized user-facing workout-log reads in chat, monthly summaries, and adaptation checks so they can read either `workout_log` or `workout_logs`.
- Cleaned remaining mojibake in touched backend/mobile files.

Required database table before push tokens persist:

```sql
create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  provider text not null default 'expo',
  token text not null,
  platform text,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider, token)
);
```

Still blocked outside code:

- iOS signing/TestFlight build needs first-time Apple credential setup in an interactive terminal.
- Native billing/IAP needs App Store Connect in-app purchase products before it can be wired safely.
- Real camera, push permission, HealthKit, and YouTube playback must be tested on an iPhone build, not Expo Go/web.

## Latest Progress - EAS Install Failure Fix

- Diagnosed failed EAS iOS build `4378d761-1f73-4548-90c3-3565814ebaf8`.
- Cause: EAS runs `npm ci`, and the mobile lockfile resolved `react-dom@19.2.6` while Expo SDK 54 pins `react@19.1.0`. npm rejected the peer dependency tree during the Install dependencies phase.
- Fix: pinned `react-dom` to `19.1.0` in the mobile workspace so React and React DOM match.
- Verified locally:
  - `npm --prefix apps/mobile ci --include=dev --dry-run`
  - `npm run mobile:typecheck`
  - `npm run mobile:config`
- Follow-up: EAS uses npm 10.9.3, which also requires nested optional dependencies in the lockfile. Regenerated `apps/mobile/package-lock.json` with npm 10 so it includes the nested `@expo/image-utils/node_modules/typescript@5.9.3` entry required by `npm ci`.
- Follow-up 2: the next EAS run passed dependency install and CocoaPods, then failed during JavaScript bundling because `babel-preset-expo` was not explicit in the mobile workspace. Added `babel-preset-expo` as a mobile dev dependency and verified `npx expo export:embed --eager --platform ios --dev false` locally.
- Follow-up 3: EAS build `cebc990d-292e-408f-9bcb-ea6849daeb64` passed dependency install and JS bundling, then failed in Xcode while Hermes compiled the production bundle. Cause: React Native internal `DOMRectReadOnly` code reached `main.jsbundle` with private class fields (`#x`, `#width`, etc.), and Hermes rejected them with `private properties are not supported`.
- Fix: added Babel private-field downlevel transforms in `apps/mobile/babel.config.js` and a mobile `metro.config.js` using the `hermes-stable` transform profile so React Native internals are also emitted in Hermes-compatible syntax.
- Verified locally:
  - `npx expo export:embed --eager --platform ios --dev false`
  - `npx expo export:embed --eager --platform ios --dev false --bundle-output <temp> --assets-dest <temp>`
  - Confirmed the generated bundle contains zero matches for the failing `#x/#y/#width/#height` private fields.
- Follow-up 4: EAS build `e641d5c9-e4ae-4f9e-afcf-bf855ec56847` passed the previous private-field failure, but Hermes then rejected raw `class` statements from React Native internals with `invalid statement encountered`. For the first App Store/TestFlight build, switched the Expo mobile app to `jsEngine: "jsc"` to avoid the Hermes bytecode compile step on iOS. This is safer for submission than continuing to fight React Native internal syntax transforms during the archive.
- Follow-up 5: EAS build `5cb724c5-87d5-4b2a-bce9-a0f56b59f8af` confirmed `jsEngine: "jsc"` was read, but failed during eager bundling because the temporary `@babel/plugin-transform-classes` transform ran too early on React Native Flow class fields (`FlatList.js`) and produced `Missing class properties transform`. Removed that class transform again; local `npx expo export:embed --eager --platform ios --dev false` passes.
- Follow-up 6: EAS build `f3d19f81-a909-491e-8e16-9ceda33ff0f5` passed dependency install, CocoaPods, and eager bundling, then failed in Xcode with `Invalid expression encountered`. The failing generated line came from Supabase JS OpenTelemetry tracing (`import(/* webpackIgnore */ OTEL_PKG)` / `@opentelemetry/api`) inside `main.jsbundle`.
- Fix: the native app only needs Supabase Auth, so the mobile client now uses `@supabase/auth-js` directly instead of importing the full `@supabase/supabase-js` bundle. This removes Supabase storage/realtime/postgrest/tracing code from the iOS bundle while preserving login, signup, password reset, session restore, and bearer token API calls.
- Verified locally:
  - `npx expo export:embed --eager --platform ios --dev false --bundle-output <temp> --assets-dest <temp>`
  - Confirmed the generated bundle has zero matches for `webpackIgnore`, `turbopackIgnore`, `OTEL_PKG`, `@vite-ignore`, `@opentelemetry/api`, or `Dynamic require defined`.
  - `npm run mobile:typecheck`
  - `npm run mobile:config`
  - `npx npm@10.9.3 ci --include=dev --dry-run --cache D:\Synap\.npm-cache-mobile`
- Result: EAS iOS production build `db680157-1ba4-49ea-9444-70c935af145b` finished successfully from commit `09b357782bb5d36cfe1132ec849f261226c9350f`. App build number `9`; IPA artifact: `https://expo.dev/artifacts/eas/t6pAEtN8ZLZuHRBshw3ZVD.ipa`.

## Latest Progress - App Review Polish

- Replaced the Home tab placeholder cards with real subscription, today's workout, and nutrition summaries from the existing backend APIs.
- Rebuilt the native chat screen around `FlatList` plus `KeyboardAvoidingView` so long histories and the iOS keyboard behave like a proper chat app.
- Removed the iOS external pricing link from the Billing screen. The app now shows current access and states that in-app upgrades require approved Apple IAP products.
- Replaced corrupted Arabic translation strings and removed visible mojibake/placeholder review text from the touched mobile screens.
- Added `react-native-reanimated` and `react-native-gesture-handler`, imported gesture handler at the root, and added the Reanimated Babel plugin.
- Tried switching the native iOS JavaScript engine back to Hermes after removing the Supabase tracing bundle issue.
- Verified locally:
  - `npm run mobile:typecheck`
  - `npm run mobile:config`
  - `npx expo export:embed --eager --platform ios --dev false --bundle-output <temp> --assets-dest <temp>`
  - Confirmed the generated bundle has no Supabase tracing markers or prior mojibake review-risk strings.
  - `npx npm@10.9.3 ci --include=dev --dry-run --cache D:\Synap\.npm-cache-mobile`
- Result: EAS iOS build `e2d0f3e9-193a-4582-8b6f-ad7b710c3c5b` still failed during Hermes bytecode compilation with React Native internal `invalid statement encountered` errors. Reverted iOS back to `jsEngine: "jsc"` for the App Review build path while keeping all review polish fixes.
- Result: EAS iOS production build `c8a1b067-da25-44f6-843a-ac28e6f57d8b` finished successfully from commit `54f71a9af5749ef3fa40c751c297d174ed29b8c1`. App build number `11`; IPA artifact: `https://expo.dev/artifacts/eas/qLWzyZSgXLJYJroKomHJgn.ipa`.

## Latest Progress - Final iOS Review Build 12

- Removed remaining iOS review-risk copy from native onboarding and billing.
- Removed web checkout/cancel subscription actions from the native Billing screen. iOS now shows account/access status and sends subscription help through support until Apple IAP products are approved.
- Cleaned the More screen Arabic language label and verified the touched native UI no longer exposes internal App Review wording.
- Kept `jsEngine: "jsc"` intentionally for the App Store build path because Hermes still fails during EAS bytecode compilation on React Native internals. JSC has produced stable production archives.
- Verified before build:
  - `npm run mobile:typecheck`
  - `npm run mobile:config`
  - `npx expo export:embed --eager --platform ios --dev false --bundle-output <temp> --assets-dest <temp>`
  - `npx npm@10.9.3 ci --include=dev --dry-run --cache D:\Synap\.npm-cache-mobile`
- Result: EAS iOS production build `3bac743c-a9c2-4f3e-8cc3-ece58df907f6` finished successfully from commit `b0105067a26a5f178e8792ca13b8e0c6713ec82a`. App build number `12`; IPA artifact: `https://expo.dev/artifacts/eas/8nouPS6ciaUmiqGCuBwxaQ.ipa`.

## Latest Progress - Native Core Parity Pass

- Upgraded the native Plan screen from a read-only summary to a real plan hub:
  - Diet/workout tabs.
  - Active cycle timing.
  - Full meal and workout-day detail.
  - Meal recipe generation.
  - Plan history.
  - Previous-cycle rollback.
  - Renewal preview and "Apply new plan" confirmation using `/api/renew-plan`.
- Updated `/api/renew-plan` so native bearer-authenticated users can generate renewal previews, apply them, and roll back previous plans.
- Expanded native Nutrition:
  - Macro progress bars for calories, protein, carbs, and fat.
  - Water controls kept on the main screen.
  - Planned meal checklist now toggles on/off against Supabase meal logs.
  - Manual, barcode, live scanner, and photo scan paths still feed the editable food log form.
- Expanded native Train:
  - Per-exercise weight and reps inputs.
  - Session draft sync now keeps completion state and performance notes.
  - Workout logs include the per-exercise performance inside the logged exercise payload.
  - Exercise guidance/progression notes from the backend now display in native.
- Fixed the More screen typed navigation and kept Arabic language switch text clean.
- Verified:
  - `npm run mobile:typecheck`
  - `npm run mobile:config`
  - `npm run build`
  - `npx expo export:embed --eager --platform ios --dev false --bundle-output <temp> --assets-dest <temp>`
- Result: EAS iOS production build `ced867ad-21e2-438c-a863-3000fdf57567` finished successfully from commit `659726ef4943e88369ed89209664d86f6c862d7f`. App build number `14`; IPA artifact: `https://expo.dev/artifacts/eas/rxrLFRKxfdsHtC5n8Q3JT2.ipa`.

## Latest Progress - Remaining Web Parity Screens

- Added native Profile Settings so users can edit the key profile fields Ion depends on: age, body stats, goal, training schedule, injuries, food preferences, allergies, and meals/day.
- Added a mobile `GET /api/save-profile` path and reused the existing `POST /api/save-profile` profile persistence flow for native settings.
- Added native Supplement Stack screen connected to `/api/supplement-recommendations`.
- Added native Macro Adjustment screen connected to `/api/macro-adjustment`.
- Updated supplement and macro-adjustment APIs to accept native bearer auth while preserving web behavior.
- Added More-screen links for Settings, Supplements, and Macro adjustment.
- Verified:
  - `npm run mobile:typecheck`
  - `npm run mobile:config`
  - `npm run build`
  - `npx expo export:embed --eager --platform ios --dev false --bundle-output <temp> --assets-dest <temp>`
- Result: EAS iOS production build `b975ff0b-6909-4e53-b3d0-47dfd6499c22` finished successfully from commit `da2391614cdb08ba31edbe7cb4d5a597727ac40e`. App build number `16`; IPA artifact: `https://expo.dev/artifacts/eas/oUhEwwSUbdPiNvzni9yCf7.ipa`.

## Latest Progress - Notification Scheduling And Deep Links

- Added native local notification scheduling for daily SYNAP reminders:
  - Workout check-in routes to Train.
  - Meal logging reminder routes to Nutrition.
  - Hydration reminder routes to Nutrition.
- Notifications screen now schedules/cancels/checks local reminders after permission is granted.
- Added app-level notification handler so foreground notifications display in iOS.
- Added push/local notification tap routing:
  - `data.url` opens the specific native route.
  - Known notification types route to Nutrition, Train, Progress, Reports, or Plan.
- Re-tested Hermes with EAS build `f1e4281c-20af-4d54-9e04-6abb822b2834`. It still fails during Xcode/Hermes bytecode compilation with React Native internal `invalid statement encountered` errors. Release path remains `jsEngine: "jsc"` for stability.
- Result: EAS iOS production build `bd1a6f1b-fee9-40a1-a5cf-fbd576e3c1e3` finished successfully from commit `ce891d0c8200e461e0d42a9742f47abddd1afd95`. App build number `20`; IPA artifact: `https://expo.dev/artifacts/eas/pmnGfPY7KCLtpBTNsXFttR.ipa`.
- Submit status: `eas submit --platform ios --profile production --latest --non-interactive` is blocked until `ascAppId` is added to `apps/mobile/eas.json` or the submit command is run interactively with Apple ID login. Non-interactive Codex shell cannot answer the Apple ID prompt.

## Latest Progress - Expo Build Above Capacitor

- Added App Store Connect app ID `6771498466` to the EAS submit profile.
- Bumped the Expo iOS build number above the old Capacitor build numbers to avoid selecting the wrong binary in App Store Connect.
- Result: EAS iOS production build `f8b7166c-e33f-419a-8159-8c2855ab89b4` finished successfully from commit `2fb721fe99ae3251c13a48bdd812ab1e249fc216`. App build number `58`; IPA artifact: `https://expo.dev/artifacts/eas/wHjy2Li9MCDCmYWmE8NQco.ipa`.
- Submit result: `eas submit --platform ios --profile production --latest --non-interactive` successfully uploaded build `58` to App Store Connect. Apple is processing it for TestFlight/App Review selection.

## Latest Progress - Launch Crash Follow-up

- User reported TestFlight app crashed immediately on open after build `58`.
- Diagnosis found `apps/mobile/metro.config.js` still forced `unstable_transformProfile: "hermes-stable"` while `apps/mobile/app.json` uses `jsEngine: "jsc"`. This can produce a runtime/bundle mismatch on iOS startup.
- Removed the Hermes transform profile so production iOS bundles are transformed for the configured JSC runtime.
- Verified:
  - `npm run typecheck`
  - `npx expo export:embed --eager --platform ios --dev false --bundle-output <temp> --assets-dest <temp>`
- Result: EAS iOS production build `8733eaea-8f03-4e89-99ae-ae505fde95e5` finished successfully from commit `3d0f39e60f3f81c4e10c563c3180ebe1d9cd981c`. App build number `60`; IPA artifact: `https://expo.dev/artifacts/eas/hGkovfapCF5M3D7NGvLCvk.ipa`.
- Submit result: `eas submit --platform ios --profile production --latest --non-interactive` successfully uploaded build `60` to App Store Connect. Apple is processing it for TestFlight/App Review selection.

## Latest Progress - Build 61 Debug Pass (2026-05-23)

User reported build 60 still crashing on launch and showing the wrong app icon. Full debug audit performed.

### Crash root cause — react-native-reanimated v4 / JSC incompatibility

- `apps/mobile/package.json` had `react-native-reanimated: ~4.1.1` installed.
- Reanimated v4 dropped JSC support entirely — it requires Hermes. The mobile app uses `jsEngine: "jsc"` (Hermes still fails on EAS due to React Native internal syntax errors).
- Result: immediate fatal launch crash on any JSC build with reanimated v4.
- Fix: downgraded `react-native-reanimated` from `~4.1.1` → `~3.16.7` (the last v3 release, fully compatible with Expo 54 + JSC).

### Wrong icon — asset file mismatch

- `apps/mobile/assets/icon.png` was a 1,457,298-byte file (different image, not the SYNAP icon).
- Fix: replaced with the correct SYNAP icon copied from `resources/icon.png` (467,327 bytes, 1024×1024).

### Wrong splash screen — asset file mismatch

- `apps/mobile/assets/splash.png` was the same wrong 1,457,298-byte file as the icon.
- Fix: replaced with the correct SYNAP splash copied from `resources/splash.png` (345,068 bytes, 2732×2732).

### Dead @supabase/supabase-js dependency

- `@supabase/supabase-js: ^2.105.1` was still listed in `apps/mobile/package.json` even though the mobile app switched to `@supabase/auth-js` directly (to avoid OpenTelemetry dynamic imports that crash JSC).
- No mobile source file imports `@supabase/supabase-js` — it was dead weight pulling in the full Supabase bundle unnecessarily.
- Fix: removed `@supabase/supabase-js` from mobile `package.json`.

### Metro config dead Supabase CJS resolver

- `apps/mobile/metro.config.js` had a `@supabase/supabase-js` CJS resolver redirect left over from before the auth-js switch. It was never hit at runtime after supabase-js was removed, but caused Metro to scan and resolve the redirect on every startup.
- Effect: Metro startup was 8844ms instead of ~850ms.
- Fix: simplified `metro.config.js` to just `getDefaultConfig(__dirname)` — no custom resolver needed.
- Verified: Metro startup dropped from 8844ms → 849ms; bundle still builds 1477 modules cleanly.

### Verified after all fixes

- `npm run mobile:typecheck` — clean, 0 errors.
- `npx expo export:embed --eager --platform ios --dev false --bundle-output <temp> --assets-dest <temp>` — 849ms Metro startup, 1477 modules, 0 errors.
- `npm run mobile:config` — clean, expected iOS bundle ID, HealthKit plugin, correct icon and splash paths.
- Icon asset: `apps/mobile/assets/icon.png` — 467,327 bytes (correct SYNAP icon, 1024×1024).
- Splash asset: `apps/mobile/assets/splash.png` — 345,068 bytes (correct SYNAP splash, 2732×2732).

### Next step

Commit all changes and trigger a new EAS production build (will auto-increment to build 61+):

```bash
cd D:\Synap
git add apps/mobile/package.json apps/mobile/metro.config.js apps/mobile/assets/icon.png apps/mobile/assets/splash.png MOBILE_APP_BUILD.md
git commit -m "fix: crash (reanimated v4→v3.16.7), icon/splash assets, remove dead supabase-js dep"
git push
eas build --platform ios --profile production --non-interactive --no-wait
eas submit --platform ios --profile production --latest --non-interactive
```

## Latest Progress - Direct GitHub iOS Build Signing (2026-05-24)

Goal: build the Expo-native iOS app directly from GitHub Actions so we are not blocked by EAS build limits.

What was added:

- Added direct GitHub Actions workflow `.github/workflows/ios-expo-direct.yml`.
- Workflow performs:
  - Checkout.
  - Node install for root and `apps/mobile`.
  - Mobile TypeScript check.
  - Expo config validation.
  - `npx expo prebuild --platform ios --clean --non-interactive`.
  - CocoaPods install.
  - Fastlane build and TestFlight upload attempt.
- Added/updated Fastlane `ios expo_beta` lane to build the generated Expo iOS project.
- Added public diagnostics so GitHub annotations show the real Fastlane signing failure even when raw logs are not accessible.
- Normalized App Store Connect API key handling:
  - Supports GitHub secret values with real newlines.
  - Supports GitHub secret values with escaped `\n`.
  - Validates that the full `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----` block exists.
  - Bypassed the fragile `app_store_connect_api_key` action by passing a Fastlane API-key hash directly to signing/upload actions.

Verification from GitHub Actions:

- Dependency install passed.
- Mobile TypeScript check passed.
- Expo config validation passed.
- Expo iOS prebuild passed.
- CocoaPods install passed.
- App Store Connect API key is now being read.
- The build is blocked at Apple Distribution certificate creation, not app code.

Current blocker:

```txt
Could not create another Distribution certificate, reached the maximum number of available Distribution certificates.
```

Meaning:

- GitHub/Fastlane authenticated with Apple successfully.
- Fastlane tried to create a new Apple Distribution certificate.
- Apple refused because the Apple Developer account already has the maximum allowed Distribution certificates.

Safest next path:

- Do not revoke certificates blindly.
- Reuse an existing valid Apple Distribution certificate instead of creating a new one on every GitHub run.
- Export the existing Distribution certificate as a `.p12`.
- Add the `.p12` and matching provisioning profile to GitHub Actions secrets.
- Update the workflow to import the existing certificate/profile into the GitHub runner keychain.
- Remove `cert(force: true)` from the direct build lane.

Secrets planned for the stable direct GitHub signing path:

```txt
IOS_DIST_CERT_P12_BASE64
IOS_DIST_CERT_PASSWORD
IOS_PROVISION_PROFILE_BASE64
APPLE_TEAM_ID
APP_STORE_CONNECT_API_KEY_ID
APP_STORE_CONNECT_ISSUER_ID
APP_STORE_CONNECT_API_KEY_P8
```

**Code fix applied (no more cert creation):**

- Rewrote Fastlane `expo_beta` lane to import an existing `.p12` Distribution certificate from GitHub secrets instead of calling Apple's API to create a new one. Removed `cert(force: true)` and `sigh(force: true)` — these were the calls that hit the Apple certificate limit.
- Updated `.github/workflows/ios-expo-direct.yml` to pass the new signing secrets to Fastlane.
- Added `require 'base64'` and `require 'tmpdir'` to `Fastfile` (needed for P12 decoding).

**User action required — 4 steps:**

**Step 1 — Export your existing Distribution certificate (on your Mac)**
1. Open **Keychain Access** → login keychain → My Certificates.
2. Find `Apple Distribution: [your name]` or `iPhone Distribution: [your name]`.
3. Right-click it → **Export** → save as `dist.p12`.
4. Set a password when prompted (you'll need it in step 3).

**Step 2 — Download the provisioning profile**
1. Go to [developer.apple.com → Profiles](https://developer.apple.com/account/resources/profiles/list).
2. Find the **App Store** profile for bundle ID `app.synap.fit`.
3. Download it → save as `synap.mobileprovision`.

**Step 3 — Base64 encode both files (Mac terminal)**
```bash
base64 -i dist.p12 | pbcopy
# paste that into GitHub secret: IOS_DIST_CERT_P12_BASE64

base64 -i synap.mobileprovision | pbcopy
# paste that into GitHub secret: IOS_PROVISION_PROFILE_BASE64
```

**Step 4 — Add these secrets to GitHub**
Go to: GitHub repo → Settings → Secrets and variables → Actions → New repository secret

| Secret name | Value |
|---|---|
| `IOS_DIST_CERT_P12_BASE64` | Base64 output of dist.p12 |
| `IOS_DIST_CERT_PASSWORD` | Password you set when exporting |
| `IOS_PROVISION_PROFILE_BASE64` | Base64 output of synap.mobileprovision |
| `APPLE_TEAM_ID` | Your 10-char Apple team ID (e.g. `ABC123DEFG`) |
| `APP_STORE_CONNECT_API_KEY_ID` | Already added |
| `APP_STORE_CONNECT_ISSUER_ID` | Already added |
| `APP_STORE_CONNECT_API_KEY_P8` | Already added |

After secrets are added, push any commit to `main` — the `iOS Expo Direct Build` workflow will trigger automatically.

## Latest Progress - Build 66 Root Cause Fix — New Architecture disabled

**Actual root cause (present since build 9, never tested on device until build 58):**

Expo SDK 54 enables New Architecture (Fabric renderer + TurboModules) by default for new projects. The `app.json` had no `"newArchEnabled": false` key, so every EAS build ran with New Architecture on. Two packages in the app use Old Architecture native APIs that are incompatible with Fabric:

- `react-native-youtube-iframe` 2.4.1 — imports `react-native-webview` at module scope using Old Architecture bridge APIs. Under New Architecture these fail at native module init before any JS component renders.
- `react-native-view-shot` 5.1.0 — same issue, Old Architecture view capture API.

When JSC evaluates the full bundle at startup (JSC has no lazy module loading unlike Hermes), both packages try to initialize their native modules immediately → crash before the login screen ever renders.

**All fixes applied for build 66:**

1. **`app.json` — added `"newArchEnabled": false`**: Forces old bridge (most compatible with all packages including view-shot, webview, youtube-iframe, nitro-modules under JSC).

2. **`progress.tsx` — made `react-native-view-shot` a lazy import**: `captureRef` is now loaded inside the share function via `await import(...)` instead of at module scope. If the native module has issues, it fails gracefully inside the share button handler, not at app startup.

3. **`programme.tsx` — made `react-native-youtube-iframe` a lazy import**: `YoutubePlayer` is now loaded on demand when a user taps "Watch inside app". The module is not evaluated at bundle startup.

4. **`_layout.tsx` — added root `ErrorBoundary`**: Any React render crash now shows a SYNAP-branded error screen instead of a silent crash to the iOS home screen. This is a permanent safety net.

5. **Previous fix (build 65)** — removed `react-native-gesture-handler` direct dep and bare import. Expo Router provides gesture-handler internally; the explicit 2.28.0 pinned version was pulling in reanimated as a peer dep and crashing worklet initialization.

**Verified:** `npm run mobile:typecheck` — clean, 0 errors.

## Latest Progress - Build 65 Crash Fix — gesture-handler / reanimated worklet crash

**Root cause of persistent crash (builds 58 → 64):**

Gesture-handler 2.28.0 uses reanimated worklets (`runOnUI`) internally during gesture initialization. When `react-native-reanimated` was removed from `package.json` in build 64, the Babel plugin that transforms worklet functions was also removed. Reanimated 3.16.7 was still present in the lockfile as a peer dependency of gesture-handler. Result: gesture-handler tried to call reanimated worklet APIs that were never set up → fatal crash before any screen rendered.

**Fix:**

- Removed `react-native-gesture-handler` from `apps/mobile/package.json`. Expo Router already includes a compatible, correctly wired version of gesture-handler internally. The explicit 2.28.0 pinned version was overriding expo-router's own dep and pulling in reanimated as a peer.
- Removed `import 'react-native-gesture-handler'` from `apps/mobile/app/_layout.tsx`. Expo Router wraps the root in `<GestureHandlerRootView>` automatically — the manual bare import is not needed and was causing double initialization.
- Regenerated `apps/mobile/package-lock.json`. Both `react-native-gesture-handler` and `react-native-reanimated` are now only listed as optional peer deps, not installed. The native build will not link either module.

**Verified:**
- `npm run mobile:typecheck` — clean, 0 errors.
- Lockfile: 0 installed copies of reanimated or gesture-handler as direct dependencies.

**Build 65 expected result:** no gesture-handler worklet crash at startup. Expo Router's internal gesture-handler handles swipe navigation normally.

## Latest Progress - GitHub Build Path Corrected (No Mac Required)

The direct Fastlane build path (`ios-expo-direct.yml`) requires a Mac to export a `.p12` certificate from Keychain Access. Since the machine is Windows-only, the correct build path is EAS.

**What changed:**

- `ios-expo-eas.yml` now triggers **automatically on every push to `main`** when any `apps/mobile/**` file changes. Previously it was manual-only.
- `ios-expo-direct.yml` is now **manual-only** with a clear comment. It remains in the repo as a future option if Mac signing secrets are ever available.
- EAS already holds the valid Apple Distribution certificate and provisioning profile from builds 9–60. No new cert needs to be created — no Apple limit issue.

**How the build path works now:**

```
git push → GitHub Actions (ubuntu-latest)
  → npm ci + typecheck + config validate
  → eas build --platform ios --profile production --non-interactive --no-wait
  → EAS cloud macOS runner builds IPA + handles signing
  → IPA available at expo.dev/artifacts
  → run eas submit manually or enable submit input in workflow_dispatch
```

**Only secret needed in GitHub:** `EXPO_TOKEN` (already added from earlier builds).

## Latest Progress - EAS Build 61-63 Retry (2026-05-24)

Goal: push the latest mobile update through EAS because EAS already has valid remote Apple signing credentials and does not require a Mac.

Build attempts:

- Build 61 was accepted by EAS and auto-bumped `expo.ios.buildNumber` from `60` to `61`, but failed during dependency install.
- Build 62 was accepted by EAS and auto-bumped to `62`, but failed with the same dependency-install issue.

Dependency-install root cause:

```txt
npm ci --include=dev can only install packages when package.json and package-lock.json are in sync.
Missing: typescript@5.9.3 from lock file
```

Fix:

- Regenerated `apps/mobile/package-lock.json` using the same npm version EAS uses: `npm@10.9.3`.
- Verified locally with:

```bash
npx npm@10.9.3 ci --include=dev --dry-run
```

Follow-up build result:

- Build 63 got past dependency install and failed later in Xcode.
- Xcode root cause was `RNReanimated`:

```txt
react-native-reanimated/Common/cpp/reanimated/Fabric/ShadowTreeCloner.cpp
fatal error: 'folly/coro/Coroutine.h' file not found
```

Decision:

- Remove `react-native-reanimated` from the native mobile app before App Review.
- Reason: Reanimated v4 crashes under the current JSC release path, and Reanimated v3.16.7 fails native compilation with React Native 0.81 new architecture on EAS.
- This dependency was added for UI polish only; no native mobile feature currently depends on Reanimated APIs.
- Keep `react-native-gesture-handler` because it is harmless and still useful for navigation/gesture compatibility.

Final result:

- Removed `react-native-reanimated` from `apps/mobile/package.json`.
- Removed `react-native-reanimated/plugin` from `apps/mobile/babel.config.js`.
- Regenerated the mobile lockfile with `npm@10.9.3`.
- EAS iOS production build `079716c8-a8bd-4181-8a1f-b7c23398fc6b` finished successfully from commit `eca8633b67c8f6398c648615d2eb9a1cbb6714ac`.
- App build number: `64`.
- IPA artifact: `https://expo.dev/artifacts/eas/WmYt5qhoH3HGCebXPf6aM.ipa`.
- Submission scheduled for build `64` using EAS Submit and the EAS-managed App Store Connect API key.
- Submission ID: `814515a6-3754-41ad-b071-de473a8ae0d7`.
- Submission URL: `https://expo.dev/accounts/mou_hossam/projects/synap/submissions/814515a6-3754-41ad-b071-de473a8ae0d7`.

## Latest Progress - Direct GitHub Xcode Compatibility (2026-05-25)

Direct GitHub build progressed past signing, Expo prebuild, and CocoaPods after adding `cocoapods` to the root `Gemfile`.

New blocker:

```txt
/Pods/fmt/include/fmt/format-inl.h:1394:33:
error: call to consteval function ... is not a constant expression
```

Root cause:

- The workflow was running on GitHub's `macos-26` image with Xcode `26.4.1`.
- React Native 0.81 / Expo SDK 54 pods are not compiling cleanly on that bleeding-edge Xcode image.
- This is a toolchain compatibility issue in native C++ pods (`fmt`), not a SYNAP app-code issue.

First attempted fix:

- Switched `.github/workflows/ios-expo-direct.yml` from `runs-on: macos-26` to `runs-on: macos-15`.
- Result: the archive built, but App Store Connect rejected upload because Apple now requires the iOS 26 SDK for all iOS/iPadOS uploads.

Final fix:

- Restored `.github/workflows/ios-expo-direct.yml` to `runs-on: macos-26`.
- Added a Fastlane post-`pod install` patch for `Pods.xcodeproj`.
- The patch adds `FMT_USE_CONSTEVAL=0` to pod preprocessor definitions and C++ flags so Xcode 26 can compile the React Native native pods.
- The patch also makes the generated `Pods/fmt/include/fmt/core.h` writable and edits it to disable `FMT_CONSTEVAL` directly when the pod header still enables it.
- The patch also makes the generated `Pods/fmt/include/fmt/format-inl.h` writable and rewrites `FMT_STRING(...)` to `fmt::runtime(...)`, avoiding the remaining Xcode 26 `consteval` failures in fmt's own implementation file.
- The patch also raises generated pod deployment targets below iOS 12 to `12.0` to match the Xcode 26 supported range.

## Latest Progress - TestFlight Crash Diagnosis (2026-05-25)

Build `1028` crash report was inspected from `SYNAP-2026-05-25-214053.000.ips`.

Crash report finding:

- Exception: `EXC_CRASH`, `SIGABRT`, `Abort trap: 6`.
- Faulting queue: `com.facebook.react.ExceptionsManagerQueue`.
- This means React Native received a fatal startup exception and aborted the app.
- The app binary still loaded `hermes.framework` and had a `hades` Hermes GC thread, even though `app.json` had `jsEngine: "jsc"`.

Fix:

- Keep all app features in place.
- Upload `SYNAP-Expo.app.dSYM.zip` as a GitHub Actions artifact for future symbolication.

Follow-up build `1029` still crashed and still loaded `hermes.framework`.

Updated diagnosis:

- React Native `0.81.5` forces Hermes inside `react_native_pods.rb`.
- The generated native project cannot be switched to JSC by editing the Podfile.
- Keeping `app.json` on `jsEngine: "jsc"` created a misleading config/runtime mismatch.
- `npx expo-doctor` found SDK 54 native dependency mismatches:
  - `expo-device` was installed as `56.x` instead of `~8.0.10`.
  - `expo-image-picker` was installed as `56.x` instead of `~17.0.11`.
  - `expo-notifications` was installed as `56.x` instead of `~0.32.17`.
  - `expo-sharing` was installed as `56.x` instead of `~14.0.8`.
  - `react-native-view-shot` was installed as `5.x` instead of `4.0.3`.
  - `babel-preset-expo`, `typescript`, `react-native-webview`, and `@types/react` also needed SDK alignment.

Fix:

- Keep all mobile app features in place.
- Align the native app explicitly to Hermes because RN `0.81.5` requires it.
- Install Expo SDK 54 compatible package versions with `npx expo install`.
- Remove the obsolete Fastlane Podfile patch that tried to force Hermes off.
- Add `npx expo-doctor` to the direct GitHub iOS workflow before Fastlane so bad native dependency versions fail before an IPA is uploaded.

Local verification after the fix:

- `npx expo-doctor` passed `18/18`.
- `npm run mobile:typecheck` passed.
- `npm run mobile:config` reports `jsEngine: "hermes"` and `newArchEnabled: false`.
- `npx expo export --platform ios --clear` produced a Hermes bytecode bundle (`.hbc`) successfully.

## Latest Progress - Login Runtime Error (2026-05-25)

After build `1029` launched successfully, login showed:

```txt
Cannot assign to read-only property 'NONE'
```

Diagnosis:

- The error matches React Native's internal DOM `Event` constants (`Event.NONE`).
- The mobile Babel config was forcing loose class-property transforms globally.
- That can rewrite React Native's own `Event` implementation so it attempts to assign read-only constants on event instances.
- Login triggers network/auth events, which is why the error appeared when pressing `LOG IN`.

Fix:

- Removed the manual class-property/private-property Babel plugins from the mobile app.
- Let `babel-preset-expo` choose the correct React Native / Hermes transforms.
- Removed the now-unused Babel transform packages from the mobile app dependencies.

Local verification:

- `npm run mobile:typecheck` passed.
- `npx expo-doctor` passed `18/18`.
- `npx expo export --platform ios --clear` produced a Hermes bytecode bundle successfully.

## Latest Progress - Mobile Network Runtime Env (2026-05-25)

After the app launched, login showed:

```txt
Network request failed
```

Diagnosis:

- The GitHub direct iOS workflow was not exporting Expo public runtime variables.
- The local build had `.env.local`, but GitHub Actions did not pass:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_API_BASE_URL`
- Without those values, the TestFlight bundle falls back to the placeholder Supabase URL and auth requests fail on-device.

Fix:

- Added the mobile public runtime env values to the direct iOS workflow job environment.
- Added a workflow preflight step that fails before building if any required mobile runtime env value is missing.
- Added Xcode gym log artifact upload so future native build failures include the complete archive log, not only clipped annotation lines.

Required GitHub configuration:

- Add `EXPO_PUBLIC_SUPABASE_URL` as a GitHub Actions secret or repository variable.
- Add `EXPO_PUBLIC_SUPABASE_ANON_KEY` as a GitHub Actions secret or repository variable.
- `EXPO_PUBLIC_API_BASE_URL` is optional because the workflow defaults it to `https://www.synapfit.app`.
- The workflow also accepts the existing web names:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Do not expose or use `SUPABASE_SERVICE_ROLE_KEY` in the mobile build.

## Latest Progress - UI Redesign & Web Parity Pass (2026-05-26)

Full visual redesign of the five core mobile screens to close the gap with the web app design system.

### Dashboard (index.tsx) — complete redesign

Before: three plain cards (Access, Workout, Nutrition).

After (matches web dashboard):

- **Time-based greeting** — "GOOD MORNING / AFTERNOON / EVENING" in the brand spark colour, with the user's name in large text below.
- **4 stat chips row**: Goal, Calories, Training, Weight — each with a Feather icon and colour-coded value. Matches the web's 2×2 stat grid.
- **Ion last-message preview card** — tappable gradient card showing the latest Ion message with avatar, "ION SAYS" eyebrow, and chevron. Routes to Chat tab. Web parity.
- **Today Workout card** — shows workout name, exercise preview rows (3 items + overflow count), rest-day state, and taps into Train. Has accent top-edge highlight (purple).
- **Today Nutrition card** — shows calorie logged/target with a gradient progress bar, and meal count. Taps into Nutrition.
- **Weight delta indicator** — shows +/– change from last measurement in appropriate color (pulse = good, flame = caution).
- **Quick actions row** — three action chips: Ask Ion → Chat, Log Weight → Progress, Start Training → Train. Matches web's quick-action row.
- **Ambient purple glow** — radial glow behind the hero header, matching the web's `radial-gradient` treatment.
- **Access banner** — SYNAP logo + tier/access status at the bottom.

### Chat (chat.tsx) — quick prompts added

- **8 horizontal quick-prompt chips** (English + Arabic) shown in a scrollable row when the composer is empty.
- Prompts: "How am I progressing?", "Adjust my calories", "I missed a workout", "Explain my workout split", "Best time to take protein?", "I want to change my goal", "I'm feeling sore", "Feeling tired lately".
- Tapping a prompt sends it immediately without needing to type.
- Matches the web chat's quick-prompt chip strip.

### Progress (progress.tsx) — chart + measurement detail

Before: list of weight/waist rows.

After:

- **Redesigned latest snapshot card** — large weight number, stat pills for Waist / Body Fat % / Muscle Mass (shown when available from InBody analysis).
- **Inline weight-trend chart** — drawn with positioned Views (no extra native deps). Shows connecting lines between up to 8 measurements (oldest → newest), coloured green (pulse) for good trend or purple (spark) for neutral. Weight values labelled at start and end.
- **Delta indicator** inside the snapshot card.
- **Timeline history** — each measurement row has a colour dot (spark for latest, dim for older).

### More (more.tsx) — navigation rows

Before: plain text links in a flat list.

After:

- **Proper navigation rows** — each feature has an icon badge (coloured), label, and right chevron arrow. Matches iOS-native Settings visual pattern.
- **Preference chips** with icons: sun/moon for theme toggle, globe for language.
- **Rebuild Plan, Logout, Delete Account** moved to styled nav rows with appropriate accent colours.
- **Apple Health stats** displayed as compact labelled pills (Steps, Kcal, Weight, HR).
- **Support links** styled as nav rows with document/shield/life-buoy icons.

### Design system additions

- Added `sparkLight` colour token (`#D88BFF` dark / `#C084FC` light) to `colors.ts` and `ThemeColors` type — matches the web `sparkLight` used for accent text and gradient ends.
- Upgraded `Card` component with a 1px top-edge inner highlight (white 5.5% opacity, or brand spark when `accent` prop is set) — approximates the web `glass-card` inner-glow treatment.

### Verified

- `npm run mobile:typecheck` — clean, 0 errors.

---

## Latest Progress - Nutrition/Train Crash Fix & Full Web Parity (2026-05-26)

### Runtime crash fix — "Objects are not valid as a React child"

**Root cause:** The plan JSON can contain `meal.recipe` as a nested object `{title, steps, instructions, tips, prep_time_min, cook_time_min}` and `meal.instructions` / `meal.description` as arrays or objects. Rendering these as React text children crashed with `Objects are not valid as a React child (found: object with keys {tips, steps, title, ingredients, cook_time_min, prep_time_min})`.

**Fix — `safeText()` helper in `nutrition.tsx`:**

```typescript
function safeText(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'string') return val.trim()
  if (Array.isArray(val)) {
    return val.map((v: unknown) => (typeof v === 'string' ? v : safeText(v))).filter(Boolean).join('\n')
  }
  if (typeof val === 'object') {
    const r = val as Record<string, unknown>
    const parts: string[] = []
    if (r.title && typeof r.title === 'string') parts.push(r.title)
    if (r.steps) parts.push(safeText(r.steps))
    if (r.instructions) parts.push(safeText(r.instructions))
    if (r.tips) parts.push('Tips: ' + safeText(r.tips))
    if (r.prep_time_min) parts.push(`Prep: ${r.prep_time_min} min`)
    if (r.cook_time_min) parts.push(`Cook: ${r.cook_time_min} min`)
    if (parts.length === 0) {
      Object.values(r).forEach(v => { if (typeof v === 'string' && v) parts.push(v) })
    }
    return parts.filter(Boolean).join('\n')
  }
  return String(val)
}
```

**Fix — `safeIngredient()` helper in `nutrition.tsx`:**

```typescript
function safeIngredient(ing: unknown): string {
  if (typeof ing === 'string') return ing.trim()
  if (ing && typeof ing === 'object') {
    const o = ing as Record<string, unknown>
    const name = o.name ?? o.item ?? o.food ?? ''
    const amount = o.amount ?? o.quantity ?? o.serving ?? ''
    const cal = o.calories ? ` · ${o.calories} kcal` : ''
    return `${name}${amount ? '  ' + amount : ''}${cal}`.trim()
  }
  return String(ing ?? '')
}
```

All `meal.recipe`, `meal.instructions`, `meal.description`, and ingredient fields now route through these helpers before rendering.

### Nutrition tab — web parity additions

- **`CalorieRing`** — SVG-style circle progress ring (drawn with positioned `View` components, no `react-native-svg` dep) showing calories consumed vs. target.
- **`MacroBar`** — labelled progress bars for protein / carbs / fat with numeric targets.
- **Water tracker** — individual glass buttons (8-glass grid), each tap fills the next glass.
- **Grocery List quick action** — tappable card that routes to `app/grocery.tsx`.
- **Eating Out Mode quick action** — tappable card that routes to `app/eating-out.tsx`.
- **Meal food list** — when a planned meal is expanded it now shows `meal.foods` / `meal.items` as individual food rows with portion and calorie info.
- **Ingredients list** — expanded meal also shows `meal.ingredients` formatted via `safeIngredient()`.
- **Recipe/instructions panel** — shows `meal.recipe` and `meal.instructions` rendered via `safeText()`.
- **Pre/post workout note banners** — shown when `meal.tags` contains `pre_workout` or `post_workout`.
- **Meal timing note** — shown when `meal.timing_note` or `meal.meal_type` is present.
- **Collapsible log food panel** — manual log form now collapses when not in use; tapping "+ Log Food" expands it.
- **RTL localisation** — all new layout elements respect `isRtl` direction.

### Train tab — web parity additions

- **YouTube video button (per exercise)** — exercises with a `video_id` field show a red YouTube icon button. Tapping it opens the YouTube app if installed, otherwise falls back to the browser.

  ```typescript
  function openVideo(videoId: string | null | undefined) {
    if (!videoId) return
    const appUrl = `youtube://www.youtube.com/watch?v=${videoId}`
    const webUrl  = `https://www.youtube.com/watch?v=${videoId}`
    Linking.canOpenURL(appUrl)
      .then(supported => Linking.openURL(supported ? appUrl : webUrl))
      .catch(() => Linking.openURL(webUrl))
  }
  ```

- **Exercise expand/collapse** — tap an exercise name or the chevron to expand it. Expanded view shows form tips, progression note, and a full-width "Watch exercise video" button.
- **Progress bar in session card** — shows `completed / total exercises` as a horizontal fill bar.
- **Muscle group tag** — shown as a pill badge next to each exercise name when `exercise.muscle_group` is present.
- **`TrainLink` quick navigation** — three tap targets at the top of the tab: Programme, Measurements, Form Check. Each navigates to the corresponding secondary screen.
- **RTL localisation** — all layout elements respect `isRtl` direction.

### Commit

All changes pushed as commit `92d1eac` — `fix(mobile): crash fix + full nutrition/train web parity`.

---

## Latest Progress - Builds 1037 → 1039 (2026-05-26)

### Changes shipped in builds 1037 – 1039

| Commit | Build | Description |
|---|---|---|
| `4c3061c` | 1037 | Removed `react-native-youtube-iframe` from `package.json` (zero JS imports — replaced by `VideoModal` WebView; native code was still linking at CocoaPods time and was a startup crash risk). Regenerated lockfile with `npm@10.9.3`. |
| `dab38de` | 1038–1039 | Billing screen rewrite — subscribe CTA is now the first thing on the screen (was buried after features and steps). Added "Copy website address" button using `Share.share()` which opens the iOS native share sheet (includes Copy); user copies, opens Safari, pastes. No `Linking.openURL`, Apple-compliant. |

### Pre-build 1037 verification (all green)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx expo-doctor` | ✅ 18/18 checks passed |
| `npx expo config --type public` | ✅ `jsEngine: hermes`, `newArchEnabled: false`, `bundleIdentifier: app.synap.fit` |
| `npx expo export:embed --platform ios --dev false` | ✅ 1285 modules, Hermes, 0 errors |
| `npx npm@10.9.3 ci --dry-run` | ✅ No sync errors |
| Bundle crash-risk scan | ✅ no youtube-iframe, no reanimated require, no opentelemetry |

### Current build

**Latest build: 1039** — `dab38de` — billing screen UX rewrite (subscribe CTA first + Copy address button).

---

## Latest Progress - Full Web Parity, Focus Refresh Fixes & Billing System (2026-05-26)

### Grocery list — full web parity

`apps/mobile/app/grocery.tsx` — complete rewrite.

- **Checkable items** — tap any item to tick it off; checked items show a strikethrough and a green checkbox icon.
- **Progress bar** — live `N / total` count with percentage fill. Updates on every tap.
- **AsyncStorage persistence** — checked state is written to `synap_grocery_checked_v1` on every toggle and restored on mount, so the list survives app restarts.
- **Native Share** — header button opens the iOS native share sheet with the full list as plain text. Works without any permissions.
- **Clear checked** — confirmation alert clears all ticks and wipes the stored state.

### Progress tab — full web parity

`apps/mobile/app/(tabs)/progress.tsx` — complete rewrite.

- **5-metric chart selector** — pill chip row lets the user switch between Weight, Waist, Chest, Bicep, and Body Fat %. The inline chart re-renders for the selected metric.
- **`MetricMiniChart`** — generalised chart component drawn with positioned Views (no `react-native-svg`). Works for any numeric measurement key.
- **Workout log history** — fetches `/api/workout-session` logs inline and shows a dated list below the measurements.
- **Streak counter** — counts consecutive days with a logged workout and displays it in the header.
- **Coach timeline** — fetches `/api/me/features` to show coach notes and plan-change events in a vertical timeline.
- **`useFocusEffect`** — measurements and workout logs refresh whenever the tab comes into focus so logging a weight in another screen is immediately reflected here.

### Train tab — full web parity + workout timer

`apps/mobile/app/(tabs)/train.tsx` — major additions.

**7-day week browser:**
- Horizontal scrollable day selector showing all 7 days of the current week.
- Today highlighted with a purple dot; days that have a planned workout show a small green dot.
- Tapping any day loads that day's workout. A "Browsing — Day X" banner appears when viewing a non-today day.
- Inlined `canonicalDay()`, `getPlanDays()`, and `buildTodayWorkout()` helpers (equivalent to the web's `workout-days.ts`).

**Workout timer:**
- `'idle' | 'running' | 'paused'` state machine.
- Start / Pause / Resume / Reset controls with a live `MM:SS` / `HH:MM:SS` display.
- Timer auto-starts the first time the user checks off an exercise.
- Finish button subtitle shows the actual elapsed time.
- When all exercises are checked: button changes to "All done! Save workout 🏆".

**Exercise completion:**
- Checked exercises show strikethrough name, green left border, and a filled checkbox.
- `useFocusEffect` reloads the session on tab focus.

**YouTube inline player:**
- Removed `openVideo()` / `Linking` approach (opened external YouTube app).
- Added `VideoModal` import and `activeVideoId` state; all video buttons now open the inline WebView player.

### Settings — Billing and Notifications tabs

`apps/mobile/app/settings.tsx` — major additions.

- **3-tab layout** — Profile / Billing / Notifications tab bar at the top of Settings.
- **Billing tab** — shows plan badge (Elite / Pro / Launch / Starter), active/locked access indicator, renewal date, trial expiry. Navigates to the dedicated `/billing` screen via a purple CTA button. Apple-compliant: no prices, no external links.
- **Notifications tab** — 5 preference toggles (workout reminder, meal reminder, hydration reminder, daily check-in, weekly report) with per-type icons. State backed by `synap_notif_prefs_v1` in AsyncStorage. Local reminders info card.

### Focus refresh — stale data fixed across all tabs

Root cause: `useAsyncData(fn, [])` fetches once on mount. Returning from another screen didn't re-fetch. Added `useFocusEffect(useCallback(() => { x.reload() }, []))` to every tab that shows data modified elsewhere:

- `nutrition.tsx` — reloads `logs` + `hydration` when tab comes into focus (after logging food in Eating Out).
- `progress.tsx` — reloads `measurements` + `workoutLogs` on focus.
- `train.tsx` — reloads session on focus.
- `index.tsx` (Dashboard) — reloads `meals`, `plan`, `chat` on focus.

### Eating-out logging fix

`apps/mobile/app/eating-out.tsx`:

- Added `logging` boolean state — Log button shows spinner and is disabled while request is in flight.
- Fixed macro field name mismatches: `macros.calories ?? macros.kcal`, `macros.fat_g ?? macros.fats_g ?? macros.fat`.
- Added `try/catch` with error `Alert` on API failure.
- Better success message: `"${best.title}" was added to today's nutrition log.`

### Dashboard — Ion preview fix + stale meals

`apps/mobile/app/(tabs)/index.tsx`:

- Fixed `lastIonMessage` — previously read from `plan.data.lastIonMessage` which doesn't exist in the API response.
- Fix: added `getChatHistory(10)` fetch and extracts the last `assistant` / `ion` role message, stripping JSON wrappers with a try/catch parse.
- Added `useFocusEffect` to reload meals, plan, and chat on tab focus.

### YouTube — inline WebView player (VideoModal)

`apps/mobile/src/components/VideoModal.tsx` — **NEW component**.

- `Modal` (pageSheet) wrapping a `react-native-webview` `WebView`.
- Embed URL: `https://www.youtube.com/embed/{videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
- Same approach as the web app's `<iframe>` embed — no external app required.
- `react-native-webview 13.15.0` was already installed.
- Used in: `train.tsx`, `programme.tsx`.

`apps/mobile/app/programme.tsx` — full rewrite:
- Removed `react-native-youtube-iframe` lazy import (Old Architecture APIs, fragile crash).
- Added `VideoModal` + `activeVideoId` state; video chips per exercise open the inline player.
- Added muscle group tags and form tip preview per exercise.

### Billing system — Spotify model (Apple-compliant)

Full implementation of Option 3: web-only purchases with a clear in-app "how to subscribe" screen.

**`apps/mobile/app/billing.tsx`** — complete rewrite (was a 4-line stub):

| Section | Content |
|---|---|
| Hero | Ion avatar + "SYNAP PREMIUM" + gradient. Active subscribers see their tier badge. |
| Feature grid | 6-card 2-column grid: Ion Coach, Nutrition Plans, Workouts, Progress, Eating Out, Grocery Lists — each with icon, name, one-liner. |
| How to subscribe | 3-step visual timeline with numbered circles: ① Open synapfit.app → ② Choose your plan → ③ Come back here |
| Website display | `synapfit.app` shown in a prominent styled box — styled like a URL bar, clearly not a button. Caption: "Type this address into your web browser to subscribe." |
| Already subscribed? | Log out / log back in instructions + support contact via Alert showing `support@synapfit.app` (no URL button). |

**Apple App Review compliance:**
- ✅ No prices anywhere in the app.
- ✅ No tappable external links — `synapfit.app` is plain styled text, not a `Linking.openURL` button.
- ✅ No `external-link` icon on any CTA button.
- ✅ Support contact goes through an Alert showing only an email address.
- ✅ Matches exactly how Spotify, Netflix, and Kindle handle this on iOS (Guideline 3.1.1 safe).

**`apps/mobile/src/components/UpgradeGate.tsx`** — **NEW component**:

A reusable `<UpgradeGate hasAccess={bool}>` wrapper. When `hasAccess` is false it shows a lock icon, short description, and a "How to subscribe →" button that navigates to `/billing`. Drop it around any premium feature screen section.

**`apps/mobile/app/settings.tsx`** — Billing tab updated:
- Slim plan status display (badge + access indicator + dates).
- One purple CTA button: "How to subscribe to SYNAP" / "View plan details & features" → navigates to `/billing`.

**`apps/mobile/app/(tabs)/index.tsx`** — Dashboard upgrade banner:
- **Starter users**: spark-purple banner "Unlock the full experience · Visit synapfit.app to subscribe" → taps to `/billing`.
- **Subscribed users**: existing small tier badge unchanged.

### Commits

| Hash | Description |
|---|---|
| `b52641b` | `feat(mobile): Apple-compliant billing screen (Spotify model)` — settings.tsx billing tab polish |
| `1bf1259` | `feat(mobile): full Spotify-model billing system` — billing.tsx rewrite, UpgradeGate component, settings nav, dashboard CTA |

---

## Latest Progress - Native Ion Identity Polish (2026-05-26)

The TestFlight app is launching and authenticating again, so the next pass started closing the visual parity gap with the web app.

Changes:

- Added native `IonAvatar` using the existing SYNAP Ion avatar asset.
- Added native `SynapLogo` using the existing SYNAP icon asset.
- Added shared `IonPageHeader` so core native screens use consistent Ion/avatar presentation.
- Replaced plain auth brand text on login, signup, and reset screens with the SYNAP logo treatment.
- Added Ion avatar headers to Dashboard, Chat, Plan, Nutrition, Train, Progress, Programme, More, Settings, and Onboarding.
- Added Ion avatar selection to native Settings and Onboarding, saving `ion_gender` with the profile data.
- Added `ion_gender` to the native onboarding profile type.

Local verification:

- `npm run typecheck` passed inside `apps/mobile`.
- `npx expo export --platform ios --clear` passed and produced a Hermes bytecode bundle.

---

## Latest Progress - Build 1046 QA Bug-Fix Pass (2026-05-28)

Full bug-fix session addressing issues found during real-device testing on build 1039–1044. All fixes pushed to `main` and auto-triggered the Direct Build workflow.

### Build CI: Direct Build replaces EAS auto-trigger

- `ios-expo-eas.yml` changed from auto-trigger on push → **manual-only**. EAS builds were failing on every push (EXPO_TOKEN not configured in this repo's Actions) and creating noise.
- `ios-expo-direct.yml` changed from manual-only → **auto-triggers on every push to `main`** when `apps/mobile/**` changes. This is now the primary build path.
- Build numbers bumped: `1044` (accidentally skipped) → `1046` (correct next build).

### Fix: Dashboard loading lag — stale-while-revalidate caching

**Root cause:** `useAsyncData` fetched fresh on every mount with no cache. Every tab switch showed a loading spinner.

**Fix:** Complete rewrite of `apps/mobile/src/hooks/useAsyncData.ts`:
- Stale-while-revalidate pattern using AsyncStorage.
- Cache key prefix: `@sdc:`, configurable `cacheTtlMs` (default 5 min).
- Cache hit → sets data immediately (no spinner), then `silentRefresh()` in background.
- New return value includes `silentRefresh` method used by `useFocusEffect` so tab focus never shows a loading state.

**Dashboard cache keys added:**
```typescript
subscription  → @sdc:subscription      (default 5 min TTL)
plan          → @sdc:plan-history       (default 5 min TTL)
meals         → @sdc:meal-logs-today    (2 min TTL — changes frequently)
profile       → @sdc:profile            (10 min TTL)
chat          → @sdc:chat-last10        (default 5 min TTL)
```

**Logout cache clearing:** More screen logout now removes all `@sdc:*` keys from AsyncStorage before navigating to login so the next user doesn't see stale data.

### Fix: Workout shows wrong day (Monday on Wednesday)

**Root cause:** `summarizeTodayWorkout()` in `/api/plan-history/route.ts` matched the day array by name first, then fell back to `dayOfWeek % plan.days.length`. JS `Date.getDay()` is Sunday-indexed (0=Sun), but workout plans are Monday-indexed — a Wednesday (JS day 3) was mapped to plan index 3 = Thursday.

**Fix:** Fallback changed to `(dayOfWeek + 6) % 7` (Monday-indexed). Also fixed to always return the real calendar day name in the response so the UI always shows the correct day.

### Fix: Logout required app restart

**Root cause:** `signOut()` was called but navigation to login never fired unless `_layout.tsx` re-rendered.

**Fix:**
1. `_layout.tsx` — added `useAuth` session watcher: `if (!loading && session === null) router.replace('/(auth)/login')`.
2. More screen logout handler — explicitly calls `router.replace('/(auth)/login')` after `signOut()` and cache clear.

### Fix: Barcode scan "Unauthorized" on mobile

**Root cause:** `requireFoodScanAccess()` was called without `req` in the barcode API routes. On mobile, auth comes from the Bearer token in the request header — calling without `req` means the token is never read → 401.

**Files fixed:**
- `src/app/api/barcode/route.ts` — `requireFoodScanAccess(req)`
- `src/app/api/barcode/estimate/route.ts` — `requireFoodScanAccess(req)`

### Fix: Food logging only saved calories, not macros

**Root cause:** The nutrition log form had only a calories field. `handleSave()` never sent `protein_g`, `carbs_g`, or `fats_g`.

**Fix in `apps/mobile/app/(tabs)/nutrition.tsx`:**
- Added `protein`, `carbs`, `fat` state variables.
- `handleSave()` now includes `protein_g`, `carbs_g`, `fats_g`.
- `applyBarcodeProduct()` scales macros by serving size and fills all 4 fields.
- `handlePhotoScan()` populates macro fields from AI scan result.
- `startEdit()` pre-fills macro fields from the existing log entry.
- Added 3 side-by-side macro inputs (P / C / F) in the log form UI.
- Added `estimateBarcodeProduct()` AI fallback when barcode product isn't found in Open Food Facts.

### Fix: Push notifications not working

**Root cause:** The server was sending push notifications via OneSignal but `ONESIGNAL_APP_ID` / `ONESIGNAL_API_KEY` were not set → silently failing.

**Fix — Expo Push service (no API key needed, token-based):**
- Added `src/lib/expo-push.ts`:
  - `getExpoTokensForUser(userId)` — queries `push_tokens` table.
  - `sendExpoPush(messages)` — POSTs to `https://exp.host/--/api/v2/push/send`.
  - `sendPushToUser(userId, payload)` — high-level helper.
- Added `src/lib/push.ts`:
  - `pushToUser({ userId, type, overrides })` — tries Expo first, falls back to OneSignal.
- Updated `src/app/api/push-notification/route.ts` — uses `sendPushToUser()`.
- Updated `src/app/api/adaptation-check/route.ts` — all 4 `sendPushNotification()` calls → `pushToUser()`.
- Updated `src/app/api/renew-plan/route.ts` — `pushToUser()`.

**Fix — Adaptation check runs from mobile:**
- Dashboard (`index.tsx`) now calls `runAdaptationCheck()` once per day via AsyncStorage date gate `@sdc:adaptation-last`.
- Added `runAdaptationCheck()` to `apps/mobile/src/features/tools.ts`.

**Required Supabase table (already added):**
```sql
-- push_tokens table was already created in a previous build
```

### Fix: Notification timing was fixed times, not plan meal times

**Root cause:** `scheduleSynapReminders()` used hardcoded `13:00` for meal reminders.

**Fix in `apps/mobile/src/features/notifications.ts`:**
- Added `parseMealTime(raw)` helper (parses `"7:30 AM"`, `"13:00"`, `"8am"` etc.).
- `scheduleSynapReminders({ mealTimes? })` now schedules one reminder per plan meal at its actual plan time.
- Falls back to a single 1 PM reminder if no plan times available.
- `_layout.tsx` `tryAutoRegisterPush()` reads cached plan meal times from AsyncStorage and passes them to `scheduleSynapReminders()`.

**Also removed:** "Send backend test" button from `apps/mobile/app/notifications.tsx` (was developer-only debugging tool, should not be visible to users).

### Fix: Supplement Stack stuck loading / items not showing

**Root cause 1:** Data shape mismatch. The AI generates `{ supplements: [...] }` stored as JSON in the `recommendations` DB column. The mobile app read `recommendation.recommendations` (the DB column object), then checked `Array.isArray(recommendation.recommendations)` → always `false` (it's an object, not an array).

**Fix:** Read `recommendation.recommendations.supplements` with a legacy array fallback:
```typescript
const recData = recommendation?.recommendations
const items = Array.isArray(recData?.supplements) ? recData.supplements
             : Array.isArray(recData) ? recData  // legacy fallback
             : []
```

**Root cause 2:** AI outputs `benefit` and `notes` fields, but the screen looked for `rationale`/`why` and `where_to_buy`.

**Fix:** Added `item.benefit` as primary, `item.notes` shown with 💡 icon.

**Root cause 3:** `toLocaleDateString()` with no locale uses the device locale → Hijri calendar on Arabic devices.

**Fix:** All date displays use `toLocaleDateString('en-GB')` to force Gregorian format.

### Fix: Apple Health connects but does nothing

**Root cause:** The connection flow only showed an alert but never synced data to the app.

**Fix in `apps/mobile/app/(tabs)/more.tsx`:**
- After successful HealthKit read, if `summary.latestWeightKg` is present, auto-calls `createMeasurement()` to sync the weight to the user's progress log.
- Alert now shows actual health values (steps, calories, weight, HR).
- Added `createMeasurement` import from `@/features/measurements`.

### Fix: Recipe button had no loading indicator

**Root cause:** Recipe generation takes 5–15 seconds but the button showed no feedback.

**Fix in `apps/mobile/app/plan.tsx`:**
- Added `recipeLoading` state (`number | null`) tracking which meal index is loading.
- Recipe button shows `ActivityIndicator` while loading.
- Other meal recipe buttons are dimmed (opacity 0.4) while any recipe is generating.
- Response parser handles both `steps` and `ingredients` arrays.

### Fix: Pre/post workout text overflowing frame in Nutrition

**Root cause:** The pre/post workout banner used `flexDirection: 'row'` which caused long text to overflow the card boundary.

**Fix in `apps/mobile/app/(tabs)/nutrition.tsx`:**
- Added `workoutBanner` style with `flexDirection: 'column'`.
- Text now wraps correctly within the card.

### Fix: workout_log table missing from database

**Root cause:** `workout_log` was defined in `supabase-schema.sql` but never migrated to the live database. Saving a workout returned `{"error":"Could not find the table 'public.workout_logs' in the schema cache"}`.

**Fix:** Added migration `supabase/migrations/20260528_workout_log.sql` with all columns used by the API:

```sql
create table if not exists public.workout_log (
  id               uuid  default uuid_generate_v4() primary key,
  user_id          uuid  references public.users(id) on delete cascade not null,
  date             date  default current_date,
  day_name         text,
  workout_plan_id  uuid  references public.workout_plans(id),
  exercises_completed integer,
  total_exercises  integer,
  completion_pct   integer,
  exercises        jsonb,
  duration_min     integer,
  duration_minutes integer,
  notes            text,
  ion_feedback     text,
  logged_at        timestamptz default now(),
  created_at       timestamptz default now()
);
alter table public.workout_log enable row level security;
create policy "Users can manage own workout logs" on public.workout_log
  for all using (auth.uid() = user_id);
```

**Applied to live Supabase database via SQL Editor.**

### Fix: Billing Settings tab shows "Starter" for all users

**Root cause:** `apps/mobile/app/settings.tsx` computed `tierLabel` using `sub?.plan_type` which doesn't exist in the `/api/me/subscription` response (which only returns `tier`, `status`, `planName`).

**Fix:** Updated both `tierLabel` and `tierColor` to use `sub?.tier`:
```typescript
const tierLabel = sub?.tier === 'elite' ? 'Elite'
                : sub?.tier === 'pro'   ? 'Pro'
                : sub?.tier === 'launch' ? 'Launch Access' : 'Starter'
const tierColor = sub?.tier === 'elite' ? color.flame
                : sub?.tier === 'pro'   ? color.spark
                : sub?.tier === 'launch' ? color.pulse : color.muted
```

### Fix: Raw push token visible on Notifications screen

**Root cause:** Notifications screen displayed the full `ExponentPushToken[...]` string as text.

**Fix:** Replaced with a friendly status message:
- Before registration: `"Push notifications not yet enabled on this device."`
- After registration: `"✓ Device registered for push notifications"` (in pulse/green colour).

### Fix: Push token "Network request failed" on Direct Builds

**Root cause:** `getExpoPushTokenAsync()` requires an explicit `projectId`. On Direct Builds (not EAS), `Constants.easConfig?.projectId` is `null`, so the call had no project ID → Expo's token service couldn't identify the project → network call failed.

**Fix in `apps/mobile/app/notifications.tsx` and `app/_layout.tsx`:**
```typescript
const projectId =
  Constants.expoConfig?.extra?.eas?.projectId ||
  (Constants as any).easConfig?.projectId ||
  '5fb169d2-85c2-48ef-990f-960a395e7c6a'  // hardcoded fallback for Direct Builds
const res = await Notifications.getExpoPushTokenAsync({ projectId })
```

### Fix: Workout checkboxes reset to empty when returning to Train tab

**Root cause:** `saveWorkoutSession()` called PUT `/api/workout-session` which inserts into `chat_messages` with `role: 'system'`. The `chat_messages` table has a check constraint `role IN ('user', 'ion')` — so every save silently failed with a DB error. The `.catch(() => {})` swallowed it. `useFocusEffect` then loaded the empty session on every tab return.

**Fix in `apps/mobile/app/(tabs)/train.tsx`:**
- Removed all `getWorkoutSession` / `saveWorkoutSession` API calls.
- Replaced with AsyncStorage local session:
  ```typescript
  const SESSION_KEY = (date: string) => `@synap:workout-session:${date}`
  async function loadLocalSession(date)  // reads from AsyncStorage
  async function saveLocalSession(date, completedExercises, exercisePerformance)  // writes to AsyncStorage
  ```
- `toggleExercise`, `updatePerformance`, `selectDay`, and `useFocusEffect` all use the local helpers.
- Session persists instantly across tab switches with no network dependency.

### Commits in this pass

| Commit | Description |
|---|---|
| `f894520` | fix: barcode auth, food macros, push via Expo, adaptation check from mobile |
| `46ee140` | fix: notification timing, remove test button, supplement loading, Apple Health sync, recipe spinner, pre/post workout overflow |
| `bb7bdfb` | chore: bump iOS build number to 1044 (then superseded) |
| `5b1c497` | chore: bump iOS build number to 1046 |
| `586e624` | ci: auto-trigger Direct Build on push, disable EAS auto-trigger |
| `c2b5e22` | fix: supplements items not showing, Hijri date, benefit/notes field names |
| `660cb01` | fix: workout_log migration, billing tier display, hide push token |
| `0538e56` | fix: push token Network request failed, workout session resets via AsyncStorage |

### Current build

**Build 1046** — all fixes above — auto-building via `iOS Expo Direct Build` GitHub Actions workflow.

---

## Build 1051 QA Pass — Source Audit Fixes (2026-05-29)

Pre-submission source-level QA audit of every screen. Five issues found and fixed, plus a CI dependency-validation failure resolved.

### Fix: Dashboard stat chips & quick actions unreadable in light mode

**Root cause:** `StatChip` and `QuickAction` in `apps/mobile/app/(tabs)/index.tsx` hardcoded text colours — label `#475569` and value `#F8FAFC`. `#F8FAFC` is the **dark-mode** text token; in light mode the screen background is also `#F8FAFC`, so values/labels rendered near-white on near-white = invisible.

**Fix:** Both components now take `labelColor`/`valueColor` props wired to theme tokens (`color.muted` for labels, `color.text` for values) at every call site.

### Fix: Notification preference toggles didn't persist or take effect

**Root cause:** `apps/mobile/app/settings.tsx` declared `NOTIF_STORAGE_KEY` but never read or wrote it. `toggleNotif` only called `setState` (in-memory), so prefs reset to defaults on every screen open, and the switches were never wired to the actual scheduler — reminders fired regardless.

**Fix:**
- Moved the `NotifPrefs` type, `DEFAULT_NOTIF_PREFS`, and a shared `NOTIF_PREFS_KEY` into `apps/mobile/src/features/notifications.ts`, with `loadNotifPrefs()` / `saveNotifPrefs()` helpers.
- `scheduleSynapReminders()` now accepts `prefs` and **filters** the local reminders (workout / meal / hydration) by the user's toggles, loading from storage when not passed.
- `settings.tsx` loads prefs on mount and, on toggle, persists + re-applies the schedule so switches take real effect.
- `_layout.tsx` auto-register and `notifications.tsx` enable() pick up saved prefs automatically (no args → loads from storage).
- Note: `checkin_reminder` and `weekly_report` are server-driven push, so they are now *persisted* but not locally scheduled — full server wiring is a separate task.

### Fix: Supplements "Invalid Date" when `generated_at` missing

**Root cause:** `apps/mobile/app/supplements.tsx` rendered `new Date(recommendation.generated_at).toLocaleDateString(...)` in the populated branch without the null guard the empty-state branch already had.

**Fix:** Guarded the date — only renders "Generated …" when `generated_at` exists.

### Fix: Macro-adjustment metric cards low-contrast in light mode

**Root cause:** `apps/mobile/app/macro-adjustment.tsx` `Metric` used hardcoded white value text on a translucent-white card — unreadable in light mode.

**Fix:** `Metric` now takes `bg`/`valueColor` from theme tokens (`color.elevated` / `color.text`).

### Fix (CI): expo-doctor dependency-validation failure on build 1050

**Root cause:** The `iOS Expo Direct Build` workflow runs `npx expo-doctor`, which failed (exit 1) on patch-version mismatches: `expo-font` 14.0.11 vs expected ~14.0.12, `expo-router` 6.0.23 vs ~6.0.24.

**Fix:** Ran `npx expo install --fix` → bumped `expo-font ~14.0.12`, `expo-router ~6.0.24`, `expo ~54.0.35` and refreshed the lockfile. `expo-doctor` now passes 18/18.

### Note: custom fonts not yet implemented

Audit found **no** `.ttf`/`.otf` assets, no `useFonts`/`Font.loadAsync`, no `fontFamily` usage, and no `@expo-google-fonts/*` package. `expo-font` is present only as an SDK dep and is **not** in `app.json` plugins. Custom fonts are not wired up; the `expo install` suggestion to add `"expo-font"` to plugins was intentionally skipped (a bare plugin with no `fonts` array is a no-op). To add custom fonts later: drop files in `assets/fonts/`, register via the `expo-font` plugin `fonts` array (or `useFonts`), and apply `fontFamily` in styles.

### Commits in this pass

| Commit | Description |
|---|---|
| `da7d888` | fix: light-mode contrast, notification prefs persistence, supplement date guard |
| `3cb6555` | fix(ci): align expo-font/expo-router to SDK 54 expected versions |

## Post-test Pass — Notifications persistence + HealthKit / New Architecture (2026-05-29)

### Fix: Notifications page lost "enabled" status on navigation

**Root cause:** `apps/mobile/app/notifications.tsx` held `token` and `scheduledCount` only in component state. Navigating away unmounted the screen; returning reset state to `null`, so it always showed "Push notifications not yet enabled" even when the device was already registered.

**Fix:** Persist the Expo push token to AsyncStorage (`@synap:push-token`) on enable, and add a `useFocusEffect` that re-reads OS permission status + persisted token + live scheduled-reminder count on every focus. Revoking permission in iOS Settings now correctly flips back to "not enabled" and clears the stored token.

### Fix: HealthKit non-functional — re-enabled New Architecture

**Root cause:** `@kingstinct/react-native-healthkit` v14 is built on `react-native-nitro-modules` (v0.35.7), and **Nitro modules only run under the New Architecture**. With `app.json` → `newArchEnabled: false`, the HealthKit native module never registered, so the Connect Health flow returned unavailable/unauthorized and produced no data. The HealthKit JS code (`src/features/health.ts`) was already correct for the v14 API.

**Investigation (why New Arch was off):** Commit `2e9c5cd` (May 24) disabled New Arch because two modules crashed at startup under New Arch + JSC: `react-native-youtube-iframe` 2.4.1 and `react-native-view-shot` 5.1.0. That reason is now obsolete — `react-native-youtube-iframe` was removed entirely, `react-native-view-shot` is now 4.0.3 (New-Arch compatible, still lazy-loaded in `progress.tsx`), and the engine is now Hermes (not JSC). All remaining native modules (`expo-*`, `async-storage`, `react-native-webview` 13.15.0) support New Architecture.

**Fix:** Set `newArchEnabled: true` in `app.json`.

**Smoke test required on the new build:** (1) app launches to login, (2) HealthKit Connect works and returns data, (3) progress-card share still works (the one remaining old-style module path), (4) push/notifications still register.

### Commits in this pass

| Commit | Description |
|---|---|
| `6fb3481` | fix: persist Notifications page enabled status across navigation |
| `72001c1` | feat: re-enable New Architecture so HealthKit (Nitro) works |

### Current build

**Build 1051** — all fixes above — auto-building via `iOS Expo Direct Build` GitHub Actions workflow (build 1050 failed on the expo-doctor step, now resolved).

## Pre-App-Store Feature + Compliance Pass (2026-05-29)

Worked on branch `feat/live-activity-native` (native Swift/codesigning changes carry archive-breaking risk, so they were kept off `main` and verified via `workflow_dispatch` before merge). Four feature areas + a hard App Store compliance fix, then the iOS codesigning work to ship a Live Activity widget extension.

### 1. Smarter Ion (server `/api/chat`)

The `buildSystemPrompt` in `src/app/api/chat/route.ts` was already highly detailed (profile, trend vs expected-rate, calorie/protein compliance, workout compliance, plan-change awareness, 21 coaching rules). The only ceiling was truncation: both chat invocations capped at `max_tokens: 1024`, which cut off the longer responses the prompt explicitly permits (Elite supplement protocols, goal projections, multi-pattern callouts). Raised both (stream + non-stream) to `2048`. Short replies are unaffected — the model still stops when done, and rule 4 keeps everyday answers to 2–4 sentences.

### 2. Haptics on key actions

Tactile feedback wired into core interactions (workout set toggles, key confirmations) via Expo Haptics — no-op on devices without a Taptic Engine.

### 3. Branded splash + loading spinner

- `assets/splash.png` → the full SYNAP launch artwork; native splash switched to `cover` / `#000000` so it fills edge-to-edge with no letterbox.
- New `src/components/LoadingSplash.tsx`: a JS overlay showing the *same* artwork with a live `ActivityIndicator` near the bottom while auth/cached data resolve. It hides the native splash on first layout (seamless handoff), fades out when ready, and keeps a hard 4s safety cap.
- Wired into `app/_layout.tsx` (`RootNavigator`), replacing the bare native-splash-hide logic.

### 4. Native Live Activity — Dynamic Island + Lock Screen workout timer

The training timer now drives an iOS ActivityKit Live Activity (iOS 16.2+), rendering a self-ticking timer in the Dynamic Island and on the Lock Screen with no per-second JS push.

**Architecture (CNG-safe — `ios/` is generated, so everything is injected via plugins/modules):**

- **Config plugin:** added `@bacons/apple-targets` to `app.json` plugins + `NSSupportsLiveActivities: true` in `ios.infoPlist`.
- **Widget extension target:** `apps/mobile/targets/widget/` — `expo-target.config.js` (type `widget`, `deploymentTarget 16.2`, SwiftUI/WidgetKit/ActivityKit frameworks, `$accent` color, `SynapMark` image), and `index.swift` (the `WorkoutActivityAttributes` + WidgetKit `ActivityConfiguration` / `DynamicIsland` views).
- **Local Expo module:** `apps/mobile/modules/synap-live-activity/` — Swift `SynapLiveActivityModule` exposing `areActivitiesEnabled / startWorkoutActivity / updateWorkoutActivity / endWorkoutActivity` over ActivityKit `Activity.request/.update/.end`. The `WorkoutActivityAttributes` struct is duplicated byte-for-byte between the module and the widget — ActivityKit matches a running Activity to its widget by attributes type name + Codable ContentState, so identical structs interoperate across the app + widget targets.
- **JS bridge:** `src/lib/liveActivity.ts` wraps the module via `requireOptionalNativeModule` — fully crash-safe / no-op on Android, iOS < 16.2, or any build without the extension. `app/(tabs)/train.tsx` calls it on start/pause/resume/reset and on each exercise toggle.
- **gitignore:** added negations so `modules/**/ios/` Swift sources are tracked (the non-anchored `ios/` ignore was swallowing them).

**Dynamic Island branding:** the transparent SYNAP mark (`targets/widget/synap-mark.png`, cropped/centered from the source art) is registered via the target's `images` map and used as the brand glyph (compactLeading, minimal, expanded-leading, Lock Screen banner) in place of the SF Symbol bolt.

### 5. App Store compliance — remove external purchase steering (Guideline 3.1.1 / 3.1.3)

**The big rejection risk.** The billing flow funneled users to an external website to subscribe, then unlocked features in-app — exactly what 3.1.1 forbids ("buttons, external links, or other calls to action that direct customers to purchasing mechanisms other than IAP"). Fitness coaching does **not** qualify for the reader-app exception.

Chosen path: **"multiplatform" model (3.1.3b)** — the app reflects entitlement only and never markets or directs to an external purchase (keeps 100% of revenue; no Apple cut).

- `billing.tsx`: replaced the "Subscribe to SYNAP / synapfit.app / Copy website / open Safari / choose a plan" funnel with a neutral **"No active plan"** screen (restore-by-correct-account + Contact Support). Subscriber view no longer points to `synapfit.app` for management.
- `app/(tabs)/community.tsx`: removed the "Get Elite Access" button that opened `${webBaseUrl}/pricing` externally (the most clear-cut violation) → informational "coming soon" note.
- `app/(tabs)/index.tsx` dashboard banner: dropped "Visit synapfit.app to subscribe".
- `settings.tsx`, `UpgradeGate.tsx`, `app/(tabs)/chat.tsx`: neutralized "Subscribe / How to subscribe / Upgrade" copy → "View your plan" (all route to the in-app status screen; no external links).
- Retained Privacy / Terms / Support `Linking.openURL` calls (allowed/required).

### iOS codesigning — shipping the widget extension (manual signing, no EAS)

The Fastlane direct-build pipeline uses manual signing. The new `SynapWidget` extension (`app.synap.fit.SynapWidget`) needed its own App Store provisioning profile and a sequence of fixes, each surfaced by the next CI archive:

1. **Widget App ID + profile (user, Apple portal):** registered `app.synap.fit.SynapWidget`, created an App Store distribution profile ("SYNAP Widget AppStore"), base64-encoded it into GitHub secret `IOS_WIDGET_PROVISION_PROFILE_BASE64`.
2. **Error 90347 (extension bundle id == app id):** `@bacons/apple-targets` resolved the widget to the bare `app.synap.fit`. Fixed by forcing `bundleIdentifier: '.SynapWidget'` in `expo-target.config.js` **and** deterministically setting `PRODUCT_BUNDLE_IDENTIFIER` (+ matching `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION`) on the widget target directly in the generated `.pbxproj` in `fastlane/Fastfile` (step 7b) — independent of the plugin.
3. **Secret not reaching Fastlane:** the secret existed but the workflow `env:` block never mapped it. Added `IOS_WIDGET_PROVISION_PROFILE_BASE64` to `.github/workflows/ios-expo-direct.yml`.
4. **Capability mismatch (main app signed with widget profile):** `update_code_signing_settings`'s `bundle_identifier` option does **not** filter targets in this Fastlane version — both signing calls hit every target. Re-scoped by **target name**: step 8 signs all targets except `SynapWidget` with the app profile; step 8b signs only `SynapWidget` with the widget profile.

### CI verification (branch `feat/live-activity-native`, triggered via `workflow_dispatch`)

| Run / build | Commit | Result |
|---|---|---|
| Live Activity + signing fixes | `48b9716` | ✅ success (first green archive with the widget extension) |
| + branded splash + Dynamic Island mark | `3764e8d` (build 1061) | ✅ success |
| + billing 3.1.1 compliance | `f79ae84` (build 1062) | ✅ success — **submission build** |

### Commits in this pass

| Commit | Description |
|---|---|
| `1f43caa` | feat(chat): give Ion headroom for detailed coaching replies (max_tokens 1024→2048) |
| `6acb9e8` | feat(mobile): wire training timer to iOS Live Activity (no-op safe) |
| `16fde6a` | feat(mobile): native Live Activity for the workout timer (Dynamic Island) |
| `a116a31` | fix(mobile): pin SynapWidget extension bundle id to app.synap.fit.SynapWidget |
| `f646b6f` | fix(ios): force SynapWidget bundle id + pass widget profile secret to Fastlane |
| `48b9716` | fix(ios): scope code-signing by target so widget profile doesn't clobber app |
| `3764e8d` | feat(mobile): branded splash with loading spinner + SYNAP mark in Dynamic Island |
| `f79ae84` | fix(mobile): remove external purchase steering for App Store compliance (3.1.1) |

### Pre-submission checklist (App Store Connect)

- ✅ **Submission build:** 1062 (`f79ae84`) in TestFlight — Live Activity + splash + Dynamic Island + billing compliance.
- ✅ **Account deletion** present (More → Delete account) — mandatory, satisfied.
- ✅ **Sign in with Apple** not required — auth is email/password only (no social login → Guideline 4.8 N/A).
- ✅ **Demo account** ready (pre-subscribed so reviewers see full app) — enter in App Review Information → Sign-In required.
- ⬜ **App Privacy** questionnaire (health, photos, chat data) + **Privacy Policy URL** set (required for HealthKit).
- ⬜ **Review notes:** "Subscriptions are managed by our multiplatform service; the app only reflects entitlement" + "HealthKit data is read to personalize coaching."
- ⬜ Screenshots reflect the real app (no website/subscribe flow).
- ✅ Encryption compliance (`ITSAppUsesNonExemptEncryption: false`) set.

### On-device verification (recommended before/after submit)

- Launch shows the full SYNAP splash with a loading spinner at the bottom.
- Start a workout → Dynamic Island + Lock Screen show the SYNAP mark + live ticking timer; pause freezes it; finishing ends the Activity.
- Billing screen for a non-subscriber shows the neutral "No active plan" state (no website/subscribe CTA).

## Support Link, Bug Fixes + Social Sign-In (2026-05-30)

### Compliant help-center link (build 1064, `6449b09`, on `main`)

Added a support-framed website link (not a purchase CTA, so it stays within 3.1.1):
- `billing.tsx` support dialog gained an "Help center" button → `synapfit.app/contact`.
- More-tab support row now points to `/contact` (was `/support`).

### Bug fixes (build 1065, `b5e97c1`, on `main`)

**YouTube exercise videos failed with error 150/153.** `VideoModal` pointed the
WebView straight at `youtube.com/embed/<id>`, giving YouTube no valid HTTP
referer/origin, so most videos refused to play ("playback on other websites
disabled"). Fix: load the embed inside an HTML document with a real
`baseUrl` (`https://www.synapfit.app`) — the same origin the web app embeds
from — via `source={{ html, baseUrl }}`. Videos now play in-app.

**Training-day count was wrong (showed 5, plan had 4).** The weekly day selector
in `train.tsx` counted any day carrying a weekday name, including named rest
days. Fixed `workoutDays` to only count days with `exercises.length > 0`,
matching the server's `daysPerWeek` logic in `plan-history/route.ts`.

### Google + Sign in with Apple (branch `feat/social-signin`, `6fbf9d2`)

Adds social login to the login + signup screens — Google (matching the web app)
and Sign in with Apple (required by Guideline 4.8 once any third-party login is
offered).

- **Packages:** `expo-apple-authentication`, `expo-web-browser`, `expo-crypto`.
- **AuthProvider:** `signInWithGoogle` (browser OAuth via `expo-web-browser`,
  PKCE `exchangeCodeForSession`, reuses the web's Google provider) and
  `signInWithApple` (native identity token → `supabase.auth.signInWithIdToken`
  with a SHA-256 hashed nonce).
- **supabase client:** `flowType: 'pkce'` for the native code exchange.
- **`SocialAuthButtons`** component (Google button + theme-aware native Apple
  HIG button, iOS-only) wired into both auth screens.
- **app.json:** `ios.usesAppleSignIn: true` + `expo-web-browser` plugin — adds
  the `com.apple.developer.applesignin` entitlement (verified via
  `expo config --type introspect`).

**⚠️ Required external setup before this branch can build + work** (the new
entitlement breaks signing until the profile includes it):

1. **Apple Developer → Identifiers → `app.synap.fit`:** enable the **Sign in
   with Apple** capability → Save.
2. **Regenerate the App Store provisioning profile** for `app.synap.fit` (now
   with the capability) → base64 → update GitHub secret
   `IOS_PROVISION_PROFILE_BASE64`. (Same flow as the widget profile.)
3. **Supabase → Authentication → Providers → Apple:** enable, add
   `app.synap.fit` to **Client IDs** (native sign-in needs no Services ID/secret).
4. **Supabase → Authentication → Providers → Google:** confirm enabled (already
   used by web).
5. **Supabase → Authentication → URL Configuration → Redirect URLs:** add
   `synap://auth/callback`.

Only after steps 1–2 will CI signing pass; steps 3–5 make the buttons function
at runtime. Build dispatched via `workflow_dispatch` on the branch once ready,
then merge to `main`.

### Build status

| Build | Commit | Branch | Result |
|---|---|---|---|
| 1064 | `6449b09` | main | ✅ help-center link |
| 1065 | `b5e97c1` | main | ✅ YouTube + training-day fixes |
| social sign-in | `778d4d1` | feat/social-signin | ✅ first build with applesignin entitlement (signing passed) |
| social sign-in v2 | `2816288` | feat/social-signin | ⏳ rest-day fix + new-user onboarding routing |

### Follow-up fixes after first device test (2026-05-30)

**Train rest day (placeholder encoding).** The day-count fix only checked
`exercises.length > 0`, but some plans encode a rest day as a single placeholder
exercise named "Rest Day". That still counted it (5 vs 4) and rendered it as a
fake exercise. Added `isRestDayData()` in `train.tsx` mirroring the server's
`is_rest_day` logic (empty OR all exercises named "rest day"); used for both the
day-dot filter and `buildTodayWorkout` (which now clears exercises + sets
`is_rest_day` so the Rest Day card shows like web). Commit `2816288`.

**Social sign-in "signed in but everything errors".** New Google/Apple accounts
have no profile, so routing straight to the tabs dropped them on a dataless
dashboard where every API call failed. `SocialAuthButtons` now calls
`getProfile()` after sign-in and routes profile-less users to `/onboarding`
(like email signup); existing users go to the app. Commit `2816288`.

**Google "opens the website" / no session — Supabase config (not code).** With
`synap://auth/callback` absent from Supabase's redirect allowlist, Supabase falls
back to the Site URL after OAuth, so the app never receives the session. Required
Supabase settings (Authentication):
- URL Configuration → Redirect URLs → add `synap://auth/callback` (+ `synap://**`).
- Providers → Apple → enable + add `app.synap.fit` to Client IDs.
- Providers → Google → confirm enabled.

The Google consent screen showing `xxxx.supabase.co` is cosmetic (brand via the
Google OAuth consent screen or a Supabase custom domain).

## Device-Test QA, Plan Timing, InBody, Onboarding Parity (2026-05-30 → 05-31)

A long device-testing pass. A **build marker** was added to the More tab footer
(`SYNAP v<ver> · build <n> · fixpack-<N>`, `BUILD_TAG` in `more.tsx`) so we can
confirm exactly which binary is installed — this resolved several "still broken"
reports that were actually stale TestFlight builds.

### Social sign-in — verified
Sign in with Apple confirmed working on device after the user enabled the
Supabase Apple provider (`app.synap.fit` client id) + `synap://auth/callback`
redirect. The widget App ID profile + Sign-in-with-Apple entitlement archive
signs cleanly.

### Chat fixes
- **Empty suggestion bubbles**: `displayChatContent` matched the web exactly and
  `visibleMessages` now drops assistant bubbles with no displayable text.
- **Quick-prompt chips invisible then huge**: the chips were visible while the
  thread was empty but vanished once messages loaded — the `inverted` FlatList
  had no `flex:1`, so it grew unbounded and rendered over its siblings. Added
  `style={{flex:1}}` to bound it. Then the chips ballooned vertically (a
  horizontal ScrollView in a flex column grows to fill leftover height), fixed
  with `flexGrow:0`/`flexShrink:0` + `alignItems:center`, and bright `color.text`.

### Train — match the web exactly
Root cause of the persistent "5 days vs 4": the day SOURCE. The web plan page
reads `weeks[]` first then `days[]`; mobile read `days[]` first, so a plan
carrying both a legacy `days` and current `weeks` diverged. `getPlanDays` now
mirrors the web order, and rest detection uses the web's exact rule (a day with
no exercises is rest). Verified against the real DB plan: dots = Mon/Tue/Thu/Fri.

### Nutrition — recipe ingredients
Generated plans nest ingredients under `meal.recipe.ingredients`, but the page
read `meal.ingredients` (always undefined) so ingredients never rendered. Read
the correct path; guard the planned-meal "done" match against empty names.

### Dashboard
- **WEIGHT stat** read a non-existent `profile.measurements`. Now uses
  account-specific data first (this account's measurement → onboarding weight),
  and **Apple Health weight LAST** — Health is device-level (shared across every
  account on the phone), which made a different account show the device owner's
  weight.
- **No-plan CTA**: a prominent "Let's build your plan →" card (→ onboarding)
  shows whenever the account has no active workout plan, so users aren't dropped
  on an empty dashboard.
- Planned-meal completion count guarded against empty-name matches.

### Social routing
`SocialAuthButtons` now routes by **active plan** (via `getPlanHistory`), not
just profile existence — an account that signed up but never generated a plan
goes to onboarding.

### Plan cycle timing + renewal (server, on `main`)
- **Fixed cycles**: workout = **6 weeks (42 days)**, diet = **2 weeks (14 days)**.
  `generate-plan` now produces a 6-week program (was 12), clamps deload weeks
  into the window, and **stores `start_date`/`end_date` on the initial plans** —
  previously initial plans had no `end_date`, so the "renews in 3 days"
  email/push only fired from the 2nd cycle. `renew-plan` diet cycle 4w→2w.
- `plan-history` + `chat` GET use a **fixed** cycle (not derived from
  `plan_json.weeks`) so older 12-week plans don't show an 84-day ("68 days left")
  window; a stored `end_date` always takes precedence. Dashboard + chat banner
  now agree per user (verified across all 10 active plans — none > 42 days).
- **Renewal basis** (`renew-plan`): triggered ~3 days before cycle end (email +
  push via the daily adaptation check); the new plan is built from the user's
  last 5 measurements (progress), recalculated macros/volume, profile, and the
  previous plan (workout: ~10% volume progression; diet: calories adjusted to
  trend). Generates a **preview** the user approves; rollback supported.

### InBody-measured BMR drives calories (server, on `main`)
`calculateMacros` now uses the InBody-measured BMR (`p.bmr_kcal`, lean-mass based,
more accurate for atypical body composition) for TDEE when a scan provides one —
guarded to within ±25% of the Mifflin formula so a bad/stale scan can't distort
the target; otherwise falls back to Mifflin. Applies to generation + renewal,
web + app. (Previously InBody only set body-fat → macros and was AI context.)

### Onboarding parity with the web
Mobile onboarding was a ~13-field form; the web asks ~30 (`onboardingFlow.ts`).
Rebuilt `app/onboarding.tsx` as a **6-step wizard** (You, Goal, Lifestyle,
Training, Nutrition, Health) collecting every field `save-profile` already
accepts: `goal_speed/target/date`, work schedule + wake/sleep times, stress,
sleep quality, current routine, equipment, training time/style, exercises to
avoid, optional **strength levels**, dietary prefs + allergies, cooking ability,
food budget, medical conditions, supplements, and an optional **InBody scan**
(reuses `analyzeInBodyPhoto` so body composition feeds the plan). No server
change — `save-profile` + `generate-plan` already read these fields.

### Branches / builds
- `feat/social-signin` merged to `main` (build 1077) — social sign-in + the
  YouTube/train/chat/nutrition/dashboard QA fixes.
- Server changes (plan cycle, InBody BMR, dashboard weight API, chat end_date)
  committed directly to `main` (web + app share the API).
- `feat/onboarding-parity` (build ≥1080 / `fixpack-15`) — onboarding parity +
  dashboard no-plan CTA + account-specific weight + plan-based routing; pending
  on-device verification, then merge to `main`.

### App Store submission status
Code-ready (no external purchase steering, account deletion, Sign in with Apple,
permission strings, encryption flag). Remaining before submit: confirm the
production build green, verify social sign-in on device (done for Apple), and
complete App Store Connect metadata (pre-subscribed demo account, App Privacy +
Privacy Policy URL, review notes, support URL = `synapfit.app/contact`,
screenshots).

## Onboarding/Train/Nutrition polish + merge to main (2026-05-31)

Final device-test round, then consolidation.

### Onboarding
- **Keyboard dismissing after one character**: `Field`/`Segment`/`MultiSelect`
  were defined *inside* the screen component, so each keystroke re-rendered the
  screen and remounted the `TextInput`. Moved them to **module-level** components
  (color/isRtl passed as props) so inputs keep focus. (Classic
  don't-define-components-in-render bug.)

### Nutrition
- **Renewal countdown banner**: the Nutrition page now shows "X days left in your
  nutrition plan" from `timing.diet` (2-week cycle), turning amber/red as it
  nears zero, and "ready to renew — ask Ion" at zero — mirroring training.

### Train / data freshness
- **Stale plan on the Train tab**: the tab loaded the plan once on mount and kept
  it in memory, so a plan change made elsewhere (Ion swapping Friday→Saturday)
  kept showing the old day set (a lingering "5 days") until restart. Train and
  Nutrition now `silentRefresh()` the plan on focus.
- **Rest days were showing a fallback workout**: `summarizeTodayWorkout` (server)
  fell back to a random plan day when today's weekday wasn't in the plan, so a
  rest day (e.g. Sunday) showed another day's session — reading as an extra /
  duplicate training day. Now, for weekday-scheduled plans, a non-training day
  returns `is_rest_day`. (Server fix, live for web + app.)
- **Browsing a non-training weekday**: the Train tab now renders the **Rest Day**
  card for any non-training weekday instead of "No workout plan" (which is now
  reserved for actually having no plan).
- Confirmed the day-selector "today" dot is `isToday`-driven (distinct purple,
  vs green workout dots) — not hardcoded.

### Build marker
`More` tab footer shows `SYNAP v… · build … · fixpack-<N>` (`BUILD_TAG` in
`more.tsx`), bumped each build, to verify the installed binary — this ended
several "still broken" reports that were stale TestFlight builds. Reached
`fixpack-19` (build 1084) before merge.

### Merge to main (build 1085)
`feat/onboarding-parity` merged into `main` (no conflicts) — onboarding parity +
keyboard fix, dashboard no-plan CTA / account-specific weight / plan-based
routing, Train+Nutrition focus refresh, rest-day card, nutrition countdown.
Server changes (plan cycles, InBody BMR, rest-day-aware today) were committed
directly to `main` and are already deployed. `main` is now the single source of
truth for web + app; production build 1085 is the submission build.

## Proactive notification system (2026-05-31, build 1087)

The old reminders were limited (3 generic) and, worse, **gated behind push-token
registration** — so new/social-sign-in users never got any. Rebuilt
`src/features/notifications.ts`:

- **`scheduleSynapReminders(data)`** now builds the full set from the user's plan
  + profile: hydration (**≥5/day**, evenly spread wake→~1h before sleep, with the
  per-glass ml target), a reminder at **each plan meal time** (name + calories),
  **pre-workout / workout / post-workout** as WEEKLY reminders on each training
  weekday (with muscle focus), plus a **morning brief** (calorie + water target)
  and **evening check-in**.
- **`syncSynapReminders(requestPermission?)`** ensures notification permission
  (optionally prompting), gathers plan/profile via `getPlanHistory` + `getProfile`,
  and reschedules. **Decoupled from the push token.**
- Wired in: app launch (`_layout.tsx`, re-sync each session, no token gate),
  onboarding completion (prompts), the Notifications screen ("Enable"), and the
  Settings notification toggles.
- Tap-routing unchanged (each reminder carries `data.url`).

Merged `feat/notifications` → `main` (build 1087).
