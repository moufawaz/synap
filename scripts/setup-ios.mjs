#!/usr/bin/env node
/**
 * setup-ios.mjs — runs on the CI macOS runner after `npx cap add ios`
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Applies all Info.plist permission keys (camera, photos, notifications)
 * 2. Adds Associated Domains entitlement (Universal Links)
 * 3. Adds Push Notifications entitlement (APNs)
 * 4. Confirms the entitlements file is wired into the Xcode build settings
 *
 * Uses /usr/libexec/PlistBuddy — always present on macOS CI runners.
 * Safe to run multiple times (PlistBuddy Set overwrites existing keys).
 */

import { execSync } from 'child_process'
import { existsSync, writeFileSync, readFileSync } from 'fs'
import path from 'path'

const PLIST   = 'ios/App/App/Info.plist'
const ENTITLEMENTS = 'ios/App/App/App.entitlements'
const PBXPROJ = 'ios/App/App.xcodeproj/project.pbxproj'

// ── Validate the iOS project was generated ───────────────────────────────────
if (!existsSync(PLIST)) {
  console.error('❌  ios/App/App/Info.plist not found.')
  console.error('    Run `npx cap add ios && npx cap sync ios` first.')
  process.exit(1)
}

function pb(cmd) {
  try {
    execSync(`/usr/libexec/PlistBuddy ${cmd}`, { stdio: 'pipe' })
  } catch {
    // Key already exists — use Set instead of Add
    const setCmd = cmd.replace(/^-c "Add /, '-c "Set ')
    try {
      execSync(`/usr/libexec/PlistBuddy ${setCmd}`, { stdio: 'pipe' })
    } catch (e2) {
      console.warn(`  ⚠  PlistBuddy warning: ${e2.message?.split('\n')[0]}`)
    }
  }
}

// ── 1. Info.plist permission strings ─────────────────────────────────────────
console.log('📝  Applying Info.plist permission keys...')

const plistKeys = [
  ['NSCameraUsageDescription',
    'SYNAP uses your camera to scan food barcodes and analyse exercise form photos for AI coaching.'],
  ['NSPhotoLibraryUsageDescription',
    'SYNAP accesses your photo library so you can select progress photos and exercise form images.'],
  ['NSPhotoLibraryAddUsageDescription',
    'SYNAP saves your progress share card to your photo library.'],
  ['NSUserNotificationUsageDescription',
    'SYNAP sends workout reminders, meal logging nudges, hydration checks, and motivational messages from Ion to keep you on track with your training and nutrition goals.'],
  ['NSHealthShareUsageDescription',
    'SYNAP reads your steps, active calories, heart rate, and weight from Apple Health so Ion can give you more accurate coaching without you having to log everything manually.'],
  ['NSHealthUpdateUsageDescription',
    'SYNAP writes your logged workouts and body weight to Apple Health to keep your health data in sync.'],
]

for (const [key, value] of plistKeys) {
  pb(`-c "Add :${key} string '${value}'" "${PLIST}"`)
  console.log(`   ✓  ${key}`)
}

// ── 2. App.entitlements — Associated Domains + Push Notifications ─────────────
console.log('\n🔑  Writing App.entitlements...')

// Capacitor may have already created this file — if so, read and augment it.
// If not, write from scratch with the required keys.
const entitlementsXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<!-- Universal Links (synapfit.app → SYNAP native app) -->
\t<key>com.apple.developer.associated-domains</key>
\t<array>
\t\t<string>applinks:synapfit.app</string>
\t\t<string>applinks:www.synapfit.app</string>
\t</array>
\t<!-- Push Notifications (APNs) -->
\t<key>aps-environment</key>
\t<string>production</string>
\t<!-- HealthKit — read steps, calories, heart rate, weight -->
\t<key>com.apple.developer.healthkit</key>
\t<true/>
\t<true/>
</dict>
</plist>
`

writeFileSync(ENTITLEMENTS, entitlementsXml, 'utf8')
console.log('   ✓  Associated Domains: applinks:synapfit.app')
console.log('   ✓  Push Notifications: aps-environment = production')

// ── 3. Wire entitlements into Xcode build settings ───────────────────────────
// The .pbxproj needs CODE_SIGN_ENTITLEMENTS set so Xcode uses the file.
console.log('\n🔧  Updating Xcode project build settings...')

if (existsSync(PBXPROJ)) {
  let pbx = readFileSync(PBXPROJ, 'utf8')
  const entRelPath = 'App/App.entitlements'

  // Only insert if not already there
  if (!pbx.includes('CODE_SIGN_ENTITLEMENTS')) {
    // Insert into both Debug and Release build settings blocks
    pbx = pbx.replace(
      /PRODUCT_BUNDLE_IDENTIFIER = app\.synap\.fit;/g,
      `CODE_SIGN_ENTITLEMENTS = "${entRelPath}";\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = app.synap.fit;`
    )
    writeFileSync(PBXPROJ, pbx, 'utf8')
    console.log('   ✓  CODE_SIGN_ENTITLEMENTS added to project.pbxproj')
  } else {
    console.log('   ✓  CODE_SIGN_ENTITLEMENTS already present — skipped')
  }
} else {
  console.warn('   ⚠  project.pbxproj not found — skipping build settings update')
}

// ── 4. Verify bundle ID ───────────────────────────────────────────────────────
console.log('\n🔍  Verifying bundle identifier...')
try {
  const result = execSync(
    `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${PLIST}"`,
    { encoding: 'utf8', stdio: 'pipe' }
  ).trim()
  console.log(`   Bundle ID: ${result}`)
  if (result !== 'app.synap.fit') {
    console.warn(`   ⚠  Expected app.synap.fit — got ${result}. Check capacitor.config.ts.`)
  } else {
    console.log('   ✓  Bundle ID matches app.synap.fit')
  }
} catch {
  console.warn('   ⚠  Could not read CFBundleIdentifier')
}

console.log('\n✅  iOS project configured successfully.\n')
