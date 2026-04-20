#!/usr/bin/env node
/**
 * patch-capacitor-config.js
 *
 * Run after `cap sync ios`. Capacitor CLI regenerates
 * ios/App/App/capacitor.config.json from capacitor.config.ts but strips
 * unknown keys like `packageClassList`. This script re-injects the list so
 * the Capacitor bridge knows to load our custom native plugins (RemindersPlugin).
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const CONFIG_PATH = path.resolve(
  __dirname,
  '../ios/App/App/capacitor.config.json'
)

const REQUIRED_PLUGINS = ['AppPlugin', 'PreferencesPlugin', 'RemindersPlugin']

try {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))

  const existing = new Set(config.packageClassList || [])
  REQUIRED_PLUGINS.forEach(p => existing.add(p))
  config.packageClassList = Array.from(existing)

  // Write back with the same tab-indentation Capacitor uses
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, '\t') + '\n')
  console.log('✅  Patched capacitor.config.json — packageClassList:', config.packageClassList.join(', '))
} catch (e) {
  console.error('❌  patch-capacitor-config.js failed:', e.message)
  process.exit(1)
}
