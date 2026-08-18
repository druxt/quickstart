/**
 * Run a Drush command against the backend configured in .env, e.g.
 * `npm run drush -- cr` or `npm run drush -- status --field=bootstrap`.
 */

import fs from 'node:fs'
import path from 'node:path'
import { DRUPAL_DIR, backendInfo, exitWithError, ddevProjectHost, run } from './lib.mjs'

const drushArgs = process.argv.slice(2)

try {
  const backend = backendInfo()

  if (backend.url && !backend.managed && !backend.ddev) {
    exitWithError(
      `BASE_URL (${backend.url}) points at a remote backend - Drush can only be run against the local backend or DDEV. Use that backend's own tooling instead.`
    )
  }

  if (backend.ddev) {
    // `ddev drush` always targets the project in drupal/ - reject a
    // BASE_URL naming some OTHER DDEV project before running commands
    // against the wrong site.
    const expected = ddevProjectHost()
    if (expected && backend.host !== expected) {
      exitWithError(
        `BASE_URL (${backend.url}) names a different DDEV project than drupal/.ddev/config.yaml (${expected}) - refusing to run against the wrong site.`
      )
    }
    // Inside DDEV, drush must run in the container.
    run('ddev', ['drush', ...drushArgs], { cwd: DRUPAL_DIR })
  } else {
    // vendor/bin/drush is a bash wrapper; drush.php is the same Composer
    // bin proxy runnable directly with php (works on Windows too).
    const drush = path.join('vendor', 'bin', 'drush.php')
    if (!fs.existsSync(path.join(DRUPAL_DIR, drush))) {
      exitWithError('Drush is not installed - run `npm run setup` (or `npm run assemble`) first.')
    }

    run('php', [drush, '-r', 'web', ...drushArgs], { cwd: DRUPAL_DIR })
  }
} catch (error) {
  exitWithError(`Drush command failed: ${error.message}`)
}
