/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages/', '<rootDir>/apps/', '<rootDir>/scripts/'],
  testMatch: ['**/__tests__/**/*.e2e-spec.ts', '**/__tests__/**/*.spec.ts'],
  moduleNameMapper: require('ts-jest').pathsToModuleNameMapper(
    require('./tsconfig.base.json').compilerOptions.paths,
    { prefix: '<rootDir>/' },
  ),
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.base.json' }],
    // Transform ESM-only packages (uuid v13+ ships as ESM .js)
    '[/\\\\]node_modules[/\\\\]uuid[/\\\\].+\\.js$': ['ts-jest', {
      tsconfig: 'tsconfig.base.json',
      diagnostics: false,
    }],
  },
  transformIgnorePatterns: [
    'node_modules[/\\\\](?!(uuid)[/\\\\])',
  ],
  // E2E tests hit live APIs — give each test generous timeout
  testTimeout: 120_000,
  // Run test files sequentially to avoid rate-limiting
  maxWorkers: 1,
};
