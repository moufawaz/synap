import { StyleSheet, View } from 'react-native'
import { IonAvatar } from '@/components/IonAvatar'
import { PageHeader } from '@/components/PageHeader'
import { useLanguage } from '@/i18n/LanguageProvider'

export function IonPageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
}) {
  const { isRtl } = useLanguage()

  return (
    <View style={[styles.row, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
      <View style={styles.text}>
        <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      </View>
      <IonAvatar size="lg" />
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-start',
    gap: 14,
  },
  text: {
    flex: 1,
  },
})
