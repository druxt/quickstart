/**
 * Tests for scripts/check-oauth.mjs.
 *
 * Runs the real script against stub backends in a child process: it
 * exits on failure, and its whole job is to classify HTTP responses, so
 * exercising it end to end is what proves anything. The scripts resolve
 * .env from their own directory, so each case gets a throwaway copy of
 * scripts/ with its own .env.
 */

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** A backend that answers authorize and token however a case needs. */
function stubBackend({ authorize, token }) {
  const server = http.createServer((req, res) => {
    const target = req.method === 'POST' ? token : authorize
    if (target.status >= 300 && target.status < 400) {
      res.writeHead(target.status, { location: '/user/login' })
      res.end()
      return
    }
    res.writeHead(target.status, { 'content-type': 'application/json' })
    res.end(target.body === undefined ? '' : target.body)
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

const HEALTHY = {
  authorize: { status: 302 },
  token: { status: 400, body: JSON.stringify({ error: 'invalid_grant' }) },
}

let workspace

before(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'druxt-oauth-'))
  fs.cpSync(path.join(REPO, 'scripts'), path.join(workspace, 'scripts'), { recursive: true })
})

after(() => {
  fs.rmSync(workspace, { recursive: true, force: true })
})

/**
 * Run the script and collect its result.
 *
 * Async on purpose: spawnSync would block this process's event loop, and
 * the stub server lives here, so it could never answer the child.
 */
function runScript(cwdFile) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cwdFile], { encoding: 'utf8' })
    let output = ''
    child.stdout.on('data', (chunk) => {
      output += chunk
    })
    child.stderr.on('data', (chunk) => {
      output += chunk
    })
    child.on('close', (code) => resolve({ code, output }))
  })
}

/** Run the check against a stub, returning its exit code and output. */
async function runCheck(responses, env = {}) {
  const server = await stubBackend({ ...HEALTHY, ...responses })
  const { port } = server.address()
  const lines = [
    `BASE_URL=http://127.0.0.1:${port}`,
    'OAUTH_CLIENT_ID=test-client',
    ...Object.entries(env).map(([k, v]) => `${k}=${v}`),
  ]
  fs.writeFileSync(path.join(workspace, '.env'), `${lines.join('\n')}\n`)

  const result = await runScript(path.join(workspace, 'scripts/check-oauth.mjs'))
  server.close()
  return result
}

describe('check-oauth', () => {
  it('passes against a healthy backend', async () => {
    const { code, output } = await runCheck({})
    assert.equal(code, 0, output)
    assert.match(output, /OAuth consumer recognised/)
    assert.match(output, /Authorization code grant enabled/)
  })

  it('reports an unrecognised consumer', async () => {
    const { code, output } = await runCheck({
      authorize: { status: 401, body: JSON.stringify({ error: 'invalid_client' }) },
    })
    assert.equal(code, 1)
    assert.match(output, /does not recognise OAUTH_CLIENT_ID/)
  })

  it('reports a consumer without the authorization code grant', async () => {
    const { code, output } = await runCheck({
      token: { status: 400, body: JSON.stringify({ error: 'unsupported_grant_type' }) },
    })
    assert.equal(code, 1)
    assert.match(output, /authorization_code grant enabled/)
  })

  it('reports a backend that cannot resolve a scope', async () => {
    const { code, output } = await runCheck({
      authorize: {
        status: 400,
        body: JSON.stringify({ error: 'invalid_request', hint: 'Check the `scope` parameter' }),
      },
    })
    assert.equal(code, 1)
    assert.match(output, /cannot resolve a scope/)
  })

  // The check used to treat any response it did not recognise as a pass,
  // which is how it reported success while login was broken.
  it('fails closed on an error it does not recognise', async () => {
    const { code, output } = await runCheck({
      authorize: {
        status: 400,
        body: JSON.stringify({
          error: 'invalid_request',
          hint: 'Check the `redirect_uri` parameter',
        }),
      },
    })
    assert.equal(code, 1)
    assert.match(output, /Unexpected answer from authorize/)
  })

  it('fails closed on a non-JSON body', async () => {
    const { code, output } = await runCheck({ token: { status: 400, body: 'not json' } })
    assert.equal(code, 1)
    assert.match(output, /Unexpected answer from the token endpoint/)
  })

  it('requires BASE_URL and OAUTH_CLIENT_ID', async () => {
    fs.writeFileSync(path.join(workspace, '.env'), 'BASE_URL=http://127.0.0.1:1\n')
    const { code, output } = await runScript(path.join(workspace, 'scripts/check-oauth.mjs'))
    assert.equal(code, 1)
    assert.match(output, /must both be set/)
  })
})
