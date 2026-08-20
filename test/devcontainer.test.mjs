/**
 * Tests for the repository's own configuration.
 *
 * These are small, but each one pins a config value that broke something
 * in a way no other test could catch: a container that will not build,
 * or a merge commit that fails lint on the default branch.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** devcontainer.json is JSONC, so comments have to go before parsing. */
function readJsonc(file) {
  const raw = fs.readFileSync(path.join(REPO, file), 'utf8')
  return JSON.parse(raw.replace(/^\s*\/\/.*$/gm, ''))
}

describe('devcontainer', () => {
  const config = readJsonc('.devcontainer/devcontainer.json')
  const features = config.features || {}

  it('installs mise without asking for the latest release of the repo', () => {
    // The mise feature resolves "latest" across every release in
    // jdx/mise, which now includes a separate vfox-* line. It picked
    // vfox-v2026.8.15, found no mise binary, and every build failed.
    assert.equal(
      features['ghcr.io/devcontainers-extra/features/mise:1'],
      undefined,
      'the mise feature has no tag filter - use gh-release directly'
    )
  })

  it('filters mise release tags to mise itself', () => {
    const release = features['ghcr.io/devcontainers-extra/features/gh-release:1']
    assert.ok(release, 'mise is installed through gh-release')
    assert.equal(release.repo, 'jdx/mise')
    assert.equal(release.binaryNames, 'mise')

    const pattern = new RegExp(release.releaseTagRegex)
    assert.ok(pattern.test('v2026.8.10'), 'accepts a mise release')
    assert.ok(!pattern.test('vfox-v2026.8.15'), 'rejects a vfox release')
    assert.ok(!pattern.test('vfox-v2026.9.0'), 'rejects any vfox release')
  })

  it('picks exactly one asset from a mise release', () => {
    // mise publishes the same build four ways, and the resolver refuses
    // to choose between them: "Too many matches found".
    const release = features['ghcr.io/devcontainers-extra/features/gh-release:1']
    const published = [
      'mise-v2026.8.10-linux-x64',
      'mise-v2026.8.10-linux-x64.tar.gz',
      'mise-v2026.8.10-linux-x64.tar.xz',
      'mise-v2026.8.10-linux-x64.tar.zst',
    ]
    const pattern = new RegExp(release.assetRegex)
    const matched = published.filter((asset) => pattern.test(asset))
    assert.deepEqual(matched, ['mise-v2026.8.10-linux-x64.tar.gz'])
  })

  it('pins the backend port so the forwarded port matches', () => {
    // .devtools/start otherwise takes the first free port from 8888 up,
    // and a container that picked 8889 would forward the wrong one.
    assert.equal(config.containerEnv.WEBSERVER_PORT, '8888')
    assert.ok(config.forwardPorts.includes(8888))
  })
})

describe('semantic pull requests', () => {
  it('validates the title, which is what squash-merge keeps', () => {
    const raw = fs.readFileSync(path.join(REPO, '.github/semantic.yml'), 'utf8')
    // Deliberately not a YAML parser: the root package has no
    // dependencies, and this file is two lines of config.
    const enabled = /^\s*titleOnly:\s*true\s*$/m.test(raw)
    assert.ok(
      enabled,
      'without titleOnly the app passes on conventional commits alone, and a ' +
        'prose title still becomes the merge commit subject'
    )
  })
})
