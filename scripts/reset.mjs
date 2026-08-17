/**
 * Stop the backend and wipe the throwaway SQLite database - the root-level
 * equivalent of `make reset` in drupal/Makefile. Re-run `npm run setup`
 * for a fresh site.
 */

import fs from 'node:fs'
import { backendInfo, exitWithError, readEnv, runDevtools } from './lib.mjs'

// Same precedence as drupal/.devtools: environment, then .env, then default.
const dbFile = process.env.DB_FILE || readEnv().DB_FILE || '/tmp/quickstart-drupal-site.sqlite'
const logFile = '/tmp/quickstart-drupal-php-server.log'
const pidFile = '/tmp/quickstart-drupal-php-server.pid'

try {
  const backend = backendInfo()

  if (backend.url && !backend.managed) {
    console.log(`Backend ${backend.url} is external (${backend.ddev ? 'DDEV' : 'remote'}) - reset it with its own tooling.`)
    if (backend.ddev) {
      console.log('From drupal/: ddev drupal-install && ddev druxt-add-consumer')
    }
    process.exit(0)
  }

  runDevtools('stop')
  fs.rmSync(dbFile, { force: true })
  fs.rmSync(logFile, { force: true })
  fs.rmSync(pidFile, { force: true })
  console.log(`Removed ${dbFile}`)
  console.log('')
  console.log('Run `npm run setup` (or `make setup`) for a fresh site.')
} catch (error) {
  exitWithError(error.message)
}
