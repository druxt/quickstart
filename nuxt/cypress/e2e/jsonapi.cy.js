/* global it, cy, Cypress, expect */

// Backend-only checks - no Nuxt rendering involved - covering the two
// things the frontend depends on but a page-render test wouldn't catch
// on its own: JSON:API being reachable at all, and OAuth key discovery
// (druxt-auth's authorization_code + PKCE flow needs the JWKS endpoint
// to validate tokens).
const drupalBaseUrl = Cypress.env('DRUPAL_BASE_URL')

it('JSON:API is reachable and describes the Druxt-enabled resource types', () => {
  cy.request(`${drupalBaseUrl}/jsonapi`).then((response) => {
    expect(response.status).to.eq(200)
    expect(response.body.links).to.have.property('node--article')
    expect(response.body.links).to.have.property('node--page')
  })
})

it('OAuth JWKS endpoint publishes at least one signing key', () => {
  cy.request(`${drupalBaseUrl}/oauth/jwks`).then((response) => {
    expect(response.status).to.eq(200)
    expect(response.body.keys).to.have.length.greaterThan(0)
  })
})
