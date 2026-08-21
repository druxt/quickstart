/**
 * Start developing: bring up the backend if (and only if) BASE_URL points
 * at the local .devtools PHP server, then run the Nuxt dev server.
 *
 * DDEV / remote backends are used as-is and never started from here.
 */

import { checkOauth } from './check-oauth.mjs'
import {
  FRONTEND_PORTS,
  NUXT_DIR,
  ensureBackend,
  ensureOauthClientId,
  exitWithError,
  firstFreePort,
  foregroundNpm,
  isPortOpen,
  portIsRegistered,
  readEnv,
} from './lib.mjs'

// Nuxt binds 0.0.0.0 (see nuxt.config.js), which answers on loopback
// too, so this is the probe for "is that port taken".
const HOST = '127.0.0.1'
const PORT_RANGE = `${FRONTEND_PORTS[0]}-${FRONTEND_PORTS[FRONTEND_PORTS.length - 1]}`
const ENV_PORT = Number(process.env.PORT)
// A usable PORT in the environment is a decision; the default is only a
// starting point. An empty or unparsable one is neither.
const PORT_IS_EXPLICIT = Number.isInteger(ENV_PORT) && ENV_PORT > 0
const REQUESTED_PORT = PORT_IS_EXPLICIT ? ENV_PORT : FRONTEND_PORTS[0]

/**
 * Pick the port to serve the frontend on.
 *
 * Nuxt's dev server does not fail on a busy port - it falls back to a
 * random one. The OAuth consumer in Drupal is registered against a fixed
 * set of callback URLs, so the login round trip then fails with a bare
 * `invalid_client` from Drupal, pointing nowhere near the real cause.
 *
 * Provisioning registers all of FRONTEND_PORTS for exactly that reason,
 * which makes a busy default a choice rather than a failure: take the
 * next registered port and say so. A port the user named is theirs.
 *
 * Something else can still take the port between this check and Nuxt
 * binding it, which lands back on Nuxt's own random fallback - the same
 * place an unguarded start would have been anyway.
 */
async function resolveFrontendPort() {
  if (!(await isPortOpen(HOST, REQUESTED_PORT))) {
    return REQUESTED_PORT
  }

  if (PORT_IS_EXPLICIT) {
    exitWithError(
      `Port ${REQUESTED_PORT} is already in use, and PORT asks for it by name.\n\n` +
        `  Nuxt would fall back to a random port, and login would then fail with\n` +
        `  {"error":"invalid_client"} - Drupal only accepts a callback it has\n` +
        `  registered.\n\n` +
        `  Free the port (another dev server, or another copy of this project),\n` +
        `  or drop PORT and let \`npm run dev\` take the first free one of\n` +
        `  ${PORT_RANGE}.`
    )
  }

  const port = await firstFreePort(HOST)
  if (port === null) {
    exitWithError(
      `Ports ${PORT_RANGE} are all in use.\n\n` +
        `  Nuxt would fall back to a random port, and login would then fail with\n` +
        `  {"error":"invalid_client"} - those are the only callbacks Drupal has\n` +
        `  registered.\n\n` +
        `  Free one of them, or commit to a port outside the range: set\n` +
        `  OAUTH_CALLBACK in .env to that port, re-run \`npm run provision\` to\n` +
        `  re-register the consumer, then start with \`PORT=<port> npm run dev\`.`
    )
  }

  console.log(`Port ${REQUESTED_PORT} is in use - starting on ${port} instead.`)
  console.log(`Login still works: Drupal accepts the callback on any of ${PORT_RANGE}.`)
  console.log('')
  return port
}

/**
 * The consumer is registered for one callback URL plus the whole
 * FRONTEND_PORTS range. Serving the frontend anywhere else fails the
 * same way a busy port does, just without anything else looking wrong.
 */
function ensureCallbackMatchesPort(port) {
  // Provisioning registers the range whatever OAUTH_CALLBACK says, so
  // a port from it is always accepted.
  if (portIsRegistered(port)) {
    return
  }

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
  if (callbackPort === port) {
    return
  }

  exitWithError(
    `OAUTH_CALLBACK names port ${callbackPort}, but the dev server would run on ${port}.\n\n` +
      `  Login would fail with {"error":"invalid_client"} - Drupal only accepts the\n` +
      `  callback it has registered (${callback}).\n\n` +
      `  Either start on that port with \`PORT=${callbackPort} npm run dev\`, or set\n` +
      `  OAUTH_CALLBACK to port ${port} and re-run \`npm run provision\` to\n` +
      `  re-register the consumer.`
  )
}

async function main() {
  await ensureBackend()
  ensureOauthClientId()
  const port = await resolveFrontendPort()
  ensureCallbackMatchesPort(port)
  // Confirm the backend will actually accept this consumer. Nuxt reads
  // OAUTH_CLIENT_ID once at startup, so a stale value - or a consumer
  // left over from an older provision - shows up only as a failed login
  // in the browser, with nothing in the terminal to explain it.
  await checkOauth()
  console.log(`Starting the Nuxt dev server -> http://localhost:${port}`)
  console.log('')
  process.exitCode = await foregroundNpm(['run', 'dev'], {
    cwd: NUXT_DIR,
    env: { PORT: String(port) },
  })
}

main().catch((error) => exitWithError(error.message))
