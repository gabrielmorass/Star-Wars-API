'use strict';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: ['src/**/*.js'],
  // Bootstrap com listen/sinais do processo; justificativa em TESTES.md.
  coveragePathIgnorePatterns: ['/node_modules/', '/src/server\\.js$'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/relatorios',
      outputName: 'junit.xml',
      suiteName: 'Testes do BFF Codex Estelar',
    }],
  ],
};
