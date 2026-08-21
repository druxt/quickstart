/**
 * Shared helpers for the repository-root npm scripts (scripts/*.mjs).
 *
 * Runs on plain Node (>= 16, see .nvmrc / mise.toml) with zero npm
 * dependencies: the root package.json intentionally has none, so
 * `npx giget gh:druxt/quickstart my-site --install` stays fast and
 * nothing can hoist over or conflict with nuxt/'s dependency tree.
 */

import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const DRUPAL_DIR = path.join(ROOT, 'drupal')
export const NUXT_DIR = path.join(ROOT, 'nuxt')
export const ENV_FILE = path.join(ROOT, '.env')
export const SETUP_LOCK_DIR = path.join(ROOT, '.setup.lock')

/**
 * What to tell a Windows user instead of failing midway: the local
 * backend runs a PHP built-in server managed with nohup, lsof, ps and
 * kill, and provisioning generates OAuth keys through OpenSSL, none of
 * which works on Windows outside a Linux environment.
 */
export const WINDOWS_HELP = [
  'The local PHP backend is not supported on Windows directly.',
  '',
  'Pick one of these instead - all three run this repo unchanged:',
  '',
  '  - Dev container: open this folder in VS Code and "Reopen in',
  '    Container", or run `devpod up .`. Everything is set up for you.',
  '  - WSL2: clone and run the same commands inside your Linux distro.',
  '  - DDEV or Lando: start the container backend, put its URL in',
  '    BASE_URL in .env, then run `npm run setup` for the frontend.',
  '',
  'See the Windows section of README.md.',
].join('\n')

/**
 * The setup lock: two setups in one checkout corrupt nuxt/node_modules
 * and drupal/vendor (two npm/composer processes race in the same dirs).
 * The realistic collision: a dev container's automatic post-create setup
 * still running when the user follows an error message that says to run
 * `npm run setup`.
 */
export function setupLockInfo() {
  let raw
  try {
    raw = JSON.parse(fs.readFileSync(path.join(SETUP_LOCK_DIR, 'lock.json'), 'utf8'))
  } catch {
    // Directory without a readable lock.json: either mid-write by the
    // other setup, or debris - treat as held, staleness can't be proven.
    return fs.existsSync(SETUP_LOCK_DIR) ? { pid: null, startedAt: null } : null
  }
  try {
    process.kill(raw.pid, 0)
    return raw
  } catch {
    // The owning process is gone (crash, container rebuild) - stale.
    fs.rmSync(SETUP_LOCK_DIR, { recursive: true, force: true })
    return null
  }
}

export function acquireSetupLock() {
  setupLockInfo() // clears a stale lock as a side effect
  try {
    fs.mkdirSync(SETUP_LOCK_DIR) // atomic: exactly one contender wins
  } catch {
    return false
  }
  fs.writeFileSync(
    path.join(SETUP_LOCK_DIR, 'lock.json'),
    JSON.stringify({ pid: process.pid, startedAt: Date.now() })
  )
  process.on('exit', releaseSetupLock)
  return true
}

export function releaseSetupLock() {
  fs.rmSync(SETUP_LOCK_DIR, { recursive: true, force: true })
}

function describeLockAge(lock) {
  if (!lock || !lock.startedAt) {
    return ''
  }
  return ` (started ${Math.max(1, Math.round((Date.now() - lock.startedAt) / 60000))} min ago)`
}

export function setupLockContentionMessage() {
  return (
    `another setup is already running in this checkout${describeLockAge(setupLockInfo())}.\n` +
    '  In a dev container that is the automatic post-create setup - let it\n' +
    '  finish. Two setups at once corrupt nuxt/node_modules and drupal/vendor.\n' +
    '  If that setup crashed, delete .setup.lock/ and re-run.'
  )
}

export const IS_WINDOWS = process.platform === 'win32'

// npm is npm.cmd on Windows, and .cmd files must be spawned via a shell.
const NPM = IS_WINDOWS ? 'npm.cmd' : 'npm'
const needsShell = (command) => IS_WINDOWS && /\.(cmd|bat|exe)$/i.test(command)

/**
 * The Druxt logo, as used by the druxt.js Gitpod welcome screen.
 */
export const SPLASH = `
██████╗ ██████╗ ██╗   ██╗██╗  ██╗████████╗     ██╗███████╗
██╔══██╗██╔══██╗██║   ██║╚██╗██╔╝╚══██╔══╝     ██║██╔════╝
██║  ██║██████╔╝██║   ██║ ╚███╔╝    ██║        ██║███████╗
██║  ██║██╔══██╗██║   ██║ ██╔██╗    ██║   ██   ██║╚════██║
██████╔╝██║  ██╗╚██████╔╝██╔╝ ██╗   ██║██╗╚█████╔╝███████║
╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝╚═╝ ╚════╝ ╚══════╝
`

/**
 * Parse the repository-root .env into a plain object ({} when absent).
 *
 * The file is written by drupal/.devtools (provision writes
 * OAUTH_CLIENT_ID, start writes BASE_URL) - it is not parsed with a
 * dependency, just enough of the dotenv format for KEY=VALUE lines.
 */
export function readEnv() {
  let contents
  try {
    contents = fs.readFileSync(ENV_FILE, 'utf8')
  } catch {
    return {}
  }

  const env = {}
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!match) continue
    env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return env
}

/**
 * The hostname this repo's own DDEV project serves at, read from
 * drupal/.ddev/config.yaml - or null if there is no DDEV config.
 *
 * Used to reject a *.ddev.site BASE_URL that names some OTHER DDEV
 * project: `ddev drush` always targets the project in drupal/, so a
 * mismatched BASE_URL would silently run commands against the wrong
 * site.
 */
export function ddevProjectHost() {
  try {
    const config = fs.readFileSync(path.join(DRUPAL_DIR, '.ddev', 'config.yaml'), 'utf8')
    const match = config.match(/^name:\s*(\S+)\s*$/m)
    return match ? `${match[1]}.ddev.site` : null
  } catch {
    return null
  }
}

/**
 * Classify the backend that BASE_URL points at.
 *
 * `managed: true` means a loopback URL - the PHP built-in server run by
 * drupal/.devtools - which `npm run dev` / `npm run start` may auto-start
 * when it is down. DDEV (*.ddev.site) and remote URLs may resolve to
 * loopback IP *addresses* but keep distinct *hostnames*, so they
 * correctly classify as external and are never started from here.
 */
export function backendInfo(env = readEnv()) {
  const url = env.BASE_URL
  if (!url) {
    return { managed: false, url: null, host: null, port: null }
  }

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return { managed: false, url, host: null, port: null }
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, '')
  const loopback = ['localhost', '127.0.0.1', '::1'].includes(host)
  return {
    managed: loopback,
    ddev: host.endsWith('.ddev.site'),
    lando: host.endsWith('.lndo.site'),
    url,
    host,
    port: Number(parsed.port) || (parsed.protocol === 'https:' ? 443 : 80),
  }
}

/**
 * Check whether a TCP host:port accepts connections.
 */
export function isPortOpen(host, port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const finish = (result) => {
      socket.destroy()
      resolve(result)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
    socket.connect(port, host)
  })
}

/**
 * Poll a host:port until it accepts connections, or time out.
 */
export async function waitForPort(host, port, timeoutSeconds = 30) {
  const deadline = Date.now() + timeoutSeconds * 1000
  while (Date.now() < deadline) {
    if (await isPortOpen(host, port, 500)) return true
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return false
}

/**
 * The ports the frontend may serve on. Provisioning registers an OAuth
 * callback for every one of them (drupal/.devtools/provision and
 * .ddev/commands/web/druxt-add-consumer), so moving between them never
 * breaks login. Anything outside the list does, because the browser
 * builds redirect_uri from its own origin and Drupal rejects an
 * unregistered one as, confusingly, invalid_client.
 */
export const FRONTEND_PORTS = Array.from({ length: 10 }, (_, index) => 3000 + index)

/** True when a port has an OAuth callback registered for it. */
export function portIsRegistered(port) {
  return FRONTEND_PORTS.includes(port)
}

/**
 * The first of `ports` nothing is listening on, or null when they are
 * all taken. Checked in order, so a free 3000 always wins.
 */
export async function firstFreePort(host, ports = FRONTEND_PORTS) {
  for (const port of ports) {
    if (!(await isPortOpen(host, port, 500))) return port
  }
  return null
}

/**
 * Run a command to completion, inheriting stdio. Throws on failure.
 */
export function run(command, args, { cwd, allowFailure = false, env } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: env ? { ...process.env, ...env } : undefined,
    stdio: 'inherit',
    shell: needsShell(command),
  })
  if (result.error) {
    throw new Error(`unable to run '${command}': ${result.error.message}`)
  }
  const status = result.status === null ? 1 : result.status
  if (status !== 0 && !allowFailure) {
    throw new Error(`command failed (${status}): ${command} ${args.join(' ')}`)
  }
  return status
}

/**
 * True when a command runs successfully (used for prerequisite checks).
 */
export function toolAvailable(command, args = ['-v']) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: needsShell(command),
  })
  return !result.error && result.status === 0
}

/**
 * True when mise is on PATH - gates mise-specific hints so people who
 * don't use it don't see irrelevant advice.
 */
export function miseAvailable() {
  return toolAvailable('mise')
}

/**
 * The day-to-day command list - shown after setup completes and
 * whenever a user needs reminding what's available. Every command here
 * is backend-aware (local .devtools, DDEV, remote) and safe to suggest
 * regardless of which one is in play.
 */
export function printCommands() {
  console.log('  Commands:')
  console.log('    npm run dev      Start the Nuxt frontend (auto-starts the local backend)')
  console.log('    npm run login    One-time Drupal login link')
  console.log('    npm run stop     Stop the local backend')
  console.log('    npm run reset    Wipe the local database, start fresh')
  console.log('    npm run info     Backend URL, ports, credentials')
  if (miseAvailable()) {
    console.log('    mise install     Pin Node + PHP to the versions this repo uses')
  }
  console.log('')
}

/**
 * Run a command attached to this terminal (Ctrl-C reaches it) and
 * resolve with its exit code once it ends.
 */
export function foreground(command, args, { cwd, env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: env ? { ...process.env, ...env } : undefined,
      stdio: 'inherit',
      shell: needsShell(command),
    })
    const forward = (signal) => child.kill(signal)
    process.on('SIGINT', () => forward('SIGINT'))
    process.on('SIGTERM', () => forward('SIGTERM'))
    child.once('error', reject)
    child.once('close', (code) => resolve(code === null ? 1 : code))
  })
}

/**
 * Run a drupal/.devtools script. Those scripts resolve `web/`,
 * `vendor/` and `../.env` relative to their *working directory*, so they
 * must always be started from drupal/. Going through `php` (rather than
 * the shebang) also keeps them working on Windows.
 */
export function runDevtools(script, args = [], { env } = {}) {
  return run('php', [`.devtools/${script}`, ...args], { cwd: DRUPAL_DIR, env })
}

/**
 * Node >= 17 ships OpenSSL 3, which dropped the legacy MD4 hash Nuxt 2's
 * webpack 4 uses for build hashing - every npm command below runs
 * through here (build/dev/start/generate all end up in nuxt/), and
 * without this they fail with "error:0308010C:digital envelope
 * routines::unsupported" on any Node newer than this repo's pinned 16.x.
 * A no-op on Node 16, so this is safe regardless of which Node actually
 * ends up on PATH.
 */
function withLegacyOpenssl(env = {}) {
  // The flag itself doesn't exist before Node 17 (it's how 17+ opted back
  // into OpenSSL 1.1's behavior) - Node rejects unrecognized flags in
  // NODE_OPTIONS outright rather than ignoring them, so adding it
  // unconditionally breaks this repo's own pinned Node 16.
  const nodeMajor = Number(process.versions.node.split('.')[0])
  if (nodeMajor < 17) return env

  const existing = env.NODE_OPTIONS ?? process.env.NODE_OPTIONS ?? ''
  if (existing.includes('--openssl-legacy-provider')) return env
  return { ...env, NODE_OPTIONS: `${existing} --openssl-legacy-provider`.trim() }
}

export function runNpm(args, opts = {}) {
  return run(NPM, args, { ...opts, env: withLegacyOpenssl(opts.env) })
}

export function foregroundNpm(args, opts = {}) {
  return foreground(NPM, args, { ...opts, env: withLegacyOpenssl(opts.env) })
}

/**
 * Make sure a backend is available for the frontend to talk to:
 * start the .devtools PHP server when BASE_URL is loopback and down;
 * never start anything for DDEV/external backends.
 */
export function ensureOauthClientId(env = readEnv()) {
  if (env.OAUTH_CLIENT_ID) {
    return
  }
  // Without this, Nuxt dies inside druxt-auth with "requires a clientId
  // to be provided", which says nothing about what to do. It is empty
  // whenever provisioning did not finish, so point at that instead.
  const backend = backendInfo(env)
  const fix =
    backend.url && !backend.managed
      ? "Create a consumer with the backend's own tooling (DDEV: `ddev druxt-add-consumer`,\n  Lando: `lando druxt-add-consumer`) and copy the printed UUID into .env."
      : 'Run `npm run setup` to provision the backend - it writes this value.'
  exitWithError(`OAUTH_CLIENT_ID is not set in .env.\n\n  ${fix}`)
}

export async function ensureBackend() {
  const backend = backendInfo()

  if (!backend.url) {
    if (setupLockInfo()) {
      exitWithError(
        'Setup is still running in this checkout (a dev container runs it\n' +
          'automatically after create). Wait for it to finish, then re-run.'
      )
    }
    exitWithError('No BASE_URL in .env - run `npm run setup` first.')
  }

  if (!backend.managed) {
    console.log(`Backend (external): ${backend.url}`)
    console.log('Start it yourself if it is not already running.')
    console.log('')
    return backend
  }

  if (await isPortOpen(backend.host, backend.port)) {
    console.log(`Backend (running): ${backend.url}`)
    console.log('')
    return backend
  }

  console.log('Backend not running - starting it via drupal/.devtools...')
  console.log('')
  runDevtools('start')
  const up = await waitForPort(backend.host, backend.port, 30)
  if (!up) {
    console.error(`Backend did not come up at ${backend.url}`)
    console.error('Log: /tmp/quickstart-drupal-php-server.log')
    process.exit(1)
  }

  console.log(`Backend (started): ${backend.url}`)
  console.log('')
  return backend
}

export function exitWithError(message) {
  console.error(`\n${message}\n`)
  process.exit(1)
}
