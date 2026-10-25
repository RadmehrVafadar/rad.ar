const nodeExternals = require('webpack-node-externals');

/**
 * Custom webpack config for NestJS API.
 *
 * By default, NestJS webpack uses webpack-node-externals which externalizes
 * ALL node_modules and workspace packages, emitting bare
 * `require("@rad-ar/source-linkedin")` calls.
 *
 * Node.js v24's built-in TypeScript support then resolves those to the raw
 * .ts source files via Yarn workspace symlinks and fails because of
 * extensionless ESM imports (e.g. `./linkedin.module` without `.js`).
 *
 * Fix: use a custom allowlist so that @rad-ar/* packages are bundled
 * (inlined by webpack) rather than externalized.
 */
module.exports = (options) => {
  const isMcp = String(options.entry)
    .replace(/\\/g, '/')
    .includes('/apps/mcp/src/');
  return {
    ...options,
    ...(isMcp
      ? {
          output: {
            ...options.output,
            path: require('path').resolve(__dirname, 'apps/mcp/dist'),
            filename: 'index.js',
          },
          plugins: [
            ...(options.plugins ?? []),
            new (require('webpack').BannerPlugin)({
              banner: '#!/usr/bin/env node',
              raw: true,
              entryOnly: true,
            }),
          ],
        }
      : {}),
    externals: [
      nodeExternals({
        // Bundle (inline) all @rad-ar/* workspace packages
        allowlist: [/^@rad-ar\//],
      }),
    ],
  };
};
