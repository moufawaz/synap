// Sentry's Expo metro config wraps expo/metro-config and adds debug-ID
// injection + proper source-map serialization so uploaded maps actually
// symbolicate crash stacks (file:line instead of main.jsbundle:1:23456).
// Behaves like the plain default config when Sentry env isn't present.
const { getSentryExpoConfig } = require('@sentry/react-native/metro')

const config = getSentryExpoConfig(__dirname)

module.exports = config
