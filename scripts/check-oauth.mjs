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

import crypto from 'node:crypto'
import http from 'node:http'
import https from 'node:https'
import { exitWithError, readEnv } from './lib.mjs'

/** OAuth errors carry the useful detail in `hint`; surface it. */
function describe(response) {
  try {
    const parsed = JSON.parse(response.body)
    return `${parsed.error || '?'} - ${parsed.hint || parsed.error_description || ''}`
  } catch {
    return response.body.slice(0, 300).replace(/\s+/g, ' ')
  }
}

function request(url, postBody) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http
    const options = { timeout: 10000 }
    if (postBody !== undefined) {
      options.method = 'POST'
      options.headers = {
        'content-type': 'application/x-www-form-urlencoded',
        'content-length': Buffer.byteLength(postBody),
      }
    }
    const req = client.request(url, options, (res) => {
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      })
      res.on('end', () => resolve({ status: res.statusCode, body }))
    })
    req.on('timeout', () => req.destroy(new Error('timed out')))
    req.on('error', reject)
    req.end(postBody)
  })
}

async function main() {
  const env = readEnv()
  if (!env.BASE_URL || !env.OAUTH_CLIENT_ID) {
    exitWithError(
      'BASE_URL and OAUTH_CLIENT_ID must both be set in .env - run `npm run setup` first.'
    )
  }

  // The consumer requires PKCE, so a request without a challenge is
  // rejected before anything else is looked at - including the scope.
  const verifier = 'quickstart-oauth-check-verifier-0123456789'
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')

  const url = new URL('/oauth/authorize', env.BASE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', env.OAUTH_CLIENT_ID)
  url.searchParams.set('redirect_uri', env.OAUTH_CALLBACK || 'http://localhost:3000/callback')
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')

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
  if (status >= 400) {
    console.log(`  authorize without scope -> ${describe({ status, body })}`)
  }

  // Being recognised is not enough: the consumer also has to have the
  // authorization_code grant enabled, or the code exchange fails with
  // unsupported_grant_type after the user has already logged in. Sending
  // a deliberately invalid code is enough to tell the two apart.
  const tokenUrl = new URL('/oauth/token', env.BASE_URL)
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.OAUTH_CLIENT_ID,
    redirect_uri: env.OAUTH_CALLBACK || 'http://localhost:3000/callback',
    code: 'not-a-real-code',
    code_verifier: 'not-a-real-verifier',
  }).toString()

  const token = await request(tokenUrl, form)

  if (token.body.includes('unsupported_grant_type')) {
    exitWithError(
      'The consumer does not have the authorization_code grant enabled.\n\n' +
        '  Login gets as far as the code exchange and then fails with\n' +
        '  {"error":"unsupported_grant_type"}.\n\n' +
        '  Re-run `npm run provision` to recreate the consumer.'
    )
  }

  console.log('Authorization code grant enabled.')

  // druxt-auth sends `scope=` empty: @nuxtjs/auth-next defaults the
  // option to [], its getter joins that to '', and its query encoder
  // drops undefined but keeps empty strings. Probing with the same
  // parameter tells us whether that empty value is what Drupal rejects,
  // separately from anything this repo controls. Reported, not fatal -
  // the fix for it lives in druxt-auth.
  const emptyScopeUrl = new URL(url)
  emptyScopeUrl.searchParams.set('scope', '')
  const emptyScope = await request(emptyScopeUrl)

  if (emptyScope.body.includes('Check the `scope` parameter')) {
    exitWithError(
      'The backend cannot resolve a scope for this consumer.\n\n' +
        `  ${describe(emptyScope)}\n\n` +
        '  Login fails with invalid_request whether the frontend sends a scope\n' +
        '  or not, so provisioning must create an oauth2_scope and set it as the\n' +
        "  consumer's authorization_code_scopes. Re-run `npm run provision`."
    )
  } else if (emptyScope.status !== status) {
    console.log(`  empty scope -> ${describe(emptyScope)}`)
  } else {
    console.log(`Empty scope accepted (HTTP ${emptyScope.status}).`)
  }
}

main().catch((error) => exitWithError(`OAuth check failed: ${error.message}`))
