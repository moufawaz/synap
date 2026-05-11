export type AiLanguage = 'en' | 'ar'

export function normalizeAiLanguage(value: unknown): AiLanguage {
  return value === 'ar' ? 'ar' : 'en'
}

export function aiLanguageName(language: AiLanguage) {
  return language === 'ar' ? 'Arabic' : 'English'
}

export function aiLanguageInstruction(language: AiLanguage, scope = 'all user-facing text') {
  if (language === 'ar') {
    return [
      `LANGUAGE REQUIREMENT: Write ${scope} fully in Arabic.`,
      'Keep JSON keys, enum values, IDs, dates, numbers, URLs, video IDs, and database identifiers unchanged.',
      'Do not mix English except for proper nouns, brand names, product names, exercise names that are commonly known in English, or user-provided text that should remain literal.',
    ].join(' ')
  }

  return [
    `LANGUAGE REQUIREMENT: Write ${scope} in English.`,
    'Keep JSON keys, enum values, IDs, dates, numbers, URLs, video IDs, and database identifiers unchanged.',
  ].join(' ')
}
