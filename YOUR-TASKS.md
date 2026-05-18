# SYNAP — Everything You Need To Do Yourself

This is the complete list of manual tasks only you can complete.
All code is done. Everything below requires accounts, devices, or decisions only you own.

---

## STEP 1 — Accounts (do these first, they take the longest)

### 1a. Apple Developer Program
- Sign up at **developer.apple.com/programs**
- Cost: **$99/year**
- Requires: Apple ID, credit card, 24–48 h approval wait
- Once approved you get a **10-character Team ID** (e.g. `AB12CD34EF`) — you'll need it for Step 4

### 1b. Google Play Developer Account
- Sign up at **play.google.com/console**
- Cost: **$25 one-time**
- Requires: Google account, credit card, identity verification (can take 2–3 days)

---

## STEP 2 — OneSignal (push notifications)

1. Go to **onesignal.com** → Create account → New App → name it "SYNAP"
2. For iOS: upload your **APNs Auth Key (.p8)**
   - Get it from: developer.apple.com → Certificates → Keys → New key → Apple Push Notifications service
   - Download the .p8 file (only downloadable once), note the Key ID
3. For Android: connect **Firebase**
   - Create a Firebase project at **console.firebase.google.com**
   - Add Android app with package name `app.synap.fit`
   - Download `google-services.json` → put it in `android/app/google-services.json`
   - Copy the FCM Server Key → paste into OneSignal Android config
4. Copy your **OneSignal App ID** from the dashboard
5. Add it to Vercel environment variables:
   - Vercel dashboard → synap project → Settings → Environment Variables
   - Name: `NEXT_PUBLIC_ONESIGNAL_APP_ID`
   - Value: your OneSignal App ID
   - Apply to: Production, Preview, Development

---

## STEP 3 — Android keystore (signing key)

Run this **once** on any machine with Java installed and store the result safely.
**If you lose this keystore you can never update your app on Google Play.**

```bash
keytool -genkey -v \
  -keystore synap-release.jks \
  -alias synap \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

It will ask you for passwords and your name/organisation — fill them in.
Store `synap-release.jks` somewhere safe (not in the git repo).

After creating it, get the SHA-256 fingerprint:
```bash
keytool -list -v -keystore synap-release.jks -alias synap
```
Copy the `SHA256:` line. You need it for Step 5.

---

## STEP 4 — Two placeholder values in the code

### 4a. Apple Team ID → AASA file
Open `public/.well-known/apple-app-site-association` and replace both occurrences of `TEAMID` with your real Team ID:

**Before:**
```json
"appID": "TEAMID.app.synap.fit"
```
**After (example):**
```json
"appID": "AB12CD34EF.app.synap.fit"
```

Get your Team ID: developer.apple.com → Account → Membership → Team ID

### 4b. Keystore SHA-256 → assetlinks.json
Open `public/.well-known/assetlinks.json` and replace `REPLACE_WITH_YOUR_KEYSTORE_SHA256_FINGERPRINT` with the SHA256 you got in Step 3:

**Before:**
```json
"sha256_cert_fingerprints": ["REPLACE_WITH_YOUR_KEYSTORE_SHA256_FINGERPRINT"]
```
**After (example):**
```json
"sha256_cert_fingerprints": ["14:6D:E9:83:C5:...rest of fingerprint..."]
```

Commit and push both files after editing.

---

## STEP 5 — iOS native project (requires a Mac)

The iOS app cannot be built on Windows. On a Mac:

```bash
# Install deps (only if not done)
npm install

# Add iOS platform
npx cap add ios

# Sync
npx cap sync ios

# Apply Info.plist additions
# Open ios-setup/Info.plist.additions.xml
# Copy those keys into ios/App/App/Info.plist
# (or just open the project and add them via Xcode)

# Open Xcode
npx cap open ios
```

In Xcode:
1. Select the `App` target → **Signing & Capabilities**
2. Set Team to your Apple Developer account
3. Enable **Push Notifications** capability
4. Enable **Associated Domains** → add `applinks:synapfit.app`
5. Build once to verify it compiles

Then commit the entire `ios/` folder to the repo so GitHub Actions CI can build it.

---

## STEP 6 — GitHub Secrets (for CI/CD to work)

Go to: **github.com/moufawaz/synap → Settings → Secrets and variables → Actions**
Add each secret below.

### Android secrets
| Secret name | How to get the value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -i synap-release.jks` on Mac/Linux, or use a base64 tool on Windows |
| `ANDROID_KEYSTORE_PASSWORD` | The password you set when creating the keystore |
| `ANDROID_KEY_ALIAS` | `synap` (or whatever alias you used) |
| `ANDROID_KEY_PASSWORD` | The key password (often same as keystore password) |
| `GOOGLE_PLAY_JSON_KEY` | See below |

**Getting GOOGLE_PLAY_JSON_KEY:**
1. Play Console → Setup → API access
2. Link to a Google Cloud project
3. Create a Service Account → grant "Release Manager" role
4. Create a JSON key for that service account → download the .json file
5. Paste the **entire file contents** as the secret value

### iOS secrets
| Secret name | How to get the value |
|---|---|
| `APPLE_ID` | Your Apple ID email |
| `APPLE_TEAM_ID` | 10-char Team ID from developer.apple.com |
| `ITC_TEAM_ID` | Numeric team ID from App Store Connect → Users & Access |
| `APP_STORE_CONNECT_API_KEY_ID` | App Store Connect → Users & Access → Integrations → Key ID |
| `APP_STORE_CONNECT_ISSUER_ID` | Same page → Issuer ID (UUID) |
| `APP_STORE_CONNECT_API_KEY_P8` | Contents of the .p8 file you download from that page |
| `MATCH_GIT_URL` | URL of a new private GitHub repo you create for certificates (e.g. `https://github.com/moufawaz/synap-certs`) |
| `MATCH_GIT_TOKEN` | `base64("your_github_username:your_personal_access_token")` — PAT needs `repo` scope |
| `MATCH_PASSWORD` | Any strong password you invent — used to encrypt the certificates repo |
| `MATCH_KEYCHAIN_PASSWORD` | Any random string — used for a temporary CI keychain |

### Optional
| Secret name | Value |
|---|---|
| `SLACK_WEBHOOK_URL` | Slack incoming webhook if you want build notifications |

---

## STEP 7 — First upload (manual — required by both stores)

Both stores require the **very first build to be uploaded manually** before CI can take over.

### Android (first manual upload)
1. Play Console → Create app → package `app.synap.fit`
2. Build the AAB manually from Android Studio (open with `npm run cap:android`)
3. Upload to **Internal Testing** track
4. After this one upload, all future builds go through GitHub Actions automatically

### iOS (first manual upload)
1. App Store Connect → New App → bundle ID `app.synap.fit`
2. Archive from Xcode → Distribute App → App Store Connect → Upload
3. After this, GitHub Actions handles all future TestFlight uploads

---

## STEP 8 — Store listing content (copy-paste ready in store-metadata.md)

All the text is already written in `store-metadata.md`. You just paste it in.

### App Store Connect fields to fill:
- [ ] App Name: `SYNAP — AI Fitness Coach`
- [ ] Subtitle: `Training · Nutrition · Ion`
- [ ] Description: copy from store-metadata.md
- [ ] Keywords: `fitness,AI trainer,diet plan,workout,nutrition,calorie tracker,body composition,Ion,muscle,weight loss`
- [ ] Support URL: `https://synapfit.app/support`
- [ ] Marketing URL: `https://synapfit.app`
- [ ] Privacy Policy URL: `https://synapfit.app/privacy`
- [ ] Age Rating questionnaire: check all **None** → result is **4+**
- [ ] Privacy Nutrition Label: fill per the table in store-metadata.md

### Google Play Console fields to fill:
- [ ] Short description: `AI personal trainer: workouts, nutrition & body tracking with Ion.`
- [ ] Full description: copy from store-metadata.md
- [ ] Category: Health & Fitness
- [ ] Content rating questionnaire: complete it → **Everyone**
- [ ] Data safety form: fill per the table in store-metadata.md

---

## STEP 9 — Screenshots (you take these)

Both stores require at least 1 screenshot. Apple recommends 5. Shoot on a real device or simulator.

**Target sizes:**
- iPhone: 6.7" (1290×2796px) — required by App Store
- Android: any phone screenshot works for Play Store

**5 screens to capture (what to show on each):**
| # | Where to go in the app | Caption to add |
|---|---|---|
| 1 | Dashboard — home screen with stats | "Your body. Fully connected." |
| 2 | Chat with Ion — multi-turn conversation | "A coach who actually follows up." |
| 3 | Workout → Today — exercise list | "Training built around you." |
| 4 | Nutrition → food photo scan result | "Point. Scan. Done." |
| 5 | Progress → measurement chart | "See exactly what's changing." |

Add a coloured background + caption text using Figma, Canva, or Apple's screenshot tool.

---

## STEP 10 — Privacy policy and support pages

The store requires these URLs to exist and be live:

- `https://synapfit.app/privacy` — Privacy Policy page
- `https://synapfit.app/support` — Support page (can be as simple as a contact email)

If these pages don't exist yet, create them in your Next.js app (`src/app/privacy/page.tsx`, `src/app/support/page.tsx`) before submitting.

---

## Summary — order to do things

```
1. Sign up: Apple Developer ($99) + Google Play ($25)     ← waiting time: up to 3 days
2. Create OneSignal app + add NEXT_PUBLIC_ONESIGNAL_APP_ID to Vercel
3. Generate Android keystore (keytool command above)
4. Edit 2 placeholder values in the repo (TEAMID + SHA256) and push
5. On a Mac: npx cap add ios → Xcode setup → commit ios/ folder
6. Add all GitHub Secrets (Android + iOS)
7. First manual upload for each store
8. Paste store listing copy (already written in store-metadata.md)
9. Take and upload 5 screenshots per platform
10. Create /privacy and /support pages if they don't exist
11. Submit for review
```

Once Steps 1–6 are done, every future update to the app is automatic:
push to `main` → GitHub Actions builds and uploads to both stores.

---

## What's already done (nothing for you to touch)

- ✅ Capacitor wrapper + config
- ✅ Native platform detection (SSR-safe, no hydration issues)
- ✅ OneSignal push — web SDK + native Capacitor SDK
- ✅ Local notifications — 5 categories with full settings UI
- ✅ Deep link handling (Universal Links + local notification taps)
- ✅ Apple IAP gate — LemonSqueezy checkout hidden in native binary
- ✅ Safe area insets — iOS notch/home indicator handled
- ✅ CSP headers — WKWebView compatible
- ✅ AASA + assetlinks.json files (just need your real IDs in Step 4)
- ✅ Android permissions in AndroidManifest.xml
- ✅ iOS plist keys template in ios-setup/
- ✅ Store metadata written (name, description, keywords, privacy label)
- ✅ Icon PNG replaced with your file
- ✅ GitHub Actions CI/CD — android.yml + ios.yml
- ✅ Fastlane — android beta + ios beta lanes
