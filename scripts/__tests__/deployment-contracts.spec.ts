import * as fs from 'node:fs';
import * as path from 'node:path';

interface Compose {
  volumes: Record<string, { name: string }>;
  services: Record<
    string,
    { environment: Record<string, string>; healthcheck: { test: string[] } }
  >;
}
const yaml = require('js-yaml') as { load(body: string): Compose };
const root = path.resolve(__dirname, '../..');

it('lets renamed services reuse existing physical data and secret volumes', () => {
  const compose = yaml.load(
    fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8'),
  );
  expect(compose.volumes['radar-postgres'].name).toBe(
    '${POSTGRES_VOLUME_NAME:-radar-postgres}',
  );
  expect(compose.volumes['radar-local-config'].name).toBe(
    '${LOCAL_CONFIG_VOLUME_NAME:-radar-local-config}',
  );
  expect(compose.services.postgres.environment.POSTGRES_DB).toBe(
    '${POSTGRES_DB:-radar}',
  );
  expect(compose.services.postgres.environment.POSTGRES_USER).toBe(
    '${POSTGRES_USER:-radar}',
  );
  expect(compose.services.postgres.healthcheck.test[1]).toContain(
    '$${POSTGRES_USER}',
  );
  expect(compose.services.postgres.healthcheck.test[1]).toContain(
    '$${POSTGRES_DB}',
  );
});

it('builds the MCP image with the root lockfile and shared workspace sources', () => {
  const dockerfile = fs.readFileSync(
    path.join(root, '.deploy/mcp/Dockerfile'),
    'utf8',
  );
  expect(dockerfile).toContain(
    'COPY package*.json tsconfig.base.json nest-cli.json webpack.config.js ./',
  );
  expect(dockerfile).toContain('COPY packages ./packages');
  expect(dockerfile).toContain('RUN npm ci');
  expect(dockerfile).toContain('RUN npx nest build mcp');
  expect(dockerfile).toContain(
    'COPY --from=builder /app/apps/mcp/node_modules ./node_modules',
  );
});
