import { getYouTubeId } from '@/lib/exercises'
import { primaryVideoSearchTarget } from '@/lib/exercise-video-targets'

const videoCache = new Map<string, string | null>()
const validationCache = new Map<string, boolean>()

export async function resolveExerciseVideo(name: string, currentVideoId?: string | null): Promise<string | null> {
  if (currentVideoId && /^[a-zA-Z0-9_-]{11}$/.test(currentVideoId)) return currentVideoId

  const searchName = primaryVideoSearchTarget(name)
  if (!searchName) return null

  const staticId = getYouTubeId(searchName)
  if (staticId) return staticId

  const key = searchName.toLowerCase().trim()
  if (videoCache.has(key)) return videoCache.get(key) ?? null

  const id = await searchYouTube(key)
  videoCache.set(key, id)
  return id
}

export async function isEmbeddableVideo(videoId: string): Promise<boolean> {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return false
  if (validationCache.has(videoId)) return validationCache.get(videoId) ?? false

  const publicOk = await fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
  )
    .then(r => r.ok)
    .catch(() => false)

  if (!publicOk) {
    validationCache.set(videoId, false)
    return false
  }

  const embedOk = await fetch(`https://www.youtube-nocookie.com/embed/${videoId}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })
    .then(async r => {
      if (!r.ok) return false
      const html = await r.text()
      return !/Video unavailable|This video is unavailable|player-unavailable/i.test(html)
    })
    .catch(() => false)

  validationCache.set(videoId, embedOk)
  return embedOk
}

async function searchYouTube(exerciseName: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`${exerciseName} exercise tutorial proper form`)
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${query}&sp=EgIQAQ%3D%3D`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }
    )
    if (!res.ok) return null

    const html = await res.text()
    const candidates = extractVideoCandidates(html)
      .map(candidate => ({
        ...candidate,
        score: scoreVideoCandidate(exerciseName, candidate.title),
      }))
      .filter(candidate => candidate.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)

    for (const candidate of candidates) {
      if (await isEmbeddableVideo(candidate.id)) return candidate.id
    }

    return candidates[0]?.id ?? null
  } catch {
    return null
  }
}

function extractVideoCandidates(html: string): Array<{ id: string; title: string }> {
  const data = parseYouTubeInitialData(html)
  const fromJson = data ? collectVideoRenderers(data) : []
  if (fromJson.length > 0) return uniqueCandidates(fromJson)

  const fallback: Array<{ id: string; title: string }> = []
  const re = /"videoId":"([a-zA-Z0-9_-]{11})"[\s\S]{0,700}?"title":\{"runs":\[\{"text":"([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    fallback.push({ id: m[1], title: decodeJsonText(m[2]) })
    if (fallback.length >= 12) break
  }
  return uniqueCandidates(fallback)
}

function parseYouTubeInitialData(html: string): any | null {
  const marker = 'var ytInitialData = '
  const start = html.indexOf(marker)
  if (start === -1) return null

  const jsonStart = html.indexOf('{', start)
  if (jsonStart === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = jsonStart; i < html.length; i++) {
    const char = html[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (char === '{') depth++
    if (char === '}') depth--
    if (depth === 0) {
      try {
        return JSON.parse(html.slice(jsonStart, i + 1))
      } catch {
        return null
      }
    }
  }

  return null
}

function collectVideoRenderers(node: any): Array<{ id: string; title: string }> {
  const found: Array<{ id: string; title: string }> = []

  const visit = (value: any) => {
    if (!value || typeof value !== 'object') return

    if (value.videoRenderer?.videoId) {
      const renderer = value.videoRenderer
      const title =
        renderer.title?.runs?.map((run: any) => run.text).join('') ||
        renderer.title?.simpleText ||
        ''
      found.push({ id: renderer.videoId, title })
    }

    for (const child of Object.values(value)) visit(child)
  }

  visit(node)
  return found
}

function uniqueCandidates(candidates: Array<{ id: string; title: string }>) {
  const seen = new Set<string>()
  return candidates.filter(candidate => {
    if (!/^[a-zA-Z0-9_-]{11}$/.test(candidate.id) || seen.has(candidate.id)) return false
    seen.add(candidate.id)
    return true
  })
}

function scoreVideoCandidate(exerciseName: string, title: string): number {
  const exerciseTokens = meaningfulTokens(exerciseName)
  const titleTokens = meaningfulTokens(title)
  if (exerciseTokens.length === 0 || titleTokens.length === 0) return 0

  const titleText = normalizeText(title)
  const exactPhrase = titleText.includes(normalizeText(exerciseName)) ? 4 : 0
  const matched = exerciseTokens.filter(token => titleTokens.includes(token)).length
  const exerciseCoverage = matched / exerciseTokens.length
  const tutorialSignal = /\b(exercise|tutorial|proper|form|how|guide|demonstration|demo)\b/.test(titleText) ? 2 : 0
  const noisePenalty = /\b(motivation|compilation|fail|funny|reaction|shorts|prank)\b/.test(titleText) ? 3 : 0

  return exactPhrase + exerciseCoverage * 10 + tutorialSignal - noisePenalty
}

function meaningfulTokens(value: string) {
  const stop = new Set(['the', 'and', 'or', 'with', 'for', 'a', 'an', 'proper', 'form', 'exercise', 'tutorial', 'how', 'to'])
  return normalizeText(value)
    .split(' ')
    .filter(token => token.length > 2 && !stop.has(token))
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function decodeJsonText(value: string) {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`)
  } catch {
    return value
  }
}
