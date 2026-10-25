import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

const root = path.resolve(__dirname, '../..');
const posix = (value: string) => value.split(path.sep).join('/');
function sources(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory())
      return ['node_modules', 'dist', '__tests__'].includes(entry.name)
        ? []
        : sources(file);
    return /\.tsx?$/.test(file) && !/\.(?:spec|test|d)\.tsx?$/.test(file)
      ? [file]
      : [];
  });
}
function imports(file: string): string[] {
  return ts
    .preProcessFile(fs.readFileSync(file, 'utf8'), true, true)
    .importedFiles.map((entry) => entry.fileName);
}
const config = JSON.parse(
  fs.readFileSync(path.join(root, 'tsconfig.base.json'), 'utf8'),
);
const options = ts.convertCompilerOptionsFromJson(
  config.compilerOptions,
  root,
).options;
const resolutionCache = ts.createModuleResolutionCache(
  root,
  (value) => value,
  options,
);
function resolve(file: string, specifier: string): string | undefined {
  return ts.resolveModuleName(specifier, file, options, ts.sys, resolutionCache)
    .resolvedModule?.resolvedFileName;
}

it('applications never import another application source tree', () => {
  const violations: string[] = [];
  for (const file of sources(path.join(root, 'apps'))) {
    const owner = posix(path.relative(root, file)).split('/')[1];
    for (const name of imports(file)) {
      const target = resolve(file, name);
      const relative = target && posix(path.relative(root, target));
      if (relative?.startsWith('apps/') && relative.split('/')[1] !== owner)
        violations.push(posix(path.relative(root, file)) + ' -> ' + name);
    }
  }
  expect(violations).toEqual([]);
});

it('plugins depend on contracts rather than other plugin implementations', () => {
  const violations: string[] = [];
  for (const file of sources(path.join(root, 'packages/plugins'))) {
    const relative = posix(path.relative(root, file));
    // The canonical inventory is host composition, not a plugin implementation.
    if (relative === 'packages/plugins/index.ts') continue;
    const owner = relative.split('/')[2];
    for (const name of imports(file)) {
      const target = resolve(file, name);
      const dependency = target && posix(path.relative(root, target));
      if (
        dependency?.startsWith('apps/') ||
        dependency?.startsWith('packages/watcher/')
      )
        violations.push(relative + ' -> ' + name);
      if (
        dependency?.startsWith('packages/plugins/') &&
        dependency.split('/')[2] !== owner
      )
        violations.push(relative + ' -> ' + name);
    }
  }
  expect(violations).toEqual([]);
});

it('discovers nested workspace packages and maps every plugin entrypoint', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
  );
  expect(manifest.workspaces).toContain('packages/plugins/*');
  const names = new Set<string>();
  const missing: string[] = [];
  for (const entry of fs.readdirSync(path.join(root, 'packages/plugins'), {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) continue;
    const packageFile = path.join(
      root,
      'packages/plugins',
      entry.name,
      'package.json',
    );
    if (!fs.existsSync(packageFile)) continue;
    const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    if (names.has(pkg.name)) missing.push('duplicate ' + pkg.name);
    names.add(pkg.name);
    if (!config.compilerOptions.paths[pkg.name]) missing.push(pkg.name);
  }
  expect(missing).toEqual([]);
});

it('keeps browser imports outside all server entrypoints', () => {
  const entry = path.join(
    root,
    'packages/plugins/ui-operator/src/browser/index.ts',
  );
  const seen = new Set<string>();
  const violations: string[] = [];
  const visit = (file: string): void => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const name of imports(file)) {
      if (
        /^(?:@nestjs\/|@prisma\/|node:|@rad-ar\/(?:common|watcher|watch-engine|job-search)(?:\/|$))/.test(
          name,
        )
      )
        violations.push(name);
      const target = resolve(file, name);
      if (!target || target.includes('node_modules')) continue;
      const relative = posix(path.relative(root, target));
      if (
        relative.startsWith('packages/plugins/ui-operator/src/') &&
        !relative.includes('/browser/') &&
        !relative.endsWith('operator-ui.manifest.ts')
      )
        violations.push(relative);
      visit(target);
    }
  };
  visit(entry);
  expect(violations).toEqual([]);
});

it('keeps source discovery canonical and the production base explicit', () => {
  const cli = fs.readFileSync(
    path.join(root, 'apps/cli/src/cli.module.ts'),
    'utf8',
  );
  expect(cli).not.toMatch(/from ['"]@rad-ar\/source-/);
  for (const app of ['api', 'cli', 'watcher']) {
    expect(
      fs.readFileSync(
        path.join(root, 'apps', app, 'src/jobs-composition.ts'),
        'utf8',
      ),
    ).toContain('...ALL_SOURCE_MODULES');
  }
  expect(
    JSON.parse(fs.readFileSync(path.join(root, 'nx.json'), 'utf8')).defaultBase,
  ).toBe('prod');
});
