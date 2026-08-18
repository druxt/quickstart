/**
 * One-command first-time setup, as promised by the README:
 *
 *   npm run setup
 *
 * Backend-aware:
 * - No BASE_URL yet (fresh clone): full Docker-free pipeline - frontend
 *   dependencies, then drupal/.devtools (Composer install -> site install
 *   -> webserver), which also writes BASE_URL + OAUTH_CLIENT_ID to .env.
 * - BASE_URL pointing at DDEV (*.ddev.site) or a remote backend: only the
 *   frontend is ours to install; the backend keeps its own tooling and
 *   this script never rewrites .env.
 *
 * The same pipeline is also triggered by `npm install` at the repository
 * root on a fresh checkout (scripts/postinstall.mjs) - that is what
 * makes `npx giget gh:druxt/quickstart my-site --install` install
 * everything, not just the (empty) root package.
 */

import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  NUXT_DIR,
  SPLASH,
  backendInfo,
  exitWithError,
  miseAvailable,
  printCommands,
  readEnv,
  runDevtools,
  runNpm,
  toolAvailable,
} from './lib.mjs'

const prerequisites = [
  {
    command: 'php',
    hint: 'PHP 8.4+ with the usual Drupal extensions - https://www.php.net/manual/en/install.php',
  },
  {
    command: 'composer',
    hint: 'https://getcomposer.org/download/',
  },
]

function checkPrerequisites() {
  const missing = prerequisites.filter((tool) => !toolAvailable(tool.command))
  if (missing.length === 0) {
    return
  }

  console.error('Missing required tools:')
  for (const tool of missing) {
    console.error(`  - ${tool.command}: ${tool.hint}`)
  }
  console.error('')
  if (miseAvailable()) {
    console.error('mise users: run `mise install` in this repository to get PHP 8.4 + Node.')
  }
  console.error('Prefer containers? See README.md for the DDEV workflow.')
  exitWithError('Setup cannot continue.')
}

function setupFrontend() {
  console.log('==> Installing frontend dependencies (nuxt/)')
  runNpm(['install'], { cwd: NUXT_DIR })
}

function reportExternalSetup(backend) {
  console.log('')
  console.log('=======================================================')
  console.log('  Frontend setup complete')
  console.log('=======================================================')
  console.log(`  Backend (external): ${backend.url}`)
  if (backend.ddev) {
    console.log('')
    console.log('  Provision the DDEV backend from drupal/:')
    console.log('')
    console.log('    ddev start')
    console.log('    ddev drupal-install')
    console.log('    ddev druxt-add-consumer')
    console.log('')
    console.log('  Then copy the printed consumer UUID into OAUTH_CLIENT_ID')
    console.log('  in .env (it does not write .env itself).')
  } else {
    console.log('')
    console.log('  Provision the backend with its own tooling, then check')
    console.log('  OAUTH_CLIENT_ID in .env.')
  }
  console.log('')
  printCommands()
}

export async function runSetup({ splash = true } = {}) {
  if (splash) {
    console.log(SPLASH)
  }
  console.log('Setting up the Druxt quickstart (Drupal backend + Nuxt frontend)...')
  console.log('')

  const backend = backendInfo(readEnv())

  if (backend.url && !backend.managed) {
    console.log(`BASE_URL points at an external backend (${backend.url}) - frontend-only setup.`)
    console.log('')
    setupFrontend()
    reportExternalSetup(backend)
    return
  }

  checkPrerequisites()

  setupFrontend()

  console.log('')
  console.log('==> Assembling the backend (drupal/.devtools/assemble)')
  runDevtools('assemble')

  console.log('')
  console.log('==> Provisioning the site (drupal/.devtools/provision)')
  runDevtools('provision')

  console.log('')
  console.log('==> Starting the backend (drupal/.devtools/start)')
  runDevtools('start')

  const env = readEnv()
  console.log('')
  console.log('=======================================================')
  console.log('  Setup complete')
  console.log('=======================================================')
  console.log(`  Drupal backend : ${env.BASE_URL || '(see .env)'}`)
  console.log('  Nuxt frontend  : http://localhost:3000')
  console.log('')
  printCommands()
}

// Only auto-run when executed directly (npm run setup / node scripts/setup.mjs),
// not when imported by scripts/postinstall.mjs.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (invokedDirectly) {
  runSetup().catch((error) => exitWithError(`Setup failed: ${error.message}`))
}
