import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import Feather from '@expo/vector-icons/Feather'
import { Card } from './Card'
import { deleteProgressPhoto, listProgressPhotos, uploadProgressPhoto, type ProgressPhoto } from '@/features/measurements'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { tapLight } from '@/lib/haptics'
import { useTheme } from '@/theme/ThemeProvider'

/**
 * Progress photos — private before/after tracking. Numbers tell, photos sell:
 * the scale can stall for two weeks while the mirror clearly moves, and this
 * section is what keeps users believing (and renewing) through those stalls.
 *
 * - Grid of dated thumbnails (signed URLs, 1h expiry — reload refetches).
 * - Add via camera (falls back to library when permission is denied).
 * - Tap a photo → full-screen viewer with delete.
 * - "Compare" → earliest vs latest side by side. That's the money shot.
 */
export function ProgressPhotos() {
  const { color } = useTheme()
  const { isRtl } = useLanguage()
  const align = isRtl ? 'right' : 'left'

  const photos = useAsyncData(listProgressPhotos, [], { cacheKey: 'progress-photos', cacheTtlMs: 30 * 60 * 1000 })
  const [uploading, setUploading] = useState(false)
  const [viewer, setViewer] = useState<ProgressPhoto | null>(null)
  const [compare, setCompare] = useState(false)

  const list = photos.data?.photos ?? []
  const oldest = list.length ? list[list.length - 1] : null
  const newest = list.length ? list[0] : null

  const addPhoto = useCallback(async () => {
    tapLight()
    setUploading(true)
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      let asset
      if (perm.granted) {
        const shot = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.4, exif: false })
        if (shot.canceled) { setUploading(false); return }
        asset = shot.assets[0]
      } else {
        const lib = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.4, exif: false })
        if (lib.canceled) { setUploading(false); return }
        asset = lib.assets[0]
      }
      if (!asset?.base64) {
        Alert.alert('SYNAP', isRtl ? 'تعذّرت قراءة الصورة.' : 'Could not read the image.')
        return
      }
      await uploadProgressPhoto(asset.base64, asset.mimeType || 'image/jpeg')
      await photos.reload()
    } catch (e) {
      Alert.alert('SYNAP', e instanceof Error ? e.message : (isRtl ? 'تعذّر الرفع.' : 'Upload failed.'))
    } finally {
      setUploading(false)
    }
  }, [isRtl, photos])

  function confirmDelete(photo: ProgressPhoto) {
    Alert.alert(
      isRtl ? 'حذف الصورة؟' : 'Delete photo?',
      isRtl ? 'لا يمكن التراجع عن هذا.' : 'This cannot be undone.',
      [
        { text: isRtl ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isRtl ? 'حذف' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProgressPhoto(photo.name)
              setViewer(null)
              await photos.reload()
            } catch (e) {
              Alert.alert('SYNAP', e instanceof Error ? e.message : 'Could not delete.')
            }
          },
        },
      ],
    )
  }

  return (
    <Card style={{ marginTop: 14 }}>
      <View style={[styles.header, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.title, { color: color.text, textAlign: align }]}>
          {isRtl ? 'صور التقدم' : 'Progress photos'}
        </Text>
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', gap: 8 }}>
          {list.length >= 2 ? (
            <Pressable onPress={() => setCompare(true)} style={[styles.headerBtn, { borderColor: color.spark, backgroundColor: `${color.spark}14` }]}>
              <Feather name="columns" size={13} color={color.spark} />
              <Text style={[styles.headerBtnText, { color: color.spark }]}>{isRtl ? 'قارن' : 'Compare'}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={addPhoto} disabled={uploading} style={[styles.headerBtn, { borderColor: color.border, backgroundColor: color.elevated }]}>
            {uploading ? <ActivityIndicator size="small" color={color.spark} /> : (
              <>
                <Feather name="camera" size={13} color={color.text} />
                <Text style={[styles.headerBtnText, { color: color.text }]}>{isRtl ? 'أضف' : 'Add'}</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {photos.loading ? <ActivityIndicator color={color.spark} style={{ marginVertical: 16 }} /> : null}

      {!photos.loading && list.length === 0 ? (
        <Text style={[styles.empty, { color: color.muted, textAlign: align }]}>
          {isRtl
            ? 'التقط أول صورة اليوم — بعد شهر ستتمنى لو كانت عندك صورة "قبل". خاصة ولا يراها أحد غيرك.'
            : "Take your first photo today — a month from now you'll wish you had a 'before'. Private, only you can see them."}
        </Text>
      ) : null}

      <View style={[styles.grid, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        {list.map(photo => (
          <Pressable key={photo.name} onPress={() => setViewer(photo)} style={styles.thumbWrap}>
            <Image source={{ uri: photo.url }} style={[styles.thumb, { backgroundColor: color.elevated }]} />
            <Text style={[styles.thumbDate, { color: color.dim }]}>{photo.date}</Text>
          </Pressable>
        ))}
      </View>

      {/* Full-screen viewer */}
      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={styles.viewerBackdrop}>
          <View style={[styles.viewerBar, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Text style={styles.viewerDate}>{viewer?.date}</Text>
            <View style={{ flexDirection: 'row', gap: 18 }}>
              <Pressable onPress={() => viewer && confirmDelete(viewer)} hitSlop={10}>
                <Feather name="trash-2" size={20} color="#F87171" />
              </Pressable>
              <Pressable onPress={() => setViewer(null)} hitSlop={10}>
                <Feather name="x" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>
          {viewer ? <Image source={{ uri: viewer.url }} style={styles.viewerImage} resizeMode="contain" /> : null}
        </View>
      </Modal>

      {/* Before / after compare */}
      <Modal visible={compare} transparent animationType="fade" onRequestClose={() => setCompare(false)}>
        <View style={styles.viewerBackdrop}>
          <View style={[styles.viewerBar, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Text style={styles.viewerDate}>{isRtl ? 'قبل ← بعد' : 'Before → After'}</Text>
            <Pressable onPress={() => setCompare(false)} hitSlop={10}>
              <Feather name="x" size={22} color="#fff" />
            </Pressable>
          </View>
          <View style={[styles.compareRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            {oldest ? (
              <View style={styles.compareCol}>
                <Image source={{ uri: oldest.url }} style={styles.compareImage} resizeMode="cover" />
                <Text style={styles.compareLabel}>{oldest.date}</Text>
              </View>
            ) : null}
            {newest && newest.name !== oldest?.name ? (
              <View style={styles.compareCol}>
                <Image source={{ uri: newest.url }} style={styles.compareImage} resizeMode="cover" />
                <Text style={styles.compareLabel}>{newest.date}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </Card>
  )
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 15, fontWeight: '900' },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  headerBtnText: { fontSize: 12, fontWeight: '800' },
  empty: { fontSize: 13, lineHeight: 19, fontWeight: '600', marginBottom: 4 },
  grid: { flexWrap: 'wrap', gap: 8 },
  thumbWrap: { width: '31%' },
  thumb: { width: '100%', aspectRatio: 3 / 4, borderRadius: 12 },
  thumbDate: { fontSize: 10, fontWeight: '700', marginTop: 3, textAlign: 'center' },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)' },
  viewerBar: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  viewerDate: { color: '#fff', fontSize: 14, fontWeight: '800' },
  viewerImage: { flex: 1, marginBottom: 30 },
  compareRow: { flex: 1, gap: 8, padding: 12, paddingBottom: 40 },
  compareCol: { flex: 1 },
  compareImage: { flex: 1, borderRadius: 14 },
  compareLabel: { color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center', marginTop: 8 },
})
