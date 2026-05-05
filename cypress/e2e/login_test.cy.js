describe('Team Lead - Time Sheet Submission', () => {

  it('TL submits personal time sheet', () => {
    // 1. Login as Team Lead
    cy.visit('/'); 
    cy.get('input').first().type('ashishinturi50@gmaill.com'); 
    cy.get('input[type="password"]').type('ACS1002');
    cy.get('button[type="submit"]').click();
    
    // 2. Navigate to Time Sheets
    cy.contains('Time Sheets').click({ force: true });

    // 3. Fill the Form (Matching image_b63b8f.png)
    // Date
    const today = new Date().toISOString().split('T')[0];
    cy.get('input[type="date"]').type(today, { force: true });
    
    // Project Selection
    cy.get('select').select(1, { force: true }); 

    // Task & Hours
    cy.get('input[placeholder="Task"]').type('TL Code Review and Sprint Planning', { force: true });
    cy.get('input[placeholder="Hours"]').type('6', { force: true });
    
    // Description
    cy.get('textarea[placeholder="Description"]').type('Reviewing backend PRs for Addition HRMS.', { force: true });

    // 4. Submit (FIXED: Button text is 'Submit' in image_b63b8f.png)
    cy.get('button').contains(/^Submit$/).click({ force: true });
    
    // 5. Verification: Ensure form clears or redirects
    cy.get('input[placeholder="Task"]').should('have.value', '');
  });

  it('Manager verifies the TL submission', () => {
    cy.visit('/'); 
    cy.get('input').first().type('ashishinturi922@gmail.com'); 
    cy.get('input[type="password"]').type('Ashish@123');
    cy.get('button[type="submit"]').click();

    cy.contains('Time Sheets').click({ force: true });
    cy.contains('Team Management').click({ force: true });

    // Wait for the data to fetch (observed in your logs: api/manager/team-leads-timesheets)
    cy.wait(2000); 

    // Verification
    cy.contains('TL Code Review and Sprint Planning', { timeout: 10000 }).should('be.visible');
    
    // FIX: Use a case-insensitive search for the name and handle potential leading spaces
    cy.contains('tr', /proona everu/i, { timeout: 8000 }).within(() => {
      cy.contains('6').should('be.visible');
    });
  });
});