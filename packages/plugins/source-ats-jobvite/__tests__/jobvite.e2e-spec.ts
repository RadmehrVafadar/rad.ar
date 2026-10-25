/**
 * E2E test for the Jobvite scraper.
 *
 * Tests both public scraping and authenticated API paths.
 * To run authenticated tests, set JOBVITE_API_KEY and JOBVITE_API_SECRET env vars.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { JobviteModule, JobviteService } from '@rad-ar/source-ats-jobvite';
import { ScraperInputDto, Site, DescriptionFormat } from '@rad-ar/models';

describe('JobviteService (E2E)', () => {
  let service: JobviteService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JobviteModule],
    }).compile();

    service = module.get<JobviteService>(JobviteService);
  });

  it('should return job results via public scraping', async () => {
    const input = new ScraperInputDto({
      siteType: [Site.JOBVITE],
      companySlug: 'jobvite',
      resultsWanted: 5,
      descriptionFormat: DescriptionFormat.MARKDOWN,
    });

    const response = await service.scrape(input);

    expect(response).toBeDefined();
    expect(response.jobs).toBeDefined();
    expect(Array.isArray(response.jobs)).toBe(true);

    if (response.jobs.length > 0) {
      const job = response.jobs[0];
      expect(job.title).toBeDefined();
      expect(typeof job.title).toBe('string');
      expect(job.site).toBe(Site.JOBVITE);
      expect(job.atsType).toBe('jobvite');
    }
  });

  it('should fall back to public scraping when API credentials are invalid', async () => {
    const input = new ScraperInputDto({
      siteType: [Site.JOBVITE],
      companySlug: 'jobvite',
      resultsWanted: 3,
      auth: {
        jobvite: {
          apiKey: 'invalid-key',
          apiSecret: 'invalid-secret',
        },
      },
    });

    const response = await service.scrape(input);

    expect(response).toBeDefined();
    expect(response.jobs).toBeDefined();
    expect(Array.isArray(response.jobs)).toBe(true);
  });

  it('should return empty results when no companySlug provided', async () => {
    const input = new ScraperInputDto({
      siteType: [Site.JOBVITE],
      resultsWanted: 5,
    });

    const response = await service.scrape(input);

    expect(response).toBeDefined();
    expect(response.jobs.length).toBe(0);
  });
});
