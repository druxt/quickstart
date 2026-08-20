/* global before, it, cy, expect */

const TITLE = 'Druxt quickstart test article'

let nodePath

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
  cy.exec('cd ../drupal && php .devtools/seed-test-content').then(({ stdout }) => {
    // Drupal allocates the node ID; it is only 1 on a database with no
    // prior nodes. Re-running the suite without a reset (or seeding after
    // any other content exists) allocates a higher one, so read the path
    // back from the command instead of assuming.
    const match = stdout.match(/\(node\/(\d+)\)/)
    expect(match, `seed output should report the created node path, got: ${stdout}`).to.not.equal(null)
    nodePath = `/node/${match[1]}`
  })
})

it('Article page', () => {
  // Given I visit the seeded Article at its default (un-aliased) route.
  cy.visit(nodePath)

  // Expect the page title to be the entity's title - the "Full content"
  // display mode hides the title field itself (Olivero's page title
  // block/breadcrumb render it instead, not the content region), so
  // <title> is the real assertion, not a substitute for one.
  cy.title().should('eq', TITLE)

  // Expect the entity's body to render inside the page's content region -
  // proof that a real Drupal entity survives the full JSON:API ->
  // DruxtRouter -> DruxtEntity round trip.
  cy.get('div[blocks][name="content"]')
    .should('exist')
    .should('contain.text', 'Seeded by .devtools/seed-test-content')
})
