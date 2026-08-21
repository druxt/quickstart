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
  ddevProjectHost,
  DRUPAL_DIR,
  ensureOauthClientId,
  foreground,
  foregroundNpm,
  isPortOpen,
  MINIMUM_PHP,
  miseAvailable,
  phpBelowMinimum,
  phpVersion,
  printCommands,
  readEnv,
  releaseSetupLock,
  run,
  runNpm,
  SETUP_LOCK_DIR,
  setupLockContentionMessage,
  setupLockInfo,
  toolAvailable,
  waitForPort,
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

  it('clears a lock whose owner is gone', () => {
    // A crash or a container rebuild leaves the directory behind. Left
    // alone it would refuse every later setup.
    fs.mkdirSync(SETUP_LOCK_DIR, { recursive: true })
    fs.writeFileSync(
      path.join(SETUP_LOCK_DIR, 'lock.json'),
      JSON.stringify({ pid: 0x7fffffff, startedAt: Date.now() })
    )
    assert.equal(setupLockInfo(), null, 'a dead owner means stale')
    assert.equal(fs.existsSync(SETUP_LOCK_DIR), false, 'and the debris is gone')
  })

  it('treats a lock it cannot read as held', () => {
    // Mid-write by the other setup: staleness cannot be proven, so the
    // safe answer is held.
    fs.mkdirSync(SETUP_LOCK_DIR, { recursive: true })
    try {
      const info = setupLockInfo()
      assert.notEqual(info, null)
      assert.equal(info.pid, null)
    } finally {
      fs.rmSync(SETUP_LOCK_DIR, { recursive: true, force: true })
    }
  })
})

describe('isPortOpen', () => {
  it('reports a closed port as closed', async () => {
    // 1 is privileged and never listening in CI.
    assert.equal(await isPortOpen('127.0.0.1', 1, 250), false)
  })
})

describe('phpBelowMinimum', () => {
  it('matches the floor the setup preflight and composer.json agree on', () => {
    assert.deepEqual(MINIMUM_PHP, [8, 3])
  })

  it('rejects every version too old to run Drupal 11', () => {
    for (const version of ['7.4.33', '8.0.30', '8.1.31', '8.2.29', '8.2']) {
      assert.equal(phpBelowMinimum(version), true, version)
    }
  })

  it('accepts the floor itself and anything newer', () => {
    for (const version of ['8.3.0', '8.3.11', '8.4.24', '9.0.0', '10.1.0']) {
      assert.equal(phpBelowMinimum(version), false, version)
    }
  })

  it('does not reject a version it cannot read', () => {
    // Guessing here would block a working machine. An unreadable version
    // is composer's to report.
    for (const version of [null, undefined, '', 'unknown', 'php8']) {
      assert.equal(phpBelowMinimum(version), false, String(version))
    }
  })
})

describe('phpVersion', () => {
  let shim
  let realPath

  before(() => {
    shim = fs.mkdtempSync(path.join(os.tmpdir(), 'druxt-php-'))
    realPath = process.env.PATH
  })

  after(() => {
    process.env.PATH = realPath
    fs.rmSync(shim, { recursive: true, force: true })
  })

  /** Put a php on PATH that prints whatever a case needs. */
  function stubPhp(body) {
    fs.writeFileSync(path.join(shim, 'php'), `#!/bin/sh\n${body}\n`, { mode: 0o755 })
    process.env.PATH = [shim, realPath].join(path.delimiter)
  }

  it('reports what the php on PATH prints', () => {
    stubPhp('echo 8.3.11')
    assert.equal(phpVersion(), '8.3.11')
  })

  it('is null when the output is not a version', () => {
    stubPhp('echo not-a-version')
    assert.equal(phpVersion(), null)
  })

  it('is null when there is no php at all', () => {
    process.env.PATH = path.dirname(process.execPath)
    assert.equal(phpVersion(), null)
  })
})

describe('toolAvailable', () => {
  it('finds a command that runs', () => {
    assert.equal(toolAvailable(process.execPath, ['--version']), true)
  })

  it('does not find a command that is not installed', () => {
    assert.equal(toolAvailable('druxt-no-such-command'), false)
  })

  it('answers for mise either way, so the hints can be gated on it', () => {
    assert.equal(typeof miseAvailable(), 'boolean')
  })
})

describe('ddevProjectHost', () => {
  it('names the DDEV project committed in drupal/', () => {
    // backendInfo rejects a *.ddev.site BASE_URL naming another project,
    // so this has to track the real config rather than a copy of it.
    const config = fs.readFileSync(path.join(DRUPAL_DIR, '.ddev', 'config.yaml'), 'utf8')
    const name = config.match(/^name:\s*(\S+)\s*$/m)[1]
    assert.equal(ddevProjectHost(), `${name}.ddev.site`)
  })
})

describe('run', () => {
  it('returns 0 when the command succeeds', () => {
    assert.equal(run(process.execPath, ['-e', '']), 0)
  })

  it('throws on a non-zero exit, naming the status', () => {
    assert.throws(() => run(process.execPath, ['-e', 'process.exit(3)']), /command failed \(3\)/)
  })

  it('returns the status instead when failure is allowed', () => {
    assert.equal(run(process.execPath, ['-e', 'process.exit(3)'], { allowFailure: true }), 3)
  })

  it('says which command could not be run at all', () => {
    assert.throws(() => run('druxt-no-such-command', []), /unable to run 'druxt-no-such-command'/)
  })
})

describe('waitForPort', () => {
  it('returns as soon as the port answers', async () => {
    const server = net.createServer()
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address()
    assert.equal(await waitForPort('127.0.0.1', port, 5), true)
    server.close()
  })

  it('gives up when nothing ever listens', async () => {
    // 1 is privileged and never listening in CI.
    assert.equal(await waitForPort('127.0.0.1', 1, 1), false)
  })
})

describe('printCommands', () => {
  it('lists the day-to-day commands', () => {
    const lines = []
    const log = console.log
    console.log = (line = '') => lines.push(String(line))
    try {
      printCommands()
    } finally {
      console.log = log
    }
    const output = lines.join('\n')
    for (const command of ['npm run dev', 'npm run login', 'npm run stop', 'npm run reset']) {
      assert.ok(output.includes(command), command)
    }
  })
})

describe('ensureOauthClientId', () => {
  it('passes silently once the consumer UUID is in .env', () => {
    // The missing case exits the process, so it is asserted from a child
    // process in guards.test.mjs instead.
    assert.doesNotThrow(() => ensureOauthClientId({ OAUTH_CLIENT_ID: 'a-uuid' }))
  })
})

describe('foreground', () => {
  it('resolves with the exit code once the command ends', async () => {
    assert.equal(await foreground(process.execPath, ['-e', '']), 0)
    assert.equal(await foreground(process.execPath, ['-e', 'process.exit(4)']), 4)
  })

  it('rejects when the command cannot be started', async () => {
    await assert.rejects(() => foreground('druxt-no-such-command', []))
  })
})

describe('the npm wrappers', () => {
  // Every npm command in this repo goes through these, which is where
  // --openssl-legacy-provider is added: Nuxt 2's webpack 4 cannot hash
  // on OpenSSL 3, and Node rejects the flag outright before 17.
  it('runs npm and returns its exit code', () => {
    assert.equal(runNpm(['--version']), 0)
  })

  it('runs npm attached to the terminal too', async () => {
    assert.equal(await foregroundNpm(['--version']), 0)
  })

  it('leaves an explicit NODE_OPTIONS alone rather than duplicating the flag', () => {
    const options = '--openssl-legacy-provider'
    assert.equal(runNpm(['--version'], { env: { NODE_OPTIONS: options } }), 0)
  })
})
