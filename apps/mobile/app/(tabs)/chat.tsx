import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { getChatHistory, sendChatMessage, ChatMessage } from '@/features/chat'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

export default function ChatScreen() {
  const { color } = useTheme()
  const { text, isRtl } = useLanguage()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const history = useAsyncData(() => getChatHistory(80), [])
  const messages = useMemo(() => history.data?.messages ?? [], [history.data])

  async function handleSend(nextMessage?: string) {
    const trimmed = (nextMessage ?? message).trim()
    if (!trimmed || sending) return

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
    } catch (error: any) {
      Alert.alert('Ion', error?.message || 'Could not send message')
      await history.reload()
    } finally {
      setSending(false)
    }
  }

  return (
    <Screen>
      <PageHeader eyebrow="ION" title={text.chat} subtitle="Native chat shell ready. Streaming and plan edit confirmation come next." />
      {history.loading ? <ActivityIndicator color={color.spark} /> : null}
      {history.error ? <Text style={[styles.error, { color: color.danger }]}>{history.error}</Text> : null}
      <View style={styles.thread}>
        {messages.length === 0 && !history.loading ? (
          <Card>
            <Text style={[styles.ion, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>
              Ion will remember profile, plans, meals, workouts, measurements, and prior messages through the existing backend context.
            </Text>
          </Card>
        ) : null}
        {messages.map(item => {
          const isUser = item.role === 'user'
          return (
            <View key={item.id} style={[styles.messageRow, isUser ? styles.userRow : styles.ionRow]}>
              <View style={[
                styles.bubble,
                {
                  backgroundColor: isUser ? color.sparkSoft : color.surface,
                  borderColor: isUser ? color.spark : color.border,
                  maxWidth: '88%',
                },
              ]}>
                <Text style={[styles.bubbleText, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>{item.content}</Text>
                {item.metadata?.plan_edit ? (
                  <View style={[styles.planEditCard, { borderColor: color.spark }]}>
                    <Text style={[styles.planEditTitle, { color: color.spark }]}>Plan change preview</Text>
                    <Text style={[styles.bubbleText, { color: color.text }]}>{String((item.metadata.plan_edit as any).summary || 'Ion prepared a plan change.')}</Text>
                    <View style={styles.planButtons}>
                      <Pressable onPress={() => handleSend('Confirm')} style={[styles.planButton, { borderColor: color.pulse }]}>
                        <Text style={[styles.planButtonText, { color: color.pulse }]}>Apply</Text>
                      </Pressable>
                      <Pressable onPress={() => handleSend('No, cancel this change')} style={[styles.planButton, { borderColor: color.danger }]}>
                        <Text style={[styles.planButtonText, { color: color.danger }]}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          )
        })}
      </View>
      <View style={[styles.composer, { backgroundColor: color.surface, borderColor: color.border }]}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder={text.askIon}
          placeholderTextColor={color.dim}
          style={[styles.input, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}
        />
        <Pressable disabled={sending} onPress={() => handleSend()} style={[styles.send, { backgroundColor: sending ? color.dim : color.spark }]}>
          {sending ? <ActivityIndicator color="#FFFFFF" /> : <Feather name="send" color="#FFFFFF" size={20} />}
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  ion: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  thread: {
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
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
  planButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  planButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  planButtonText: {
    fontWeight: '900',
  },
  error: {
    marginBottom: 12,
    fontWeight: '700',
  },
  composer: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 18,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 46,
    fontSize: 16,
    paddingHorizontal: 10,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
