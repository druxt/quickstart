/**
 * Print a Drupal one-time login link (drush uli) for the backend
 * configured in .env.
 */

import fs from 'node:fs'
import path from 'node:path'
import { DRUPAL_DIR, backendInfo, exitWithError, run } from './lib.mjs'

try {
  const backend = backendInfo()

  if (backend.url && !backend.managed && !backend.ddev) {
    exitWithError(
      `BASE_URL (${backend.url}) points at a remote backend - a login link can only be generated for the local backend or DDEV. Use that backend's own tooling instead.`
    )
  }

  if (backend.ddev) {
    // Inside DDEV, drush must run in the container.
    const args = ['drush', 'uli']
    if (backend.url) {
      args.push('-l', backend.url)
    }
    run('ddev', args, { cwd: DRUPAL_DIR })
  }
  else {
    // vendor/bin/drush is a bash wrapper; drush.php is the same Composer
    // bin proxy runnable directly with php (works on Windows too).
    const drush = path.join('vendor', 'bin', 'drush.php')
    if (!fs.existsSync(path.join(DRUPAL_DIR, drush))) {
      exitWithError('Drush is not installed - run `npm run setup` (or `npm run assemble`) first.')
    }

    const args = [drush, '-r', 'web', 'uli']
    if (backend.url) {
      args.push('-l', backend.url)
    }
    run('php', args, { cwd: DRUPAL_DIR })
  }
} catch (error) {
  exitWithError(`Unable to generate a login link: ${error.message}`)
}
