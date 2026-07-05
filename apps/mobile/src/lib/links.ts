import { Alert, Linking } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { reportError } from '@/lib/sentry'

/**
 * Open an external HTTPS URL safely. Prefers expo-web-browser's in-app Safari
 * controller (no app switch, no "Unable to open URL" failures — iOS 26 was
 * rejecting Linking.openURL for plain HTTPS links, caught by Sentry) and
 * falls back to Linking only if WebBrowser itself errors. Any final failure
 * is reported to Sentry with the URL but never crashes the UI — the user
 * just sees an alert and can continue.
 *
 * Used by the More tab (Privacy/Terms/Support) and the paywall's legal
 * links, which App Review requires to be functional.
 */
export async function openExternalLink(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET })
  } catch (webBrowserErr) {
    try {
      await Linking.openURL(url)
    } catch (linkingErr) {
      reportError(linkingErr, { source: 'openExternalLink', url, webBrowserErr: String(webBrowserErr) })
      Alert.alert('Could not open link', `${url} — please try again or open in your browser.`)
    }
  }
}
