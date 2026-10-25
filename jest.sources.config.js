const base = require('./jest.config');
const { compilerOptions } = require('./tsconfig.base.json');

/** Fixture suites transpile independently; application builds retain type checking. */
module.exports = {
  ...base,
  roots: ['<rootDir>/packages/plugins/'],
  testMatch: ['**/source-*/__tests__/**/*.spec.ts'],
  testTimeout: 15_000,
  transform: Object.fromEntries(
    Object.entries(base.transform).map(([pattern, [transformer, options]]) => [
      pattern,
      [transformer, {
        ...options,
        tsconfig: { ...compilerOptions, isolatedModules: true },
      }],
    ]),
  ),
};
