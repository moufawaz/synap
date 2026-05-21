#!/usr/bin/env node
/**
 * setup-ios.mjs — runs on the CI macOS runner after `npx cap add ios`
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Patches Capacitor plugin Package.swift to enable NonescapableTypes
 *    (required because the Capacitor 8 binary XCFramework uses this Swift
 *     experimental feature; plugin source code needs it enabled to compile)
 * 2. Applies all Info.plist permission keys (camera, photos, notifications)
 * 3. Adds Associated Domains entitlement (Universal Links)
 * 4. Adds Push Notifications entitlement (APNs)
 * 5. Confirms the entitlements file is wired into the Xcode build settings
 *
 * Uses /usr/libexec/PlistBuddy — always present on macOS CI runners.
 * Safe to run multiple times (PlistBuddy Set overwrites existing keys).
 */

import { execSync } from 'child_process'
import { existsSync, writeFileSync, readFileSync } from 'fs'

const PLIST        = 'ios/App/App/Info.plist'
const ENTITLEMENTS = 'ios/App/App/App.entitlements'
const PBXPROJ      = 'ios/App/App.xcodeproj/project.pbxproj'
const HEALTHKIT_PLUGIN = 'ios/App/App/SynapHealthKitPlugin.swift'
const HEALTHKIT_REGISTRATION = 'ios/App/App/SynapHealthKitPlugin.m'

// ── 1. Patch Capacitor plugin Package.swift for NonescapableTypes ─────────────
// Capacitor 8 core ships as a binary XCFramework compiled with the experimental
// Swift feature $NonescapableTypes (SE-0418).  Plugin source packages don't
// enable it by default, causing compile errors like:
//   'any CAPBridgeProtocol' has no member 'webView'
//   'PluginConfig' has no member 'getString'
//   'CAPPluginCall' has no member 'reject'
// Fix: add swiftSettings: [.enableExperimentalFeature("NonescapableTypes")]
// to the main .target() in each affected plugin's Package.swift.
console.log('🔧  Patching Capacitor plugin Package.swift for NonescapableTypes...')

const CAPACITOR_PLUGINS = [
  'node_modules/@capacitor/status-bar/Package.swift',
  'node_modules/@capacitor/splash-screen/Package.swift',
  'node_modules/@capacitor/push-notifications/Package.swift',
  'node_modules/@capacitor/local-notifications/Package.swift',
  'node_modules/@capacitor/app/Package.swift',
  'node_modules/@capacitor/camera/Package.swift',
]

for (const pkgPath of CAPACITOR_PLUGINS) {
  if (!existsSync(pkgPath)) {
    console.log(`   ⏭  ${pkgPath} not found — skipped`)
    continue
  }
  let content = readFileSync(pkgPath, 'utf8')
  if (content.includes('enableExperimentalFeature("NonescapableTypes")')) {
    console.log(`   ✓  ${pkgPath} already patched`)
    continue
  }
  // Two layouts appear in practice:
  //   Layout A — path on its own line, ) on the next line:
  //       <indent>path: "ios/Sources/PluginName"
  //       <smaller-indent>)
  //   Layout B — path and ) on the same line:
  //       <indent>path: "ios/Sources/PluginName"),
  // We handle both, inserting swiftSettings with the same indentation as path:.
  const FLAG = '.enableExperimentalFeature("NonescapableTypes")'
  // Layout A: path line ends with " before a newline + indent + )
  let patched = content.replace(
    /([ \t]+)(path: "ios\/Sources\/[^"]+")([ \t]*\n[ \t]*\))/,
    (_, indent, pathVal, closingPart) =>
      `${indent}${pathVal},\n${indent}swiftSettings: [${FLAG}]${closingPart}`
  )
  // Layout B: path ends with ") on the same line
  if (patched === content) {
    patched = content.replace(
      /([ \t]+)(path: "ios\/Sources\/[^"]+")\)/,
      (_, indent, pathVal) =>
        `${indent}${pathVal},\n${indent}swiftSettings: [${FLAG}])`
    )
  }
  if (patched !== content) {
    writeFileSync(pkgPath, patched, 'utf8')
    console.log(`   ✓  Patched ${pkgPath}`)
  } else {
    console.warn(`   ⚠  Could not patch ${pkgPath} — pattern not matched`)
  }
}

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
  ['NSLocationWhenInUseUsageDescription',
    'SYNAP uses your location to tailor workout recommendations and find nearby gyms.'],
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

// Add export compliance key as boolean — tells App Store Connect this app uses
// only standard HTTPS/TLS (exempt from export compliance documentation)
pb(`-c "Add :ITSAppUsesNonExemptEncryption bool false" "${PLIST}"`)
console.log('   ✓  ITSAppUsesNonExemptEncryption = false')

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
</dict>
</plist>
`

writeFileSync(ENTITLEMENTS, entitlementsXml, 'utf8')
console.log('   ✓  Associated Domains: applinks:synapfit.app')
console.log('   ✓  Push Notifications: aps-environment = production')

// ── 3. Native HealthKit Capacitor bridge ─────────────────────────────────────
console.log('\n🫀  Writing SynapHealthKit native bridge...')

const healthKitSwift = `import Foundation
import Capacitor
import HealthKit

@objc(SynapHealthKitPlugin)
public class SynapHealthKitPlugin: CAPPlugin {
    private let healthStore = HKHealthStore()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["authorized": false, "available": false])
            return
        }

        var readTypes = Set<HKObjectType>()
        if let steps = HKObjectType.quantityType(forIdentifier: .stepCount) { readTypes.insert(steps) }
        if let activeEnergy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) { readTypes.insert(activeEnergy) }
        if let heartRate = HKObjectType.quantityType(forIdentifier: .heartRate) { readTypes.insert(heartRate) }
        if let bodyMass = HKObjectType.quantityType(forIdentifier: .bodyMass) { readTypes.insert(bodyMass) }

        var shareTypes = Set<HKSampleType>()
        if let bodyMass = HKObjectType.quantityType(forIdentifier: .bodyMass) { shareTypes.insert(bodyMass) }
        shareTypes.insert(HKObjectType.workoutType())

        healthStore.requestAuthorization(toShare: shareTypes, read: readTypes) { success, error in
            if let error = error {
                call.resolve(["authorized": false, "available": true, "error": error.localizedDescription])
                return
            }
            call.resolve(["authorized": success, "available": true])
        }
    }

    @objc func readSummary(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(baseSummary(available: false, authorized: false))
            return
        }

        let group = DispatchGroup()
        var result = baseSummary(available: true, authorized: true)

        group.enter()
        readTodaySum(identifier: .stepCount, unit: HKUnit.count()) { value in
            if let value = value { result["stepsToday"] = Int(value.rounded()) }
            group.leave()
        }

        group.enter()
        readTodaySum(identifier: .activeEnergyBurned, unit: HKUnit.kilocalorie()) { value in
            if let value = value { result["activeEnergyKcalToday"] = Int(value.rounded()) }
            group.leave()
        }

        group.enter()
        readLatest(identifier: .heartRate, unit: HKUnit.count().unitDivided(by: HKUnit.minute())) { value, date in
            if let value = value { result["latestHeartRateBpm"] = Int(value.rounded()) }
            if let date = date { result["latestHeartRateDate"] = iso8601(date) }
            group.leave()
        }

        group.enter()
        readLatest(identifier: .bodyMass, unit: HKUnit.gramUnit(with: .kilo)) { value, date in
            if let value = value { result["latestWeightKg"] = round(value * 10) / 10 }
            if let date = date { result["latestWeightDate"] = iso8601(date) }
            group.leave()
        }

        group.notify(queue: .main) {
            call.resolve(result)
        }
    }

    private func readTodaySum(identifier: HKQuantityTypeIdentifier, unit: HKUnit, completion: @escaping (Double?) -> Void) {
        guard let quantityType = HKObjectType.quantityType(forIdentifier: identifier) else {
            completion(nil)
            return
        }

        let start = Calendar.current.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)

        let query = HKStatisticsQuery(quantityType: quantityType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, statistics, _ in
            completion(statistics?.sumQuantity()?.doubleValue(for: unit))
        }
        healthStore.execute(query)
    }

    private func readLatest(identifier: HKQuantityTypeIdentifier, unit: HKUnit, completion: @escaping (Double?, Date?) -> Void) {
        guard let quantityType = HKObjectType.quantityType(forIdentifier: identifier) else {
            completion(nil, nil)
            return
        }

        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(sampleType: quantityType, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
            guard let sample = samples?.first as? HKQuantitySample else {
                completion(nil, nil)
                return
            }
            completion(sample.quantity.doubleValue(for: unit), sample.endDate)
        }
        healthStore.execute(query)
    }

    private func baseSummary(available: Bool, authorized: Bool) -> [String: Any] {
        return [
            "available": available,
            "authorized": authorized,
            "stepsToday": NSNull(),
            "activeEnergyKcalToday": NSNull(),
            "latestHeartRateBpm": NSNull(),
            "latestWeightKg": NSNull(),
            "latestWeightDate": NSNull(),
            "latestHeartRateDate": NSNull()
        ]
    }

    private func iso8601(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        return formatter.string(from: date)
    }
}
`

writeFileSync(HEALTHKIT_PLUGIN, healthKitSwift, 'utf8')
console.log('   ✓  SynapHealthKitPlugin.swift')

const healthKitRegistration = `#import <Capacitor/Capacitor.h>

CAP_PLUGIN(SynapHealthKitPlugin, "SynapHealthKit",
  CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(requestAuthorization, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(readSummary, CAPPluginReturnPromise);
)
`

writeFileSync(HEALTHKIT_REGISTRATION, healthKitRegistration, 'utf8')
console.log('   ✓  SynapHealthKitPlugin.m')

if (existsSync(PBXPROJ)) {
  let pbx = readFileSync(PBXPROJ, 'utf8')
  if (!pbx.includes('SynapHealthKitPlugin.swift')) {
    const swiftFileRef = 'SYNAP' + Math.random().toString(16).slice(2, 20).toUpperCase().padEnd(19, '0')
    const swiftBuildFile = 'SYNAP' + Math.random().toString(16).slice(2, 20).toUpperCase().padEnd(19, '1')
    const objcFileRef = 'SYNAP' + Math.random().toString(16).slice(2, 20).toUpperCase().padEnd(19, '2')
    const objcBuildFile = 'SYNAP' + Math.random().toString(16).slice(2, 20).toUpperCase().padEnd(19, '3')

    pbx = pbx.replace(
      '/* End PBXBuildFile section */',
      `\t\t${swiftBuildFile} /* SynapHealthKitPlugin.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${swiftFileRef} /* SynapHealthKitPlugin.swift */; };\n\t\t${objcBuildFile} /* SynapHealthKitPlugin.m in Sources */ = {isa = PBXBuildFile; fileRef = ${objcFileRef} /* SynapHealthKitPlugin.m */; };\n/* End PBXBuildFile section */`,
    )
    pbx = pbx.replace(
      '/* End PBXFileReference section */',
      `\t\t${swiftFileRef} /* SynapHealthKitPlugin.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = SynapHealthKitPlugin.swift; sourceTree = "<group>"; };\n\t\t${objcFileRef} /* SynapHealthKitPlugin.m */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.c.objc; path = SynapHealthKitPlugin.m; sourceTree = "<group>"; };\n/* End PBXFileReference section */`,
    )
    pbx = pbx.replace(
      /(\s+children = \(\n\s+[A-Z0-9]+ \/\* AppDelegate\.swift \*\/,)/,
      `$1\n\t\t\t\t${swiftFileRef} /* SynapHealthKitPlugin.swift */,\n\t\t\t\t${objcFileRef} /* SynapHealthKitPlugin.m */,`,
    )
    // In pbxproj, isa = PBXSourcesBuildPhase comes BEFORE files = (, so we
    // anchor on the isa line and insert right after the opening of files = (.
    pbx = pbx.replace(
      /(isa = PBXSourcesBuildPhase;[\s\S]*?files = \(\n)/,
      `$1\t\t\t\t${swiftBuildFile} /* SynapHealthKitPlugin.swift in Sources */,\n\t\t\t\t${objcBuildFile} /* SynapHealthKitPlugin.m in Sources */,\n`,
    )
    writeFileSync(PBXPROJ, pbx, 'utf8')
    console.log('   ✓  Added SynapHealthKitPlugin files to Xcode sources')
  } else {
    console.log('   ✓  SynapHealthKitPlugin files already in Xcode project')
  }
} else {
  console.warn('   ⚠  project.pbxproj not found — HealthKit bridge file was written but not added')
}

// ── 4. Wire entitlements into Xcode build settings ───────────────────────────
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
