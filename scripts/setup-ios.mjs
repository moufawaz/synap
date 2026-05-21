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
const STORYBOARD   = 'ios/App/App/Base.lproj/Main.storyboard'
const HEALTHKIT_PLUGIN       = 'ios/App/App/SynapHealthKitPlugin.swift'
const HEALTHKIT_REGISTRATION = 'ios/App/App/SynapHealthKitPlugin.m'
const VIEWCONTROLLER         = 'ios/App/App/ViewController.swift'

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

// Capacitor 8: plugin must conform to CAPBridgedPlugin and declare its JS methods.
// Registration happens in ViewController.capacitorDidLoad() via bridge?.registerPluginInstance().
// The old CAP_PLUGIN ObjC macro and instancePlugins approaches are NOT used in Capacitor 8.
@objc(SynapHealthKitPlugin)
public class SynapHealthKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SynapHealthKitPlugin"
    public let jsName = "SynapHealthKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readSummary", returnType: CAPPluginReturnPromise),
    ]
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

        // Use a serial queue so all result mutations are thread-safe (Swift 6)
        let serialQueue = DispatchQueue(label: "app.synap.healthkit.results")
        let group = DispatchGroup()
        var result = baseSummary(available: true, authorized: true)

        group.enter()
        readTodaySum(identifier: .stepCount, unit: HKUnit.count()) { value in
            serialQueue.sync { if let v = value { result["stepsToday"] = Int(v.rounded()) } }
            group.leave()
        }

        group.enter()
        readTodaySum(identifier: .activeEnergyBurned, unit: HKUnit.kilocalorie()) { value in
            serialQueue.sync { if let v = value { result["activeEnergyKcalToday"] = Int(v.rounded()) } }
            group.leave()
        }

        group.enter()
        readLatest(identifier: .heartRate, unit: HKUnit.count().unitDivided(by: HKUnit.minute())) { value, date in
            serialQueue.sync {
                if let v = value { result["latestHeartRateBpm"] = Int(v.rounded()) }
                if let d = date { result["latestHeartRateDate"] = self.iso8601(d) }
            }
            group.leave()
        }

        group.enter()
        readLatest(identifier: .bodyMass, unit: HKUnit.gramUnit(with: .kilo)) { value, date in
            serialQueue.sync {
                if let v = value { result["latestWeightKg"] = round(v * 10) / 10 }
                if let d = date { result["latestWeightDate"] = self.iso8601(d) }
            }
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

// Capacitor 8: the CAP_PLUGIN macro is NOT used.
// Plugin registration is handled in Swift via CAPBridgedPlugin conformance
// and bridge?.registerPluginInstance() in capacitorDidLoad().
// We still write an empty .m file so any stale pbxproj references compile cleanly.
const healthKitRegistration = `// SynapHealthKitPlugin.m
// Capacitor 8: plugin is registered via CAPBridgedPlugin in Swift.
// This file intentionally left empty.
`

writeFileSync(HEALTHKIT_REGISTRATION, healthKitRegistration, 'utf8')
console.log('   ✓  SynapHealthKitPlugin.m (stub — registration is Swift-only in Capacitor 8)')

// ── Register plugin via ViewController.capacitorDidLoad() ────────────────────
// Capacitor 8 registration approach:
//   1. Plugin conforms to CAPBridgedPlugin (declares jsName, identifier, pluginMethods)
//   2. ViewController overrides capacitorDidLoad() and calls bridge?.registerPluginInstance()
//      which is the only supported manual registration path in Capacitor 8.
//
// instancePlugins does NOT exist in CAPBridgeViewController.
// CAP_PLUGIN ObjC macro does NOT register in Capacitor 8 (bridge reads from capacitor.config.json).
//
// Capacitor 8 may or may not generate ViewController.swift:
//   • If it exists → patch it (inject capacitorDidLoad override if missing)
//   • If it does not exist → create a minimal one and register it in pbxproj
console.log('\n📱  Registering SynapHealthKitPlugin via ViewController.capacitorDidLoad()...')

const viewControllerContent = `import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {

    /// Capacitor 8: register custom bundled plugins here.
    /// bridge is available at this point (set before capacitorDidLoad fires).
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SynapHealthKitPlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        // Override point for customisation after application load.
    }
}
`

const capacitorDidLoadPatch = `\n    /// Capacitor 8: register custom bundled plugins here.\n    override func capacitorDidLoad() {\n        bridge?.registerPluginInstance(SynapHealthKitPlugin())\n    }\n`

let vcCreated = false
if (existsSync(VIEWCONTROLLER)) {
  let vc = readFileSync(VIEWCONTROLLER, 'utf8')
  if (!vc.includes('capacitorDidLoad')) {
    // Inject capacitorDidLoad() into the existing class body, after the opening brace
    vc = vc.replace(
      /class ViewController\s*:\s*CAPBridgeViewController\s*\{/,
      `class ViewController: CAPBridgeViewController {${capacitorDidLoadPatch}`,
    )
    writeFileSync(VIEWCONTROLLER, vc, 'utf8')
    console.log('   ✓  capacitorDidLoad() override added to existing ViewController.swift')
  } else {
    console.log('   ✓  capacitorDidLoad already present in ViewController.swift — skipped')
  }
} else {
  // Capacitor 8 did not generate ViewController.swift — create it from scratch.
  writeFileSync(VIEWCONTROLLER, viewControllerContent, 'utf8')
  vcCreated = true
  console.log('   ✓  ViewController.swift created from scratch (was absent from Capacitor template)')
}

// ── Patch Main.storyboard to use our ViewController subclass ─────────────────
// Capacitor 8 template has Main.storyboard pointing to CAPBridgeViewController
// in the Capacitor module directly:
//   customClass="CAPBridgeViewController" customModule="Capacitor"
//
// This means our ViewController.swift subclass is never instantiated — the
// storyboard bypasses it entirely, even though it compiles fine.
//
// Fix: change the storyboard to use our ViewController class (App module, no
// customModule attribute needed since it lives in the app target itself).
console.log('\n📱  Patching Main.storyboard to use ViewController subclass...')
if (existsSync(STORYBOARD)) {
  let sb = readFileSync(STORYBOARD, 'utf8')
  if (sb.includes('customClass="CAPBridgeViewController"')) {
    // Remove customModule="Capacitor" and change class to our ViewController
    sb = sb.replace(
      /customClass="CAPBridgeViewController"\s+customModule="Capacitor"/g,
      'customClass="ViewController"',
    )
    writeFileSync(STORYBOARD, sb, 'utf8')
    console.log('   ✓  Main.storyboard now uses ViewController (App module)')
  } else if (sb.includes('customClass="ViewController"')) {
    console.log('   ✓  Main.storyboard already uses ViewController — skipped')
  } else {
    console.warn('   ⚠  Main.storyboard: unexpected viewController class — check manually')
  }
} else {
  console.warn('   ⚠  Main.storyboard not found at expected path')
}

if (existsSync(PBXPROJ)) {
  let pbx = readFileSync(PBXPROJ, 'utf8')
  if (!pbx.includes('SynapHealthKitPlugin.swift')) {
    const swiftFileRef   = 'SYNAP' + Math.random().toString(16).slice(2, 20).toUpperCase().padEnd(19, '0')
    const swiftBuildFile = 'SYNAP' + Math.random().toString(16).slice(2, 20).toUpperCase().padEnd(19, '1')
    const objcFileRef    = 'SYNAP' + Math.random().toString(16).slice(2, 20).toUpperCase().padEnd(19, '2')
    const objcBuildFile  = 'SYNAP' + Math.random().toString(16).slice(2, 20).toUpperCase().padEnd(19, '3')
    // Fixed IDs for HealthKit.framework (stable across runs)
    const hkFwRef        = 'SYNAPHEALTH0000000000FWREF'
    const hkFwBuildFile  = 'SYNAPHEALTH0000000000FWBLD'
    // Fixed IDs for ViewController.swift (only used when vcCreated === true)
    const vcFileRef      = 'SYNAPVC00000000000000FREF0'
    const vcBuildFile    = 'SYNAPVC00000000000000FBLD0'

    // ── PBXBuildFile ──────────────────────────────────────────────────────────
    let newBuildFiles =
      `\t\t${swiftBuildFile} /* SynapHealthKitPlugin.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${swiftFileRef} /* SynapHealthKitPlugin.swift */; };\n` +
      `\t\t${objcBuildFile} /* SynapHealthKitPlugin.m in Sources */ = {isa = PBXBuildFile; fileRef = ${objcFileRef} /* SynapHealthKitPlugin.m */; };\n` +
      `\t\t${hkFwBuildFile} /* HealthKit.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = ${hkFwRef} /* HealthKit.framework */; settings = {ATTRIBUTES = (Required, ); }; };\n`
    if (vcCreated) {
      newBuildFiles +=
        `\t\t${vcBuildFile} /* ViewController.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${vcFileRef} /* ViewController.swift */; };\n`
    }
    pbx = pbx.replace('/* End PBXBuildFile section */', newBuildFiles + `/* End PBXBuildFile section */`)

    // ── PBXFileReference ─────────────────────────────────────────────────────
    // Use SOURCE_ROOT-relative paths so Xcode always resolves correctly
    // regardless of which group the file ends up in.
    // SOURCE_ROOT = ios/App/ (the dir containing App.xcodeproj)
    // Source files live in ios/App/App/ → path = App/<filename>
    let newFileRefs =
      `\t\t${swiftFileRef} /* SynapHealthKitPlugin.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = SynapHealthKitPlugin.swift; path = App/SynapHealthKitPlugin.swift; sourceTree = SOURCE_ROOT; };\n` +
      `\t\t${objcFileRef} /* SynapHealthKitPlugin.m */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.c.objc; name = SynapHealthKitPlugin.m; path = App/SynapHealthKitPlugin.m; sourceTree = SOURCE_ROOT; };\n` +
      `\t\t${hkFwRef} /* HealthKit.framework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = HealthKit.framework; path = System/Library/Frameworks/HealthKit.framework; sourceTree = SDKROOT; };\n`
    if (vcCreated) {
      newFileRefs +=
        `\t\t${vcFileRef} /* ViewController.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = ViewController.swift; path = App/ViewController.swift; sourceTree = SOURCE_ROOT; };\n`
    }
    pbx = pbx.replace('/* End PBXFileReference section */', newFileRefs + `/* End PBXFileReference section */`)

    // ── Group children (cosmetic — for Xcode navigator) ───────────────────────
    pbx = pbx.replace(
      /(\s+children = \(\n\s+[A-Z0-9]+ \/\* AppDelegate\.swift \*\/,)/,
      `$1\n\t\t\t\t${swiftFileRef} /* SynapHealthKitPlugin.swift */,\n\t\t\t\t${objcFileRef} /* SynapHealthKitPlugin.m */,` +
      (vcCreated ? `\n\t\t\t\t${vcFileRef} /* ViewController.swift */,` : ''),
    )

    // ── PBXSourcesBuildPhase — add plugin files (+ ViewController if new) ────
    // isa = PBXSourcesBuildPhase comes BEFORE files = ( in pbxproj format
    let newSources =
      `\t\t\t\t${swiftBuildFile} /* SynapHealthKitPlugin.swift in Sources */,\n` +
      `\t\t\t\t${objcBuildFile} /* SynapHealthKitPlugin.m in Sources */,\n`
    if (vcCreated) {
      newSources += `\t\t\t\t${vcBuildFile} /* ViewController.swift in Sources */,\n`
    }
    pbx = pbx.replace(
      /(isa = PBXSourcesBuildPhase;[\s\S]*?files = \(\n)/,
      `$1${newSources}`,
    )

    // ── PBXFrameworksBuildPhase — link HealthKit.framework ───────────────────
    pbx = pbx.replace(
      /(isa = PBXFrameworksBuildPhase;[\s\S]*?files = \(\n)/,
      `$1\t\t\t\t${hkFwBuildFile} /* HealthKit.framework in Frameworks */,\n`,
    )

    writeFileSync(PBXPROJ, pbx, 'utf8')
    console.log('   ✓  Added SynapHealthKitPlugin.swift + .m to Xcode sources')
    console.log('   ✓  Linked HealthKit.framework')
    if (vcCreated) console.log('   ✓  Added ViewController.swift to Xcode sources')
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
    // Insert into both Debug and Release build settings blocks.
    // Also add OTHER_SWIFT_FLAGS to enable the NonescapableTypes experimental
    // feature — required because our SynapHealthKitPlugin.swift imports Capacitor
    // whose XCFramework is compiled with this Swift feature enabled.
    pbx = pbx.replace(
      /PRODUCT_BUNDLE_IDENTIFIER = app\.synap\.fit;/g,
      `CODE_SIGN_ENTITLEMENTS = "${entRelPath}";\n\t\t\t\tOTHER_SWIFT_FLAGS = "-enable-experimental-feature NonescapableTypes";\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = app.synap.fit;`
    )
    writeFileSync(PBXPROJ, pbx, 'utf8')
    console.log('   ✓  CODE_SIGN_ENTITLEMENTS added to project.pbxproj')
    console.log('   ✓  OTHER_SWIFT_FLAGS = NonescapableTypes added to project.pbxproj')
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
