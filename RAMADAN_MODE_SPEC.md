# Ramadan Mode — Feature Spec

**Status:** Ready to build (post App Store approval)
**Why:** No major fitness app re-plans nutrition + training around fasting properly.
SYNAP's core market fasts every year. This is the killer differentiator for the
GCC — seasonal, deeply local, hard for English-first competitors to copy credibly.

---

## 1. User experience

### Activation
- **Auto-prompt:** ~1 week before Ramadan (date from a small server-side table of
  Hijri→Gregorian Ramadan ranges per year), Ion proactively asks in chat +
  a push notification: "Ramadan starts on {date}. Want me to switch your plan to
  Ramadan mode?" One tap → re-plans.
- **Manual:** Settings → toggle **"Ramadan mode"** (with start/end dates
  prefilled, editable for regional differences).
- **Deactivation:** auto-prompt at Eid ("Ramadan is over — switch back?") +
  manual toggle. Reverting regenerates the normal plan.

### What changes when ON
1. **Nutrition re-timed to two anchored meals + optional snack:**
   - **Iftar** (sunset, from prayer-times API or user-set time) — the main meal,
     break-fast structure: dates + water → soup/salad → main. ~50–55% of calories.
   - **Suhoor** (pre-dawn) — slow-digesting: protein, complex carbs, fats,
     high-satiety. ~35–40% of calories.
   - **Optional night snack** (between iftar & sleep) — remaining calories,
     protein-focused.
   - Hydration target spread **only across non-fasting hours** (iftar → suhoor),
     with reminders re-scheduled to that window.
2. **Training re-timed.** Options the user picks once (Ion explains trade-offs):
   - **Post-iftar (recommended):** 1.5–2h after iftar, full intensity.
   - **Pre-iftar:** 30–60 min before sunset, reduced volume (-30–40%), no
     failure sets — then eat immediately.
   - **Post-taraweeh / late night:** normal intensity, ensure suhoor recovery meal.
   - Deload-style volume reduction in week 1 of Ramadan (adaptation week).
3. **Calorie strategy:** maintenance or mild deficit only (no aggressive cuts
   while fasting); protein floor unchanged; Ion explains why.
4. **Notifications re-mapped:** suhoor reminder (~45 min before), iftar
   countdown, hydration reminders only in the eating window, training reminder
   at the chosen slot, **no meal/water reminders during fasting hours**.
5. **Ion awareness:** system prompt gains a Ramadan block (fasting state, meal
   times, energy expectations, "don't suggest daytime eating"). Greetings:
   "Ramadan Kareem".

---

## 2. Technical design

### Data
- `profiles`: add `ramadan_mode boolean default false`,
  `ramadan_training_slot text` ('post_iftar' | 'pre_iftar' | 'late_night'),
  `iftar_time text`, `suhoor_time text` (HH:MM, user-editable; defaults from
  location-less sensible times 18:30 / 03:30, refined by user).
- Server constant: Ramadan date ranges for the next few years
  (e.g. 2026-02-17→03-18, 2027-02-06→03-07 — verify exact dates at build time).

### Server
- `generate-plan` / `renew-plan` `buildPrompt`: when `ramadan_mode`, swap the
  MEAL TIMING + workout-scheduling sections for the Ramadan rules above
  (structured meals: Iftar/Suhoor/Snack with the calorie split; training slot
  from profile). Phased generation unchanged.
- `chat` system prompt: Ramadan context block when active.
- `save-profile`: accept the new fields.
- Cron (optional v2): auto-prompt push 7 days before Ramadan + at Eid.

### Mobile + web
- Settings: Ramadan card (toggle, iftar/suhoor times, training slot) → on
  change, calls save-profile then offers "Regenerate my plan for Ramadan"
  (reuses the existing 4-phase generation + PlanGenerating UI).
- `notifications.ts` (mobile): when `ramadan_mode`, build hydration reminders
  across iftar→suhoor window instead of wake→sleep; suhoor/iftar reminders;
  meal reminders from the Ramadan plan's meal times (these come from the plan
  JSON already, so most of it falls out naturally).
- Nutrition page: meals render as Iftar/Suhoor/Snack automatically (names come
  from plan JSON — minimal UI work). Optional: crescent badge on dashboard.

### Effort estimate
- Server prompts + fields: ~1 day
- Settings UI (web + mobile) + notifications window: ~1 day
- Testing (generate plans in both languages, verify timings): ~0.5 day
- **Total: ~2–3 days.** No new dependencies, no new build risk areas.

---

## 3. Marketing angle (launch alongside the feature)
- "The only AI coach that plans your Ramadan." Arabic-first campaign.
- LinkedIn/Instagram: before/after of a plan switching to Ramadan mode.
- Time the App Store screenshots refresh + a "What's New" release note to it.
