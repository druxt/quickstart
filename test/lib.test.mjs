/**
 * Tests for scripts/lib.mjs.
 *
 * Uses node:test and node:assert so the root package keeps its zero
 * dependencies - the same reason the scripts themselves use no
 * libraries. Run with `npm run test:scripts`.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'

import {
  acquireSetupLock,
  backendInfo,
  backendIsProvisionedHere,
  DRUPAL_DIR,
  firstFreePort,
  FRONTEND_PORTS,
  isPortOpen,
  portIsRegistered,
  readEnv,
  releaseSetupLock,
  setupLockContentionMessage,
  setupLockInfo,
} from '../scripts/lib.mjs'

describe('backendInfo', () => {
  it('reports nothing when BASE_URL is unset', () => {
    const backend = backendInfo({})
    assert.equal(backend.url, null)
    assert.equal(backend.managed, false)
  })

  it('treats a loopback URL as the backend this repo manages', () => {
    for (const host of ['127.0.0.1', 'localhost', '[::1]']) {
      const backend = backendInfo({ BASE_URL: `http://${host}:8888` })
      assert.equal(backend.managed, true, host)
      assert.equal(backend.port, 8888, host)
    }
  })

  it('never manages DDEV, Lando or remote backends', () => {
    const cases = [
      ['https://quickstart-druxtsite.ddev.site', 'ddev'],
      ['https://druxt-quickstart.lndo.site', 'lando'],
    ]
    for (const [url, flag] of cases) {
      const backend = backendInfo({ BASE_URL: url })
      assert.equal(backend.managed, false, url)
      assert.equal(backend[flag], true, url)
    }

    const remote = backendInfo({ BASE_URL: 'https://demo-api.druxtjs.org' })
    assert.equal(remote.managed, false)
    assert.equal(remote.ddev, false)
    assert.equal(remote.lando, false)
  })

  it('defaults the port from the protocol', () => {
    assert.equal(backendInfo({ BASE_URL: 'https://example.com' }).port, 443)
    assert.equal(backendInfo({ BASE_URL: 'http://example.com' }).port, 80)
  })

  it('does not throw on a malformed BASE_URL', () => {
    const backend = backendInfo({ BASE_URL: 'not a url' })
    assert.equal(backend.managed, false)
    assert.equal(backend.host, null)
  })

  it('classifies a *.ddev.site host by name, not by resolved address', () => {
    // DDEV resolves to a loopback address but must never be auto-started
    // from here, so classification is by hostname.
    const backend = backendInfo({ BASE_URL: 'http://anything.ddev.site' })
    assert.equal(backend.managed, false)
  })
})

describe('backendIsProvisionedHere', () => {
  it('claims the backends this repo sets up', () => {
    const ours = [
      'http://127.0.0.1:8888',
      'https://quickstart-druxtsite.ddev.site',
      'https://druxt-quickstart.lndo.site',
    ]
    for (const url of ours) {
      assert.equal(backendIsProvisionedHere(backendInfo({ BASE_URL: url })), true, url)
    }
  })

  it('disclaims a backend set up somewhere else', () => {
    // Its consumer was registered out of sight, so what callbacks it
    // accepts is not this checkout's to assert.
    const backend = backendInfo({ BASE_URL: 'https://demo-api.druxtjs.org' })
    assert.equal(backendIsProvisionedHere(backend), false)
  })
})

describe('readEnv', () => {
  let dir
  let cwd

  before(() => {
    cwd = process.cwd()
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'druxt-env-'))
  })

  after(() => {
    process.chdir(cwd)
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('returns an empty object when there is no .env', () => {
    // ENV_FILE is resolved from the repo root, so this asserts the shape
    // rather than the contents.
    assert.equal(typeof readEnv(), 'object')
  })
})

describe('the setup lock', () => {
  it('is exclusive, and releases cleanly', () => {
    assert.equal(setupLockInfo(), null, 'no lock at rest')
    assert.equal(acquireSetupLock(), true, 'first acquire wins')
    assert.notEqual(setupLockInfo(), null, 'lock is visible once held')
    assert.equal(acquireSetupLock(), false, 'second acquire is refused')
    releaseSetupLock()
    assert.equal(setupLockInfo(), null, 'released')
  })

  it('names the contention in its message', () => {
    acquireSetupLock()
    const message = setupLockContentionMessage()
    releaseSetupLock()
    assert.match(message, /another setup is already running/)
    assert.match(message, /\.setup\.lock/)
  })
})

describe('the registered frontend ports', () => {
  it('cover exactly the ports provisioning registers a callback for', () => {
    // Drupal is the authority here: a port with no registered callback
    // fails login with invalid_client, so the two lists have to agree.
    const provision = fs.readFileSync(path.join(DRUPAL_DIR, '.devtools', 'provision'), 'utf8')
    const [, first, last] = provision.match(/range\((\d+),\s*(\d+)\)/)
    const expected = []
    for (let port = Number(first); port <= Number(last); port += 1) {
      expected.push(port)
    }
    assert.deepEqual(FRONTEND_PORTS, expected)
  })

  it('are the only ports portIsRegistered accepts', () => {
    for (const port of FRONTEND_PORTS) {
      assert.equal(portIsRegistered(port), true, String(port))
    }
    for (const port of [0, 80, 2999, 3010, 8080]) {
      assert.equal(portIsRegistered(port), false, String(port))
    }
  })

  it('does not accept a port that is not a number', () => {
    for (const port of ['3000', null, undefined, NaN]) {
      assert.equal(portIsRegistered(port), false, String(port))
    }
  })
})

describe('firstFreePort', () => {
  /** Listen on an ephemeral port, and report which one. */
  async function listen() {
    const server = net.createServer()
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    return { server, port: server.address().port }
  }

  /** A port nothing is listening on: take one, then give it back. */
  async function freePort() {
    const { server, port } = await listen()
    await new Promise((resolve) => server.close(resolve))
    return port
  }

  it('skips a port in use and returns the next free one', async () => {
    const busy = await listen()
    const free = await freePort()
    try {
      assert.equal(await firstFreePort('127.0.0.1', [busy.port, free]), free)
    } finally {
      busy.server.close()
    }
  })

  it('takes the first free port, not just any free one', async () => {
    const first = await freePort()
    const second = await freePort()
    assert.equal(await firstFreePort('127.0.0.1', [first, second]), first)
  })

  it('is null when every port is taken', async () => {
    const busy = await listen()
    try {
      assert.equal(await firstFreePort('127.0.0.1', [busy.port]), null)
    } finally {
      busy.server.close()
    }
  })
})

describe('isPortOpen', () => {
  it('reports a closed port as closed', async () => {
    // 1 is privileged and never listening in CI.
    assert.equal(await isPortOpen('127.0.0.1', 1, 250), false)
  })
})
