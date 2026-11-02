/**
 * Production build, with what Nuxt 2's webpack needs on Node 17 or newer.
 */

import { NUXT_DIR, exitWithError, runNpm } from './lib.mjs'

try {
  runNpm(['run', 'build'], { cwd: NUXT_DIR })
} catch (error) {
  exitWithError(error.message)
}
