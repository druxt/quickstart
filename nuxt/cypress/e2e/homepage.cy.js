/* global it, cy */

it('Homepage', () => {
  // Given I visit the homepage.
  cy.visit('/')

  // Expect primary menu.
  cy.get('div[blocks][name="primary_menu"]').should('exist')
    .find('li').should('have.length', 1)
    .first().should('contain.text', 'Home')

  // Expect secondary menu.
  cy.get('div[blocks][name="secondary_menu"]').should('exist')
    .find('li').should('have.length', 1)
    .first().should('contain.text', 'Log in')

  // Expect empty frontpage in content block.
  cy.get('div[blocks][name="content"]').should('exist')
    .should('contain.text', 'No front page content has been created yet.')
})
