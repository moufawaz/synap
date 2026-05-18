#!/usr/bin/env node
/**
 * generate-icons.mjs — SYNAP icon generation helper
 * ─────────────────────────────────────────────────────────────────────────────
 * Prerequisites:
 *   npm install -D @capacitor/assets sharp
 *
 * Usage:
 *   node scripts/generate-icons.mjs
 *
 * What it does:
 *   1. Reads resources/icon.png  (must be 1024×1024, no transparency for iOS)
 *   2. Reads resources/splash.png  (must be at least 2732×2732)
 *   3. Runs @capacitor/assets to generate all Android + iOS icon/splash sizes
 *   4. Regenerates public/icons/*.webp for the PWA manifest
 *
 * Run this whenever the icon changes, then `npx cap sync` to push to native.
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

// ── Validate source assets ────────────────────────────────────────────────────
const iconSrc = path.join(root, 'resources', 'icon.png')
const splashSrc = path.join(root, 'resources', 'splash.png')

if (!existsSync(iconSrc)) {
  console.error('❌  resources/icon.png not found')
  console.error('    Place a 1024×1024 PNG (no transparency) there first.')
  process.exit(1)
}
if (!existsSync(splashSrc)) {
  console.error('❌  resources/splash.png not found')
  console.error('    Place a 2732×2732 PNG there first.')
  process.exit(1)
}

// ── @capacitor/assets ─────────────────────────────────────────────────────────
console.log('🎨  Generating Capacitor icons and splash screens…')
try {
  execSync('npx @capacitor/assets generate --iconBackgroundColor "#0A0A0F" --splashBackgroundColor "#0A0A0F"', {
    cwd: root,
    stdio: 'inherit',
  })
  console.log('✅  Capacitor assets generated (android/ + ios/)')
} catch {
  console.error('❌  @capacitor/assets generation failed.')
  console.error('    Make sure the android/ and/or ios/ directories exist (npx cap add android / ios first).')
  process.exit(1)
}

// ── PWA WebP icons via sharp ──────────────────────────────────────────────────
console.log('\n🖼   Generating PWA WebP icons…')

let sharp
try {
  const mod = await import('sharp')
  sharp = mod.default
} catch {
  console.warn('⚠️   sharp not installed — skipping PWA WebP generation.')
  console.warn('    Run: npm install -D sharp')
  process.exit(0)
}

import { mkdirSync, writeFileSync } from 'fs'
const iconsDir = path.join(root, 'public', 'icons')
mkdirSync(iconsDir, { recursive: true })

const sizes = [48, 72, 96, 128, 192, 256, 512]
for (const size of sizes) {
  const outPath = path.join(iconsDir, `icon-${size}x${size}.webp`)
  await sharp(iconSrc)
    .resize(size, size)
    .webp({ quality: 90 })
    .toFile(outPath)
  console.log(`   ✓  ${size}×${size} → public/icons/icon-${size}x${size}.webp`)
}

// apple-touch-icon (180×180 PNG — Safari requires PNG, not WebP)
await sharp(iconSrc)
  .resize(180, 180)
  .png()
  .toFile(path.join(root, 'public', 'apple-touch-icon.png'))
console.log('   ✓  180×180 → public/apple-touch-icon.png')

// Fallback icon.png (512×512) for manifest
await sharp(iconSrc)
  .resize(512, 512)
  .png()
  .toFile(path.join(root, 'public', 'icon.png'))
console.log('   ✓  512×512 → public/icon.png')

console.log('\n🚀  Done! Run `npx cap sync` to push changes to the native projects.')
