/**
 * Ramadan mode (mini scope for build 1107).
 *
 * When a user enables ramadan_mode in their profile with iftar/suhoor times,
 * Ion plans nutrition around the fasting window instead of around wake/sleep.
 * This block is injected into every food-related AI surface (generate-plan,
 * renew-plan, chat system prompt) so Ion is fully Ramadan-aware.
 *
 * Full Ramadan UX (auto-prompt push, training slot picker, hydration window
 * remap, suhoor/iftar countdown notifications) is deferred to build 1108 —
 * see RAMADAN_MODE_SPEC.md.
 */

export function isRamadanModeOn(profile: any): boolean {
  return !!profile?.ramadan_mode
}

/** Inject this whenever building a meal plan prompt. Empty string when off. */
export function ramadanBlock(profile: any): string {
  if (!isRamadanModeOn(profile)) return ''
  const iftar = profile.iftar_time || '18:30'
  const suhoor = profile.suhoor_time || '03:30'
  return `

????????????????????????????
RAMADAN MODE — NON-NEGOTIABLE
????????????????????????????
The client is fasting from before dawn (Fajr / before suhoor at ${suhoor}) until
sunset (Maghrib / iftar at ${iftar}). NO food or water is consumed in between.
Build the entire nutrition plan around this window, NOT wake/sleep.

Meal structure (override the standard 3–4 meals/day timing):
1. IFTAR (sunset, at ${iftar}) — the main meal. Open with dates + water, then
   soup/salad, then main. ~50–55% of daily calories. Protein and fluids priority.
2. SUHOOR (pre-dawn, at ${suhoor}) — slow-digesting: complex carbs, lean protein,
   healthy fats, high-satiety foods (oats, eggs, ful medames, yogurt, dates).
   ~35–40% of daily calories. Hydrate heavily here.
3. OPTIONAL SNACK between iftar and sleep — remaining calories, protein-leaning
   (Greek yogurt, fruit, nuts). Skip if calorie budget is met by iftar + suhoor.

Hydration: target ${profile.water_l || '2.5'} L spread ONLY across the eating
window (iftar → suhoor). NEVER suggest fluids during fasting hours.

Calorie strategy: maintenance or mild deficit only — no aggressive cut while
fasting. Protein floor unchanged. Explain this to the user once in the plan
notes ("during Ramadan we prioritise preserving muscle over fat-loss speed").

Cultural foods are normal and good:
- Suhoor: ful medames, eggs, yogurt, oats, dates, whole-grain bread, labneh
- Iftar opening: dates + water (sunnah), lentil soup, fattoush/tabbouleh
- Iftar main: kabsa, mansaf, mahshi, grilled meats, koshary (portion-controlled)
- Avoid recommending heavy fried foods (samosa, sambousek) as primary protein
  sources — they fit as small accents only

DO NOT:
- Schedule meals during fasting hours
- Suggest water/coffee during fasting
- Override the user's iftar/suhoor times — use them as authoritative
- Treat Ramadan as a "diet break" — it's a different eating pattern, not a pause`
}

/** Compact one-liner for Ion's chat system prompt. */
export function ramadanChatContext(profile: any): string {
  if (!isRamadanModeOn(profile)) return ''
  const iftar = profile.iftar_time || '18:30'
  const suhoor = profile.suhoor_time || '03:30'
  return `
RAMADAN CONTEXT: The client is fasting (suhoor ${suhoor}, iftar ${iftar}).
- Plan nutrition around iftar + suhoor, NEVER suggest daytime food or fluids.
- Open every conversation with "Ramadan Kareem" if it's the first message of the day.
- For training questions, recommend post-iftar (1.5-2h after) as default; mention
  pre-iftar (reduced volume) and post-taraweeh (late night) as options.
- Calorie targets stay the same, just redistributed across the eating window.`
}
