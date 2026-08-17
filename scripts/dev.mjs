/**
 * Start developing: bring up the backend if (and only if) BASE_URL points
 * at the local .devtools PHP server, then run the Nuxt dev server.
 *
 * DDEV / remote backends are used as-is and never started from here.
 */

import { NUXT_DIR, ensureBackend, exitWithError, foregroundNpm } from './lib.mjs'

async function main() {
  await ensureBackend()
  console.log('Starting the Nuxt dev server -> http://localhost:3000')
  console.log('')
  process.exitCode = await foregroundNpm(['run', 'dev'], { cwd: NUXT_DIR })
}

main().catch((error) => exitWithError(error.message))
