/**
 * Runs after `npm install` at the repository root - including
 * `npx giget gh:druxt/quickstart my-site --install`, where it is the
 * first thing a new user sees.
 *
 * `--install` should install, so on a fresh checkout with PHP +
 * Composer available this triggers the full setup pipeline (the same
 * one as `npm run setup`): frontend dependencies, Composer packages,
 * Drupal site (SQLite) and the backend webserver.
 *
 * It steps aside - banner only, always exit 0 - when doing work would
 * be wrong or impossible:
 * - CI (`CI` env var): CI installs happen in nuxt/ only, but never
 *   provision from a lifecycle hook just in case.
 * - Already set up (BASE_URL + OAUTH_CLIENT_ID present in .env):
 *   subsequent installs must not re-provision the site.
 * - PHP or Composer missing: the user gets pointed at `npm run setup`
 *   and the README instead of a failed install.
 */

import {
  IS_WINDOWS,
  SPLASH,
  WINDOWS_HELP,
  backendInfo,
  miseAvailable,
  printCommands,
  readEnv,
  toolAvailable,
} from './lib.mjs'
import { runSetup } from './setup.mjs'

function printNextSteps(hint) {
  console.log('  Next steps:')
  console.log('')
  if (hint) {
    console.log(hint)
    console.log('')
  }
  console.log('    npm run setup    # Install everything, provision Drupal (local PHP +')
  console.log('                      SQLite), start the backend')
  console.log('    npm run dev      # Run the Nuxt frontend at http://localhost:3000')
  console.log('')
  console.log('    Prefer DDEV? Keep the *.ddev.site BASE_URL in .env, run npm run')
  console.log('    setup (frontend only), then from drupal/: ddev start &&')
  console.log('    ddev drupal-install && ddev druxt-add-consumer')
  console.log('')
}

async function main() {
  console.log(SPLASH)

  const env = readEnv()

  if (process.env.CI) {
    console.log('  CI detected - skipping automatic setup.')
    console.log('')
    return
  }

  if (env.BASE_URL && env.OAUTH_CLIENT_ID) {
    console.log('  Already set up - backend, site and .env are in place.')
    console.log('')
    printCommands()
    return
  }

  // External/DDEV backend: setup is frontend-only (npm install in nuxt/),
  // which needs neither PHP nor Composer - never block it on them.
  const backend = backendInfo(env)
  const externalBackend = backend.url && !backend.managed

  if (IS_WINDOWS && !externalBackend) {
    console.log('  Node side ready.')
    console.log('')
    for (const line of WINDOWS_HELP.split('\n')) {
      console.log(line ? `  ${line}` : '')
    }
    console.log('')
    return
  }

  if (!externalBackend && (!toolAvailable('php') || !toolAvailable('composer'))) {
    console.log('  Node side ready. The backend needs PHP 8.3+ and Composer (or DDEV).')
    console.log('')
    printNextSteps(
      miseAvailable()
        ? '    Install them (mise users: `mise install`), then:'
        : '    Install them, then:'
    )
    return
  }

  console.log('  Fresh install detected - running full setup (frontend + Composer')
  console.log('  packages + Drupal site + backend). This takes a few minutes...')
  console.log('')

  await runSetup({ splash: false })

  console.log(`  All installed. In your terminal: cd ${process.cwd().split('/').pop()}`)
  console.log('')
}

main().catch((error) => {
  console.error('')
  console.error(`  Automatic setup did not complete: ${error.message}`)
  console.error('')
  printNextSteps('    Fix the issue above, then re-run:')
  // Never fail `npm install` itself: the (empty) root package installed
  // fine - the remaining work is what `npm run setup` is for.
  process.exit(0)
})
