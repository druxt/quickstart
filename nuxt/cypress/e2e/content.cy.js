/* global before, it, cy */

const TITLE = 'Druxt quickstart test article'

before(() => {
  // Seed one Article via drupal/.devtools - a fresh quickstart install is
  // intentionally empty (see homepage.cy.js), so this spec provisions its
  // own content rather than relying on any. Marked non-promoted, so it
  // never appears on the front page and can't affect that spec either way.
  //
  // cy.exec() has no `cwd` option - it always runs from the Cypress
  // project root (nuxt/, where cypress.config.js lives). But
  // .devtools/seed-test-content itself needs its cwd to actually be
  // drupal/ (it resolves vendor/, web/ relative to its own working
  // directory, like every .devtools/ script) - `cd && php ...` gets
  // both right in one shell invocation.
  cy.exec('cd ../drupal && php .devtools/seed-test-content')
})

it('Article page', () => {
  // Given I visit the seeded Article at its default (un-aliased) route.
  cy.visit('/node/1')

  // Expect the page title to be the entity's title - the "Full content"
  // display mode hides the title field itself (Olivero's page title
  // block/breadcrumb render it instead, not the content region), so
  // <title> is the real assertion, not a substitute for one.
  cy.title().should('eq', TITLE)

  // Expect the entity's body to render inside the page's content region -
  // proof that a real Drupal entity survives the full JSON:API ->
  // DruxtRouter -> DruxtEntity round trip.
  cy.get('div[blocks][name="content"]').should('exist')
    .should('contain.text', 'Seeded by .devtools/seed-test-content')
})
