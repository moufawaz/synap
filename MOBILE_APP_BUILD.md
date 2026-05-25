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
- The patch also raises generated pod deployment targets below iOS 12 to `12.0` to match the Xcode 26 supported range.
