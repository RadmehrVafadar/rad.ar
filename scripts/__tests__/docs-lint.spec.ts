import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { extractLinks, formatResult, lintDocs } from '../docs-lint';
let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'radar-docs-'));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});
async function write(file: string, body: string) {
  const full = path.join(root, file);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, body);
}
it('ignores code and external links but retains relative links with line numbers', () => {
  expect(
    extractLinks(
      '[a](a.md)\n`[b](ignored.md)`\n```ts\n[c](ignored.md)\n```\n[d](d.md#part)',
    ),
  ).toEqual([
    { href: 'a.md', line: 1 },
    { href: 'd.md#part', line: 6 },
  ]);
});
it('accepts a descriptive plan reachable through the roadmap', async () => {
  await write('AGENTS.md', '# App\n[Roadmap](docs/specs/roadmap.md)');
  await write('docs/index.md', '# Docs');
  await write('docs/specs/roadmap.md', '# Roadmap\n[Feature](feature.md)');
  await write(
    'docs/specs/feature.md',
    '# Feature\n\n**Status:** ready\n\n## Goal\n\nGoal.\n\n## Scope\n\nScope.\n\n## Design\n\nDesign.\n\n## Tasks\n\n- [ ] Implement.\n\n## Done when\n\n- [ ] Tested.',
  );
  const result = await lintDocs(root);
  expect(formatResult(result)).toBe('Doc-lint passed');
});
it('reports broken links, orphan docs, invalid names, and incomplete plans', async () => {
  await write(
    'docs/index.md',
    '# Docs\n[Bad](specs/bad.md)\n[Missing](missing.md)',
  );
  await write('docs/ORPHAN.md', '# Orphan');
  await write('docs/specs/bad.md', '# Bad');
  const result = await lintDocs(root);
  expect(result.ok).toBe(false);
  expect(result.brokenLinks).toHaveLength(1);
  expect(result.unindexedDocs).toContain('docs/ORPHAN.md');
  expect(result.invalidNames).toContain('docs/ORPHAN.md');
  expect(result.invalidSpecs).toContain('docs/specs/bad.md');
});
it('rejects recreated Spec Kit artifacts', async () => {
  await write('.specify/specs/001/spec.md', '# Retired');
  expect((await lintDocs(root)).retiredArtifacts).toEqual(['.specify']);
});
it('checks archive accessibility while preserving frozen historical references', async () => {
  await write('docs/index.md', '# Docs\n[Archive](archive/README.md)');
  await write('docs/archive/README.md', '# Archive\n[Log](log.md)');
  await write('docs/archive/log.md', '# Log\n[Removed history](removed.md)');
  expect((await lintDocs(root)).ok).toBe(true);
});
