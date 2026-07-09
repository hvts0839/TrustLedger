export default {
  rootDir: '.',
  transform: {},
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup/globalMocks.js'],
  testTimeout: 120000,
  verbose: true,
  collectCoverageFrom: [
    'services/**/*.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
  ],
}
