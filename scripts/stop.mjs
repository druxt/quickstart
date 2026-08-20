/**
 * Stop the backend - only when it is the local .devtools PHP server.
 * DDEV / remote backends are left to their own tooling.
 */

import { backendInfo, exitWithError, runDevtools } from './lib.mjs'

try {
  const backend = backendInfo()

  if (!backend.url) {
    console.log('No BASE_URL in .env - nothing to stop.')
  } else if (!backend.managed) {
    console.log(`Backend ${backend.url} is external (DDEV/remote) - stop it with its own tooling.`)
  } else {
    runDevtools('stop')
  }
} catch (error) {
  exitWithError(error.message)
}
