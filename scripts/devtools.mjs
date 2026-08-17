/**
 * Run any drupal/.devtools script by name, e.g.
 *
 *   npm run devtools -- assemble
 *   npm run devtools -- info
 */

import { exitWithError, runDevtools } from './lib.mjs'

const [script, ...args] = process.argv.slice(2)

if (!script || !/^[a-z][a-z0-9-]*$/.test(script)) {
  exitWithError('Usage: npm run devtools -- <script> [args...] (assemble, provision, start, stop, info)')
}

try {
  runDevtools(script, args)
} catch (error) {
  exitWithError(error.message)
}
