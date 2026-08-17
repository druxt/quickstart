const fs = require('fs')
const path = require('path')
const { defineConfig } = require("cypress");

/**
 * Read BASE_URL from the repository-root .env - the same file
 * `drupal/.devtools/start` writes and nuxt.config.js reads. Specs that
 * talk to Drupal directly (not through the Nuxt app) need it, and it is
 * a different, auto-discovered port every run.
 */
function readDrupalBaseUrl() {
  try {
    const contents = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
    const match = contents.match(/^\s*BASE_URL\s*=\s*(.*?)\s*$/m)
    return match ? match[1].replace(/^(['"])(.*)\1$/, '$2') : null
  } catch {
    return null
  }
}

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    env: {
      DRUPAL_BASE_URL: readDrupalBaseUrl(),
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
