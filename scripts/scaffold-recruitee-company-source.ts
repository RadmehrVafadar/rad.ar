/**
 * scaffold-recruitee-company-source.ts
 *
 * Reusable, deterministic generator for **Recruitee-backed company-direct**
 * source plugins. Given a batch descriptor file (JSON array of
 * `RecruiteeCompanyDescriptor`), it materialises, for each entry:
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
 * The generated service does NOT re-implement Recruitee parsing. It resolves the
 * registered Recruitee ATS plugin from the core `PluginRegistry` at runtime and
 * delegates `scrape({ ...input, companySlug })`, then re-stamps the company
 * identity (`site`, `companyName`, `id` `recruitee-`→`<slug>-` prefix) — so every
 * Recruitee field fix is inherited automatically. This mirrors the proven
 * Lever/Ashby/SmartRecruiters delegation plugins and honours the "no plugin
 * imports a peer plugin directly; discover via the registry" rule.
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
 *     scripts/scaffold-recruitee-company-source.ts .batch-input.json
 *
 * The batch descriptor shape is intentionally self-contained so a batch can be
 * assembled from any source (live Recruitee probe, CSV, fixture corpus). It is
 * the sibling of `scaffold-smartrecruiters-company-source.ts`; the only backend
 * differences are the delegated `Site` (RECRUITEE), the id prefix (`recruitee-`),
 * the public API host (`<slug>.recruitee.com/api/offers`), and the
 * `{ offers: [...] }` envelope wire shape.
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

export interface RecruiteeCompanyDescriptor {
  /** Plugin dir suffix + enum VALUE + JobPostDto id prefix (clean, hyphen-free). */
  slug: string;
  /** The live Recruitee subdomain identifier, e.g. `channable` or `sendcloud`. */
  companySlug: string;
  /** PascalCase base, e.g. `Channable`. */
  className: string;
  /** `${className}Module`. */
  moduleName: string;
  /** `${className}Service`. */
  serviceName: string;
  /** Site enum KEY, e.g. `CHANNABLE`. */
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

function packageJson(d: RecruiteeCompanyDescriptor): string {
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

function indexFile(d: RecruiteeCompanyDescriptor): string {
  return (
    `export { ${d.moduleName} } from './${d.slug}.module';\n` +
    `export { ${d.serviceName} } from './${d.slug}.service';\n`
  );
}

function moduleFile(d: RecruiteeCompanyDescriptor): string {
  return (
    `import { Module } from '@nestjs/common';\n` +
    `import { ${d.serviceName} } from './${d.slug}.service';\n\n` +
    `@Module({ providers: [${d.serviceName}], exports: [${d.serviceName}] })\n` +
    `export class ${d.moduleName} {}\n`
  );
}

function serviceFile(d: RecruiteeCompanyDescriptor): string {
  const doc =
    `/**\n` +
    ` * ${sq(d.displayName)} — ${sq(d.oneLiner)}\n` +
    ` *\n` +
    `${jsdocBlock(d.description)}\n` +
    ` *\n` +
    ` * Sector: ${sq(d.sector)}. HQ: ${sq(d.hq)}.\n` +
    ` *\n` +
    ` * Source: Recruitee careers board, subdomain \`${d.companySlug}\`\n` +
    ` * (\`https://${d.companySlug}.recruitee.com\`). The company's live postings\n` +
    ` * are served by Recruitee. Rather than re-implement Recruitee parsing (and\n` +
    ` * risk drift), this plugin resolves the registered Recruitee source plugin\n` +
    ` * from the \`PluginRegistry\` at runtime and delegates the fetch + field\n` +
    ` * mapping to it, then re-stamps the company identity (site, companyName, id\n` +
    ` * prefix) onto the results — so every Recruitee field fix is inherited\n` +
    ` * automatically. This honours the "no plugin imports a peer plugin directly;\n` +
    ` * discover via the registry" rule.\n` +
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
    `    const recruitee = this.registry?.getScraper(Site.RECRUITEE);\n` +
    `    if (!recruitee) {\n` +
    `      this.logger.error(\n` +
    `        'Recruitee source plugin is not registered; cannot scrape ${sq(d.displayName)}',\n` +
    `      );\n` +
    `      return new JobResponseDto([]);\n` +
    `    }\n\n` +
    `    this.logger.log(\n` +
    `      \`${sq(d.displayName)}: delegating to Recruitee (slug \${COMPANY_SLUG})\`,\n` +
    `    );\n\n` +
    `    const result = await recruitee.scrape({\n` +
    `      ...input,\n` +
    `      companySlug: COMPANY_SLUG,\n` +
    `    } as ScraperInputDto);\n\n` +
    `    for (const job of result.jobs) {\n` +
    `      job.site = Site.${d.enumKey};\n` +
    `      job.companyName = COMPANY_NAME;\n` +
    `      if (job.id) {\n` +
    `        job.id = job.id.replace(/^recruitee-/, '${d.slug}-');\n` +
    `      }\n` +
    `    }\n\n` +
    `    this.logger.log(\`${sq(d.displayName)}: scraped \${result.jobs.length} jobs\`);\n` +
    `    return result;\n` +
    `  }\n` +
    `}\n`
  );
}

function buildFixture(d: RecruiteeCompanyDescriptor): string {
  const offers = d.listings.slice(0, 3).map((l, i) => {
    const loc = l.location ?? 'Remote';
    const isRemote = /remote/i.test(loc);
    const rawId = l.id || `${d.slug}-fixture-${i + 1}`;
    const offerSlug = `${d.slug}-role-${i + 1}`;
    const parts = loc.split(',').map((p) => p.trim());
    const created = l.updatedAt
      ? new Date(Date.parse(String(l.updatedAt)) || 1_717_200_000_000)
      : new Date(1_717_200_000_000);
    // Recruitee's loose "YYYY-MM-DD HH:MM:SS UTC" timestamp form.
    const createdAt = created
      .toISOString()
      .replace('T', ' ')
      .replace(/\.\d+Z$/, ' UTC');
    return {
      id: rawId,
      title: l.title,
      slug: offerSlug,
      department: l.department ?? null,
      location: isRemote ? null : loc,
      city: isRemote ? null : parts[0] ?? null,
      state: null,
      country: isRemote ? null : parts[parts.length - 1] ?? null,
      remote: isRemote,
      description: `<p>${l.title} at ${d.displayName}.</p>`,
      created_at: createdAt,
      careers_url: `https://${d.companySlug}.recruitee.com/o/${offerSlug}`,
      min_hours: null,
      max_hours: null,
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      company_name: d.displayName,
    };
  });
  // Recruitee's public careers API returns an { offers: [...] } envelope.
  return JSON.stringify({ offers }, null, 2) + '\n';
}

function testFile(d: RecruiteeCompanyDescriptor): string {
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
import { RecruiteeService } from '@rad-ar/source-ats-recruitee';

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
// Recruitee's public careers API returns an { offers: [...] } envelope.
const JOBS_ENVELOPE_RAW: { offers: any[] } = JSON.parse(
  fs.readFileSync(path.join(FIXTURE_DIR, '${d.slug}-jobs.json'), 'utf8'),
);
const JOBS_RAW: any[] = JOBS_ENVELOPE_RAW.offers;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Registry wired with a real RecruiteeService under Site.RECRUITEE. */
function registryWithRecruitee(): PluginRegistry {
  const registry = new PluginRegistry();
  registry.register(
    { site: Site.RECRUITEE, name: 'Recruitee', category: 'ats', isAts: true },
    new RecruiteeService(),
  );
  return registry;
}

describe('${d.serviceName} — Recruitee delegation', () => {
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

  describe('happy path (delegates to the registered Recruitee plugin)', () => {
    it('maps all fixture offers to JobPostDto with the company identity', async () => {
      mockGet.mockResolvedValueOnce({ data: clone(JOBS_ENVELOPE_RAW) });

      const service = new ${d.serviceName}(registryWithRecruitee());
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
      // company identity is re-stamped over Recruitee's defaults
      expect(job0?.site).toBe(Site.${d.enumKey});
      expect(job0?.companyName).toBe(COMPANY_NAME_EXPECT);
      expect(job0?.id).toBe('${d.slug}-' + first.id);
      expect(job0?.id?.startsWith('recruitee-')).toBe(false);
      // Recruitee-mapped fields flow through untouched
      expect(job0?.title).toBe(first.title);
      expect(job0?.jobUrl).toBe(first.careers_url + '/' + first.slug);
      expect(job0?.department).toBe(first.department);

      // it hit the Recruitee board for the company slug, not GH/Lever/Ashby/SR
      const calledUrls = mockGet.mock.calls.map((c) => c[0] as string);
      expect(calledUrls[0]).toContain('${d.companySlug}.recruitee.com');
      expect(calledUrls[0]).not.toContain('greenhouse');
      expect(calledUrls[0]).not.toContain('lever');
      expect(calledUrls[0]).not.toContain('smartrecruiters');
    });

    it('every job carries the company site, companyName, and id prefix', async () => {
      mockGet.mockResolvedValueOnce({ data: clone(JOBS_ENVELOPE_RAW) });
      const service = new ${d.serviceName}(registryWithRecruitee());
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
    it('forwards the company slug and caller input to the Recruitee scraper', async () => {
      const captured: ScraperInputDto[] = [];
      const fakeRecruitee: IScraper = {
        scrape: async (input) => {
          captured.push(input);
          return new JobResponseDto([
            new JobPostDto({ id: 'recruitee-x1', title: 'Role', jobUrl: 'u' }),
          ]);
        },
      };
      const registry = new PluginRegistry();
      registry.register(
        { site: Site.RECRUITEE, name: 'Recruitee', category: 'ats', isAts: true },
        fakeRecruitee,
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

    it('only rewrites a leading recruitee- id prefix', async () => {
      const fakeRecruitee: IScraper = {
        scrape: async () =>
          new JobResponseDto([
            new JobPostDto({ id: 'recruitee-recruitee-7', title: 'T', jobUrl: 'u' }),
          ]),
      };
      const registry = new PluginRegistry();
      registry.register(
        { site: Site.RECRUITEE, name: 'Recruitee', category: 'ats', isAts: true },
        fakeRecruitee,
      );
      const service = new ${d.serviceName}(registry);
      const result = await service.scrape({
        siteType: [Site.${d.enumKey}],
      } as ScraperInputDto);
      expect(result.jobs[0].id).toBe('${d.slug}-recruitee-7');
    });
  });

  describe('resilience', () => {
    it('returns an empty response when no Recruitee plugin is registered', async () => {
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
      const service = new ${d.serviceName}(registryWithRecruitee());
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

function scaffoldOne(repoRoot: string, d: RecruiteeCompanyDescriptor): void {
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
  const batch: RecruiteeCompanyDescriptor[] = JSON.parse(fs.readFileSync(abs, 'utf8'));
  for (const d of batch) scaffoldOne(repoRoot, d);
  // eslint-disable-next-line no-console
  console.log(`Scaffolded ${batch.length} Recruitee company-source plugin(s).`);
  for (const d of batch) {
    // eslint-disable-next-line no-console
    console.log(`  Spec ${d.specNo}  ${d.enumKey} = '${d.slug}'  (${d.serviceName} → recruitee:${d.companySlug})`);
  }
}

if (require.main === module) {
  main();
}
