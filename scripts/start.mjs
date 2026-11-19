/**
 * Production mode: ensure the backend, build the frontend if it has not
 * been built yet, then serve it with `nuxt start`.
 */

import fs from 'node:fs'
import path from 'node:path'
import {
  NUXT_DIR,
  ensureBackend,
  buildMatchesAuth,
  ensureOauthClientId,
  oauthClientId,
  exitWithError,
  foregroundNpm,
  runNpm,
} from './lib.mjs'

async function main() {
  await ensureBackend()
  ensureOauthClientId()

  // `nuxt start` needs the server bundle from a production build. A dev
  // server's .nuxt/ has no dist/server, and a failed build leaves it empty, so
  // neither may fool this check.
  const built = fs.existsSync(path.join(NUXT_DIR, '.nuxt', 'dist', 'server', 'server.js'))
  // The auth module is compiled in or left out, so a build made with another
  // OAUTH_CLIENT_ID, or with none, would serve the wrong one.
  const stale = built && !buildMatchesAuth(oauthClientId())
  if (!built || stale) {
    console.log(
      stale
        ? 'OAUTH_CLIENT_ID has changed since the last build - building the frontend again...'
        : 'No production build found - building the frontend first...'
    )
    console.log('')
    runNpm(['run', 'build'], { cwd: NUXT_DIR })
    console.log('')
  }

  console.log('Serving the frontend -> http://localhost:3000')
  console.log('')
  process.exitCode = await foregroundNpm(['run', 'start'], { cwd: NUXT_DIR })
}

main().catch((error) => exitWithError(error.message))
