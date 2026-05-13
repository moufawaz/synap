import { createAdminClient, createServerClient } from '@/lib/supabase-server'
import { getAnthropicClient, withAnthropicRetry } from '@/lib/anthropic'
import { recordAiUsage } from '@/lib/ai-usage'
import { normalizeAiLanguage } from '@/lib/ai-language'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

type LocalizeResult = {
  diet_plan: boolean
  workout_plan: boolean
  messages: number
}

export async function POST() {
  const server = await createServerClient()
  const { data: { user }, error: authError } = await server.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const [profileRes, userLangRes] = await Promise.all([
    admin.from('profiles').select('language').eq('user_id', user.id).maybeSingle(),
    admin.from('users').select('language').eq('id', user.id).maybeSingle(),
  ])
  const language = normalizeAiLanguage(userLangRes.data?.language ?? profileRes.data?.language)
  if (language !== 'ar') {
    return NextResponse.json({ error: 'Arabic language must be selected first.' }, { status: 400 })
  }

  const result: LocalizeResult = { diet_plan: false, workout_plan: false, messages: 0 }
  const client = getAnthropicClient()

  const [dietRes, workoutRes, messagesRes] = await Promise.all([
    admin.from('diet_plans').select('id, plan_json').eq('user_id', user.id).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('workout_plans').select('id, plan_json').eq('user_id', user.id).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('chat_messages')
      .select('id, content, role')
      .eq('user_id', user.id)
      .in('role', ['assistant', 'ion'])
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (dietRes.data?.plan_json) {
    const localized = await localizeJson(client, user.id, 'localize_active_diet_plan', dietRes.data.plan_json, 'diet plan')
    if (localized) {
      const { error } = await admin.from('diet_plans').update({ plan_json: localized }).eq('id', dietRes.data.id)
      if (!error) result.diet_plan = true
    }
  }

  if (workoutRes.data?.plan_json) {
    const localized = await localizeJson(client, user.id, 'localize_active_workout_plan', workoutRes.data.plan_json, 'workout plan')
    if (localized) {
      const { error } = await admin.from('workout_plans').update({ plan_json: localized }).eq('id', workoutRes.data.id)
      if (!error) result.workout_plan = true
    }
  }

  const assistantMessages = (messagesRes.data ?? []).filter((message: any) => {
    const content = String(message.content ?? '').trim()
    return content && !/[\u0600-\u06FF]/.test(content)
  })

  if (assistantMessages.length > 0) {
    const localizedMessages = await localizeMessages(client, user.id, assistantMessages)
    for (const item of localizedMessages) {
      if (!item?.id || !item?.content) continue
      const { error } = await admin
        .from('chat_messages')
        .update({ content: String(item.content) })
        .eq('id', item.id)
        .eq('user_id', user.id)
      if (!error) result.messages += 1
    }
  }

  return NextResponse.json({ ok: true, result })
}

async function localizeJson(
  client: ReturnType<typeof getAnthropicClient>,
  userId: string,
  feature: string,
  json: any,
  label: string,
) {
  const response = await withAnthropicRetry(() => client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 12000,
    system: [
      'You translate stored SYNAP coaching content to Arabic.',
      'Return ONLY valid JSON.',
      'Preserve the exact JSON structure and all keys.',
      'Translate only user-facing string values.',
      'Keep numbers, IDs, URLs, video_id values, enum-like machine values, dates, and units structurally valid.',
      'Do not add, remove, or reorder required fields.',
    ].join(' '),
    messages: [{
      role: 'user',
      content: `Translate this active ${label} to natural Arabic for the app UI. JSON keys must stay unchanged.\n\n${JSON.stringify(json, null, 2)}`,
    }],
  }))
  await recordAiUsage({ userId, feature, model: response.model, usage: response.usage })

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
  return parseJsonObject(raw)
}

async function localizeMessages(
  client: ReturnType<typeof getAnthropicClient>,
  userId: string,
  messages: Array<{ id: string; content: string }>,
) {
  const response = await withAnthropicRetry(() => client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 6000,
    system: [
      'Translate SYNAP assistant chat messages to Arabic.',
      'Return ONLY valid JSON.',
      'Preserve each id exactly.',
      'Translate content naturally as Ion, keeping the same meaning and coaching tone.',
    ].join(' '),
    messages: [{
      role: 'user',
      content: `Translate these messages to Arabic. Return {"messages":[{"id":"same id","content":"Arabic translation"}]}.\n\n${JSON.stringify({ messages }, null, 2)}`,
    }],
  }))
  await recordAiUsage({ userId, feature: 'localize_chat_messages', model: response.model, usage: response.usage })

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
  const parsed = parseJsonObject(raw)
  return Array.isArray(parsed?.messages) ? parsed.messages : []
}

function parseJsonObject(raw: string): any | null {
  try {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    return JSON.parse(match ? match[0] : cleaned)
  } catch {
    return null
  }
}
