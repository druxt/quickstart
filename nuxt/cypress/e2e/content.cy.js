/* global before, it, cy */

const TITLE = 'Druxt quickstart test article'

before(() => {
  // Seed one Article via drupal/.devtools - a fresh quickstart install is
  // intentionally empty (see homepage.cy.js), so this spec provisions its
  // own content rather than relying on any. Marked non-promoted, so it
  // never appears on the front page and can't affect that spec either way.
  cy.exec('php .devtools/seed-test-content', { cwd: '../drupal' })
})

it('Article page', () => {
  // Given I visit the seeded Article at its default (un-aliased) route.
  cy.visit('/node/1')

  // Expect the entity to render inside the page's content region, with
  // its title and body - proof that a real Drupal entity survives the
  // full JSON:API -> DruxtRouter -> DruxtEntity round trip.
  cy.get('div[blocks][name="content"]').should('exist')
    .should('contain.text', TITLE)
    .should('contain.text', 'Seeded by .devtools/seed-test-content')
})
