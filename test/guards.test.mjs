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
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { FRONTEND_PORTS } from '../scripts/lib.mjs'

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

/**
 * Hold one named port, or resolve null when something else already
 * holds it - either way the guard under test sees it as taken.
 */
function occupyPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(null))
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

/**
 * A backend that answers the OAuth check the way a provisioned Drupal
 * does: authorize redirects to the login form, and a bogus code is
 * rejected as a bad code. dev.mjs gets past `checkOauth` and reaches
 * its port handling, then fails trying to start Nuxt - there is no
 * nuxt/ in the throwaway workspace, which is what ends each run.
 */
function stubBackend() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      if (request.url.startsWith('/oauth/token')) {
        response.writeHead(400, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ error: 'invalid_grant' }))
        return
      }
      response.writeHead(302, { location: '/user/login' })
      response.end()
    })
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
}

function writeEnv(lines) {
  fs.writeFileSync(path.join(workspace, '.env'), `${lines.join('\n')}\n`)
}

/** Async so an in-process stub server can still answer the child. */
function run(script, { env = {}, stripPhp = false } = {}) {
  return new Promise((resolve) => {
    // PORT picks which branch of dev.mjs runs, so never inherit it.
    const childEnv = { ...process.env }
    delete childEnv.PORT
    Object.assign(childEnv, env)
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
  it('refuses to start when PORT names a port that is taken', async () => {
    const backend = await stubBackend()
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
    // A named port is the user's decision, so the way out is theirs too.
    assert.match(output, /drop PORT/)
  })

  it('moves to the next registered port when the default one is taken', async () => {
    // The whole 3000-3009 range has a registered OAuth callback, so a
    // busy 3000 is no reason to refuse to start. This holds the real
    // port 3000: a machine already using it satisfies the case anyway.
    const backend = await stubBackend()
    const held = await occupyPort(FRONTEND_PORTS[0])
    writeEnv([`BASE_URL=http://127.0.0.1:${backend.port}`, 'OAUTH_CLIENT_ID=test-client'])

    const { output } = await run('dev.mjs')
    if (held) held.close()
    backend.server.close()

    assert.match(output, /Port 3000 is in use - starting on 300[1-9] instead/)
    // It carried on, and starts Nuxt on the port it announced.
    assert.match(output, /Starting the Nuxt dev server -> http:\/\/localhost:300[1-9]/)
  })

  it('says so when every registered port is taken', async () => {
    const backend = await stubBackend()
    const held = await Promise.all(FRONTEND_PORTS.map((port) => occupyPort(port)))
    writeEnv([`BASE_URL=http://127.0.0.1:${backend.port}`, 'OAUTH_CLIENT_ID=test-client'])

    const { code, output } = await run('dev.mjs')
    for (const server of held) if (server) server.close()
    backend.server.close()

    assert.equal(code, 1)
    assert.match(output, /Ports 3000-3009 are all in use/)
    assert.match(output, /invalid_client/)
  })

  it('refuses a PORT that nothing has registered a callback for', async () => {
    // 4000 is outside 3000-3009 and no OAUTH_CALLBACK names it, so the
    // browser would send a callback Drupal has never heard of.
    const backend = await occupy()
    writeEnv([`BASE_URL=http://127.0.0.1:${backend.port}`, 'OAUTH_CLIENT_ID=test-client'])

    const { code, output } = await run('dev.mjs', { env: { PORT: '4000' } })
    backend.server.close()

    assert.equal(code, 1)
    assert.match(output, /no OAuth callback registered/)
    assert.match(output, /invalid_client/)
  })

  it('leaves an external backend to police its own callbacks', async () => {
    // Nothing here provisioned that consumer, so what it accepts is not
    // this checkout's to assert. `.invalid` never resolves, so the run
    // ends at the OAuth check without reaching the network.
    writeEnv(['BASE_URL=http://druxt-nowhere.invalid', 'OAUTH_CLIENT_ID=test-client'])

    const { output } = await run('dev.mjs', { env: { PORT: '4000' } })

    assert.match(output, /Backend \(external\)/)
    assert.doesNotMatch(output, /no OAuth callback registered/)
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
})
