import { useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { Card } from '@/components/Card'
import { IonAvatar } from '@/components/IonAvatar'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { ChatMessage, ChatHistoryResponse, getChatHistory, sendChatMessage } from '@/features/chat'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

const PLAN_MODIFY_WINDOW_DAYS = 30

const QUICK_PROMPTS_EN = [
  "How am I progressing?",
  "Adjust my calories",
  "I missed a workout",
  "Explain my workout split",
  "Best time to take protein?",
  "I want to change my goal",
  "I'm feeling sore",
  "Feeling tired lately",
]

const QUICK_PROMPTS_AR = [
  'كيف أتقدم؟',
  'عدّل سعراتي',
  'فاتني تمرين',
  'اشرح تقسيم التمرين',
  'أفضل وقت للبروتين؟',
  'أريد تغيير هدفي',
  'أشعر بآلام عضلية',
  'أشعر بالتعب',
]

// ── Helpers ──────────────────────────────────────────────

function displayChatContent(content: string) {
  const cleaned = String(content || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    const match = cleaned.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(match ? match[0] : cleaned)
    const text =
      (typeof parsed?.message === 'string' && parsed.message.trim()) ||
      (typeof parsed?.reply === 'string' && parsed.reply.trim()) ||
      (typeof parsed?.content === 'string' && parsed.content.trim()) ||
      (typeof parsed?.text === 'string' && parsed.text.trim()) ||
      ''
    if (text) return text
    // Structured message whose text lives in a list (e.g. a suggestion payload).
    // Render those lines instead of an empty bubble.
    const list = parsed?.suggestions ?? parsed?.items ?? parsed?.options
    if (Array.isArray(list)) {
      const joined = list.filter((s: any) => typeof s === 'string' && s.trim()).join('\n')
      if (joined.trim()) return joined.trim()
    }
    // Parsed as JSON but nothing displayable — return empty so the caller can
    // drop the bubble rather than show an empty box or raw JSON.
    return ''
  } catch {}
  return cleaned
}

function msgTime(m: ChatMessage): number {
  const t = m.created_at ? new Date(m.created_at).getTime() : Number(m.id)
  return Number.isFinite(t) ? t : Date.now()
}

function sameDay(a: number, b: number) {
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

interface ChatSession {
  id: string
  title: string
  dateLabel: string
  timeLabel: string
  messages: ChatMessage[]
}

function buildChatSessions(messages: ChatMessage[], isRtl: boolean): ChatSession[] {
  const sorted = [...messages].sort((a, b) => msgTime(a) - msgTime(b))
  const sessions: ChatSession[] = []
  const gapMs = 1000 * 60 * 90

  for (const message of sorted) {
    const time = msgTime(message)
    const last = sessions[sessions.length - 1]
    const lastMsg = last?.messages[last.messages.length - 1]
    const shouldStart = !last || !lastMsg || !sameDay(time, msgTime(lastMsg)) || time - msgTime(lastMsg) > gapMs

    if (shouldStart) {
      const date = new Date(time)
      const today = new Date()
      const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
      let dateLabel: string
      if (sameDay(time, today.getTime())) dateLabel = isRtl ? 'اليوم' : 'Today'
      else if (sameDay(time, yesterday.getTime())) dateLabel = isRtl ? 'أمس' : 'Yesterday'
      else dateLabel = date.toLocaleDateString(isRtl ? 'ar' : 'en', { month: 'short', day: 'numeric' })

      const raw = displayChatContent(message.content).replace(/\s+/g, ' ').trim()
      const title = raw ? (raw.length > 48 ? `${raw.slice(0, 48)}…` : raw) : (isRtl ? 'جلسة آيون' : 'Ion session')

      sessions.push({
        id: message.created_at || message.id,
        title,
        dateLabel,
        timeLabel: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        messages: [message],
      })
    } else {
      last.messages.push(message)
    }
  }

  return sessions.reverse()
}

// ── Rich Message Bubble ───────────────────────────────────

type MsgType = 'text' | 'suggestion' | 'workout_card' | 'meal_card' | 'milestone' | 'alert' | 'new_plan' | 'plan_proposal' | 'renewal_preview'

function MessageBubble({
  item,
  color,
  isRtl,
  onPrompt,
}: {
  item: ChatMessage
  color: any
  isRtl: boolean
  onPrompt: (t: string) => void
}) {
  const isUser = item.role === 'user'
  const type = (item.message_type || 'text') as MsgType
  const content = displayChatContent(item.content)

  if (isUser) {
    return (
      <View style={[styles.messageRow, isRtl ? styles.ionRow : styles.userRow]}>
        <View style={[styles.bubble, { backgroundColor: color.sparkSoft, borderColor: color.spark, maxWidth: '88%' }]}>
          <Text style={[styles.bubbleText, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>{content}</Text>
        </View>
      </View>
    )
  }

  // Ion message styling by type
  const typeConfig: Record<MsgType, { bg: string; border: string; iconName: string; iconColor: string; label: string }> = {
    text:            { bg: color.surface,          border: color.border,         iconName: '',         iconColor: '',            label: '' },
    suggestion:      { bg: `${color.spark}0A`,     border: `${color.spark}33`,   iconName: 'zap',      iconColor: color.sparkLight, label: 'Suggestion' },
    workout_card:    { bg: `${color.spark}07`,     border: `${color.spark}33`,   iconName: 'activity', iconColor: color.spark,    label: 'Workout Update' },
    meal_card:       { bg: `${color.pulse}07`,     border: `${color.pulse}33`,   iconName: 'coffee',   iconColor: color.pulse,    label: 'Nutrition' },
    milestone:       { bg: `${color.flame}08`,     border: `${color.flame}40`,   iconName: 'award',    iconColor: color.flame,    label: 'Milestone' },
    alert:           { bg: `${color.danger}08`,    border: `${color.danger}33`,  iconName: 'alert-circle', iconColor: color.danger, label: 'Alert' },
    new_plan:        { bg: `${color.spark}0D`,     border: `${color.spark}4D`,   iconName: 'trending-up',  iconColor: color.sparkLight, label: 'New Plan' },
    plan_proposal:   { bg: `${color.flame}0A`,     border: `${color.flame}47`,   iconName: 'zap',      iconColor: color.flame,    label: 'Proposed Change' },
    renewal_preview: { bg: '#3B82F610',            border: '#3B82F640',          iconName: 'trending-up',  iconColor: '#60A5FA',  label: 'Renewal Preview' },
  }

  const cfg = typeConfig[type] ?? typeConfig.text
  const isCard = type !== 'text'

  return (
    <View style={[styles.messageRow, styles.ionRow]}>
      <IonAvatar size="sm" showStatus={false} />
      <View style={[styles.bubble, { backgroundColor: cfg.bg, borderColor: cfg.border, maxWidth: '88%' }]}>
        {isCard && cfg.iconName ? (
          <View style={[styles.cardLabel, { borderBottomColor: cfg.border }]}>
            <Feather name={cfg.iconName as any} size={12} color={cfg.iconColor} />
            <Text style={[styles.cardLabelText, { color: color.dim }]}>{cfg.label.toUpperCase()}</Text>
          </View>
        ) : null}

        <Text style={[styles.bubbleText, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>{content}</Text>

        {/* Context-aware action buttons */}
        {type === 'alert' ? (
          <View style={styles.actionRow}>
            <Pressable onPress={() => onPrompt('Help me fix this')} style={[styles.actionBtn, { backgroundColor: `${color.danger}1A`, borderColor: `${color.danger}33` }]}>
              <Text style={[styles.actionBtnText, { color: '#FCA5A5' }]}>{isRtl ? 'ساعدني في الإصلاح' : 'Help me fix this'}</Text>
            </Pressable>
            <Pressable onPress={() => onPrompt("What should I change?")} style={[styles.actionBtn, { backgroundColor: color.elevated, borderColor: color.border }]}>
              <Text style={[styles.actionBtnText, { color: color.muted }]}>{isRtl ? 'ماذا أغير؟' : 'What to change?'}</Text>
            </Pressable>
          </View>
        ) : null}

        {type === 'milestone' ? (
          <View style={styles.actionRow}>
            <Pressable onPress={() => onPrompt("What's next for me?")} style={[styles.actionBtn, { backgroundColor: `${color.flame}1A`, borderColor: `${color.flame}33` }]}>
              <Text style={[styles.actionBtnText, { color: '#FCD34D' }]}>{isRtl ? 'ما التالي؟' : "What's next?"}</Text>
            </Pressable>
          </View>
        ) : null}

        {type === 'new_plan' ? (
          <View style={styles.actionRow}>
            <Pressable onPress={() => router.push('/plan')} style={[styles.actionBtn, { backgroundColor: `${color.spark}26`, borderColor: `${color.spark}33` }]}>
              <Text style={[styles.actionBtnText, { color: color.sparkLight }]}>{isRtl ? 'عرض الخطة الجديدة' : 'View New Plan'}</Text>
            </Pressable>
          </View>
        ) : null}

        {type === 'renewal_preview' ? (
          <View style={styles.actionRow}>
            <Pressable onPress={() => router.push('/plan')} style={[styles.actionBtn, { backgroundColor: '#3B82F626', borderColor: '#3B82F640' }]}>
              <Text style={[styles.actionBtnText, { color: '#93C5FD' }]}>{isRtl ? 'راجع التجديد' : 'Review Renewal'}</Text>
            </Pressable>
          </View>
        ) : null}

        {type === 'meal_card' ? (
          <View style={styles.actionRow}>
            <Pressable onPress={() => router.push('/nutrition')} style={[styles.actionBtn, { backgroundColor: `${color.pulse}1A`, borderColor: `${color.pulse}33` }]}>
              <Text style={[styles.actionBtnText, { color: color.pulse }]}>{isRtl ? 'اذهب للتغذية' : 'Go to Nutrition'}</Text>
            </Pressable>
          </View>
        ) : null}

        {type === 'workout_card' ? (
          <View style={styles.actionRow}>
            <Pressable onPress={() => router.push('/train')} style={[styles.actionBtn, { backgroundColor: `${color.spark}1A`, borderColor: `${color.spark}33` }]}>
              <Text style={[styles.actionBtnText, { color: color.spark }]}>{isRtl ? 'اذهب للتمرين' : 'Go to Workout'}</Text>
            </Pressable>
          </View>
        ) : null}

        {type === 'plan_proposal' ? (
          <View style={styles.actionRow}>
            <Pressable onPress={() => onPrompt(isRtl ? 'نعم، طبق التغيير' : 'Yes, apply this change')} style={[styles.actionBtn, { backgroundColor: `${color.flame}2D`, borderColor: `${color.flame}59` }]}>
              <Text style={[styles.actionBtnText, { color: '#FCD34D' }]}>{isRtl ? '✓ طبق التغيير' : '✓ Apply Change'}</Text>
            </Pressable>
            <Pressable onPress={() => onPrompt(isRtl ? 'لا، اقترح شيئاً آخر' : 'No, suggest something else')} style={[styles.actionBtn, { backgroundColor: color.elevated, borderColor: color.border }]}>
              <Text style={[styles.actionBtnText, { color: color.muted }]}>{isRtl ? 'اقترح آخر' : 'Suggest other'}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Legacy plan_edit card (from metadata) */}
        {item.metadata?.plan_edit ? (
          <View style={[styles.planEditCard, { borderTopColor: color.spark }]}>
            <Text style={[styles.planEditTitle, { color: color.spark }]}>Plan change preview</Text>
            <Text style={[styles.bubbleText, { color: color.text }]}>{String((item.metadata.plan_edit as any).summary || 'Ion prepared a plan change.')}</Text>
            <View style={styles.actionRow}>
              <Pressable onPress={() => onPrompt('Confirm')} style={[styles.actionBtn, { borderColor: color.pulse }]}>
                <Text style={[styles.actionBtnText, { color: color.pulse }]}>Apply</Text>
              </Pressable>
              <Pressable onPress={() => onPrompt('No, cancel this change')} style={[styles.actionBtn, { borderColor: color.danger }]}>
                <Text style={[styles.actionBtnText, { color: color.danger }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  )
}

// ── Chat History Modal ────────────────────────────────────

function ChatHistoryModal({
  visible,
  sessions,
  selectedId,
  isRtl,
  color,
  onSelect,
  onAll,
  onClose,
}: {
  visible: boolean
  sessions: ChatSession[]
  selectedId: string | null
  isRtl: boolean
  color: any
  onSelect: (id: string) => void
  onAll: () => void
  onClose: () => void
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: color.bg }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: color.border }]}>
          <View>
            <Text style={[styles.modalEyebrow, { color: color.spark }]}>{isRtl ? 'سجل المحادثات' : 'Chat History'}</Text>
            <Text style={[styles.modalSub, { color: color.dim }]}>{isRtl ? 'حسب اليوم والجلسة' : 'By day and session'}</Text>
          </View>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: color.elevated, borderColor: color.border }]}>
            <Feather name="x" size={15} color={color.muted} />
          </Pressable>
        </View>

        {/* All history button */}
        <View style={[styles.modalSection, { borderBottomColor: color.border }]}>
          <Pressable
            onPress={onAll}
            style={[styles.sessionBtn, {
              backgroundColor: selectedId === null ? `${color.spark}24` : color.elevated,
              borderColor: selectedId === null ? `${color.spark}47` : color.border,
            }]}
          >
            <Text style={[styles.sessionBtnText, { color: selectedId === null ? color.sparkLight : color.text }]}>
              {isRtl ? 'كل المحادثة الحالية' : 'All current history'}
            </Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 8 }}>
          {sessions.length === 0 ? (
            <Text style={[styles.emptyText, { color: color.dim }]}>
              {isRtl ? 'لا توجد محادثات محفوظة بعد.' : 'No saved conversations yet.'}
            </Text>
          ) : sessions.map(session => (
            <Pressable
              key={session.id}
              onPress={() => onSelect(session.id)}
              style={[styles.sessionCard, {
                backgroundColor: selectedId === session.id ? `${color.spark}24` : color.surface,
                borderColor: selectedId === session.id ? `${color.spark}47` : color.border,
              }]}
            >
              <View style={styles.sessionMeta}>
                <Text style={[styles.sessionDate, { color: color.sparkLight }]}>{session.dateLabel}</Text>
                <Text style={[styles.sessionTime, { color: color.dim }]}>{session.timeLabel}</Text>
              </View>
              <Text style={[styles.sessionTitle, { color: color.text }]} numberOfLines={2}>{session.title}</Text>
              <Text style={[styles.sessionCount, { color: color.dim }]}>
                {session.messages.length} {isRtl ? 'رسائل' : session.messages.length === 1 ? 'message' : 'messages'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── Main Screen ───────────────────────────────────────────

export default function ChatScreen() {
  const { color } = useTheme()
  const { text, isRtl } = useLanguage()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const history = useAsyncData<ChatHistoryResponse>(() => getChatHistory(250), [])
  const allMessages = history.data?.messages ?? []
  const sessions = useMemo(() => buildChatSessions(allMessages, isRtl), [allMessages, isRtl])
  const selectedSession = selectedSessionId ? sessions.find(s => s.id === selectedSessionId) : null
  const visibleMessages = useMemo(() => {
    // Action cards (with buttons) and plan-edit messages stay even if their text
    // is short/empty; plain text + suggestion bubbles are dropped when they have
    // no displayable words, so the thread never shows an empty box.
    const actionTypes = new Set(['workout_card', 'meal_card', 'new_plan', 'plan_proposal', 'alert', 'milestone', 'renewal_preview'])
    const msgs = (selectedSession?.messages ?? allMessages).filter(m => {
      if (m.role === 'user') return true
      if (actionTypes.has(m.message_type)) return true
      if (m.metadata?.plan_edit) return true
      return displayChatContent(m.content).trim().length > 0
    })
    return [...msgs].reverse()
  }, [selectedSession, allMessages])

  const listRef = useRef<FlatList<ChatMessage>>(null)
  const quickPrompts = isRtl ? QUICK_PROMPTS_AR : QUICK_PROMPTS_EN

  // Plan modification window
  const planDaysLeft = useMemo(() => {
    const createdAt = history.data?.activeWorkoutPlan?.created_at
    if (!createdAt) return null
    const age = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
    const remaining = PLAN_MODIFY_WINDOW_DAYS - age
    return remaining > 0 ? remaining : 0
  }, [history.data])

  // Message usage
  const msgUsage = history.data?.usage ?? null
  const showUsage = msgUsage && msgUsage.plan === 'starter' && Number.isFinite(msgUsage.limit)
  const usageNearLimit = showUsage && msgUsage!.used >= msgUsage!.limit - 1

  async function handleSend(nextMessage?: string) {
    const trimmed = (nextMessage ?? message).trim()
    if (!trimmed || sending) return

    setSelectedSessionId(null)
    const optimisticUser: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      message_type: 'text',
      created_at: new Date().toISOString(),
    }
    setMessage('')
    history.setData(prev => prev ? { ...prev, messages: [...prev.messages, optimisticUser] } : prev)
    setSending(true)

    try {
      const result = await sendChatMessage(trimmed)
      const assistant: ChatMessage = {
        id: `local-ion-${Date.now()}`,
        role: 'assistant',
        content: result.reply,
        message_type: result.message_type,
        metadata: result.plan_edit ? { plan_edit: result.plan_edit } : null,
        created_at: new Date().toISOString(),
      }
      history.setData(prev => prev ? { ...prev, messages: [...prev.messages, assistant] } : prev)
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }))
    } catch (error: any) {
      Alert.alert('Ion', error?.message || 'Could not send message')
      await history.reload()
    } finally {
      setSending(false)
    }
  }

  function renderMessage({ item }: { item: ChatMessage }) {
    return (
      <MessageBubble
        item={item}
        color={color}
        isRtl={isRtl}
        onPrompt={handleSend}
      />
    )
  }

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 86 : 0}
        style={styles.root}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: color.border, backgroundColor: color.surface }]}>
          <Pressable
            onPress={() => setHistoryOpen(true)}
            style={[styles.headerIconBtn, { backgroundColor: color.elevated, borderColor: color.border }]}
          >
            <Feather name="clock" size={16} color={color.muted} />
          </Pressable>

          <IonAvatar size="md" />

          <View style={styles.headerText}>
            <PageHeader eyebrow="ION" title={text.chat} subtitle="" />
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => handleSend('Run my daily adaptation check')}
              style={[styles.checkinBtn, { backgroundColor: `${color.spark}1A`, borderColor: `${color.spark}33` }]}
            >
              <Feather name="zap" size={11} color={color.sparkLight} />
              <Text style={[styles.checkinText, { color: color.sparkLight }]}>{isRtl ? 'تحقق' : 'Check-in'}</Text>
            </Pressable>
            <Feather name="star" size={16} color={color.spark} />
          </View>
        </View>

        {/* Plan modification banner */}
        {planDaysLeft !== null ? (
          <View style={[styles.planBanner, {
            backgroundColor: planDaysLeft > 7 ? `${color.pulse}0F` : planDaysLeft > 0 ? `${color.flame}0F` : `${color.danger}0F`,
            borderBottomColor: planDaysLeft > 7 ? `${color.pulse}2E` : planDaysLeft > 0 ? `${color.flame}2E` : `${color.danger}2E`,
          }]}>
            <Feather
              name="clock"
              size={12}
              color={planDaysLeft > 7 ? color.pulse : planDaysLeft > 0 ? color.flame : color.danger}
            />
            <Text style={[styles.planBannerText, {
              color: planDaysLeft > 7 ? color.pulse : planDaysLeft > 0 ? color.flame : color.danger,
            }]}>
              {planDaysLeft > 0
                ? `${planDaysLeft} day${planDaysLeft !== 1 ? 's' : ''} left to modify your plan${isRtl ? '' : ' — ask Ion here'}`
                : (isRtl ? 'انتهت فترة تعديل الخطة' : 'Plan modification window expired — ask Ion for a new plan')}
            </Text>
          </View>
        ) : null}

        {/* Loading / error */}
        {history.loading ? <ActivityIndicator color={color.spark} style={{ marginTop: 12 }} /> : null}
        {history.error ? <Text style={[styles.error, { color: color.danger }]}>{history.error}</Text> : null}

        {/* Message list */}
        <FlatList
          ref={listRef}
          data={visibleMessages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          inverted
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.thread}
          ListEmptyComponent={!history.loading ? (
            <Card>
              <Text style={[styles.emptyIon, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>
                {isRtl ? 'آيون جاهز. اسأل عن خطتك، وجباتك، وتدريبك.' : 'Ion is ready. Ask about your plan, meals, training, recovery, or progress.'}
              </Text>
            </Card>
          ) : null}
        />

        {/* Quick prompt chips */}
        {!message.trim() && !sending ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.promptsRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}
            keyboardShouldPersistTaps="handled"
          >
            {quickPrompts.map(prompt => (
              <Pressable
                key={prompt}
                onPress={() => handleSend(prompt)}
                style={[styles.promptChip, { backgroundColor: color.elevated, borderColor: color.border }]}
              >
                <Text style={[styles.promptText, { color: color.muted }]}>{prompt}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {/* Message usage counter */}
        {showUsage ? (
          <View style={styles.usageRow}>
            <Text style={[styles.usageText, { color: usageNearLimit ? color.danger : color.dim }]}>
              {msgUsage!.limit - msgUsage!.used} / {msgUsage!.limit} {isRtl ? 'رسائل متبقية اليوم' : 'messages left today'}
              {usageNearLimit ? '  ' : ''}
            </Text>
            {usageNearLimit ? (
              <Pressable onPress={() => router.push('/billing')}>
                <Text style={[styles.usageText, { color: color.spark }]}>{isRtl ? 'الخطة' : 'View plan'}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Composer */}
        <View style={[styles.composer, { backgroundColor: color.surface, borderColor: color.border }]}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={text.askIon}
            placeholderTextColor={color.dim}
            multiline
            style={[styles.input, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}
          />
          <Pressable
            disabled={sending}
            onPress={() => handleSend()}
            style={[styles.send, { backgroundColor: sending ? color.dim : color.spark }]}
          >
            {sending ? <ActivityIndicator color="#FFFFFF" /> : <Feather name="send" color="#FFFFFF" size={20} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* History modal */}
      <ChatHistoryModal
        visible={historyOpen}
        sessions={sessions}
        selectedId={selectedSessionId}
        isRtl={isRtl}
        color={color}
        onSelect={(id) => { setSelectedSessionId(id); setHistoryOpen(false) }}
        onAll={() => { setSelectedSessionId(null); setHistoryOpen(false) }}
        onClose={() => setHistoryOpen(false)}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkinText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  planBannerText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  emptyIon: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  thread: {
    flexGrow: 1,
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  ionRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  cardLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  cardLabelText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  planEditCard: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  planEditTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '900',
    marginBottom: 6,
  },
  error: {
    marginHorizontal: 20,
    marginBottom: 12,
    fontWeight: '700',
  },
  promptsRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  promptChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  promptText: {
    fontSize: 13,
    fontWeight: '600',
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 4,
  },
  usageText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  composer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    fontSize: 16,
    paddingHorizontal: 10,
    paddingTop: 12,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // History modal styles
  modalRoot: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalEyebrow: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  modalSub: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSection: {
    padding: 12,
    borderBottomWidth: 1,
  },
  sessionBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  sessionBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  sessionCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  sessionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 11,
    fontWeight: '800',
  },
  sessionTime: {
    fontSize: 10,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  sessionCount: {
    fontSize: 10,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 32,
  },
})
