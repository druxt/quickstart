/**
 * Production mode: ensure the backend, build the frontend if it has not
 * been built yet, then serve it with `nuxt start`.
 */

import fs from 'node:fs'
import path from 'node:path'
import { NUXT_DIR, ensureBackend, exitWithError, foregroundNpm, runNpm } from './lib.mjs'

async function main() {
  await ensureBackend()

  // `nuxt start` needs the server bundle from a production build; a dev
  // server's .nuxt/ (no dist/server) must not fool this check.
  if (!fs.existsSync(path.join(NUXT_DIR, '.nuxt', 'dist', 'server'))) {
    console.log('No production build found - building the frontend first...')
    console.log('')
    runNpm(['run', 'build'], { cwd: NUXT_DIR })
    console.log('')
  }

  console.log('Serving the frontend -> http://localhost:3000')
  console.log('')
  process.exitCode = await foregroundNpm(['run', 'start'], { cwd: NUXT_DIR })
}

main().catch((error) => exitWithError(error.message))
