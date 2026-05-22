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

Next immediate task: run native iOS QA on a real device/dev client through EAS or macOS, then create an EAS production build.

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

Not yet 1:1 with web:

- Landing/pricing/marketing pages are web-only.
- Admin/business dashboards are web-only.
- Full Plan page with diet/workout tabs is not native yet.
- Full measurements form with all 13 fields and symmetry tabs is simplified to quick weight/waist plus history.
- Nutrition does not yet show the full planned meal checklist/macro ring/water tracker/barcode live scanner exactly like web.
- Workout programme browser, exercise video modal/YouTube playback, and detailed session timer are simplified.
- Ion plan-edit confirmation cards, renewal preview/rollback UI, chat sessions sidebar, and structured action cards are not fully native yet.
- Grocery list, eating-out mode, form-check, meal recipes, supplement recommendations, weekly/monthly reports, hydration, and subscription checkout/cancel flows are not native screens yet.
- Push notifications/OneSignal native wiring is not implemented in the Expo app yet.
- In-app purchases are not implemented; web Lemon Squeezy billing remains on web.

Recommended before calling the native app "full parity":

1. Add native Plan screen.
2. Add native programme browser/video playback.
3. Add planned-meal checklist/macros/water in Nutrition.
4. Add Ion structured action cards and plan-edit confirmations in Chat.
5. Add native More entries for grocery list, eating-out mode, form check, reports, and billing/support links.
6. Add native push notifications after TestFlight baseline is stable.

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

- Login with the Apple review account.
- Sign up with a fresh email and reach onboarding.
- Request password reset and confirm the reset email opens the web reset flow.
- Complete native onboarding and verify plans are generated.
- Send an Ion chat message and verify history persists after app restart.
- Log, edit, and delete a manual food.
- Scan a food photo and review values before logging.
- Open Train, check/uncheck exercises, restart app, verify session state remains.
- Finish and log a workout.
- Log weight/waist measurement.
- Analyze an InBody photo.
- Share the progress card through the iOS share sheet.
- Connect Apple Health and verify HealthKit permission prompt appears.
- Switch English/Arabic and verify no corrupted Arabic text appears.
- Switch light/dark mode.
- Open Privacy, Terms, and Support links.
- Delete account from More and verify the session is signed out.
- Verify camera permission copy matches actual use.
- Verify HealthKit permission copy matches actual use.
- Verify no payment requirement blocks launch-mode access.

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
