/**
 * Direct tests for check-oauth's response classification.
 *
 * The child-process tests in check-oauth.test.mjs cover the exits a user
 * actually meets; these cover the same decisions in-process, so the
 * branch that decides them is measured rather than invisible to
 * coverage.
 */

import assert from 'node:assert/strict'
import { describe as suite, it } from 'node:test'

import { assertAuthorizeAccepted, describe, parse } from '../scripts/check-oauth.mjs'

const ENV = { OAUTH_CLIENT_ID: 'test-client' }

/** assertAuthorizeAccepted exits the process; capture that instead. */
function classify(response) {
  const realExit = process.exit
  const realError = console.error
  let exited = null
  let message = ''
  process.exit = (code) => {
    exited = code
    throw new Error('__exit__')
  }
  console.error = (text) => {
    message += text
  }
  try {
    assertAuthorizeAccepted(response, 'authorize', ENV)
  } catch (error) {
    if (error.message !== '__exit__') throw error
  } finally {
    process.exit = realExit
    console.error = realError
  }
  return { exited, message }
}

suite('parse', () => {
  it('returns the parsed body, or null when it is not JSON', () => {
    assert.deepEqual(parse({ body: '{"error":"invalid_grant"}' }), { error: 'invalid_grant' })
    assert.equal(parse({ body: 'not json' }), null)
    assert.equal(parse({ body: '' }), null)
  })
})

suite('describe', () => {
  it('prefers the hint, which names the offending parameter', () => {
    assert.match(
      describe({
        body: JSON.stringify({ error: 'invalid_request', hint: 'Check the `scope` parameter' }),
      }),
      /invalid_request - Check the `scope` parameter/
    )
  })

  it('falls back to the description, then to the raw body', () => {
    assert.match(
      describe({
        body: JSON.stringify({
          error: 'invalid_client',
          error_description: 'Client authentication failed',
        }),
      }),
      /Client authentication failed/
    )
    assert.match(describe({ body: '<html>  oops\n</html>' }), /<html> oops <\/html>/)
  })
})

suite('assertAuthorizeAccepted', () => {
  it('accepts the redirects and pages a login flow produces', () => {
    for (const status of [200, 301, 302, 303, 307, 308]) {
      assert.equal(classify({ status, body: '' }).exited, null, `status ${status}`)
    }
  })

  it('names an unrecognised consumer', () => {
    const { exited, message } = classify({
      status: 401,
      body: JSON.stringify({ error: 'invalid_client' }),
    })
    assert.equal(exited, 1)
    assert.match(message, /does not recognise OAUTH_CLIENT_ID \(test-client\)/)
  })

  it('names an unresolvable scope', () => {
    const { exited, message } = classify({
      status: 400,
      body: JSON.stringify({ error: 'invalid_request', hint: 'Check the `scope` parameter' }),
    })
    assert.equal(exited, 1)
    assert.match(message, /cannot resolve a scope/)
  })

  it('fails closed on anything it does not recognise', () => {
    for (const body of [
      JSON.stringify({ error: 'invalid_request', hint: 'Check the `redirect_uri` parameter' }),
      JSON.stringify({ error: 'server_error' }),
      'not json at all',
    ]) {
      const { exited, message } = classify({ status: 400, body })
      assert.equal(exited, 1, body)
      assert.match(message, /Unexpected answer from authorize/)
    }
  })
})
