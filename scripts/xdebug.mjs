/**
 * Toggle XDebug step-debugging on the local backend by restarting it with
 * XDEBUG=1 - the same thing `drupal/Makefile`'s `debug` target does, exposed
 * at the root so `npm run xdebug` / `mise run xdebug` work without cd'ing
 * into drupal/. Run `npm run devtools -- start` (no XDEBUG) to disable again.
 */

import { spawnSync } from 'node:child_process'
import { DRUPAL_DIR, exitWithError, runDevtools } from './lib.mjs'

function xdebugState() {
  const result = spawnSync('php', ['.devtools/info', 'xdebug'], {
    cwd: DRUPAL_DIR,
    encoding: 'utf8',
  })
  return result.stdout?.trim() ?? '-'
}

try {
  if (xdebugState() === 'enabled') {
    console.log("XDebug is already enabled. Run 'npm run devtools -- start' to disable.")
  } else {
    runDevtools('start', [], { env: { XDEBUG: '1' } })
    if (xdebugState() !== 'enabled') {
      exitWithError('Failed to enable XDebug.')
    }
    console.log("Enabled XDebug. Run 'npm run devtools -- start' to disable.")
  }
} catch (error) {
  exitWithError(`XDebug toggle failed: ${error.message}`)
}
