/**
 * Start developing: bring up the backend if (and only if) BASE_URL points
 * at the local .devtools PHP server, then run the Nuxt dev server.
 *
 * DDEV / remote backends are used as-is and never started from here.
 */

import {
  NUXT_DIR,
  ensureBackend,
  ensureOauthClientId,
  exitWithError,
  foregroundNpm,
  isPortOpen,
  readEnv,
} from './lib.mjs'

const PORT = Number(process.env.PORT) || 3000

/**
 * Refuse to start when the frontend port is taken.
 *
 * Nuxt's dev server does not fail on a busy port - it falls back to a
 * random one. The OAuth consumer in Drupal is registered against a fixed
 * callback URL, so the login round trip then fails with a bare
 * `invalid_client` from Drupal, pointing nowhere near the real cause.
 */
async function ensureFrontendPortFree() {
  if (!(await isPortOpen('127.0.0.1', PORT))) {
    return
  }

  const callback = readEnv().OAUTH_CALLBACK || `http://localhost:${PORT}/callback`
  exitWithError(
    `Port ${PORT} is already in use.\n\n` +
      `  Nuxt would fall back to a random port, and login would then fail with\n` +
      `  {"error":"invalid_client"} - Drupal has the consumer registered for\n` +
      `  ${callback}, which would no longer match.\n\n` +
      `  Free the port (another dev server, or another copy of this project),\n` +
      `  or commit to a different one: set OAUTH_CALLBACK in .env to the port\n` +
      `  you want, re-run \`npm run provision\` to re-register the consumer,\n` +
      `  then start with \`PORT=<port> npm run dev\`.`
  )
}

/**
 * The consumer is registered for one callback URL. Serving the frontend
 * on a different port than that URL names fails the same way a busy
 * port does, just without anything else looking wrong.
 */
function ensureCallbackMatchesPort() {
  const callback = readEnv().OAUTH_CALLBACK
  if (!callback) {
    return
  }

  let parsed
  try {
    parsed = new URL(callback)
  } catch {
    return
  }

  const callbackPort = Number(parsed.port) || (parsed.protocol === 'https:' ? 443 : 80)
  if (callbackPort === PORT) {
    return
  }

  exitWithError(
    `OAUTH_CALLBACK names port ${callbackPort}, but the dev server would run on ${PORT}.\n\n` +
      `  Login would fail with {"error":"invalid_client"} - Drupal only accepts the\n` +
      `  callback it has registered (${callback}).\n\n` +
      `  Either start on that port with \`PORT=${callbackPort} npm run dev\`, or set\n` +
      `  OAUTH_CALLBACK to port ${PORT} and re-run \`npm run provision\` to\n` +
      `  re-register the consumer.`
  )
}

async function main() {
  await ensureBackend()
  ensureOauthClientId()
  ensureCallbackMatchesPort()
  await ensureFrontendPortFree()
  console.log(`Starting the Nuxt dev server -> http://localhost:${PORT}`)
  console.log('')
  process.exitCode = await foregroundNpm(['run', 'dev'], { cwd: NUXT_DIR })
}

main().catch((error) => exitWithError(error.message))
