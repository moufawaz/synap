import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { WebView } from 'react-native-webview'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '@/theme/ThemeProvider'

interface Props {
  videoId: string | null
  onClose: () => void
}

/**
 * Full-screen in-app YouTube player using WebView embed.
 * Same approach as the web app's <iframe> embed — no external app required.
 */
export function VideoModal({ videoId, onClose }: Props) {
  const { color } = useTheme()

  if (!videoId) return null

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`

  return (
    <Modal
      visible={!!videoId}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        {/* Header bar */}
        <View style={[styles.header, { backgroundColor: color.surface }]}>
          <Text style={[styles.headerTitle, { color: color.text }]} numberOfLines={1}>
            Exercise Video
          </Text>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: color.elevated, borderColor: color.border }]}>
            <Feather name="x" size={18} color={color.text} />
          </Pressable>
        </View>

        {/* YouTube embed */}
        <View style={styles.playerWrap}>
          <WebView
            source={{ uri: embedUrl }}
            style={styles.webview}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            startInLoadingState
          />
        </View>

        {/* Safe area bottom */}
        <View style={[styles.footer, { backgroundColor: color.surface }]}>
          <Pressable onPress={onClose} style={[styles.doneBtn, { backgroundColor: color.spark }]}>
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
    marginRight: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerWrap: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  doneBtn: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5,
  },
})
