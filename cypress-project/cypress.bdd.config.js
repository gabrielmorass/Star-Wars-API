const { defineConfig } = require('cypress')
const createBundler = require('@bahmutov/cypress-esbuild-preprocessor')
const {
  addCucumberPreprocessorPlugin,
} = require('@badeball/cypress-cucumber-preprocessor')
const {
  createEsbuildPlugin,
} = require('@badeball/cypress-cucumber-preprocessor/esbuild')

/**
 * Configuração do Cypress — Codex Estelar, abordagem BDD (Gherkin/Cucumber).
 * Segue o mesmo padrão usado em aula (repositório de referência da
 * disciplina S07 — cypress-project/), adaptado para o nosso próprio site
 * em vez de um site externo de terceiros.
 */
module.exports = defineConfig({
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    reportDir: 'relatorio',
    overwrite: false,
    html: true,
    json: true,
  },

  e2e: {
    // Servido localmente por http-server (ver script "servidor" no package.json)
    baseUrl: 'http://localhost:8080',

    specPattern: 'cypress/bdd/features/**/*.feature',
    supportFile: 'cypress/support/e2e.js',
    fixturesFolder: 'cypress/fixtures',

    viewportWidth: 1280,
    viewportHeight: 720,

    defaultCommandTimeout: 8000,
    pageLoadTimeout: 30000,
    requestTimeout: 10000,

    video: false,
    screenshotOnRunFailure: true,

    retries: {
      runMode: 1,
      openMode: 0,
    },

    async setupNodeEvents(on, config) {
      // addCucumberPreprocessorPlugin também registra before:run/after:run;
      // Cypress só permite um handler por evento, então o mochawesome
      // precisa ser registrado DEPOIS para não ter seu handler sobrescrito
      // (isso quebrava silenciosamente a geração do relatório HTML final).
      await addCucumberPreprocessorPlugin(on, config)
      require('cypress-mochawesome-reporter/plugin')(on)

      on(
        'file:preprocessor',
        createBundler({
          plugins: [createEsbuildPlugin(config)],
        })
      )

      return config
    },
  },
})
