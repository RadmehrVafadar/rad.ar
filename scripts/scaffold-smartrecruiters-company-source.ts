/**
 * scaffold-smartrecruiters-company-source.ts
 *
 * Reusable, deterministic generator for **SmartRecruiters-backed company-direct**
 * source plugins. Given a batch descriptor file (JSON array of
 * `SmartRecruitersCompanyDescriptor`), it materialises, for each entry:
 *
 *   packages/plugins/source-company-<slug>/
 *     package.json
 *     tsconfig.json
 *     src/index.ts
 *     src/<slug>.module.ts
 *     src/<slug>.service.ts
 *     __tests__/<slug>.service.spec.ts
 *     __tests__/fixtures/<slug>-jobs.json
 *   docs/specs/source-company-<slug>.md
 *
 * The generated service does NOT re-implement SmartRecruiters parsing. It resolves
 * the registered SmartRecruiters ATS plugin from the core `PluginRegistry` at
 * runtime and delegates `scrape({ ...input, companySlug })`, then re-stamps the
 * company identity (`site`, `companyName`, `id` `sr-`→`<slug>-` prefix) — so every
 * SmartRecruiters field fix is inherited automatically. This mirrors the proven
 * Lever/Ashby delegation plugins and honours the "no plugin imports a peer plugin
 * directly; discover via the registry" rule.
 *
 * It only ever CREATES new package + spec files — it never mutates the four
 * shared wiring files (`site.enum.ts`, `packages/plugins/index.ts`,
 * `tsconfig.base.json`, `jest.config.js`) nor `docs/index.md`. Those
 * registration edits are applied separately by `wire-company-source.ts`
 * (backend-agnostic; the batch descriptor is field-compatible with it) so this
 * generator stays a pure, conflict-free, idempotent file emitter that can safely
 * fan out.
 *
 * Usage (via ts-node):
 *   ts-node --project tsconfig.base.json -r tsconfig-paths/register \
 *     scripts/scaffold-smartrecruiters-company-source.ts .batch-input.json
 *
 * The batch descriptor shape is intentionally self-contained so a batch can be
 * assembled from any source (live SmartRecruiters probe, CSV, fixture corpus). It
 * is the sibling of `scaffold-lever-company-source.ts`; the only backend
 * differences are the delegated `Site` (SMARTRECRUITERS), the id prefix (`sr-`),
 * the public API host (`api.smartrecruiters.com/v1/companies`), and the
 * `{ content: [...] }` envelope wire shape.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface ListingInput {
  id: number | string;
  title: string;
  location: string | null;
  department: string | null;
  updatedAt: string | null;
}

export interface SmartRecruitersCompanyDescriptor {
  /** Plugin dir suffix + enum VALUE + JobPostDto id prefix (clean, hyphen-free). */
  slug: string;
  /** The live SmartRecruiters company identifier, e.g. `Visa` or `BoschGroup`. */
  companySlug: string;
  /** PascalCase base, e.g. `Visa`. */
  className: string;
  /** `${className}Module`. */
  moduleName: string;
  /** `${className}Service`. */
  serviceName: string;
  /** Site enum KEY, e.g. `VISA`. */
  enumKey: string;
  /** Canonical brand display name. */
  displayName: string;
  specNo: number;
  phaseNo: number;
  jobCount: number;
  /** Factual one-line summary. */
  oneLiner: string;
  /** Sector / vertical. */
  sector: string;
  /** HQ, "City, Region, Country". */
  hq: string;
  /** Factual prose paragraph (no fabricated claims). */
  description: string;
  /** Factual highlight bullets. */
  highlights: string[];
  /** Up to 3 live listings, seeds the fixture. */
  listings: ListingInput[];
}

/** Escape a value for embedding inside single quotes in generated TS. */
function sq(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Wrap a prose block as a JSDoc comment body (indented by ` * `). */
function jsdocBlock(text: string, width = 74): string {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > width) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines.map((l) => ` * ${l}`).join('\n');
}

function packageJson(d: SmartRecruitersCompanyDescriptor): string {
  return (
    JSON.stringify(
      {
        name: `@rad-ar/source-company-${d.slug}`,
        version: '0.0.1',
        private: true,
        main: 'src/index.ts',
        types: 'src/index.ts',
      },
      null,
      2,
    ) + '\n'
  );
}

function tsconfigJson(): string {
  return (
    JSON.stringify(
      {
        extends: '../../../tsconfig.base.json',
        compilerOptions: { outDir: './dist', rootDir: './src' },
        include: ['src/**/*'],
      },
      null,
      2,
    ) + '\n'
  );
}

function indexFile(d: SmartRecruitersCompanyDescriptor): string {
  return (
    `export { ${d.moduleName} } from './${d.slug}.module';\n` +
    `export { ${d.serviceName} } from './${d.slug}.service';\n`
  );
}

function moduleFile(d: SmartRecruitersCompanyDescriptor): string {
  return (
    `import { Module } from '@nestjs/common';\n` +
    `import { ${d.serviceName} } from './${d.slug}.service';\n\n` +
    `@Module({ providers: [${d.serviceName}], exports: [${d.serviceName}] })\n` +
    `export class ${d.moduleName} {}\n`
  );
}

function serviceFile(d: SmartRecruitersCompanyDescriptor): string {
  const doc =
    `/**\n` +
    ` * ${sq(d.displayName)} — ${sq(d.oneLiner)}\n` +
    ` *\n` +
    `${jsdocBlock(d.description)}\n` +
    ` *\n` +
    ` * Sector: ${sq(d.sector)}. HQ: ${sq(d.hq)}.\n` +
    ` *\n` +
    ` * Source: SmartRecruiters job board, company identifier \`${d.companySlug}\`\n` +
    ` * (\`https://jobs.smartrecruiters.com/${d.companySlug}\`). The company's live\n` +
    ` * postings are served by SmartRecruiters. Rather than re-implement\n` +
    ` * SmartRecruiters parsing (and risk drift), this plugin resolves the\n` +
    ` * registered SmartRecruiters source plugin from the \`PluginRegistry\` at\n` +
    ` * runtime and delegates the fetch + field mapping to it, then re-stamps the\n` +
    ` * company identity (site, companyName, id prefix) onto the results — so every\n` +
    ` * SmartRecruiters field fix is inherited automatically. This honours the "no\n` +
    ` * plugin imports a peer plugin directly; discover via the registry" rule.\n` +
    ` */`;
  return (
    `import { SourcePlugin, PluginRegistry } from '@rad-ar/plugin';\n\n` +
    `import { Injectable, Logger, Optional } from '@nestjs/common';\n` +
    `import {\n` +
    `  IScraper, ScraperInputDto, JobResponseDto, Site,\n` +
    `} from '@rad-ar/models';\n\n` +
    `${doc}\n` +
    `const COMPANY_SLUG = '${sq(d.companySlug)}';\n` +
    `const COMPANY_NAME = '${sq(d.displayName)}';\n\n` +
    `@SourcePlugin({\n` +
    `  site: Site.${d.enumKey},\n` +
    `  name: COMPANY_NAME,\n` +
    `  category: 'company',\n` +
    `})\n` +
    `@Injectable()\n` +
    `export class ${d.serviceName} implements IScraper {\n` +
    `  private readonly logger = new Logger(${d.serviceName}.name);\n\n` +
    `  constructor(\n` +
    `    @Optional() private readonly registry?: PluginRegistry,\n` +
    `  ) {}\n\n` +
    `  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {\n` +
    `    const smartrecruiters = this.registry?.getScraper(Site.SMARTRECRUITERS);\n` +
    `    if (!smartrecruiters) {\n` +
    `      this.logger.error(\n` +
    `        'SmartRecruiters source plugin is not registered; cannot scrape ${sq(d.displayName)}',\n` +
    `      );\n` +
    `      return new JobResponseDto([]);\n` +
    `    }\n\n` +
    `    this.logger.log(\n` +
    `      \`${sq(d.displayName)}: delegating to SmartRecruiters (slug \${COMPANY_SLUG})\`,\n` +
    `    );\n\n` +
    `    const result = await smartrecruiters.scrape({\n` +
    `      ...input,\n` +
    `      companySlug: COMPANY_SLUG,\n` +
    `    } as ScraperInputDto);\n\n` +
    `    for (const job of result.jobs) {\n` +
    `      job.site = Site.${d.enumKey};\n` +
    `      job.companyName = COMPANY_NAME;\n` +
    `      if (job.id) {\n` +
    `        job.id = job.id.replace(/^sr-/, '${d.slug}-');\n` +
    `      }\n` +
    `    }\n\n` +
    `    this.logger.log(\`${sq(d.displayName)}: scraped \${result.jobs.length} jobs\`);\n` +
    `    return result;\n` +
    `  }\n` +
    `}\n`
  );
}

function buildFixture(d: SmartRecruitersCompanyDescriptor): string {
  const content = d.listings.slice(0, 3).map((l, i) => {
    const loc = l.location ?? 'Remote';
    const isRemote = /remote/i.test(loc);
    const id = String(l.id || `${d.slug}-fixture-${i + 1}`);
    const desc = `${l.title} at ${d.displayName}.`;
    const released = l.updatedAt
      ? new Date(Date.parse(String(l.updatedAt)) || 1_717_200_000_000).toISOString()
      : new Date(1_717_200_000_000).toISOString();
    return {
      id,
      name: l.title,
      uuid: `${d.slug}-uuid-${i + 1}`,
      refNumber: `REF${i + 1}`,
      company: { identifier: d.companySlug, name: d.displayName },
      releasedDate: released,
      location: {
        city: isRemote ? null : loc.split(',')[0]?.trim() || null,
        region: null,
        country: null,
        remote: isRemote,
        fullLocation: loc,
      },
      department: { id: `dept-${i + 1}`, label: l.department ?? null },
      typeOfEmployment: { id: 'permanent', label: 'Full-time' },
      ref: `https://jobs.smartrecruiters.com/${d.companySlug}/${id}`,
      jobAd: {
        sections: {
          jobDescription: { title: 'Job Description', text: `<p>${desc}</p>` },
        },
      },
    };
  });
  // SmartRecruiters' public Posting API returns a { content: [...] } envelope.
  return (
    JSON.stringify(
      { offset: 0, limit: 100, totalFound: content.length, content },
      null,
      2,
    ) + '\n'
  );
}

function testFile(d: SmartRecruitersCompanyDescriptor): string {
  return `import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { Test } from '@nestjs/testing';
import {
  IScraper,
  JobPostDto,
  JobResponseDto,
  ScraperInputDto,
  Site,
} from '@rad-ar/models';
import { PluginRegistry } from '@rad-ar/plugin';
import { SmartRecruitersService } from '@rad-ar/source-ats-smartrecruiters';

const mockGet = jest.fn();
jest.mock('@rad-ar/common', () => {
  const actual = jest.requireActual('@rad-ar/common');
  return {
    ...actual,
    createHttpClient: jest.fn(() => ({
      get: mockGet,
      post: jest.fn(),
      setHeaders: jest.fn(),
    })),
  };
});

import { ${d.moduleName}, ${d.serviceName} } from '../src';

const COMPANY_NAME_EXPECT = '${sq(d.displayName)}';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');
// SmartRecruiters' public Posting API returns a { content: [...] } envelope.
const JOBS_ENVELOPE_RAW: { content: any[] } = JSON.parse(
  fs.readFileSync(path.join(FIXTURE_DIR, '${d.slug}-jobs.json'), 'utf8'),
);
const JOBS_RAW: any[] = JOBS_ENVELOPE_RAW.content;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Registry wired with a real SmartRecruitersService under Site.SMARTRECRUITERS. */
function registryWithSmartRecruiters(): PluginRegistry {
  const registry = new PluginRegistry();
  registry.register(
    { site: Site.SMARTRECRUITERS, name: 'SmartRecruiters', category: 'ats', isAts: true },
    new SmartRecruitersService(),
  );
  return registry;
}

describe('${d.serviceName} — SmartRecruiters delegation', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  describe('registration scaffolding', () => {
    it('resolves through ${d.moduleName} via NestJS DI', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [${d.moduleName}],
      }).compile();
      const service = moduleRef.get(${d.serviceName});
      expect(service).toBeInstanceOf(${d.serviceName});
      await moduleRef.close();
    });

    it('exports the Site.${d.enumKey} = "${d.slug}" enum value', () => {
      expect(Site.${d.enumKey}).toBe('${d.slug}');
    });
  });

  describe('happy path (delegates to the registered SmartRecruiters plugin)', () => {
    it('maps all fixture listings to JobPostDto with the company identity', async () => {
      mockGet.mockResolvedValueOnce({ data: clone(JOBS_ENVELOPE_RAW) });

      const service = new ${d.serviceName}(registryWithSmartRecruiters());
      const result = (await service.scrape({
        siteType: [Site.${d.enumKey}],
        resultsWanted: 100,
      } as ScraperInputDto)) as JobResponseDto;

      expect(result.jobs).toHaveLength(JOBS_RAW.length);

      const first = JOBS_RAW[0];
      const job0 = result.jobs.find(
        (j) => j.id === '${d.slug}-' + first.id,
      );
      expect(job0).toBeDefined();
      // company identity is re-stamped over SmartRecruiters' defaults
      expect(job0?.site).toBe(Site.${d.enumKey});
      expect(job0?.companyName).toBe(COMPANY_NAME_EXPECT);
      expect(job0?.id).toBe('${d.slug}-' + first.id);
      expect(job0?.id?.startsWith('sr-')).toBe(false);
      // SmartRecruiters-mapped fields flow through untouched
      expect(job0?.title).toBe(first.name);
      expect(job0?.jobUrl).toBe(first.ref);
      expect(job0?.department).toBe(first.department.label);

      // it hit the SmartRecruiters board for the company slug, not GH/Lever/Ashby
      const calledUrls = mockGet.mock.calls.map((c) => c[0] as string);
      expect(calledUrls[0]).toContain('api.smartrecruiters.com');
      expect(calledUrls[0]).toContain('${d.companySlug}');
      expect(calledUrls[0]).not.toContain('greenhouse');
      expect(calledUrls[0]).not.toContain('lever');
    });

    it('every job carries the company site, companyName, and id prefix', async () => {
      mockGet.mockResolvedValueOnce({ data: clone(JOBS_ENVELOPE_RAW) });
      const service = new ${d.serviceName}(registryWithSmartRecruiters());
      const result = await service.scrape({
        siteType: [Site.${d.enumKey}],
      } as ScraperInputDto);
      for (const job of result.jobs) {
        expect(job.site).toBe(Site.${d.enumKey});
        expect(job.companyName).toBe(COMPANY_NAME_EXPECT);
        expect(job.id?.startsWith('${d.slug}-')).toBe(true);
      }
    });
  });

  describe('input pass-through', () => {
    it('forwards the company slug and caller input to the SmartRecruiters scraper', async () => {
      const captured: ScraperInputDto[] = [];
      const fakeSr: IScraper = {
        scrape: async (input) => {
          captured.push(input);
          return new JobResponseDto([
            new JobPostDto({ id: 'sr-x1', title: 'Role', jobUrl: 'u' }),
          ]);
        },
      };
      const registry = new PluginRegistry();
      registry.register(
        { site: Site.SMARTRECRUITERS, name: 'SmartRecruiters', category: 'ats', isAts: true },
        fakeSr,
      );

      const service = new ${d.serviceName}(registry);
      const result = await service.scrape({
        siteType: [Site.${d.enumKey}],
        resultsWanted: 7,
      } as ScraperInputDto);

      expect(captured).toHaveLength(1);
      expect(captured[0].companySlug).toBe('${d.companySlug}');
      expect(captured[0].resultsWanted).toBe(7);
      expect(result.jobs[0].id).toBe('${d.slug}-x1');
      expect(result.jobs[0].site).toBe(Site.${d.enumKey});
    });

    it('only rewrites a leading sr- id prefix', async () => {
      const fakeSr: IScraper = {
        scrape: async () =>
          new JobResponseDto([
            new JobPostDto({ id: 'sr-sr-7', title: 'T', jobUrl: 'u' }),
          ]),
      };
      const registry = new PluginRegistry();
      registry.register(
        { site: Site.SMARTRECRUITERS, name: 'SmartRecruiters', category: 'ats', isAts: true },
        fakeSr,
      );
      const service = new ${d.serviceName}(registry);
      const result = await service.scrape({
        siteType: [Site.${d.enumKey}],
      } as ScraperInputDto);
      expect(result.jobs[0].id).toBe('${d.slug}-sr-7');
    });
  });

  describe('resilience', () => {
    it('returns an empty response when no SmartRecruiters plugin is registered', async () => {
      const service = new ${d.serviceName}(new PluginRegistry());
      const result = await service.scrape({
        siteType: [Site.${d.enumKey}],
      } as ScraperInputDto);
      expect(result.jobs).toHaveLength(0);
    });

    it('returns an empty response when no registry is injected', async () => {
      const service = new ${d.serviceName}();
      const result = await service.scrape({
        siteType: [Site.${d.enumKey}],
      } as ScraperInputDto);
      expect(result.jobs).toHaveLength(0);
    });
  });

  describe('resultsWanted cap', () => {
    it('honours resultsWanted=1 against the fixture page', async () => {
      mockGet.mockResolvedValueOnce({ data: clone(JOBS_ENVELOPE_RAW) });
      const service = new ${d.serviceName}(registryWithSmartRecruiters());
      const result = await service.scrape({
        siteType: [Site.${d.enumKey}],
        resultsWanted: 1,
      } as ScraperInputDto);
      expect(result.jobs).toHaveLength(1);
    });
  });
});
`;
}

function writeFileSafe(abs: string, content: string): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

function scaffoldOne(repoRoot: string, d: SmartRecruitersCompanyDescriptor): void {
  const pkgDir = path.join(repoRoot, 'packages', 'plugins', `source-company-${d.slug}`);
  const specPath = path.join(repoRoot, 'docs', 'specs', `source-company-${d.slug}.md`);
  const files: Array<[string, string]> = [
    [path.join(pkgDir, 'package.json'), packageJson(d)],
    [path.join(pkgDir, 'tsconfig.json'), tsconfigJson()],
    [path.join(pkgDir, 'src', 'index.ts'), indexFile(d)],
    [path.join(pkgDir, 'src', `${d.slug}.module.ts`), moduleFile(d)],
    [path.join(pkgDir, 'src', `${d.slug}.service.ts`), serviceFile(d)],
    [path.join(pkgDir, '__tests__', `${d.slug}.service.spec.ts`), testFile(d)],
    [path.join(pkgDir, '__tests__', 'fixtures', `${d.slug}-jobs.json`), buildFixture(d)],
    [specPath, `# Source company ${d.displayName}\n\n**Status:** ready\n\n## Goal\n\nExpose ${d.displayName} through the source plugin contract.\n\n## Scope\n\n- In: the company source adapter and its mocked regression suite.\n- Out: new API behavior and unrelated sources.\n\n## Design\n\nUse the existing source registry and shared HTTP client or ATS contract.\n\n## Tasks\n\n- [ ] Register the plugin and run its tests.\n\n## Done when\n\n- [ ] Registration, type checks, and mocked source tests pass.\n`],
  ];
  // Persist the design before emitting implementation files.
  const specification = files.pop()!;
  files.unshift(specification);
  for (const [abs, content] of files) writeFileSafe(abs, content);
}

function main(): void {
  const inputPath = process.argv[2] || '.batch-input.json';
  const repoRoot = process.cwd();
  const abs = path.isAbsolute(inputPath) ? inputPath : path.join(repoRoot, inputPath);
  const batch: SmartRecruitersCompanyDescriptor[] = JSON.parse(fs.readFileSync(abs, 'utf8'));
  for (const d of batch) scaffoldOne(repoRoot, d);
  // eslint-disable-next-line no-console
  console.log(`Scaffolded ${batch.length} SmartRecruiters company-source plugin(s).`);
  for (const d of batch) {
    // eslint-disable-next-line no-console
    console.log(`  Spec ${d.specNo}  ${d.enumKey} = '${d.slug}'  (${d.serviceName} → smartrecruiters:${d.companySlug})`);
  }
}

if (require.main === module) {
  main();
}
