# SYNAP — Full Application Context for AI

> Use this document as the primary context when working on this codebase with AI tools.
> Last updated: May 2026.

---

## 1. What is SYNAP?

SYNAP is an **AI-powered personal fitness and nutrition coaching web app**. Its core product is **Ion** — an AI coach that acts as a real personal trainer and nutritionist. Ion collects deep personal data from the user during a conversational onboarding flow, builds a fully personalized 12-week workout plan and a daily meal plan, and then remains available as a chat assistant throughout the user's journey.

**Tagline:** "The Intelligence of Sport"
**Live URL:** https://www.synapfit.app
**Target market:** Arabic-speaking fitness market (primarily Saudi Arabia), fully bilingual (English + Arabic)
**Business model:** Freemium SaaS — free tier with limits, paid Pro plans via Lemon Squeezy (Merchant of Record)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + inline styles (dark glassmorphism theme) |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth (email/password + magic links) |
| AI | Anthropic Claude API (`claude-opus-4-5` for plan gen, `claude-sonnet-4-5` for chat) |
| Payments | Lemon Squeezy (Merchant of Record — no Stripe because KSA/Egypt aren't supported as merchant countries) |
| Email | Resend (from `ion@synapfit.app`) |
| Push Notifications | OneSignal Web Push SDK v16 |
| Deployment | Vercel (with daily cron jobs) |
| Font | Custom "font-heading" — all text uses this |

---

## 3. Project Structure

```
D:\Synap\
├── src/
│   ├── app/
│   │   ├── (app)/                    ← Authenticated route group
│   │   │   ├── layout.tsx            ← Auth guard + sidebar + mobile nav
│   │   │   ├── dashboard/page.tsx    ← Main dashboard
│   │   │   ├── chat/page.tsx         ← Ion chat interface
│   │   │   ├── workout/
│   │   │   │   ├── page.tsx          ← Full workout plan view
│   │   │   │   └── today/page.tsx    ← Active workout session with timer
│   │   │   ├── nutrition/page.tsx    ← Full diet plan view
│   │   │   ├── plan/page.tsx         ← Combined workout + diet plan accordion view
│   │   │   ├── progress/page.tsx     ← Weight trend charts + stats
│   │   │   ├── measurements/page.tsx ← Log body measurements
│   │   │   ├── settings/page.tsx     ← Profile, Training, Preferences, Billing tabs
│   │   │   └── admin/page.tsx        ← Admin-only revenue + user dashboard
│   │   ├── api/
│   │   │   ├── chat/route.ts         ← Ion chat with daily message limits
│   │   │   ├── generate-plan/route.ts← AI plan generation (Claude Opus)
│   │   │   ├── checkout/route.ts     ← Create Lemon Squeezy checkout
│   │   │   ├── billing/cancel/route.ts← Cancel subscription
│   │   │   ├── webhooks/lemon-squeezy/route.ts ← LS webhook handler
│   │   │   ├── cron/trial-reminders/route.ts   ← Daily trial day 5/6 reminders
│   │   │   ├── adaptation-check/route.ts ← Ion adaptation logic
│   │   │   ├── log-workout/route.ts
│   │   │   ├── log-meal/route.ts
│   │   │   ├── measurements/route.ts
│   │   │   ├── monthly-summary/route.ts
│   │   │   ├── renew-plan/route.ts
│   │   │   ├── save-profile/route.ts
│   │   │   ├── send-email/route.ts
│   │   │   └── push-notification/route.ts
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   ├── onboarding/page.tsx       ← Conversational onboarding (Ion chat UI)
│   │   ├── pricing/page.tsx          ← Public pricing page
│   │   ├── page.tsx                  ← Landing page (auth-aware)
│   │   └── layout.tsx                ← Root layout (global fonts/styles)
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── Sidebar.tsx           ← Desktop nav with user info
│   │   │   ├── MobileNav.tsx         ← Bottom tab bar
│   │   │   └── AdaptationChecker.tsx ← Runs adaptation checks silently
│   │   ├── landing/
│   │   │   ├── Navbar.tsx            ← Auth-aware top nav
│   │   │   ├── Hero.tsx              ← Auth-aware hero section
│   │   │   ├── CTA.tsx               ← Auth-aware CTA
│   │   │   ├── Features.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── WhyIon.tsx
│   │   │   └── Footer.tsx
│   │   ├── onboarding/
│   │   │   ├── MeasurementCard.tsx   ← Body measurement input card
│   │   │   └── PlanGenerating.tsx    ← Animated "building your plan" screen
│   │   ├── ui/
│   │   │   ├── IonAvatar.tsx         ← Ion AI avatar (male/female)
│   │   │   └── SynapLogo.tsx
│   │   └── OneSignalInit.tsx         ← Client push notification init
│   └── lib/
│       ├── supabase.ts               ← createBrowserClient()
│       ├── supabase-server.ts        ← createServerClient()
│       ├── lemon-squeezy.ts          ← LS API: createCheckout, cancel, verify webhook
│       ├── subscription.ts           ← getDailyLimit, canSendMessage, trial helpers
│       ├── currency.ts               ← detectUserCurrency, formatPrice, useCurrency hook
│       ├── resend.ts                 ← 13 email templates
│       ├── onesignal.ts              ← Push notification sender
│       ├── onboardingFlow.ts         ← 35-step onboarding state machine
│       └── i18n.ts                   ← Translation helpers
├── public/
│   └── OneSignalSDKWorker.js         ← Push notification service worker
├── supabase-monetization.sql         ← SQL migration for monetization tables
├── vercel.json                       ← Cron config + security headers
└── .env.local                        ← All environment variables
```

---

## 4. Database Schema (Supabase)

### Core Tables

**`auth.users`** — Supabase managed auth users (id, email, created_at)

**`users`** — App user metadata
```sql
id UUID (= auth.users.id)
language TEXT  -- 'en' | 'ar'
created_at TIMESTAMPTZ
```

**`profiles`** — User fitness profile (collected during onboarding)
```sql
id UUID
user_id UUID → auth.users
name TEXT
age INTEGER
weight_kg NUMERIC
height_cm NUMERIC
gender TEXT                    -- 'male' | 'female'
ion_gender TEXT                -- 'male' | 'female' (Ion avatar preference)
goal TEXT                      -- 'lose_fat' | 'build_muscle' | 'recomposition' | 'improve_fitness' | 'be_healthier'
goal_speed TEXT                -- 'slow' | 'moderate' | 'aggressive'
goal_target TEXT
goal_date TEXT
work_schedule TEXT             -- 'work' | 'study' | 'both' | 'neither'
work_hours TEXT
wake_time TEXT
sleep_time TEXT
lunch_break TEXT
stress_level TEXT              -- 'low' | 'moderate' | 'high'
sleep_quality TEXT             -- 'solid' | 'average' | 'struggling'
currently_training TEXT        -- 'already' | 'fresh'
current_training_desc TEXT
gym_access TEXT                -- 'gym' | 'home'
equipment TEXT
training_days INTEGER
session_duration INTEGER       -- minutes
training_time TEXT             -- 'morning' | 'afternoon' | 'evening' | 'late_night'
training_style TEXT            -- 'heavy_compound' | 'machines' | 'cables' | 'mix'
exercises_hated TEXT
foods_loved TEXT
foods_hated TEXT
dietary_preference TEXT[]      -- ['halal', 'no_pork', 'vegetarian', 'vegan', etc.]
allergies TEXT
meals_per_day INTEGER
cooking_ability TEXT           -- 'cook' | 'quick' | 'eat_out'
food_budget TEXT               -- 'tight' | 'moderate' | 'flexible'
injuries TEXT
medical_conditions TEXT
supplements TEXT
created_at TIMESTAMPTZ
```

**`workout_plans`** — AI-generated workout plans
```sql
id UUID
user_id UUID → auth.users
plan_json JSONB                -- Full plan (see AI JSON format below)
active BOOLEAN
created_at TIMESTAMPTZ
```

**`diet_plans`** — AI-generated nutrition plans
```sql
id UUID
user_id UUID → auth.users
plan_json JSONB                -- Full plan (see AI JSON format below)
active BOOLEAN
created_at TIMESTAMPTZ
```

**`chat_messages`** — Conversation history between user and Ion
```sql
id UUID
user_id UUID → auth.users
role TEXT                      -- 'user' | 'assistant' | 'ion'
content TEXT
message_type TEXT              -- 'text' | 'suggestion' | 'workout_card' | 'meal_card' | 'milestone' | 'alert' | 'new_plan'
metadata JSONB
created_at TIMESTAMPTZ
```

**`workout_log`** — Completed workout sessions
```sql
id UUID
user_id UUID → auth.users
plan_id UUID → workout_plans
day_name TEXT
exercises_completed JSONB
duration_min INTEGER
notes TEXT
logged_at TIMESTAMPTZ
```

**`measurements`** — Body measurement history
```sql
id UUID
user_id UUID → auth.users
weight_kg NUMERIC
chest_cm NUMERIC
waist_cm NUMERIC
hips_cm NUMERIC
left_arm_cm NUMERIC
right_arm_cm NUMERIC
left_thigh_cm NUMERIC
right_thigh_cm NUMERIC
date DATE
notes TEXT
created_at TIMESTAMPTZ
```

**`meal_logs`** — Meal tracking
```sql
id UUID
user_id UUID → auth.users
meal_name TEXT
foods JSONB
calories INTEGER
protein_g NUMERIC
carbs_g NUMERIC
fat_g NUMERIC
logged_at TIMESTAMPTZ
```

### Monetization Tables

**`subscriptions`** — One row per user (upserted, not appended)
```sql
id UUID
user_id UUID UNIQUE → auth.users
lemon_squeezy_subscription_id TEXT UNIQUE
lemon_squeezy_customer_id TEXT
lemon_squeezy_order_id TEXT
variant_id TEXT
plan_name TEXT                 -- 'free' | 'pro' | 'unlimited'
billing_period TEXT            -- 'monthly' | 'annual'
status TEXT                    -- 'free' | 'trial' | 'active' | 'cancelled' | 'expired' | 'past_due'
trial_ends_at TIMESTAMPTZ
current_period_ends_at TIMESTAMPTZ
cancelled_at TIMESTAMPTZ
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**`add_ons`** — One-time add-on purchases
```sql
id UUID
user_id UUID → auth.users
lemon_squeezy_subscription_id TEXT
variant_id TEXT
addon_type TEXT                -- 'extra_chat'
active BOOLEAN
created_at TIMESTAMPTZ
```

**`message_usage`** — Daily message counter
```sql
id UUID
user_id UUID → auth.users
date DATE
count INTEGER
created_at TIMESTAMPTZ
UNIQUE (user_id, date)
```

**`billing_events`** — Webhook audit log
```sql
id UUID
user_id UUID
event_type TEXT
lemon_squeezy_event_name TEXT
payload JSONB
created_at TIMESTAMPTZ
```

---

## 5. AI Plan JSON Format

Claude generates plans in this exact structure. The app parses and renders these fields:

### Workout Plan JSON
```json
{
  "name": "SYNAP 12-Week Hypertrophy Program",
  "schedule": "4 days/week",
  "split_type": "push_pull_legs",
  "weeks": 12,
  "notes": "Key training principles...",
  "rest_days": ["Wednesday", "Saturday", "Sunday"],
  "days": [
    {
      "day_name": "Monday",
      "muscle_focus": "Push",
      "warmup_min": 10,
      "duration_min": 60,
      "exercises": [
        {
          "name": "Bench Press",
          "sets": 4,
          "reps": "8-12",
          "rest_sec": 90,
          "weight_guidance": "Start moderate, RPE 7-8",
          "form_tip": "Keep shoulder blades retracted throughout",
          "muscle_group": "Chest"
        }
      ]
    }
  ]
}
```

### Diet Plan JSON
```json
{
  "daily_calories": 2400,
  "protein_g": 180,
  "carbs_g": 240,
  "fat_g": 80,
  "water_l": 3.0,
  "approach": "Moderate caloric deficit of 400 kcal",
  "pre_workout": "Banana + whey protein 30min before",
  "post_workout": "Rice + chicken within 30min after",
  "meals": [
    {
      "name": "Breakfast",
      "time": "7:30 AM",
      "calories": 600,
      "protein_g": 40,
      "carbs_g": 70,
      "fat_g": 15,
      "description": "High-protein morning meal",
      "foods": [
        {
          "item": "Whole eggs",
          "amount": "3 large",
          "calories": 210,
          "protein_g": 18,
          "carbs_g": 1,
          "fat_g": 15
        }
      ]
    }
  ]
}
```

**IMPORTANT NOTE about JSON field names:** Claude generates `food.item` (not `food.name`) for individual food items. The app handles fallback: `food.item || food.name || food.food || (typeof food === 'string' ? food : '')`. Fat macro key is `fat_g` (not `fats_g`). Water key is `water_l` (not `hydration_liters`).

---

## 6. Ion AI — Personality & System Prompt

Ion is the AI persona throughout the entire app. Ion's voice:
- Direct, confident, genuinely encouraging — real coach energy
- Speaks like a human, not a textbook — knows the science but doesn't lecture
- Short and punchy responses by default (2-4 sentences), goes longer only when needed
- Holds people accountable with warmth
- Always references the user's specific situation, never gives generic advice
- Bilingual: responds in the language the user uses

Ion has two modes:
1. **Onboarding mode** — structured 8-phase conversational data collection (35 steps total)
2. **Chat mode** — free-form coaching with full context of user's profile + active plans

Chat system prompt includes: full profile, workout plan (first 1500 chars of JSON), diet plan macros, and the last 20 messages of conversation history.

---

## 7. Onboarding Flow

35-step state machine defined in `src/lib/onboardingFlow.ts`. 8 phases:

| Phase | Name | Steps |
|---|---|---|
| 1 | Identity | name, age, weight/height, gender, ion_gender |
| 2 | Measurements | chest, waist, arms, legs (optional baseline) |
| 3 | Goal | goal type, goal speed, target, deadline |
| 4 | Daily Life | work schedule, hours, wake/sleep time, lunch break, stress, sleep quality |
| 5 | Training | current training, gym/home, equipment, days/week, session duration, time of day, style, exercises to avoid |
| 6 | Nutrition | loved foods, hated foods, dietary rules, allergies, meals/day, cooking ability, budget |
| 7 | Health | injuries, medical conditions, supplements |
| 8 | Building Plan | trigger Claude plan generation → redirect to `/dashboard` |

Steps have conditions (e.g. equipment step only shows if gym_access = 'home'). The entire onboarding UI is a chat-style interface powered by Ion's avatar.

After onboarding completes:
1. Profile saved to `profiles` table
2. Claude generates complete 12-week plan (Opus model, 8000 tokens)
3. `workout_plans` and `diet_plans` rows inserted
4. Ion's personal welcome message saved to `chat_messages`
5. Welcome email sent via Resend

---

## 8. Monetization System

### Plans & Pricing (in SAR)

| Plan | Monthly | Annual | Messages/day |
|---|---|---|---|
| Free | — | — | 5 |
| Pro | 34.99 SAR | 289.99 SAR | 30 |
| Pro+Unlimited | 44.99 SAR | 369.99 SAR | ∞ |
| Extra Chat Add-on | 9.99 SAR (one-time) | — | +20 |

### 7-Day Free Trial Policy
- Every paid plan starts with a 7-day free trial
- **Zero-charge cancel guarantee:** cancel before Day 7 → never charged, ever
- Ion sends reminder messages on Day 5 and Day 6
- Trial cancellation via `POST /api/billing/cancel` → immediately sets status to 'free', no charge

### Launch Mode
- `LAUNCH_MODE=true` in env → entire payment system bypassed, all features free
- `NEXT_PUBLIC_LAUNCH_MODE=true` for client-side checks
- Single env var change to go live: set both to `false`

### Lemon Squeezy Variant IDs
```
PRO_MONTHLY:           1600605
PRO_UNLIMITED_MONTHLY: 1602017
PRO_ANNUAL:            1602045
PRO_UNLIMITED_ANNUAL:  1602053
EXTRA_CHAT (one-time): 1600640
```

### Webhook Events Handled
`subscription_created` → upsert subscription, send trial_started email + Ion message
`subscription_updated` → update status
`subscription_cancelled` → if in trial: immediately free + zero-charge Ion message; if active: mark cancelled with period end access
`subscription_resumed` → reactivate
`subscription_expired` → set free
`subscription_payment_success` → ensure active
`subscription_payment_failed` → set past_due
`order_created` → handle extra_chat add-on purchase

---

## 9. Currency System

- Detects user's region from `navigator.language` → `Intl.Locale.region`
- Maps region to currency code (SAR, AED, KWD, USD, GBP, EUR, EGP, etc.)
- Fetches live exchange rate from `api.frankfurter.app` (24h localStorage cache, key: `synap_currency_v2`)
- Falls back to SAR if detection fails
- `useCurrency()` hook in `src/lib/currency.ts` — returns `{ currency, loading, fmt }`
- `fmt(priceSAR)` converts and formats any SAR price into detected currency

---

## 10. Email System (Resend)

From address: `Ion at SYNAP <ion@synapfit.app>` (domain verified)

13 email templates in `src/lib/resend.ts`:
- `welcome` — after first plan generation
- `trial_started` — on subscription_created when in trial
- `trial_ending_day5` — 2 days before trial ends
- `trial_ending_day6` — 1 day before trial ends (last chance)
- `trial_cancelled` — zero charges confirmed
- `subscription_cancelled` — access until period end
- `subscription_renewed` — billing confirmation
- `payment_failed` — action required
- `upgrade_confirmation` — plan activated
- `weekly_summary` — weekly stats (workouts, meals, weight)
- `plan_renewal_warning` — 3-day warning before plan renews
- `new_plan` — new plan generated
- `milestone` — achievement unlocked

---

## 11. Push Notifications (OneSignal)

- OneSignal Web Push SDK v16 loaded via `<Script>` in app layout
- `OneSignalSDKWorker.js` in `/public` (imports LS SDK)
- Users are linked by Supabase `user.id` via `OneSignal.login(userId)` on first dashboard load
- Server-side push via `src/lib/onesignal.ts` using OneSignal REST API v1
- API endpoint: `POST /api/push-notification` for sending targeted pushes

---

## 12. App Pages — What Each Does

### `/` — Landing Page
Auth-aware. If logged in: shows Dashboard/Workout/Nutrition/Ask Ion links in nav and "WELCOME BACK" CTA. If logged out: normal marketing landing page with features, how it works, CTA to sign up.

### `/onboarding` — Conversational Onboarding
Chat UI driven by `ONBOARDING_STEPS` state machine. Ion asks questions, user responds via text input, quick reply buttons, multi-select chips, measurement card, or time pickers. Progress bar shows current phase. Language toggle (EN/AR) available at step 1. Supports Arabic RTL layout. After all steps: triggers plan generation and shows animated "Building your plan" screen.

### `/dashboard` — Main Dashboard
Server component. Shows:
- Greeting based on time of day
- Launch mode banner (when LAUNCH_MODE=true)
- Trial countdown banner (when in trial, links to billing settings)
- Free plan upgrade CTA (when on free plan)
- Last Ion message (clickable, links to chat)
- Stats row: Goal, daily calories, weekly workouts vs target, weight trend
- Today's workout card (exercise preview or REST DAY)
- Today's nutrition card (macro bars + meal list)
- Weight trend mini chart (SVG, color-coded by goal direction)
- Quick action buttons: Ask Ion, Log Weight, Start Training

### `/chat` — Ion Chat
Full-screen chat interface. Features:
- Chat history loaded from `chat_messages` (last 60 messages)
- Quick prompt chips at top for common questions
- Ion typing indicator while waiting for response
- Alert styling for error messages
- Daily limit error shows upgrade link to `/pricing`
- Scroll-to-bottom on new messages
- Ion avatar shows user's preferred gender

### `/workout/today` — Active Workout Session
- Shows current day's exercises with YouTube video links (90+ exercises mapped)
- Unknown exercises get a YouTube search link fallback
- Exercise accordion: tap to expand → sets/reps/rest/weight guidance/form tip + video
- Workout timer: starts/pauses, persists across page refreshes via localStorage
- Session key: `synap_workout_session` — saves date, totalMs, resumeAt, isPaused
- Timer shows amber when paused
- "Previous session restored" banner if returning to same-day session
- "Finish & Log" button saves to `workout_log`

### `/plan` — Full Plan View
Accordion-based view of both workout and diet plans. Meal cards expand to show individual foods with macros. Fixed fat_g key handling (not fats_g). Fixed food.item rendering. Water display uses `water_l` key.

### `/nutrition` — Nutrition Page
Diet plan with meal-by-meal breakdown, macros per meal, daily totals.

### `/progress` — Progress Tracking
Weight trend charts, measurement history, workout frequency stats.

### `/measurements` — Log Measurements
Form to log current weight and optional body measurements.

### `/settings` — Settings (4 tabs)
- **Profile** — name, age, weight, height, gender, goal
- **Training** — days/week, session duration, gym access, training time, injuries
- **Preferences** — language toggle (EN/AR), Ion gender, meals/day, cooking ability
- **Billing** — current plan status, trial countdown bar, zero-charge guarantee badge, message usage bar, upgrade CTA, cancel flow (two-step confirm, no dark patterns)

### `/pricing` — Pricing Page (public)
- Annual billing default (saves ~30%)
- Billing toggle: Annual / Monthly
- 3 plan cards: Free / Pro (recommended) / Pro+Unlimited
- Extra Chat add-on section
- Currency-detected prices (Frankfurt.app rates)
- Trust signals: Zero-Charge Trial, Secure Payments (LS), Cancel Anytime
- FAQ section
- Checkout via `POST /api/checkout` → redirects to LS checkout URL

### `/admin` — Admin Dashboard (admin email only)
- Stats: Total Users, MRR (SAR), Active Subs (+ in trial), Chat Messages
- Subscription status breakdown with progress bars (active/trial/cancelled/free)
- Revenue metrics: MRR, ARR, trial conversion rate, trial starts, trial cancels
- Active plan breakdown by plan+billing
- Full users table with plan status badge
- Goal breakdown with progress bars

---

## 13. API Routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/chat` | Send message to Ion, check daily limits, save history |
| POST | `/api/generate-plan` | Generate 12-week plan with Claude Opus |
| POST | `/api/checkout` | Create Lemon Squeezy checkout session |
| POST | `/api/billing/cancel` | Cancel subscription / trial |
| POST | `/api/webhooks/lemon-squeezy` | Handle all LS webhook events |
| GET | `/api/cron/trial-reminders` | Daily cron: send day 5/6 trial reminders |
| POST | `/api/save-profile` | Save onboarding profile data |
| POST | `/api/log-workout` | Log completed workout session |
| POST | `/api/log-meal` | Log meal |
| POST | `/api/measurements` | Save body measurements |
| POST | `/api/send-email` | Trigger transactional email |
| POST | `/api/push-notification` | Send OneSignal push |
| POST | `/api/adaptation-check` | Ion checks if plan needs adapting |
| POST | `/api/monthly-summary` | Generate monthly progress summary |
| POST | `/api/renew-plan` | Regenerate plan after 12 weeks |

---

## 14. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://uzmyydpywsflrrnyujao.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...        # Only in API routes, never client

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...

# App
NEXT_PUBLIC_APP_URL=https://www.synapfit.app   # localhost:3000 in local dev

# Resend (email)
RESEND_API_KEY=re_...

# OneSignal (push notifications)
ONESIGNAL_APP_ID=f7f6950b-d7aa-489a-865d-f27347d8c553
NEXT_PUBLIC_ONESIGNAL_APP_ID=f7f6950b-...
ONESIGNAL_API_KEY=os_v2_app_...

# Admin
ADMIN_EMAIL=mohamedhossam03@gmail.com

# Launch Mode — true = all features free, payments bypassed
LAUNCH_MODE=true
NEXT_PUBLIC_LAUNCH_MODE=true

# Lemon Squeezy
LEMON_SQUEEZY_API_KEY=eyJ...                   # JWT from LS dashboard
LEMON_SQUEEZY_STORE_ID=                        # Auto-fetched if blank
LEMON_SQUEEZY_WEBHOOK_SECRET=                  # From LS Webhooks settings
LEMON_SQUEEZY_PRO_MONTHLY_VARIANT_ID=1600605
LEMON_SQUEEZY_PRO_UNLIMITED_MONTHLY_VARIANT_ID=1602017
LEMON_SQUEEZY_PRO_ANNUAL_VARIANT_ID=1602045
LEMON_SQUEEZY_PRO_UNLIMITED_ANNUAL_VARIANT_ID=1602053
LEMON_SQUEEZY_EXTRA_CHAT_VARIANT_ID=1600640

# Public variant IDs (client-side pricing page)
NEXT_PUBLIC_LS_PRO_MONTHLY_ID=1600605
NEXT_PUBLIC_LS_PRO_ANNUAL_ID=1602045
NEXT_PUBLIC_LS_UNLIMITED_MONTHLY_ID=1602017
NEXT_PUBLIC_LS_UNLIMITED_ANNUAL_ID=1602053
NEXT_PUBLIC_LS_EXTRA_CHAT_ID=1600640

# Cron auth (Vercel Cron → /api/cron/*)
CRON_SECRET=<random hex string>
```

---

## 15. Design System

**Color Palette:**
- Background: `#0D0D1A` (deep dark blue-black)
- Primary: `#BB5CF6` / `#7C3AED` (purple)
- Secondary: `#22D3EE` (cyan)
- Success: `#10B981` (green)
- Warning: `#F59E0B` (amber)
- Danger: `#EF4444` (red)
- Text Primary: `#F0F0FF` / white
- Text Secondary: `#94A3B8` / `#64748B`
- Muted: `#475569`
- Dark Muted: `#2D3748`

**Glass Card:** `.glass-card` — semi-transparent dark background with subtle border and backdrop blur

**Typography:** All text uses `font-heading` (custom font loaded globally). Tracking, weight, and letter-spacing used extensively for hierarchy.

**Layout:** Mobile-first. Sidebar nav on desktop, bottom tab bar on mobile. Max-width containers (3xl/4xl/5xl depending on page). Padding: `px-4 sm:px-6 py-6`.

---

## 16. Key Architectural Decisions

1. **No Redux/Zustand** — server components fetch data directly, client components use local state + Supabase browser client
2. **Supabase SSR** — `createServerClient()` for API routes and server components (uses cookies), `createBrowserClient()` for client components
3. **Dual Supabase clients** — never use service role key on client side; webhook handlers use service role to bypass RLS
4. **`'use client'` boundaries** — heavy client interactivity (chat, workout timer, settings) are client components; data-heavy displays (dashboard, admin) are server components
5. **LAUNCH_MODE pattern** — single env var gates entire monetization system; safe to deploy with payments off
6. **Lemon Squeezy over Stripe** — Saudi Arabia and Egypt not supported as Stripe merchant countries; LS acts as Merchant of Record globally
7. **font-heading everywhere** — no body font fallback, all text is font-heading for brand consistency
8. **Inline styles for dynamic colors** — Tailwind purges dynamic color classes; dynamic colors (user-specific, computed) use inline `style={}` instead

---

## 17. Common Pitfalls & Known Issues

- **Fat macro key:** Claude generates `fat_g`, not `fats_g`. Always use `fat_g`.
- **Food item key:** Claude generates `food.item`, not `food.name`. Access chain: `food.item || food.name || food.food || (typeof food === 'string' ? food : '')`.
- **Water key:** `water_l`, not `hydration_liters`.
- **Supabase schema cache:** After `ALTER TABLE`, run `NOTIFY pgrst, 'reload schema'` to bust the PostgREST cache.
- **YouTube player:** Must use `dynamic(() => import('react-youtube'), { ssr: false })` to avoid hydration errors.
- **Live site URL:** The apex domain `synapfit.app` 307-redirects to `www.synapfit.app`. Always test against `www.synapfit.app`.
- **Anthropic message roles:** Only `'user'` and `'assistant'` are valid. The DB stores `'ion'` for Ion messages — normalize to `'assistant'` before passing to Anthropic API.
- **One-time `supabase-monetization.sql`:** Must be run in Supabase SQL Editor before monetization features work.
- **CRON_SECRET:** Required for the trial-reminders cron endpoint in production.

---

## 18. Files to Read First When Working on a Feature

| If working on... | Read these files first |
|---|---|
| Ion chat | `src/app/(app)/chat/page.tsx`, `src/app/api/chat/route.ts` |
| Plan generation | `src/app/api/generate-plan/route.ts` |
| Onboarding | `src/lib/onboardingFlow.ts`, `src/app/onboarding/page.tsx` |
| Payments / billing | `src/lib/lemon-squeezy.ts`, `src/lib/subscription.ts`, `src/app/api/webhooks/lemon-squeezy/route.ts` |
| Dashboard | `src/app/(app)/dashboard/page.tsx` |
| Settings | `src/app/(app)/settings/page.tsx` |
| Workout session | `src/app/(app)/workout/today/page.tsx` |
| Plan view | `src/app/(app)/plan/page.tsx` |
| Admin | `src/app/(app)/admin/page.tsx` |
| Emails | `src/lib/resend.ts` |
| Currency | `src/lib/currency.ts` |
| Auth layout/guard | `src/app/(app)/layout.tsx` |
