const { defineConfig } = require("cypress");

module.exports = defineConfig({
  projectId: 'rbqqcb',
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    baseUrl: 'http://localhost:3000', // Update this if your React app runs on a different port
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx}',
    supportFile: false
  },
});