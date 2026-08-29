/**
 * Guards the frontend against dependencies that build on install.
 *
 * `vue-jest` 3 pulled in `deasync`, a native module, so `npm install`
 * ran `node-gyp`, and the `node-gyp` bundled with Node 16's npm imports
 * `distutils`, which Python 3.12 removed. The documented one-liner then
 * died partway through on any machine without `setuptools`, which is
 * every stock Ubuntu 24.04, Debian 13 and Fedora 40. Nothing at runtime
 * needed it: it was test tooling.
 *
 * A package that runs an install script and is not optional has to
 * succeed on every consumer's machine, whatever they have installed.
 * That is a decision worth making on purpose, so the set is pinned here
 * and a new one has to be added deliberately.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Packages allowed to run an install script on a consumer's machine.
 * None of these compiles anything: they print a banner, or download a
 * prebuilt binary. Adding to this list means accepting whatever the new
 * script needs, so read the script before you do.
 */
const ALLOWED = new Set([
  'core-js',
  'core-js-pure',
  'cypress',
  'nuxt',
  'vue-inbrowser-compiler-demi',
])

/** The npm package name a lockfile key refers to. */
function packageName(key) {
  return key.split('node_modules/').pop()
}

/**
 * Install-script packages a consumer cannot skip. Optional ones are
 * left out on purpose: npm carries on when their build fails, so they
 * cannot break the install the way `deasync` did.
 */
function requiredInstallScripts(lockfile) {
  const { packages = {} } = JSON.parse(fs.readFileSync(lockfile, 'utf8'))
  return Object.entries(packages)
    .filter(([, meta]) => meta.hasInstallScript && !meta.optional)
    .map(([key]) => packageName(key))
}

describe('frontend install scripts', () => {
  const lockfile = path.join(REPO, 'nuxt', 'package-lock.json')

  it('runs no install script that is not on the list', () => {
    const unexpected = [...new Set(requiredInstallScripts(lockfile))]
      .filter((name) => !ALLOWED.has(name))
      .sort()
    assert.deepEqual(
      unexpected,
      [],
      `Unlisted install script(s): ${unexpected.join(', ')}. ` +
        'Check what they need before adding them to ALLOWED in this test.'
    )
  })

  it('does not depend on deasync', () => {
    const { packages = {} } = JSON.parse(fs.readFileSync(lockfile, 'utf8'))
    const found = Object.keys(packages).filter((key) => packageName(key) === 'deasync')
    assert.deepEqual(found, [], 'deasync is back, so npm install needs Python and node-gyp again.')
  })

  it('transforms .vue files with a package that has no native build', () => {
    const { devDependencies = {} } = JSON.parse(
      fs.readFileSync(path.join(REPO, 'nuxt', 'package.json'), 'utf8')
    )
    assert.ok(
      devDependencies['@vue/vue2-jest'],
      '@vue/vue2-jest is the maintained transform for Vue 2 and Jest 29.'
    )
    assert.ok(!devDependencies['vue-jest'], 'vue-jest 3 is unmaintained and depends on deasync.')
  })
})
