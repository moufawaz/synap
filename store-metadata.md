# SYNAP — App Store & Google Play Metadata

## App Identity
| Field | Value |
|---|---|
| Bundle ID (iOS) | `app.synap.fit` |
| Package name (Android) | `app.synap.fit` |
| Version | 1.0.0 |
| Build | 1 |

---

## App Store (iOS)

### Name & Subtitle
- **App Name** (max 30 chars): `SYNAP — AI Fitness Coach`  *(22 chars)*
- **Subtitle** (max 30 chars): `Training · Nutrition · Ion`  *(27 chars)*

### Description (max 4000 chars)
```
Meet Ion — your AI personal trainer who never clocks out.

SYNAP is the operating system for your body. Built for people who train seriously, SYNAP connects every variable that matters — training, nutrition, recovery, and body composition — into a single intelligent system.

────── WHAT ION DOES FOR YOU ──────

ADAPTIVE TRAINING
Ion builds your workout programme from scratch based on your goals, equipment, and training history. Every week it analyses your performance and evolves the plan so you're always working at the right intensity.

PRECISION NUTRITION
Get a fully personalised macro and calorie plan that adjusts as your body changes. Log meals using the AI food photo scanner — just point your camera at your food and Ion handles the nutrition data.

BARCODE SCANNING
Scan any food product and instantly log accurate calories and macros. Supports thousands of products.

EATING OUT GUIDANCE
Ask Ion what to order at any restaurant. It analyses the menu and tells you the best options for your goals — with exact macro estimates.

BODY COMPOSITION TRACKING
Track 13 body measurements and watch the trends over time. Ion detects plateaus before you do and adjusts your plan automatically.

EXERCISE FORM CHECK (Elite)
Upload a photo from any set and Ion scores your form, flags the safest correction, and gives you one specific cue for the next set.

GROCERY LIST GENERATOR
Ion builds a weekly grocery list based on your meal plan — organised by section, in the right quantities.

GOAL TIMELINE PREDICTION (Elite)
Ion tells you exactly when you'll reach your goal based on your current trajectory — and what to change to get there faster.

SUPPLEMENT RECOMMENDATIONS (Elite)
Personalised supplement stack based on your diet gaps and training demands, with local supplier options.

────── WHY SYNAP ──────

✦ Bilingual — full Arabic and English support
✦ AI that actually learns — plans improve with every week of data
✦ Free 7-day trial — full access, cancel before day 7 and you're never charged
✦ No cookie-cutter programmes — everything is built specifically for you

Start the 7-day free trial. Your body deserves a system.
```

### Keywords (max 100 chars — comma-separated, no spaces after commas)
```
fitness,AI trainer,diet plan,workout,nutrition,calorie tracker,body composition,Ion,muscle,weight loss
```
*(100 chars exactly)*

### Support URL
`https://synapfit.app/support` *(create this page before submission)*

### Marketing URL
`https://synapfit.app`

### Privacy Policy URL
`https://synapfit.app/privacy`

### Copyright
`© 2026 SYNAP`

### Primary Category
**Health & Fitness**

### Secondary Category
**Sports**

---

## Age Rating (App Store)
- **Rating**: 4+
- No violent content, no gambling, no adult content
- Health/fitness tracking and AI coaching only
- Check all "None" on the age rating questionnaire

---

## Privacy Nutrition Label (App Store — required)

### Data Linked to You (user identity known)
| Data Type | Category | Linked to User | Tracking |
|---|---|---|---|
| Name | Contact Info | Yes | No |
| Email Address | Contact Info | Yes | No |
| Body measurements (weight, height, etc.) | Health & Fitness | Yes | No |
| Fitness records (workouts, reps, sets) | Health & Fitness | Yes | No |
| Food & nutrition logs | Health & Fitness | Yes | No |
| Photos (progress photos, form check) | Photos & Videos | Yes | No |
| User ID | Identifiers | Yes | No |
| Purchase history / subscription | Purchases | Yes | No |

### Data NOT Collected
- Precise location ✓
- Contacts ✓
- Browsing history ✓
- Search history ✓
- Sensitive info ✓

---

## Google Play

### Short Description (max 80 chars)
```
AI personal trainer: workouts, nutrition & body tracking with Ion.
```
*(67 chars)*

### Full Description (max 4000 chars)
*(Same as App Store description above)*

### App Category
**Health & Fitness**

### Content Rating
**Everyone** — General Audience

### Data Safety (Play Console)
| Data Type | Collected | Shared | Purpose |
|---|---|---|---|
| Name | Yes | No | App functionality |
| Email | Yes | No | Account management |
| Health info (measurements, nutrition) | Yes | No | App functionality |
| Photos | Yes | No | App functionality (form check, progress) |
| App activity (in-app actions) | Yes | No | Analytics / product improvement |

Encryption in transit: **Yes** (all Supabase/Anthropic API calls are HTTPS)
User can request deletion: **Yes** (Settings → Account → Delete Account)

---

## Screenshot Plan (iPhone 6.7" — 1320×2868px / 6.5" — 1284×2778px)

Minimum 1, recommended 5. Shoot at 6.5" (1284×2778) if using a simulator.

| # | Screen | Caption |
|---|---|---|
| 1 | Dashboard — hero card with today's stats visible | "Your body. Fully connected." |
| 2 | Ion chat — multi-turn conversation showing meal advice | "A coach who actually follows up." |
| 3 | Workout today — exercise list with sets/reps | "Training built around you." |
| 4 | Nutrition / food photo scan result | "Point. Scan. Done." |
| 5 | Progress screen — measurement trend chart | "See exactly what's changing." |

---

## Pre-Submission Checklist

### Apple Developer Account
- [ ] App registered in App Store Connect
- [ ] Bundle ID `app.synap.fit` created
- [ ] Push Notifications capability enabled in Xcode
- [ ] Associated Domains entitlement: `applinks:synapfit.app`
- [ ] **Replace `TEAMID`** in `public/.well-known/apple-app-site-association` with your 10-char Apple Team ID
- [ ] TestFlight build uploaded and at least 1 internal tester approved it
- [ ] Age rating questionnaire completed (4+)
- [ ] Privacy nutrition label filled
- [ ] In-app purchase / subscription NOT exposed in native binary (✓ already gated)

### Google Play Console
- [ ] App created (package: `app.synap.fit`)
- [ ] Keystore generated, SHA-256 fingerprint added to `public/.well-known/assetlinks.json`
- [ ] google-services.json added to `android/app/`
- [ ] Data safety form completed
- [ ] Content rating questionnaire completed
- [ ] Internal track release uploaded

### OneSignal (both platforms)
- [ ] iOS APNs Auth Key (.p8) uploaded to OneSignal dashboard
- [ ] Android FCM Server Key (from Firebase Console) uploaded to OneSignal dashboard
- [ ] Native push tested on a real device (TestFlight / Play Internal)
