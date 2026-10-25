/**
 * scaffold-company-source.ts
 *
 * Reusable, deterministic generator for **Greenhouse-backed company-direct**
 * source plugins. Given a batch descriptor file (JSON array of
 * `CompanyDescriptor`), it materialises, for each entry:
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
 * It only ever CREATES new package + spec files — it never mutates the four
 * shared wiring files (`site.enum.ts`, `packages/plugins/index.ts`,
 * `tsconfig.base.json`, `jest.config.js`) nor `docs/index.md`. Those
 * registration edits are applied separately so this generator stays a
 * pure, conflict-free, idempotent file emitter that can safely fan out.
 *
 * Usage (via ts-node):
 *   ts-node --project tsconfig.base.json -r tsconfig-paths/register \
 *     scripts/scaffold-company-source.ts .batch-input.json
 *
 * The batch descriptor shape is intentionally self-contained so a batch
 * can be assembled from any source (live probe, CSV, fixture corpus).
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

export interface CompanyDescriptor {
  slug: string;
  className: string;
  moduleName: string;
  serviceName: string;
  enumKey: string;
  displayName: string;
  specNo: number;
  phaseNo: number;
  jobCount: number;
  description: string;
  oneLiner: string;
  sector: string;
  hq: string;
  highlights: string[];
  listings: ListingInput[];
}

/** Escape a value for embedding inside a single-quoted TS string literal. */
function sq(s: string): string {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Neutralise comment terminators inside doc-comment prose. */
function safeComment(s: string): string {
  return String(s).replace(/\*\//g, '* /');
}

/** Greedy word-wrap to `width` cols, returning lines (no trailing spaces). */
function wrap(text: string, width: number): string[] {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur.length === 0) {
      cur = w;
    } else if (cur.length + 1 + w.length <= width) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

function docComment(d: CompanyDescriptor): string {
  const out: string[] = [];
  out.push('/**');
  out.push(` * ${safeComment(d.displayName)} — ${safeComment(d.oneLiner)}.`);
  out.push(' *');
  for (const line of wrap(safeComment(d.description), 68)) out.push(` * ${line}`);
  out.push(' *');
  out.push(` * Sector: ${safeComment(d.sector)}. HQ: ${safeComment(d.hq)}.`);
  if (d.highlights.length) {
    out.push(' *');
    out.push(' * Highlights:');
    for (const h of d.highlights) {
      const hl = wrap(safeComment(h), 64);
      out.push(` *   - ${hl[0]}`);
      for (let i = 1; i < hl.length; i++) out.push(` *     ${hl[i]}`);
    }
  }
  out.push(' *');
  out.push(` * Source profile (Spec ${d.specNo}):`);
  out.push(' *   - D-04 — Greenhouse canonical hosted-board host (variant 2):');
  out.push(` *     \`https://job-boards.greenhouse.io/${d.slug}/jobs/<id>\`.`);
  out.push(' *   - D-08 — entity-decode-then-tag-strip description pipeline.');
  out.push(` *   - D-09 — wire \`company_name\` pass-through (\`'${sq(d.displayName)}'\`).`);
  out.push(' *   - D-10 — defensive `.trim()` on wire titles (padding observed');
  out.push(' *     on the run-398 batch probe).');
  out.push(' *   - D-11 — defensive `.trim()` on wire department names.');
  out.push(' *');
  out.push(` * Probed ${d.jobCount} live role(s) on the run-398 batch sweep.`);
  out.push(' */');
  return out.join('\n');
}

function serviceFile(d: CompanyDescriptor): string {
  return `import { SourcePlugin } from '@rad-ar/plugin';

import { Injectable, Logger } from '@nestjs/common';
import {
  IScraper, ScraperInputDto, JobResponseDto, JobPostDto, Site, LocationDto,
} from '@rad-ar/models';
import { createHttpClient, decodeHtmlEntities, stripHtmlTags } from '@rad-ar/common';

${docComment(d)}
const API_URL = 'https://api.greenhouse.io/v1/boards/${d.slug}/jobs';

@SourcePlugin({
  site: Site.${d.enumKey},
  name: '${sq(d.displayName)}',
  category: 'company',
})
@Injectable()
export class ${d.serviceName} implements IScraper {
  private readonly logger = new Logger(${d.serviceName}.name);

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const jobs: JobPostDto[] = [];
    const resultsWanted = input.resultsWanted ?? 50;

    try {
      const client = createHttpClient({
        proxies: input.proxies,
        timeout: input.requestTimeout ?? 30,
      });

      const url = \`\${API_URL}?content=true\`;
      this.logger.log(\`${sq(d.displayName)}: fetching \${url}\`);

      const { data } = await client.get<any>(url);
      const listings = data?.jobs ?? [];

      for (const listing of listings) {
        if (jobs.length >= resultsWanted) break;

        // D-10: defensive trim of wire title padding.
        const title = (listing.title ?? '').trim();
        if (!title) continue;

        if (input.searchTerm) {
          const term = input.searchTerm.toLowerCase();
          const titleMatch = title.toLowerCase().includes(term);
          const deptMatch = (listing.departments?.[0]?.name ?? '')
            .toLowerCase()
            .includes(term);
          if (!titleMatch && !deptMatch) continue;
        }

        const jobId = listing.id ?? '';
        const id = \`${d.slug}-\${jobId}\`;

        const locationStr = listing.location?.name ?? null;
        const location = locationStr
          ? new LocationDto({ city: locationStr })
          : null;

        if (input.location && locationStr) {
          if (!locationStr.toLowerCase().includes(input.location.toLowerCase())) continue;
        }

        // D-11: defensive trim of wire department padding.
        const deptRaw = listing.departments?.[0]?.name ?? null;
        const department = deptRaw ? deptRaw.trim() : null;

        jobs.push(
          new JobPostDto({
            id,
            site: Site.${d.enumKey},
            title,
            // D-09 pass-through: wire \`company_name\`.
            companyName: listing.company_name ?? '${sq(d.displayName)}',
            // D-04: wire \`absolute_url\` flows through (variant 2).
            jobUrl:
              listing.absolute_url ??
              \`https://job-boards.greenhouse.io/${d.slug}/jobs/\${listing.id}\`,
            location,
            description: listing.content
              ? stripHtmlTags(decodeHtmlEntities(listing.content))
              : null,
            datePosted: listing.updated_at ?? null,
            isRemote: locationStr?.toLowerCase().includes('remote') ?? false,
            department,
          }),
        );
      }

      this.logger.log(\`${sq(d.displayName)}: scraped \${jobs.length} jobs\`);
    } catch (err: any) {
      this.logger.error(\`${sq(d.displayName)} scrape failed: \${err.message}\`);
    }

    return { jobs };
  }
}
`;
}

function moduleFile(d: CompanyDescriptor): string {
  return `import { Module } from '@nestjs/common';
import { ${d.serviceName} } from './${d.slug}.service';

@Module({ providers: [${d.serviceName}], exports: [${d.serviceName}] })
export class ${d.moduleName} {}
`;
}

function indexFile(d: CompanyDescriptor): string {
  return `export { ${d.moduleName} } from './${d.slug}.module';
export { ${d.serviceName} } from './${d.slug}.service';
`;
}

function packageJson(d: CompanyDescriptor): string {
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

function buildFixture(d: CompanyDescriptor): string {
  const jobs = d.listings.map((l, idx) => {
    const trimmedTitle = String(l.title).trim();
    // Force fixture[0] to carry trailing-space padding on both title and
    // department so the D-10/D-11 trim behaviour is always exercised.
    const title = idx === 0 ? trimmedTitle + ' ' : l.title;
    const deptLabel = l.department ? String(l.department).trim() : 'core';
    const job: Record<string, unknown> = {
      id: l.id,
      title,
      company_name: d.displayName,
      absolute_url: `https://job-boards.greenhouse.io/${d.slug}/jobs/${l.id}`,
      updated_at: l.updatedAt ?? '2026-06-01T00:00:00+00:00',
    };
    if (l.location) job.location = { name: l.location };
    if (l.department) {
      const deptName = idx === 0 ? String(l.department).trim() + ' ' : l.department;
      job.departments = [{ id: Number(l.id) + 1, name: deptName }];
    } else {
      job.departments = [];
    }
    job.content =
      `&lt;p&gt;&lt;strong&gt;About ${d.displayName}.&lt;/strong&gt; ` +
      `Now hiring a ${trimmedTitle} on the ${deptLabel} team &amp; more.&lt;/p&gt;`;
    return job;
  });
  return JSON.stringify({ jobs }, null, 2) + '\n';
}

function testFile(d: CompanyDescriptor): string {
  return `import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { Test } from '@nestjs/testing';
import { JobResponseDto, ScraperInputDto, Site } from '@rad-ar/models';

const mockGet = jest.fn();
jest.mock('@rad-ar/common', () => {
  const actual = jest.requireActual('@rad-ar/common');
  return {
    ...actual,
    createHttpClient: jest.fn(() => ({
      get: mockGet,
      setHeaders: jest.fn(),
    })),
  };
});

import { ${d.moduleName}, ${d.serviceName} } from '../src';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');
const JOBS_PAGE_RAW = JSON.parse(
  fs.readFileSync(path.join(FIXTURE_DIR, '${d.slug}-jobs.json'), 'utf8'),
);

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/**
 * Spec ${d.specNo} / T04 — \`${d.serviceName}\` unit tests (≥ 9 cases).
 */
describe('${d.serviceName} — Spec ${d.specNo} / T04', () => {
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

  describe('happy path', () => {
    it('maps all fixture listings to JobPostDto', async () => {
      mockGet.mockResolvedValueOnce({ data: clone(JOBS_PAGE_RAW) });

      const service = new ${d.serviceName}();
      const result = await service.scrape({
        siteType: [Site.${d.enumKey}],
        resultsWanted: 100,
      } as ScraperInputDto);
      const dto = result as JobResponseDto;
      expect(dto.jobs).toHaveLength(3);

      const first = JOBS_PAGE_RAW.jobs[0];
      const job0 = dto.jobs.find((j) => j.id === '${d.slug}-' + first.id);
      expect(job0).toBeDefined();
      expect(job0?.site).toBe(Site.${d.enumKey});
      // D-09 wire company_name pass-through.
      expect(job0?.companyName).toBe('${sq(d.displayName)}');
      // D-10 title-trim lock.
      expect(job0?.title).toBe(String(first.title).trim());
      expect(job0?.title).not.toMatch(/\\s$/);
      // D-04 variant-2 URL.
      expect(job0?.jobUrl).toBe(
        'https://job-boards.greenhouse.io/${d.slug}/jobs/' + first.id,
      );
      expect(job0?.jobUrl).toContain('job-boards.greenhouse.io/${d.slug}/jobs/');
      // D-11 department-trim lock (null-safe: some boards expose no departments).
      const firstDept =
        first.departments && first.departments[0]
          ? String(first.departments[0].name).trim()
          : null;
      expect(job0?.department).toBe(firstDept);
      expect(job0?.location?.city).toBe(first.location.name);
      expect(job0?.isRemote).toBe(
        String(first.location.name).toLowerCase().includes('remote'),
      );
      // D-08 decode-then-strip regression guard.
      expect(job0?.description).not.toContain('&lt;');
      expect(job0?.description).not.toContain('&amp;');
      expect(job0?.description).not.toContain('<p>');
      expect(job0?.description).toContain('${sq(d.displayName)}');

      const calledUrls = mockGet.mock.calls.map((c) => c[0] as string);
      expect(calledUrls[0]).toBe(
        'https://api.greenhouse.io/v1/boards/${d.slug}/jobs?content=true',
      );
    });
  });

  describe('company_name pass-through', () => {
    it('emits the wire company_name for every job', async () => {
      mockGet.mockResolvedValueOnce({ data: clone(JOBS_PAGE_RAW) });
      const service = new ${d.serviceName}();
      const result = await service.scrape({
        siteType: [Site.${d.enumKey}],
      } as ScraperInputDto);
      for (const job of result.jobs) {
        expect(job.companyName).toBe('${sq(d.displayName)}');
      }
    });
  });

  describe('D-10 title-trim lock', () => {
    it('trims wire title padding — no emitted title has surrounding whitespace', async () => {
      mockGet.mockResolvedValueOnce({ data: clone(JOBS_PAGE_RAW) });
      const service = new ${d.serviceName}();
      const result = await service.scrape({
        siteType: [Site.${d.enumKey}],
      } as ScraperInputDto);
      // Fixture listing[0] carries trailing-pad on the wire title.
      expect(JOBS_PAGE_RAW.jobs[0].title).toMatch(/\\s$/);
      for (const job of result.jobs) {
        expect(job.title).not.toMatch(/\\s$/);
        expect(job.title).not.toMatch(/^\\s/);
      }
    });
  });

  describe('D-11 department-trim lock', () => {
    it('emits trimmed department or null', async () => {
      mockGet.mockResolvedValueOnce({ data: clone(JOBS_PAGE_RAW) });
      const service = new ${d.serviceName}();
      const result = await service.scrape({
        siteType: [Site.${d.enumKey}],
      } as ScraperInputDto);
      for (let i = 0; i < result.jobs.length; i++) {
        const wire = JOBS_PAGE_RAW.jobs[i].departments;
        const expected = wire && wire[0] ? String(wire[0].name).trim() : null;
        expect(result.jobs[i].department).toBe(expected);
        if (result.jobs[i].department) {
          expect(result.jobs[i].department).not.toMatch(/\\s$/);
          expect(result.jobs[i].department).not.toMatch(/^\\s/);
        }
      }
    });
  });

  describe('resultsWanted cap', () => {
    it('honours resultsWanted=1 against a 3-item page', async () => {
      mockGet.mockResolvedValueOnce({ data: clone(JOBS_PAGE_RAW) });
      const service = new ${d.serviceName}();
      const result = await service.scrape({
        siteType: [Site.${d.enumKey}],
        resultsWanted: 1,
      } as ScraperInputDto);
      expect(result.jobs).toHaveLength(1);
    });
  });

  describe('searchTerm filter', () => {
    it('filters by case-insensitive substring of title', async () => {
      mockGet.mockResolvedValueOnce({ data: clone(JOBS_PAGE_RAW) });
      const service = new ${d.serviceName}();
      const term = String(JOBS_PAGE_RAW.jobs[0].title).trim().toLowerCase();
      const result = await service.scrape({
        siteType: [Site.${d.enumKey}],
        searchTerm: term,
      } as ScraperInputDto);
      expect(result.jobs.length).toBeGreaterThanOrEqual(1);
      expect(result.jobs.map((j) => j.id)).toContain(
        '${d.slug}-' + JOBS_PAGE_RAW.jobs[0].id,
      );
    });

    it('returns empty for a non-matching term', async () => {
      mockGet.mockResolvedValueOnce({ data: clone(JOBS_PAGE_RAW) });
      const service = new ${d.serviceName}();
      const result = await service.scrape({
        siteType: [Site.${d.enumKey}],
        searchTerm: 'zzz-no-such-term-zzz',
      } as ScraperInputDto);
      expect(result.jobs).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('catches an HTTP 500 → empty JobResponseDto, never throws', async () => {
      mockGet.mockRejectedValueOnce(new Error('Request failed with status 500'));
      const service = new ${d.serviceName}();
      const result = await service.scrape({
        siteType: [Site.${d.enumKey}],
      } as ScraperInputDto);
      expect(result.jobs).toEqual([]);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('returns empty when the response payload has no jobs', async () => {
      mockGet.mockResolvedValueOnce({ data: { jobs: [] } });
      const service = new ${d.serviceName}();
      const result = await service.scrape({
        siteType: [Site.${d.enumKey}],
      } as ScraperInputDto);
      expect(result.jobs).toEqual([]);
    });
  });
});
`;
}

function writeFileSafe(abs: string, content: string): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

export function scaffoldOne(repoRoot: string, d: CompanyDescriptor): string[] {
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
  return files.map(([abs]) => abs);
}

function main(): void {
  const inputPath = process.argv[2] || '.batch-input.json';
  const repoRoot = process.cwd();
  const abs = path.isAbsolute(inputPath) ? inputPath : path.join(repoRoot, inputPath);
  const batch: CompanyDescriptor[] = JSON.parse(fs.readFileSync(abs, 'utf8'));
  let total = 0;
  for (const d of batch) {
    const written = scaffoldOne(repoRoot, d);
    total += written.length;
    // eslint-disable-next-line no-console
    console.log(`scaffolded source-company-${d.slug} (${written.length} files)`);
  }
  // eslint-disable-next-line no-console
  console.log(`Done. ${batch.length} plugins, ${total} files.`);
}

if (require.main === module) {
  main();
}
