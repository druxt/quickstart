/* global it, cy */

it('Homepage', () => {
  // Given I visit the homepage.
  cy.visit('/')

  // Expect primary menu.
  cy.get('.region--primary-menu').should('exist')
    .find('li').should('have.length', 1)
    .first().should('contain.text', 'Home')

  // Expect secondary menu.
  cy.get('.region--secondary-menu').should('exist')
    .find('li').should('have.length', 1)
    .first().should('contain.text', 'Log in')

  // Expect empty frontpage in content block.
  cy.get('.region--content').should('exist')
    .should('contain.text', 'No front page content has been created yet.')
})
