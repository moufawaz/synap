'use client'

// ── Curated exercise → YouTube video ID map ──────────────────
// Shared across workout/page.tsx, workout/today/page.tsx, plan/page.tsx, chat, etc.
export const YOUTUBE_IDS: Record<string, string> = {
  // Chest
  'bench press': 'rT7DgCr-3pg',
  'chest press': 'rT7DgCr-3pg',
  'incline bench press': 'DbFgADa2PL8',
  'incline press': 'DbFgADa2PL8',
  'decline bench press': 'LfyQTdG13eU',
  'decline press': 'LfyQTdG13eU',
  'push up': '_l3ySVKYVJ8',
  'push-up': '_l3ySVKYVJ8',
  'pushup': '_l3ySVKYVJ8',
  'chest fly': 'eozdVDA78K0',
  'dumbbell fly': 'eozdVDA78K0',
  'cable fly': 'Iwe6AmxVf7o',
  'pec deck': 'Iwe6AmxVf7o',
  'chest dip': '2z8JmcrW-As',
  // Back
  'pull up': 'eGo4IYlbE5g',
  'pull-up': 'eGo4IYlbE5g',
  'pullup': 'eGo4IYlbE5g',
  'chin up': 'eGo4IYlbE5g',
  'chin-up': 'eGo4IYlbE5g',
  'deadlift': 'op9kVnSso6Q',
  'romanian deadlift': 'JCXUYuzwNrM',
  'rdl': 'JCXUYuzwNrM',
  'stiff leg deadlift': 'JCXUYuzwNrM',
  'barbell row': 'kBWAon7ItDw',
  'bent over row': 'kBWAon7ItDw',
  'bent-over row': 'kBWAon7ItDw',
  'dumbbell row': 'pYcpY20QaE8',
  'one arm row': 'pYcpY20QaE8',
  'lat pulldown': 'CAwf7n6Luuc',
  'cable row': 'GZbfZ033f74',
  'seated row': 'GZbfZ033f74',
  't-bar row': 'KDEl3MrezQE',
  'face pull': 'rep-qVOkqgk',
  'hyperextension': 'ph3pMpfD6Mk',
  'back extension': 'ph3pMpfD6Mk',
  // Shoulders
  'overhead press': 'QAQ64hK4d00',
  'shoulder press': 'qEwKCR5JCog',
  'military press': 'QAQ64hK4d00',
  'ohp': 'QAQ64hK4d00',
  'lateral raise': '3VcKaXpzqRo',
  'side lateral': '3VcKaXpzqRo',
  'side raise': '3VcKaXpzqRo',
  'front raise': 'gVDqkSEJnk4',
  'arnold press': '6Z15_WdXmVw',
  'upright row': 'VcGxJVQm1mU',
  'shrug': 'TE8JILCS4i0',
  'rear delt fly': 'EA7u4Q_8HQ0',
  'rear delt raise': 'EA7u4Q_8HQ0',
  'cable lateral': '3VcKaXpzqRo',
  // Biceps
  'dumbbell curl': 'ykJmrZ5v0Oo',
  'barbell curl': 'kwG2ipFRgfo',
  'bicep curl': 'kwG2ipFRgfo',
  'biceps curl': 'kwG2ipFRgfo',
  'hammer curl': 'zC3nLlEvin4',
  'preacher curl': 'fIWP-FRFNU0',
  'concentration curl': '0AUJ7oSVS-s',
  'incline curl': 'soxrZlIl35U',
  'cable curl': 'NFzTWp2qpiE',
  'ez bar curl': 'kwG2ipFRgfo',
  // Triceps
  'tricep dip': '0326dy_-CzM',
  'dip': '0326dy_-CzM',
  'tricep pushdown': 'vB5OHsJ3EME',
  'triceps pushdown': 'vB5OHsJ3EME',
  'cable pushdown': 'vB5OHsJ3EME',
  'pushdown': 'vB5OHsJ3EME',
  'skull crusher': 'd_KpSHiZOl0',
  'lying tricep extension': 'd_KpSHiZOl0',
  'overhead tricep extension': 'YbX7Wd8jQ-Q',
  'tricep extension': 'YbX7Wd8jQ-Q',
  'close grip bench': 'nEF0bv2FW7s',
  'diamond push': 'J0DnG1_S92I',
  'tricep kickback': '6SS6K3lAwZ8',
  'rope pushdown': 'vB5OHsJ3EME',
  // Legs
  'squat': 'ultWZbUMPL8',
  'back squat': 'ultWZbUMPL8',
  'front squat': 'uYumuL_G_V0',
  'goblet squat': 'MxsFDhcyFyE',
  'sumo squat': 'MxsFDhcyFyE',
  'leg press': 'IZxyjW7MPJQ',
  'lunge': 'QOVaHwm-Q6U',
  'walking lunge': 'L8fvypPrzzs',
  'reverse lunge': 'xrjCHIKdLfA',
  'bulgarian split squat': 'HRam-4iqsfw',
  'split squat': 'HRam-4iqsfw',
  'leg extension': 'ljO4jkwv8AA',
  'leg curl': 'Orxowest56U',
  'hamstring curl': 'Orxowest56U',
  'lying leg curl': 'Orxowest56U',
  'calf raise': 'gwLzBJYoWlQ',
  'standing calf raise': 'gwLzBJYoWlQ',
  'seated calf raise': 'gwLzBJYoWlQ',
  'hip thrust': 'LM8XfLVEJY0',
  'glute bridge': 'wPM8icPu6H8',
  'sumo deadlift': 'ql_4M3G0Flg',
  'hack squat': 'bD9jT5k2Q2s',
  'good morning': 'M_EjpB_hDWA',
  'sissy squat': 'ZbBYdwH_GBo',
  'step up': 'Vu2fON1dPyYI',
  'box squat': 'ultWZbUMPL8',
  // Core
  'plank': 'ASdvN_XEl_c',
  'crunch': 'Xyd_fa5zoEU',
  'sit up': 'iFpIoSGTCiU',
  'situp': 'iFpIoSGTCiU',
  'ab rollout': 'jbd4L-iVRAY',
  'ab wheel': 'jbd4L-iVRAY',
  'russian twist': '_oEJYT13RoU',
  'hanging leg raise': 'Pr1ieGZ5atk',
  'leg raise': 'Pr1ieGZ5atk',
  'cable crunch': 'taI4XduLpTk',
  'mountain climber': 'nmwgirgXLYM',
  'bicycle crunch': '9FGilxCbdz8',
  'dead bug': 'tIlbMpHMULo',
  'wood chop': 'WrBh-1bG2M4',
  'pallof press': 'j0Y0RaK63sE',
  // Cardio / Compound
  'burpee': 'dZgVxmf6jkA',
  'jumping jack': 'c4DAnQ6DtF8',
  'box jump': 'hxldG9CXBas',
  'kettlebell swing': 'YSxHifyI6s8',
  'battle rope': '6tHPs0TGjvA',
  'jump rope': 'FJmRQ5iTXKE',
  'high knee': 'pMDJFtEFRcE',
  'jump squat': 'U4s4mEQ5VIU',
}

// ── Fuzzy-match exercise name → YouTube ID ────────────────────
export function getYouTubeId(name: string): string | null {
  const lower = name.toLowerCase()
  // Exact match first
  if (YOUTUBE_IDS[lower]) return YOUTUBE_IDS[lower]
  // Substring match
  for (const [key, id] of Object.entries(YOUTUBE_IDS)) {
    if (lower.includes(key) || key.includes(lower)) return id
  }
  return null
}

// ── YouTube search URL fallback ───────────────────────────────
export function getSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' exercise tutorial proper form')}`
}
