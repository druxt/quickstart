/**
 * Verify that the backend recognises the consumer in .env.
 *
 * The frontend's login button sends OAUTH_CLIENT_ID to /oauth/authorize.
 * If no consumer matches, Drupal answers `invalid_client` and the only
 * visible symptom is a failed login - the site otherwise looks fine,
 * because anonymous JSON:API does not involve OAuth at all. That is how
 * a consumer saved without its `client_id` field reached users twice.
 *
 * A recognised client gets past client validation (a redirect to the
 * login form, or a complaint about some other parameter). An
 * unrecognised one is rejected outright.
 */

import http from 'node:http'
import https from 'node:https'
import { exitWithError, readEnv } from './lib.mjs'

function request(url) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http
    const req = client.get(url, { timeout: 10000 }, (res) => {
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      })
      res.on('end', () => resolve({ status: res.statusCode, body }))
    })
    req.on('timeout', () => req.destroy(new Error('timed out')))
    req.on('error', reject)
  })
}

async function main() {
  const env = readEnv()
  if (!env.BASE_URL || !env.OAUTH_CLIENT_ID) {
    exitWithError(
      'BASE_URL and OAUTH_CLIENT_ID must both be set in .env - run `npm run setup` first.'
    )
  }

  const url = new URL('/oauth/authorize', env.BASE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', env.OAUTH_CLIENT_ID)
  url.searchParams.set('redirect_uri', env.OAUTH_CALLBACK || 'http://localhost:3000/callback')

  const { status, body } = await request(url)

  if (body.includes('invalid_client')) {
    exitWithError(
      `Drupal does not recognise OAUTH_CLIENT_ID (${env.OAUTH_CLIENT_ID}).\n\n` +
        '  Login fails with {"error":"invalid_client"} while the rest of the site\n' +
        '  works, because anonymous JSON:API never touches OAuth.\n\n' +
        '  Re-run `npm run provision` to recreate the consumer, then check that\n' +
        '  OAUTH_CLIENT_ID in .env matches its Client ID field.'
    )
  }

  console.log(`OAuth consumer recognised (HTTP ${status}).`)
}

main().catch((error) => exitWithError(`OAuth check failed: ${error.message}`))
