/**
 * Tests for the guards in scripts/dev.mjs, setup.mjs and postinstall.mjs.
 *
 * Each guard exists because something shipped broken and surfaced far
 * from its cause, so they are exercised the way a user meets them: the
 * real script, in a child process, asserted on exit code and message.
 * The scripts resolve .env from their own directory, so every case runs
 * against a throwaway copy of scripts/.
 */

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

let workspace

before(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'druxt-guards-'))
  fs.cpSync(path.join(REPO, 'scripts'), path.join(workspace, 'scripts'), { recursive: true })
})

after(() => {
  fs.rmSync(workspace, { recursive: true, force: true })
})

/** Hold a TCP port so the guards see it as occupied. */
function occupy() {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
}

function writeEnv(lines) {
  fs.writeFileSync(path.join(workspace, '.env'), `${lines.join('\n')}\n`)
}

/** Async so an in-process stub server can still answer the child. */
function run(script, { env = {}, stripPhp = false } = {}) {
  return new Promise((resolve) => {
    const childEnv = { ...process.env, ...env }
    if (stripPhp) {
      // Keep node reachable, drop everything that could provide php.
      childEnv.PATH = path.dirname(process.execPath)
    }
    const child = spawn(process.execPath, [path.join(workspace, 'scripts', script)], {
      env: childEnv,
    })
    let output = ''
    child.stdout.on('data', (c) => {
      output += c
    })
    child.stderr.on('data', (c) => {
      output += c
    })
    child.on('close', (code) => resolve({ code, output }))
  })
}

describe('dev guards', () => {
  it('refuses to start when the frontend port is taken', async () => {
    const backend = await occupy()
    const frontend = await occupy()
    writeEnv([
      `BASE_URL=http://127.0.0.1:${backend.port}`,
      'OAUTH_CLIENT_ID=test-client',
      `OAUTH_CALLBACK=http://localhost:${frontend.port}/callback`,
    ])

    const { code, output } = await run('dev.mjs', { env: { PORT: String(frontend.port) } })
    backend.server.close()
    frontend.server.close()

    assert.equal(code, 1)
    assert.match(output, /already in use/)
    // The consequence is the point: a random port breaks the OAuth callback.
    assert.match(output, /invalid_client/)
  })

  it('refuses to start when the callback names another port', async () => {
    const backend = await occupy()
    writeEnv([
      `BASE_URL=http://127.0.0.1:${backend.port}`,
      'OAUTH_CLIENT_ID=test-client',
      'OAUTH_CALLBACK=http://localhost:3999/callback',
    ])

    const { code, output } = await run('dev.mjs', { env: { PORT: '3998' } })
    backend.server.close()

    assert.equal(code, 1)
    assert.match(output, /OAUTH_CALLBACK names port 3999/)
  })

  it('explains a missing OAUTH_CLIENT_ID instead of failing inside Nuxt', async () => {
    const backend = await occupy()
    writeEnv([`BASE_URL=http://127.0.0.1:${backend.port}`])

    const { code, output } = await run('dev.mjs')
    backend.server.close()

    assert.equal(code, 1)
    assert.match(output, /OAUTH_CLIENT_ID is not set/)
    assert.match(output, /npm run setup/)
  })
})

describe('the Windows guard', () => {
  it('names the routes that work instead of failing part way through', async () => {
    writeEnv([])
    // process.platform is read-only, so a shim sets it before the script
    // is imported - the guard is what is under test, not the platform.
    fs.writeFileSync(
      path.join(workspace, 'scripts/windows-shim.mjs'),
      [
        "Object.defineProperty(process, 'platform', { value: 'win32' })",
        "const { runSetup } = await import('./setup.mjs')",
        'try {',
        '  await runSetup({ splash: false })',
        '} catch (error) {',
        '  console.error(error.message)',
        '  process.exit(1)',
        '}',
      ].join('\n')
    )

    const { code, output } = await run('windows-shim.mjs')
    assert.equal(code, 1)
    assert.match(output, /not supported on Windows directly/)
    assert.match(output, /Dev container/)
    assert.match(output, /WSL2/)
  })
})

describe('postinstall', () => {
  it('never fails npm install when the backend cannot be set up', async () => {
    writeEnv([])
    const { code, output } = await run('postinstall.mjs', {
      env: { CI: '' },
      stripPhp: true,
    })
    // Exiting non-zero here would fail `npm install` itself, and the root
    // package installed fine - the rest is what `npm run setup` is for.
    assert.equal(code, 0, output)
    assert.match(output, /backend needs PHP|Next steps/)
  })

  it('never fails npm install when the only PHP is below the minimum', async () => {
    writeEnv([])
    // php and composer both answer, so the missing-tool guard does not
    // apply. The version has to stop the setup here, because the
    // preflight's process.exit would skip postinstall's catch and take
    // `npm install` down with it.
    const shim = fs.mkdtempSync(path.join(os.tmpdir(), 'druxt-old-php-'))
    fs.writeFileSync(path.join(shim, 'php'), '#!/bin/sh\necho 8.2.29\n', { mode: 0o755 })
    fs.writeFileSync(path.join(shim, 'composer'), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
    const { code, output } = await run('postinstall.mjs', {
      env: { CI: '', PATH: [shim, path.dirname(process.execPath)].join(path.delimiter) },
    })
    fs.rmSync(shim, { recursive: true, force: true })
    assert.equal(code, 0, output)
    assert.match(output, /backend needs PHP 8\.3\+/)
    assert.match(output, /8\.2\.29/)
  })
})
