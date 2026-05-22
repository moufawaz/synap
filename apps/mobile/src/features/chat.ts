import { apiFetch } from '@/lib/api'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'ion'
  content: string
  message_type: string
  metadata?: Record<string, unknown> | null
  created_at: string
}

export type ChatHistoryResponse = {
  profile: { gender?: 'male' | 'female' } | null
  messages: ChatMessage[]
  activeWorkoutPlan: { created_at: string } | null
  usage: { used: number; limit: number; plan: string }
}

export type ChatSendResponse = {
  reply: string
  message_type: string
  plan_edit: { type: 'workout' | 'diet'; summary: string } | null
}

export async function getChatHistory(limit = 120) {
  return apiFetch<ChatHistoryResponse>(`/api/chat?limit=${limit}`)
}

export async function sendChatMessage(message: string) {
  return apiFetch<ChatSendResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, stream: false }),
  })
}
