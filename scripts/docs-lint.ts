/** Validate the active documentation workflow without reviving historical specifications. */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export interface DocLintResult {
  brokenLinks: Array<{ from: string; to: string }>;
  unindexedDocs: string[];
  invalidNames: string[];
  invalidSpecs: string[];
  retiredArtifacts: string[];
  ok: boolean;
}

export function extractLinks(
  body: string,
): Array<{ href: string; line: number }> {
  const links: Array<{ href: string; line: number }> = [];
  let fence = '';
  body.split(/\r?\n/).forEach((line, index) => {
    const marker = line.trimStart().match(/^(```+|~~~+)/)?.[1];
    if (marker) {
      fence = fence ? '' : marker;
      return;
    }
    if (fence) return;
    const text = line.replace(/`[^`]+`/g, '');
    for (const match of text.matchAll(
      /\[(?:[^\]\\]|\\.)*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    )) {
      links.push({ href: match[1], line: index + 1 });
    }
  });
  return links;
}

async function exists(file: string): Promise<boolean> {
  return fs.access(file).then(
    () => true,
    () => false,
  );
}
async function markdown(dir: string): Promise<string[]> {
  const entries = await fs
    .readdir(dir, { withFileTypes: true })
    .catch(() => []);
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? markdown(path.join(dir, entry.name))
        : Promise.resolve(
            entry.name.endsWith('.md') ? [path.join(dir, entry.name)] : [],
          ),
    ),
  );
  return nested.flat();
}
function target(root: string, file: string, href: string): string | null {
  if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(href)) return null;
  const clean = decodeURIComponent(href.split('#')[0].split('?')[0]).replace(
    /:\d+$/,
    '',
  );
  if (!clean) return null;
  return clean.startsWith('/')
    ? path.join(root, clean.slice(1))
    : path.resolve(path.dirname(file), clean);
}

export async function lintDocs(root: string): Promise<DocLintResult> {
  const result: DocLintResult = {
    brokenLinks: [],
    unindexedDocs: [],
    invalidNames: [],
    invalidSpecs: [],
    retiredArtifacts: [],
    ok: true,
  };
  const relative = (file: string) =>
    path.relative(root, file).split(path.sep).join('/');
  const files = await markdown(path.join(root, 'docs'));
  const roots = ['AGENTS.md', 'README.md', 'CLAUDE.md', 'CONTRIBUTING.md'].map(
    (file) => path.join(root, file),
  );
  const all = [...files, ...roots.filter((file) => !files.includes(file))];
  const graph = new Map<string, string[]>();
  for (const file of all) {
    if (!(await exists(file))) continue;
    const rel = relative(file);
    // Historical prose is frozen; the archive guide itself remains checked.
    if (rel.startsWith('docs/archive/') && !rel.endsWith('/README.md'))
      continue;
    const body = await fs.readFile(file, 'utf8');
    const edges: string[] = [];
    for (const link of extractLinks(body)) {
      const resolved = target(root, file, link.href);
      if (!resolved) continue;
      if (!(await exists(resolved)))
        result.brokenLinks.push({ from: rel + ':' + link.line, to: link.href });
      edges.push(resolved);
    }
    graph.set(file, edges);
    if (
      rel.startsWith('docs/') &&
      !rel.startsWith('docs/archive/') &&
      !/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(path.basename(file))
    )
      result.invalidNames.push(rel);
    if (rel.startsWith('docs/specs/') && path.basename(file) !== 'roadmap.md') {
      const required = ['Goal', 'Scope', 'Design', 'Tasks', 'Done when'];
      if (
        !/^# .+/m.test(body) ||
        !/\*\*Status:\*\* (draft|ready|in progress)\b/.test(body) ||
        required.some((heading) => !body.includes('## ' + heading))
      )
        result.invalidSpecs.push(rel);
    }
  }
  const reachable = new Set<string>();
  const visit = (file: string): void => {
    if (reachable.has(file)) return;
    reachable.add(file);
    for (const edge of graph.get(file) ?? []) visit(edge);
  };
  visit(path.join(root, 'AGENTS.md'));
  visit(path.join(root, 'docs/index.md'));
  for (const file of files)
    if (!relative(file).startsWith('docs/archive/') && !reachable.has(file))
      result.unindexedDocs.push(relative(file));
  if (await exists(path.join(root, '.specify')))
    result.retiredArtifacts.push('.specify');
  for (const file of files)
    if (/^docs\/specs\/\d/.test(relative(file)))
      result.retiredArtifacts.push(relative(file));
  result.ok = [
    result.brokenLinks,
    result.unindexedDocs,
    result.invalidNames,
    result.invalidSpecs,
    result.retiredArtifacts,
  ].every((issues) => issues.length === 0);
  return result;
}
export function formatResult(result: DocLintResult): string {
  if (result.ok) return 'Doc-lint passed';
  return Object.entries(result)
    .filter(
      ([key, value]) => key !== 'ok' && Array.isArray(value) && value.length,
    )
    .map(
      ([key, value]) =>
        key +
        ':\n' +
        (value as unknown[])
          .map(
            (issue) =>
              '  ' +
              (typeof issue === 'string' ? issue : JSON.stringify(issue)),
          )
          .join('\n'),
    )
    .join('\n');
}
if (require.main === module) {
  lintDocs(process.cwd())
    .then((result) => {
      console.log(formatResult(result));
      process.exitCode = result.ok ? 0 : 1;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
