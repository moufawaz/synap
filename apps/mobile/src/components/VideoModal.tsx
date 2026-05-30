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

  // Load the embed inside an HTML document with a real https baseUrl rather than
  // pointing the WebView straight at youtube.com/embed/... . Loading the embed
  // URL directly gives YouTube no valid HTTP referer/origin, so many videos
  // refuse to play with "Video unavailable" / error 150/153 ("playback on other
  // websites disabled"). Setting baseUrl makes the iframe's origin
  // https://www.synapfit.app — the same origin the web app embeds from — which
  // YouTube accepts. The `origin` query param is passed to match.
  const origin = 'https://www.synapfit.app'
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&fs=1&origin=${origin}`
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{height:100%;background:#000}.v{position:fixed;inset:0}iframe{width:100%;height:100%;border:0}</style></head><body><div class="v"><iframe src="${embedUrl}" allow="autoplay;encrypted-media;picture-in-picture;fullscreen" allowfullscreen></iframe></div></body></html>`

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
            source={{ html, baseUrl: origin }}
            originWhitelist={['*']}
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
