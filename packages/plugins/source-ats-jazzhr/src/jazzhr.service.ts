import { SourcePlugin } from '@rad-ar/plugin';

// WIP: This source may need selector updates after live testing.
// JazzHR career pages use different themes so selectors may vary per company.
import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import {
  IScraper,
  ScraperInputDto,
  JobResponseDto,
  JobPostDto,
  LocationDto,
  DescriptionFormat,
  Site,
} from '@rad-ar/models';
import {
  createHttpClient,
  extractEmails,
  htmlToPlainText,
} from '@rad-ar/common';
import { JAZZHR_HEADERS } from './jazzhr.constants';

@SourcePlugin({
  site: Site.JAZZHR,
  name: 'JazzHR',
  category: 'ats',
  isAts: true,
})
@Injectable()
export class JazzHRService implements IScraper {
  private readonly logger = new Logger(JazzHRService.name);

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const companySlug = input.companySlug;
    if (!companySlug) {
      this.logger.warn('No companySlug provided for JazzHR scraper');
      return new JobResponseDto([]);
    }

    // Check for API key: per-request auth overrides env var
    const apiKey = input.auth?.jazzhr?.apiKey ?? process.env.JAZZHR_API_KEY;
    if (apiKey) {
      try {
        const result = await this.scrapeWithApi(apiKey, companySlug, input);
        return result;
      } catch (err: any) {
        this.logger.warn(
          `JazzHR authenticated API failed for ${companySlug}: ${err.message}. Falling back to HTML scraping.`,
        );
      }
    }

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(JAZZHR_HEADERS);

    const url = `https://${encodeURIComponent(companySlug)}.applytojob.com/apply/jobs/`;

    try {
      this.logger.log(`Fetching JazzHR career page for company: ${companySlug}`);
      const response = await client.get<string>(url);
      const html = response.data;

      if (!html) {
        this.logger.warn(`JazzHR: empty response for ${companySlug}`);
        return new JobResponseDto([]);
      }

      const jobs = this.parseHtml(html, companySlug);

      if (jobs.length === 0) {
        // TODO: Validate selectors against live JazzHR career pages
        this.logger.warn(
          `JazzHR: zero jobs extracted for ${companySlug} — selectors may need updating`,
        );
      }

      this.logger.log(`JazzHR: found ${jobs.length} jobs for ${companySlug}`);

      const resultsWanted = input.resultsWanted ?? 100;
      return new JobResponseDto(jobs.slice(0, resultsWanted));
    } catch (err: any) {
      this.logger.error(`JazzHR scrape error for ${companySlug}: ${err.message}`);
      return new JobResponseDto([]);
    }
  }

  private parseHtml(html: string, companySlug: string): JobPostDto[] {
    const $ = cheerio.load(html);
    const jobs: JobPostDto[] = [];

    // TODO: Validate selectors against live site — JazzHR themes vary
    // Common patterns: <a> links inside job listing containers
    // Selector strategy: try multiple known JazzHR DOM structures
    const selectors = [
      'li.list-group-item a[href*="/apply/"]',
      'div.job-listing a[href*="/apply/"]',
      'a.job-title[href*="/apply/"]',
      '.resumator-jobs-list a[href*="/apply/"]',
      'table.resumator-jobs-table tr a',
    ];

    let links: cheerio.Cheerio<any> | null = null;
    for (const sel of selectors) {
      const found = $(sel);
      if (found.length > 0) {
        links = found;
        break;
      }
    }

    // Fallback: find any link that looks like a JazzHR job link
    if (!links || links.length === 0) {
      links = $('a[href*="/apply/"]').filter((_, el) => {
        const href = $(el).attr('href') ?? '';
        return href.includes('/apply/') && !href.endsWith('/apply/jobs/');
      });
    }

    if (!links || links.length === 0) {
      return [];
    }

    links.each((_, el) => {
      try {
        const a = $(el);
        const title = a.text().trim();
        if (!title) return;

        let href = a.attr('href') ?? '';
        if (!href) return;

        // Make URL absolute if relative
        if (href.startsWith('/')) {
          href = `https://${encodeURIComponent(companySlug)}.applytojob.com${href}`;
        }

        // Try to extract location from sibling/parent elements
        const parent = a.closest('li, tr, div.job-listing');
        const locationText = parent.find('.location, .job-location, td:nth-child(2)').text().trim() || null;
        const deptText = parent.find('.department, .job-department, td:nth-child(3)').text().trim() || null;

        const jobId = `jazzhr-${Math.abs(this.hashCode(href))}`;

        jobs.push(new JobPostDto({
          id: jobId,
          title,
          companyName: companySlug,
          jobUrl: href,
          location: locationText ? new LocationDto({ city: locationText }) : null,
          site: Site.JAZZHR,
          atsId: jobId,
          atsType: 'jazzhr',
          department: deptText,
        }));
      } catch (err: any) {
        this.logger.debug(`JazzHR: failed to parse job card: ${err.message}`);
      }
    });

    return jobs;
  }

  /**
   * Fetch jobs using the authenticated JazzHR REST API.
   * API key is passed as a query parameter.
   *
   * @see https://www.jazzhr.com/api/
   */
  private async scrapeWithApi(
    apiKey: string,
    companySlug: string,
    input: ScraperInputDto,
  ): Promise<JobResponseDto> {
    this.logger.log(
      `JazzHR: using authenticated API for company: ${companySlug}`,
    );

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });

    const url = `https://api.resumatorapi.com/v1/jobs/status/open?apikey=${encodeURIComponent(apiKey)}`;

    const response = await client.get(url, {
      headers: { Accept: 'application/json' },
    });

    const jobs: any[] = Array.isArray(response.data) ? response.data : [];

    this.logger.log(
      `JazzHR (authenticated): found ${jobs.length} jobs for ${companySlug}`,
    );

    const resultsWanted = input.resultsWanted ?? 100;
    const jobPosts: JobPostDto[] = [];

    for (const job of jobs) {
      if (jobPosts.length >= resultsWanted) break;

      try {
        const post = this.mapApiJob(job, companySlug, input.descriptionFormat);
        if (post) {
          jobPosts.push(post);
        }
      } catch (err: any) {
        this.logger.warn(
          `Error processing JazzHR API job ${job.id}: ${err.message}`,
        );
      }
    }

    return new JobResponseDto(jobPosts);
  }

  /**
   * Map a JazzHR API job object to a JobPostDto.
   *
   * API response fields include: id, title, city, state, zip,
   * department, description, type, original_open_date, etc.
   */
  private mapApiJob(
    job: any,
    companySlug: string,
    format?: DescriptionFormat,
  ): JobPostDto | null {
    const title = job.title;
    if (!title) return null;

    // Description
    let description: string | null = null;
    if (job.description) {
      if (format === DescriptionFormat.HTML) {
        description = job.description;
      } else if (format === DescriptionFormat.PLAIN) {
        description = htmlToPlainText(job.description);
      } else {
        // Default: MARKDOWN / plain fallback
        description = htmlToPlainText(job.description);
      }
    }

    // Location — API provides city, state, zip as separate fields
    const city = job.city || null;
    const state = job.state || null;
    const location = (city || state)
      ? new LocationDto({ city, state })
      : null;

    // Job URL: JazzHR apply link pattern
    const jobUrl = job.board_code
      ? `https://${encodeURIComponent(companySlug)}.applytojob.com/apply/${job.board_code}`
      : `https://${encodeURIComponent(companySlug)}.applytojob.com/apply/${job.id}`;

    return new JobPostDto({
      id: `jazzhr-${job.id}`,
      title,
      companyName: companySlug,
      jobUrl,
      location,
      description,
      datePosted: job.original_open_date ?? null,
      emails: extractEmails(description),
      site: Site.JAZZHR,
      atsId: job.id ?? null,
      atsType: 'jazzhr',
      department: job.department ?? null,
      employmentType: job.type ?? null,
    });
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash;
  }
}
