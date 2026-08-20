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

function parse(response) {
  try {
    return JSON.parse(response.body)
  } catch {
    return null
  }
}

/**
 * A usable authorize endpoint sends the visitor to the login form. Treat
 * everything else as a failure, including responses this script does not
 * recognise: an earlier version only looked for known error strings, so
 * unrelated failures were reported as passes.
 */
function assertAuthorizeAccepted(response, label, env) {
  if ([200, 301, 302, 303, 307, 308].includes(response.status)) {
    return
  }

  const error = parse(response)
  if (error && error.error === 'invalid_client') {
    exitWithError(
      `Drupal does not recognise OAUTH_CLIENT_ID (${env.OAUTH_CLIENT_ID}).\n\n` +
        '  Login fails while the rest of the site works, because anonymous\n' +
        '  JSON:API never touches OAuth.\n\n' +
        '  Re-run `npm run provision` to recreate the consumer.'
    )
  }
  if (error && String(error.hint || '').includes('scope')) {
    exitWithError(
      `The backend cannot resolve a scope for this consumer (${label}).\n\n` +
        `  ${describe(response)}\n\n` +
        '  Provisioning must create an oauth2_scope and set it as the\n' +
        "  consumer's authorization_code_scopes. Re-run `npm run provision`."
    )
  }
  exitWithError(
    `Unexpected answer from ${label} (HTTP ${response.status}).\n\n  ${describe(response)}`
  )
}

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

  const authorize = await request(url)
  assertAuthorizeAccepted(authorize, 'authorize', env)
  console.log(`OAuth consumer recognised (HTTP ${authorize.status}).`)

  // Being recognised is not enough: the consumer also needs the
  // authorization_code grant, or login fails at the code exchange after
  // the user has already signed in. A deliberately invalid code should
  // be rejected as a bad *code* - any other answer means something else
  // is wrong.
  const tokenUrl = new URL('/oauth/token', env.BASE_URL)
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.OAUTH_CLIENT_ID,
    redirect_uri: env.OAUTH_CALLBACK || 'http://localhost:3000/callback',
    code: 'not-a-real-code',
    code_verifier: 'not-a-real-verifier',
  }).toString()

  const token = await request(tokenUrl, form)
  const tokenError = parse(token)

  if (!tokenError || typeof tokenError.error !== 'string') {
    exitWithError(
      `Unexpected answer from the token endpoint (HTTP ${token.status}).\n\n  ${describe(token)}`
    )
  }
  if (tokenError.error === 'unsupported_grant_type') {
    exitWithError(
      'The consumer does not have the authorization_code grant enabled.\n\n' +
        '  Login reaches the code exchange and fails there.\n' +
        '  Re-run `npm run provision` to recreate the consumer.'
    )
  }
  if (tokenError.error !== 'invalid_grant' && tokenError.error !== 'invalid_request') {
    exitWithError(
      `The token endpoint rejected the exchange for an unexpected reason.\n\n  ${describe(token)}`
    )
  }
  console.log('Authorization code grant enabled.')

  // druxt-auth sends `scope=` empty (@nuxtjs/auth-next defaults the
  // option to [] and its encoder keeps empty strings), so the real login
  // request has to be accepted with that parameter present too.
  const emptyScopeUrl = new URL(url)
  emptyScopeUrl.searchParams.set('scope', '')
  const emptyScope = await request(emptyScopeUrl)
  assertAuthorizeAccepted(emptyScope, 'authorize with an empty scope', env)
  console.log(`Empty scope accepted (HTTP ${emptyScope.status}).`)
}

main().catch((error) => exitWithError(`OAuth check failed: ${error.message}`))
