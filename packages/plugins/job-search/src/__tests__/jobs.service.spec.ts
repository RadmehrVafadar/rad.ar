import "reflect-metadata";
import {
  ScraperInputDto,
  JobPostDto,
  JobResponseDto,
  Site,
  IScraper,
  Country,
  SalarySource,
  CompensationDto,
  CompensationInterval,
} from "@rad-ar/models";

// ---------------------------------------------------------------------------
// Mock ALL source packages before importing JobsService.
// jest.mock() calls are hoisted, but can reference variables prefixed with `mock`.
//
// We auto-mock every source package with a simple class containing a scrape stub.
// This prevents TypeScript compilation of the real source files, avoiding
// cascading TS errors from dice.service.ts etc.
// ---------------------------------------------------------------------------
const mockSourceFactory = () => {
  const handler: ProxyHandler<object> = {
    get: (_target, prop) => {
      if (prop === "__esModule") return true;
      // Return a class with a scrape method for any named export
      return class {
        scrape = jest.fn();
      };
    },
  };
  return new Proxy({}, handler);
};

jest.mock("@rad-ar/source-linkedin", () => mockSourceFactory());
jest.mock("@rad-ar/source-indeed", () => mockSourceFactory());
jest.mock("@rad-ar/source-glassdoor", () => mockSourceFactory());
jest.mock("@rad-ar/source-ziprecruiter", () => mockSourceFactory());
jest.mock("@rad-ar/source-google", () => mockSourceFactory());
jest.mock("@rad-ar/source-bayt", () => mockSourceFactory());
jest.mock("@rad-ar/source-naukri", () => mockSourceFactory());
jest.mock("@rad-ar/source-bdjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-internshala", () => mockSourceFactory());
jest.mock("@rad-ar/source-exa", () => mockSourceFactory());
jest.mock("@rad-ar/source-upwork", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-ashby", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-greenhouse", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-lever", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-workable", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-smartrecruiters", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-rippling", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-workday", () => mockSourceFactory());
jest.mock("@rad-ar/source-company-amazon", () => mockSourceFactory());
jest.mock("@rad-ar/source-company-apple", () => mockSourceFactory());
jest.mock("@rad-ar/source-company-microsoft", () => mockSourceFactory());
jest.mock("@rad-ar/source-company-nvidia", () => mockSourceFactory());
jest.mock("@rad-ar/source-company-tiktok", () => mockSourceFactory());
jest.mock("@rad-ar/source-company-uber", () => mockSourceFactory());
jest.mock("@rad-ar/source-company-cursor", () => mockSourceFactory());
jest.mock("@rad-ar/source-remoteok", () => mockSourceFactory());
jest.mock("@rad-ar/source-remotive", () => mockSourceFactory());
jest.mock("@rad-ar/source-jobicy", () => mockSourceFactory());
jest.mock("@rad-ar/source-himalayas", () => mockSourceFactory());
jest.mock("@rad-ar/source-arbeitnow", () => mockSourceFactory());
jest.mock("@rad-ar/source-weworkremotely", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-recruitee", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-teamtailor", () => mockSourceFactory());
jest.mock("@rad-ar/source-usajobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-adzuna", () => mockSourceFactory());
jest.mock("@rad-ar/source-reed", () => mockSourceFactory());
jest.mock("@rad-ar/source-jooble", () => mockSourceFactory());
jest.mock("@rad-ar/source-careerjet", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-bamboohr", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-personio", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-jazzhr", () => mockSourceFactory());
jest.mock("@rad-ar/source-dice", () => mockSourceFactory());
jest.mock("@rad-ar/source-simplyhired", () => mockSourceFactory());
jest.mock("@rad-ar/source-wellfound", () => mockSourceFactory());
jest.mock("@rad-ar/source-stepstone", () => mockSourceFactory());
jest.mock("@rad-ar/source-monster", () => mockSourceFactory());
jest.mock("@rad-ar/source-careerbuilder", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-icims", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-taleo", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-successfactors", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-jobvite", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-adp", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-ukg", () => mockSourceFactory());
jest.mock("@rad-ar/source-company-google", () => mockSourceFactory());
jest.mock("@rad-ar/source-company-meta", () => mockSourceFactory());
jest.mock("@rad-ar/source-company-netflix", () => mockSourceFactory());
jest.mock("@rad-ar/source-company-stripe", () => mockSourceFactory());
jest.mock("@rad-ar/source-company-openai", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-breezyhr", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-comeet", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-pinpoint", () => mockSourceFactory());
jest.mock("@rad-ar/source-builtin", () => mockSourceFactory());
jest.mock("@rad-ar/source-snagajob", () => mockSourceFactory());
jest.mock("@rad-ar/source-dribbble", () => mockSourceFactory());
// Phase 8: ATS Expansion
jest.mock("@rad-ar/source-ats-manatal", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-paylocity", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-freshteam", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-bullhorn", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-trakstar", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-hiringthing", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-loxo", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-fountain", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-deel", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-phenom", () => mockSourceFactory());
// Phase 8: Company scrapers
jest.mock("@rad-ar/source-company-ibm", () => mockSourceFactory());
jest.mock("@rad-ar/source-company-boeing", () => mockSourceFactory());
jest.mock("@rad-ar/source-company-zoom", () => mockSourceFactory());
// Phase 9: Job board expansion
jest.mock("@rad-ar/source-themuse", () => mockSourceFactory());
jest.mock("@rad-ar/source-workingnomads", () => mockSourceFactory());
jest.mock("@rad-ar/source-4dayweek", () => mockSourceFactory());
jest.mock("@rad-ar/source-startupjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-nodesk", () => mockSourceFactory());
jest.mock("@rad-ar/source-web3career", () => mockSourceFactory());
jest.mock("@rad-ar/source-echojobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-jobstreet", () => mockSourceFactory());
// Phase 10: Government boards & ATS expansion
jest.mock("@rad-ar/source-careeronestop", () => mockSourceFactory());
jest.mock("@rad-ar/source-arbeitsagentur", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-jobylon", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-homerun", () => mockSourceFactory());
// Phase 11: Niche boards & developer API expansion
jest.mock("@rad-ar/source-hackernews", () => mockSourceFactory());
jest.mock("@rad-ar/source-landingjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-findwork", () => mockSourceFactory());
jest.mock("@rad-ar/source-jobdataapi", () => mockSourceFactory());
// Phase 12: ATS & niche board expansion
jest.mock("@rad-ar/source-authenticjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-jobscore", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-talentlyft", () => mockSourceFactory());
// Phase 13: RSS niche board expansion
jest.mock("@rad-ar/source-cryptojobslist", () => mockSourceFactory());
jest.mock("@rad-ar/source-jobspresso", () => mockSourceFactory());
jest.mock("@rad-ar/source-higheredjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-fossjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-larajobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-pythonjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-drupaljobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-realworkfromanywhere", () => mockSourceFactory());
jest.mock("@rad-ar/source-golangjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-wordpressjobs", () => mockSourceFactory());
// Phase 14: API-key sources & ATS expansion
jest.mock("@rad-ar/source-talroo", () => mockSourceFactory());
jest.mock("@rad-ar/source-infojobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-crelate", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-ismartrecruit", () => mockSourceFactory());
jest.mock("@rad-ar/source-ats-recruiterflow", () => mockSourceFactory());
// Phase 15: European government & regional boards
jest.mock("@rad-ar/source-jobtechdev", () => mockSourceFactory());
jest.mock("@rad-ar/source-francetravail", () => mockSourceFactory());
jest.mock("@rad-ar/source-navjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-jobsacuk", () => mockSourceFactory());
jest.mock("@rad-ar/source-jobindex", () => mockSourceFactory());
// Phase 16: Global expansion (LatAm, gig, startup, Canada)
jest.mock("@rad-ar/source-getonboard", () => mockSourceFactory());
jest.mock("@rad-ar/source-freelancercom", () => mockSourceFactory());
jest.mock("@rad-ar/source-joinrise", () => mockSourceFactory());
jest.mock("@rad-ar/source-canadajobbank", () => mockSourceFactory());
// Phase 17: Niche & international expansion (NGO, UN, IT)
jest.mock("@rad-ar/source-reliefweb", () => mockSourceFactory());
jest.mock("@rad-ar/source-undpjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-devitjobs", () => mockSourceFactory());
// Phase 18: Niche RSS expansion (tech, design, environment, regional)
jest.mock("@rad-ar/source-pyjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-vuejobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-conservationjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-coroflot", () => mockSourceFactory());
jest.mock("@rad-ar/source-berlinstartupjobs", () => mockSourceFactory());
// Phase 19: Tech niche, crypto, regional expansion
jest.mock("@rad-ar/source-railsjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-elixirjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-crunchboard", () => mockSourceFactory());
jest.mock("@rad-ar/source-cryptocurrencyjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-hasjob", () => mockSourceFactory());
// Phase 20: European regional & niche expansion
jest.mock("@rad-ar/source-icrunchdata", () => mockSourceFactory());
jest.mock("@rad-ar/source-swissdevjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-germantechjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-virtualvocations", () => mockSourceFactory());
jest.mock("@rad-ar/source-nofluffjobs", () => mockSourceFactory());
// Phase 21: Niche & academic expansion
jest.mock("@rad-ar/source-greenjobsboard", () => mockSourceFactory());
jest.mock("@rad-ar/source-eurojobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-opensourcedesignjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-academiccareers", () => mockSourceFactory());
jest.mock("@rad-ar/source-remotefirstjobs", () => mockSourceFactory());
// Phase 22: Eastern European, CIS & Singapore expansion
jest.mock("@rad-ar/source-djinni", () => mockSourceFactory());
jest.mock("@rad-ar/source-headhunter", () => mockSourceFactory());
jest.mock("@rad-ar/source-habrcareer", () => mockSourceFactory());
jest.mock("@rad-ar/source-mycareersfuture", () => mockSourceFactory());
// Phase 23: Japan, Nordic & Swiss expansion
jest.mock("@rad-ar/source-jobsinjapan", () => mockSourceFactory());
jest.mock("@rad-ar/source-duunitori", () => mockSourceFactory());
jest.mock("@rad-ar/source-jobsch", () => mockSourceFactory());
// Phase 24: UK & mobile dev expansion
jest.mock("@rad-ar/source-guardianjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-androidjobs", () => mockSourceFactory());
jest.mock("@rad-ar/source-iosdevjobs", () => mockSourceFactory());
// Phase 25: DevOps niche expansion
jest.mock("@rad-ar/source-devopsjobs", () => mockSourceFactory());
// Phase 25: FP, diversity & niche expansion
jest.mock("@rad-ar/source-functionalworks", () => mockSourceFactory());
jest.mock("@rad-ar/source-powertofly", () => mockSourceFactory());
jest.mock("@rad-ar/source-clojurejobs", () => mockSourceFactory());
// Phase 26: Sustainability & niche expansion
jest.mock("@rad-ar/source-ecojobs", () => mockSourceFactory());

import { JobsService } from "../jobs.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a mock scraper that resolves with the given jobs */
function makeScraper(jobs: Partial<JobPostDto>[] = []): IScraper {
  return {
    scrape: jest.fn().mockResolvedValue(
      new JobResponseDto(
        jobs.map(
          (j) =>
            new JobPostDto({
              id: j.id ?? `job-${Math.random().toString(36).slice(2)}`,
              title: j.title ?? "Software Engineer",
              companyName: j.companyName ?? "Acme Corp",
              jobUrl: j.jobUrl ?? "https://example.com/job/1",
              site: j.site,
              description: j.description,
              compensation: j.compensation,
              datePosted: j.datePosted,
              isRemote: j.isRemote ?? false,
            }),
        ),
      ),
    ),
  };
}

/** Create a failing mock scraper */
function failingScraper(error = "Network timeout"): IScraper {
  return { scrape: jest.fn().mockRejectedValue(new Error(error)) };
}

/**
 * Create a JobsService instance with a custom scraperMap.
 * Bypasses the 182-arg constructor by using Object.create.
 */
function createService(scraperEntries: [Site, IScraper][]): JobsService {
  const service = Object.create(JobsService.prototype);
  const scraperMap = new Map<Site, IScraper>(scraperEntries);
  const atsSites = new Set<Site>([
    Site.GREENHOUSE,
    Site.LEVER,
    Site.ASHBY,
    Site.WORKABLE,
    Site.SMARTRECRUITERS,
    Site.RIPPLING,
    Site.WORKDAY,
  ]);

  service.logger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  service.registry = {
    get size() {
      return scraperMap.size;
    },
    getScraper: jest.fn((site: Site) => scraperMap.get(site)),
    listAtsSites: jest.fn(() =>
      Array.from(atsSites).filter((site) => scraperMap.has(site)),
    ),
    listSiteKeys: jest.fn(() => Array.from(scraperMap.keys())),
    listSources: jest.fn(() =>
      Array.from(scraperMap.keys()).map((site) => ({
        site,
        name: site,
        category: atsSites.has(site) ? "ats" : "source",
      })),
    ),
    registerExternal: jest.fn((site: Site, scraper: IScraper) =>
      scraperMap.set(site, scraper),
    ),
  };
  service.configService = {
    get: jest.fn(() => ({
      defaultRetries: 0,
      defaultDelayMs: 0,
      defaultBackoff: 1,
      perSource: {},
    })),
  };
  service.metrics = {
    scraperDuration: { startTimer: jest.fn(() => jest.fn()) },
    scraperRequestsTotal: { inc: jest.fn() },
    setTotalSources: jest.fn(),
  };
  service.circuitBreaker = undefined;
  return service;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("JobsService", () => {
  describe("initialization", () => {
    it("publishes the discovered plugin registry size", () => {
      const service = createService([
        [Site.LINKEDIN, makeScraper()],
        [Site.INDEED, makeScraper()],
      ]);

      service.onModuleInit();

      expect((service as any).metrics.setTotalSources).toHaveBeenCalledWith(2);
    });

    it("refreshes the source total after a runtime plugin registration", () => {
      const service = createService([[Site.LINKEDIN, makeScraper()]]);

      service.registerScraper("community-source", makeScraper());

      expect((service as any).metrics.setTotalSources).toHaveBeenCalledWith(2);
    });
  });

  describe("searchJobs — site routing", () => {
    it("should use explicit siteType when provided", async () => {
      const linkedin = makeScraper([{ title: "LI job" }]);
      const indeed = makeScraper([{ title: "Indeed job" }]);
      const service = createService([
        [Site.LINKEDIN, linkedin],
        [Site.INDEED, indeed],
      ]);

      const input = new ScraperInputDto({
        searchTerm: "node",
        siteType: [Site.LINKEDIN],
      });
      const result = await service.searchJobs(input);

      expect(linkedin.scrape).toHaveBeenCalled();
      expect(indeed.scrape).not.toHaveBeenCalled();
      expect(result.length).toBe(1);
      expect(result[0].title).toBe("LI job");
    });

    it("should route to ATS scrapers when companySlug is provided and no explicit sites", async () => {
      const greenhouse = makeScraper([{ title: "GH job" }]);
      const linkedin = makeScraper([{ title: "LI job" }]);
      const service = createService([
        [Site.GREENHOUSE, greenhouse],
        [Site.LINKEDIN, linkedin],
      ]);

      const input = new ScraperInputDto({
        searchTerm: "node",
        companySlug: "stripe",
        siteType: undefined,
      });
      const result = await service.searchJobs(input);

      // GREENHOUSE is ATS → called; LINKEDIN is search → skipped
      expect(greenhouse.scrape).toHaveBeenCalled();
      expect(linkedin.scrape).not.toHaveBeenCalled();
      expect(result.length).toBe(1);
    });

    it("should skip ATS scrapers in default routing (no companySlug, no siteType)", async () => {
      const linkedin = makeScraper([{ title: "LI job" }]);
      const lever = makeScraper([{ title: "Lever job" }]);
      const amazon = makeScraper([{ title: "Amazon job" }]);
      const service = createService([
        [Site.LINKEDIN, linkedin],
        [Site.LEVER, lever],
        [Site.AMAZON, amazon],
      ]);

      const input = new ScraperInputDto({
        searchTerm: "node",
        siteType: undefined,
      });
      const result = await service.searchJobs(input);

      expect(linkedin.scrape).toHaveBeenCalled();
      expect(amazon.scrape).toHaveBeenCalled();
      expect(lever.scrape).not.toHaveBeenCalled();
      expect(result.length).toBe(2);
    });

    it("should return empty array when no valid scrapers match", async () => {
      const service = createService([]);
      const input = new ScraperInputDto({
        searchTerm: "node",
        siteType: [Site.LINKEDIN],
      });
      const result = await service.searchJobs(input);
      expect(result).toEqual([]);
    });

    it("should allow ATS scrapers via explicit siteType even without companySlug", async () => {
      const lever = makeScraper([{ title: "Lever job" }]);
      const service = createService([[Site.LEVER, lever]]);

      const input = new ScraperInputDto({
        searchTerm: "node",
        siteType: [Site.LEVER],
      });
      const result = await service.searchJobs(input);

      expect(lever.scrape).toHaveBeenCalled();
      expect(result.length).toBe(1);
    });
  });

  describe("searchJobs — error handling", () => {
    it("should not crash when one scraper fails", async () => {
      const linkedin = makeScraper([{ title: "LI job" }]);
      const service = createService([
        [Site.LINKEDIN, linkedin],
        [Site.INDEED, failingScraper()],
      ]);

      const input = new ScraperInputDto({
        searchTerm: "node",
        siteType: [Site.LINKEDIN, Site.INDEED],
      });
      const result = await service.searchJobs(input);

      expect(result.length).toBe(1);
      expect(result[0].title).toBe("LI job");
    });

    it("should return empty array when all scrapers fail", async () => {
      const service = createService([
        [Site.LINKEDIN, failingScraper("API down")],
      ]);

      const input = new ScraperInputDto({
        searchTerm: "node",
        siteType: [Site.LINKEDIN],
      });
      const result = await service.searchJobs(input);

      expect(result).toEqual([]);
    });

    it("should expose per-source outcomes to watcher callers", async () => {
      const service = createService([
        [Site.LINKEDIN, makeScraper([{ title: "LI job" }])],
        [Site.INDEED, failingScraper("provider unavailable")],
      ]);

      const result = await service.searchJobsDetailed(
        new ScraperInputDto({
          searchTerm: "intern",
          siteType: [Site.LINKEDIN, Site.INDEED],
        }),
      );

      expect(result.jobs).toHaveLength(1);
      expect(result.sourcesRequested).toEqual([Site.LINKEDIN, Site.INDEED]);
      expect(result.sourcesSucceeded).toEqual([Site.LINKEDIN]);
      expect(result.sourcesFailed).toEqual([
        { source: Site.INDEED, error: "provider unavailable" },
      ]);
      expect(result.durationsMs).toHaveProperty(Site.LINKEDIN);
      expect(result.durationsMs).toHaveProperty(Site.INDEED);
    });
  });

  describe("searchJobs — result tagging and sorting", () => {
    it("should tag each job with its source site", async () => {
      const linkedin = makeScraper([{ title: "Job A" }]);
      const indeed = makeScraper([{ title: "Job B" }]);
      const service = createService([
        [Site.LINKEDIN, linkedin],
        [Site.INDEED, indeed],
      ]);

      const input = new ScraperInputDto({
        searchTerm: "node",
        siteType: [Site.LINKEDIN, Site.INDEED],
      });
      const result = await service.searchJobs(input);

      const sites = result.map((j) => j.site);
      expect(sites).toContain(Site.LINKEDIN);
      expect(sites).toContain(Site.INDEED);
    });

    it("should sort results by site name then date descending", async () => {
      const scraper = makeScraper([
        { title: "Old", datePosted: "2024-01-01" },
        { title: "New", datePosted: "2024-06-01" },
      ]);
      const service = createService([[Site.LINKEDIN, scraper]]);

      const input = new ScraperInputDto({
        searchTerm: "node",
        siteType: [Site.LINKEDIN],
      });
      const result = await service.searchJobs(input);

      expect(result[0].title).toBe("New");
      expect(result[1].title).toBe("Old");
    });
  });

  describe("postProcessSalary", () => {
    let service: JobsService;

    beforeEach(() => {
      service = createService([]);
    });

    it("should set salarySource to DIRECT_DATA when compensation exists", () => {
      const job = new JobPostDto({
        id: "1",
        title: "SWE",
        companyName: "Co",
        jobUrl: "https://example.com",
        compensation: new CompensationDto({
          interval: CompensationInterval.YEARLY,
          minAmount: 100000,
          maxAmount: 150000,
          currency: "USD",
        }),
      });

      (service as any).postProcessSalary(
        job,
        new ScraperInputDto({ searchTerm: "node" }),
      );
      expect(job.salarySource).toBe(SalarySource.DIRECT_DATA);
    });

    it("should convert hourly to annual when enforceAnnualSalary is true", () => {
      const job = new JobPostDto({
        id: "1",
        title: "SWE",
        companyName: "Co",
        jobUrl: "https://example.com",
        compensation: new CompensationDto({
          interval: CompensationInterval.HOURLY,
          minAmount: 50,
          maxAmount: 100,
          currency: "USD",
        }),
      });

      (service as any).postProcessSalary(
        job,
        new ScraperInputDto({ searchTerm: "node", enforceAnnualSalary: true }),
      );

      expect(job.compensation!.minAmount).toBe(104000);
      expect(job.compensation!.maxAmount).toBe(208000);
    });

    it("should extract salary from description for USA jobs without compensation", () => {
      const job = new JobPostDto({
        id: "1",
        title: "SWE",
        companyName: "Co",
        jobUrl: "https://example.com",
        description: "Salary range: $120,000 - $180,000 per year",
      });

      (service as any).postProcessSalary(
        job,
        new ScraperInputDto({ searchTerm: "node", country: Country.USA }),
      );

      expect(job.salarySource).toBe(SalarySource.DESCRIPTION);
      expect(job.compensation).toBeDefined();
      expect(job.compensation!.minAmount).toBe(120000);
      expect(job.compensation!.maxAmount).toBe(180000);
    });

    it("should not extract salary for non-USA countries", () => {
      const job = new JobPostDto({
        id: "1",
        title: "SWE",
        companyName: "Co",
        jobUrl: "https://example.com",
        description: "Salary range: $120,000 - $180,000 per year",
      });

      (service as any).postProcessSalary(
        job,
        new ScraperInputDto({ searchTerm: "node", country: Country.UK }),
      );

      expect(job.compensation).toBeUndefined();
      expect(job.salarySource).toBeUndefined();
    });

    it("should clear salarySource when no salary data exists", () => {
      const job = new JobPostDto({
        id: "1",
        title: "SWE",
        companyName: "Co",
        jobUrl: "https://example.com",
      });

      (service as any).postProcessSalary(
        job,
        new ScraperInputDto({ searchTerm: "node" }),
      );

      expect(job.salarySource).toBeUndefined();
    });
  });
});
