/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'SynapWidget',
  // Explicit, app-relative bundle id → resolves to "app.synap.fit.SynapWidget".
  // A leading "." means "append to the host app's bundle id" (see
  // @bacons/apple-targets with-widget.js). This MUST be set: without it the
  // target's PRODUCT_BUNDLE_IDENTIFIER can resolve to the bare app id and App
  // Store upload fails with error 90347 ("application extension ... should not
  // contain more than one period after the application's bundle ID"). It also
  // must match the App Store provisioning profile (app.synap.fit.SynapWidget)
  // and the widget_bundle_id in fastlane/Fastfile.
  bundleIdentifier: '.SynapWidget',
  // Live Activities require the modern ActivityKit API (iOS 16.2+).
  deploymentTarget: '16.2',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
  colors: {
    // SYNAP brand spark / accent used by the Live Activity views.
    $accent: '#BB5CF6',
  },
  images: {
    // Transparent SYNAP mark, generated into an imageset at prebuild and
    // referenced from Swift as Image("SynapMark"). Used as the brand glyph in
    // the Dynamic Island + Lock Screen Live Activity.
    SynapMark: './synap-mark.png',
  },
}
