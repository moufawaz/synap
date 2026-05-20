# Fastlane — SYNAP CI/CD

## Quick reference

| Command | What it does |
|---|---|
| `bundle exec fastlane android beta` | Build signed AAB → Play Internal Track |
| `bundle exec fastlane ios certs` | Create/sync App Store certs via match |
| `bundle exec fastlane ios beta` | Build IPA → TestFlight |

---

## One-time setup

### 1. Install Ruby deps
```bash
gem install bundler
bundle install
```

### 2. Android keystore
Create your signing keystore once and store it safely:
```bash
keytool -genkey -v \
  -keystore synap-release.jks \
  -alias synap \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```
Then base64-encode it for the GitHub secret:
```bash
base64 -i synap-release.jks | pbcopy   # macOS — paste into ANDROID_KEYSTORE_BASE64
```

### 3. Google Play service account
1. Google Play Console → Setup → API access → Link to Google Cloud project
2. Create a Service Account with "Release Manager" role
3. Download JSON key → paste the **file contents** into `GOOGLE_PLAY_JSON_KEY`

### 4. App Store Connect API key
1. App Store Connect → Users & Access → Integrations → App Store Connect API
2. Create key with "App Manager" role
3. Download the `.p8` file (you can only download it once)
4. Note the **Key ID** and **Issuer ID** shown on the page

### 5. match certificates repo
1. Create a **private** GitHub repo, e.g. `your-org/synap-certificates`
2. Set `MATCH_GIT_URL` to `https://github.com/your-org/synap-certificates`
3. Generate a Personal Access Token (PAT) with `repo` scope
4. Set `MATCH_GIT_TOKEN` to `base64("username:PAT")`:
   ```bash
   echo -n "your_github_username:your_pat" | base64 | pbcopy
   ```
5. Choose a strong encryption password for the repo → `MATCH_PASSWORD`
6. Run once on your Mac to create certs:
   ```bash
   bundle exec fastlane ios certs
   ```

---

## GitHub Secrets checklist

Add these in: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

### Android
| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -i synap-release.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | `synap` (or whatever alias you used) |
| `ANDROID_KEY_PASSWORD` | key password |
| `GOOGLE_PLAY_JSON_KEY` | full contents of the Play service-account JSON |

### iOS
| Secret | Value |
|---|---|
| `APPLE_ID` | your@appleid.com |
| `APPLE_TEAM_ID` | 10-char team ID from developer.apple.com |
| `ITC_TEAM_ID` | numeric team ID from App Store Connect |
| `APP_STORE_CONNECT_API_KEY_ID` | key ID (e.g. `ABCD1234EF`) |
| `APP_STORE_CONNECT_ISSUER_ID` | issuer ID (UUID format) |
| `APP_STORE_CONNECT_API_KEY_P8` | full contents of the `.p8` file |
| `MATCH_GIT_URL` | `https://github.com/your-org/synap-certificates` |
| `MATCH_GIT_TOKEN` | `base64("username:PAT")` |
| `MATCH_PASSWORD` | match encryption password |
| `MATCH_KEYCHAIN_PASSWORD` | any random string (temp CI keychain) |

### Optional
| Secret | Value |
|---|---|
| `SLACK_WEBHOOK_URL` | incoming webhook URL for build notifications |

---

## How CI works

### On every push to `main`
1. GitHub Actions spins up **ubuntu-latest** (Android) and **macos-14** (iOS) in parallel
2. `npm ci` → `npx cap sync` (no Next.js build needed — app loads `synapfit.app` at runtime)
3. Android: Gradle builds signed AAB → Fastlane `supply` uploads to Play Internal Track
4. iOS: Fastlane `match` installs certs → Xcode archives → Fastlane `upload_to_testflight`
5. Both workflows upload the artifact (.aab / .ipa) for 14 days regardless of success/failure

### Version codes
`GITHUB_RUN_NUMBER` is used as the Android `versionCode` and iOS `buildNumber`.
Run 1 → versionCode 1, run 2 → 2, etc.  Monotonically increasing — Play and TestFlight both require this.

---

## First deployment (manual steps)

### Android
1. **Create the app in Google Play Console** (draft) with package name `app.synap.fit`
2. **Upload the first AAB manually** — Play requires one manual upload to register app signing
3. After that, all future builds go through GitHub Actions automatically

### iOS — no Mac required
The `ios/` folder is NOT committed to the repo.
GitHub Actions generates it fresh on every build using `npx cap add ios` on the macOS runner.

One-time setup before the first CI build:
1. **Enable Push Notifications** for the App ID in App Store Connect → Certificates, IDs & Profiles → Identifiers → `app.synap.fit` → Edit → Push Notifications ✓
2. **Enable Associated Domains** for the same identifier
3. **Create the match certificates repo** — a private GitHub repo (e.g. `synap-certs`)
4. **Bootstrap match** — trigger the workflow once with `MATCH_READONLY=false` override,
   or run this from any machine with Ruby:
   ```bash
   MATCH_GIT_URL=https://github.com/moufawaz/synap-certs \
   MATCH_GIT_TOKEN=base64(user:PAT) \
   MATCH_PASSWORD=yourpassword \
   bundle exec fastlane ios certs_create
   ```
   This creates the Distribution certificate + App Store provisioning profile and stores
   them encrypted in `synap-certs`. Every subsequent CI run fetches them (readonly).
5. Add all GitHub Secrets listed above
6. Push to `main` — the workflow builds and ships automatically
