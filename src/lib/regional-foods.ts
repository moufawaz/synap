/**
 * Regional food intelligence — Gulf, Egyptian, and Levantine dishes with
 * realistic local portions and macros. Injected into every food-related AI
 * prompt (plan generation, chat, eating-out, photo scan, name estimates) so
 * Ion "actually knows your food" — the differentiator generic English-first
 * apps get wrong.
 *
 * Macros are per the stated typical serving (not per 100g), based on common
 * home/restaurant preparations. The model may adjust ±15% for visible portion
 * or preparation differences.
 */

const DISH_TABLE = `
GULF / SAUDI (per typical serving)
- Kabsa / كبسة (chicken, 1 plate ~450g): 750 kcal, P45 C85 F25
- Mandi / مندي (lamb, 1 plate ~450g): 820 kcal, P48 C80 F32
- Jareesh / جريش (1 bowl ~300g): 380 kcal, P18 C55 F10
- Saleeg / سليق (1 plate ~400g): 560 kcal, P30 C70 F18
- Harees / هريس (1 bowl ~300g): 350 kcal, P20 C45 F10
- Mathloutha / مثلوثة (1 plate ~450g): 800 kcal, P40 C95 F28
- Margoog / مرقوق (1 bowl ~350g): 420 kcal, P25 C55 F12
- Mutabbaq / مطبق (1 piece savoury): 320 kcal, P12 C35 F15
- Shawarma sandwich / شاورما (chicken, 1 wrap ~250g): 470 kcal, P28 C45 F19
- Shawarma plate / صحن شاورما (~350g + garlic sauce): 700 kcal, P42 C50 F35
- Tamees bread / تميس (1/2 piece ~150g): 400 kcal, P11 C75 F6
- Dates / تمر (3 pieces sukkari): 200 kcal, P1 C54 F0

EGYPTIAN (per typical serving)
- Koshary / كشري (medium plate ~400g): 780 kcal, P20 C140 F15
- Ful medames / فول مدمس (1 bowl ~250g + oil): 310 kcal, P17 C40 F10
- Ta'meya (Egyptian falafel) / طعمية (3 pieces): 270 kcal, P10 C24 F15
- Molokhia / ملوخية (1 bowl ~250g with broth): 180 kcal, P8 C12 F11
- Mahshi / محشي (4 pieces stuffed vegetables): 380 kcal, P9 C55 F14
- Hawawshi / حواوشي (1 piece ~300g): 620 kcal, P30 C50 F33
- Feteer meshaltet / فطير مشلتت (1/4 piece, plain): 520 kcal, P9 C55 F29
- Roz me'ammar / أرز معمر (1 cup ~250g): 450 kcal, P10 C55 F21
- Kofta / كفتة (grilled, 3 fingers ~180g): 420 kcal, P32 C5 F30
- Bamia stew / بامية (1 bowl ~300g with meat): 320 kcal, P22 C18 F18
- Besarah / بصارة (1 bowl ~250g): 260 kcal, P14 C35 F7
- Baladi bread / عيش بلدي (1 loaf ~90g, whole wheat): 230 kcal, P8 C47 F1

LEVANTINE / SHARED (per typical serving)
- Hummus / حمص (3 tbsp ~100g): 170 kcal, P7 C14 F10
- Tabbouleh / تبولة (1 cup ~150g): 180 kcal, P3 C20 F10
- Fattoush / فتوش (1 bowl ~200g): 220 kcal, P4 C24 F12
- Shish tawook / شيش طاووق (skewers ~200g): 330 kcal, P42 C6 F15
- Grilled kofta kebab / كباب (~200g): 460 kcal, P34 C4 F34
- Manakish za'atar / مناقيش زعتر (1 piece): 350 kcal, P9 C45 F15
- Kibbeh / كبة (2 fried pieces): 360 kcal, P14 C28 F21
- Warak enab / ورق عنب (6 pieces): 210 kcal, P4 C30 F8
- Mansaf / منسف (1 plate ~450g): 850 kcal, P50 C75 F38
- Maqluba / مقلوبة (1 plate ~400g): 620 kcal, P30 C75 F22`

/**
 * Prompt block for food-related AI calls. Keep it appended near the nutrition
 * rules of the prompt it joins.
 */
export function regionalFoodIntelligence(): string {
  return `
REGIONAL FOOD INTELLIGENCE (Gulf, Egyptian, Levantine):
You know Middle Eastern cuisine deeply — use this curated reference for realistic
local dishes and portions instead of generic Western databases:
${DISH_TABLE}

Rules:
- When the user's loved foods, locale, or language suggest Gulf/Egyptian/Levantine
  eating, BUILD MEALS AROUND THESE REAL DISHES (with healthier preparations and
  portion control) — not generic "grilled chicken and rice" templates.
- Use the dish's local name in the user's language plus realistic local portions.
- These dishes can absolutely fit fat-loss or muscle-gain targets — adjust the
  portion and sides rather than banning cultural foods. Say so when relevant.
- For mixed plates (e.g. kabsa, koshary, mansaf), estimate from the table and
  scale by visible/stated portion; flag estimates as estimates.
- Friday family meals, gatherings, and Ramadan eating patterns are normal — plan
  with them, never against them.`
}
