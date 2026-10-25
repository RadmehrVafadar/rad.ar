module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  env: { node: true, es2021: true, jest: true, browser: true },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  ignorePatterns: ['node_modules/', 'dist/', '.nx/', '**/dist/', '**/*.d.ts'],
  rules: {
    'no-debugger': 'error',
    'no-constant-condition': ['error', { checkLoops: false }],
    'no-dupe-args': 'error',
    'no-duplicate-case': 'error',
    'no-unexpected-multiline': 'error',
    '@typescript-eslint/no-duplicate-enum-values': 'error',
  },
};
