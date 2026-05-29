/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'SynapWidget',
  // Live Activities require the modern ActivityKit API (iOS 16.2+).
  deploymentTarget: '16.2',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
  colors: {
    // SYNAP brand spark / accent used by the Live Activity views.
    $accent: '#BB5CF6',
  },
}
