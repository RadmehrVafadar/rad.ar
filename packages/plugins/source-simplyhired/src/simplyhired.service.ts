import { SourcePlugin } from '@rad-ar/plugin';

// WIP: This source may need selector updates after live testing.
// SimplyHired is owned by Indeed and may have anti-bot measures.
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as cheerio from 'cheerio';
import {
  IScraper,
  ScraperInputDto,
  JobResponseDto,
  JobPostDto,
  LocationDto,
  Site,
} from '@rad-ar/models';
import {
  createHttpClient,
  randomSleep,
  extractSalary,
} from '@rad-ar/common';
import { BrowserPool } from '@rad-ar/common';
import {
  SIMPLYHIRED_SEARCH_URL,
  SIMPLYHIRED_HEADERS,
  SIMPLYHIRED_DELAY_MIN,
  SIMPLYHIRED_DELAY_MAX,
} from './simplyhired.constants';

@SourcePlugin({
  site: Site.SIMPLYHIRED,
  name: 'SimplyHired',
  category: 'job-board',
})
@Injectable()
export class SimplyHiredService implements IScraper, OnModuleDestroy {
  private readonly logger = new Logger(SimplyHiredService.name);

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const resultsWanted = input.resultsWanted ?? 15;

    // Try cheerio first
    const cheerioJobs = await this.scrapeWithCheerio(input, resultsWanted);
    if (cheerioJobs.length > 0) {
      return new JobResponseDto(cheerioJobs);
    }

    // Fallback to Playwright if cheerio failed (likely anti-bot block)
    this.logger.log('SimplyHired: cheerio returned zero results, falling back to Playwright');
    const playwrightJobs = await this.scrapeWithPlaywright(input, resultsWanted);
    return new JobResponseDto(playwrightJobs);
  }

  private async scrapeWithCheerio(
    input: ScraperInputDto,
    resultsWanted: number,
  ): Promise<JobPostDto[]> {
    const client = createHttpClient(input);
    client.setHeaders(SIMPLYHIRED_HEADERS);

    const allJobs: JobPostDto[] = [];
    let page = 1;
    const maxPages = Math.ceil(resultsWanted / 20) + 1;

    while (allJobs.length < resultsWanted && page <= maxPages) {
      try {
        const url = new URL(SIMPLYHIRED_SEARCH_URL);
        if (input.searchTerm) url.searchParams.set('q', input.searchTerm);
        if (input.location) url.searchParams.set('l', input.location);
        if (page > 1) url.searchParams.set('pn', String(page));

        this.logger.log(`Fetching SimplyHired search page ${page}`);
        const response = await client.get<string>(url.toString());
        const html = response.data;

        const jobs = this.parseHtml(html);
        if (jobs.length === 0) break;

        allJobs.push(...jobs);
        page++;

        if (page <= maxPages && allJobs.length < resultsWanted) {
          await randomSleep(SIMPLYHIRED_DELAY_MIN, SIMPLYHIRED_DELAY_MAX);
        }
      } catch (err: any) {
        this.logger.error(`SimplyHired cheerio error page ${page}: ${err.message}`);
        break;
      }
    }

    return allJobs.slice(0, resultsWanted);
  }

  private async scrapeWithPlaywright(
    input: ScraperInputDto,
    resultsWanted: number,
  ): Promise<JobPostDto[]> {
    const proxy = input.proxies?.[0] ?? undefined;
    let page;

    try {
      page = await BrowserPool.getPage({ proxy });
      const timeoutMs = (input.requestTimeout ?? 30) * 1000;

      const url = new URL(SIMPLYHIRED_SEARCH_URL);
      if (input.searchTerm) url.searchParams.set('q', input.searchTerm);
      if (input.location) url.searchParams.set('l', input.location);

      this.logger.log(`SimplyHired Playwright: navigating to ${url.toString()}`);
      await page.goto(url.toString(), {
        waitUntil: 'domcontentloaded',
        timeout: timeoutMs,
      });

      await this.delay(5000);

      const html = await page.content();
      const jobs = this.parseHtml(html);

      if (jobs.length === 0) {
        // TODO: Validate selectors against live SimplyHired rendered DOM
        this.logger.warn('SimplyHired Playwright: zero jobs extracted — selectors may need updating');
      }

      this.logger.log(`SimplyHired Playwright: extracted ${jobs.length} jobs`);
      return jobs.slice(0, resultsWanted);
    } catch (err: any) {
      this.logger.error(`SimplyHired Playwright scrape failed: ${err.message}`);
      return [];
    } finally {
      if (page) {
        const context = page.context();
        await page.close().catch(() => {});
        await context.close().catch(() => {});
      }
    }
  }

  private parseHtml(html: string): JobPostDto[] {
    const $ = cheerio.load(html);
    const jobs: JobPostDto[] = [];

    // TODO: Validate selectors against live site
    const selectors = [
      '[data-testid="searchSerpJob"]',
      '.SerpJob',
      'article.SerpJob-jobCard',
      'li[data-jobkey]',
      '.jobposting-subtitle',
    ];

    let cards: cheerio.Cheerio<any> | null = null;
    for (const sel of selectors) {
      const found = $(sel);
      if (found.length > 0) {
        cards = found;
        break;
      }
    }

    // Broader fallback
    if (!cards || cards.length === 0) {
      cards = $('article, [data-job-id]');
    }

    if (!cards || cards.length === 0) {
      return [];
    }

    cards.each((_, el) => {
      try {
        const card = $(el);

        const titleEl = card.find('h2 a, h3 a, .jobposting-title a, a[data-testid="searchSerpJobTitle"]').first();
        const title = titleEl.text().trim();
        if (!title) return;

        let href = titleEl.attr('href') ?? '';
        if (!href) return;
        if (href.startsWith('/')) {
          href = `https://www.simplyhired.com${href}`;
        }

        const company = card.find('[data-testid="companyName"], .jobposting-company, .SerpJob-link--company').text().trim() || null;
        const location = card.find('[data-testid="searchSerpJobLocation"], .jobposting-location, .SerpJob-location').text().trim() || null;
        const salaryText = card.find('[data-testid="searchSerpJobSalaryEst"], .jobposting-salary, .SerpJob-salary').text().trim() || null;
        const snippet = card.find('.jobposting-snippet, .SerpJob-snippet, p').first().text().trim() || null;

        let compensation = null;
        if (salaryText) {
          const parsed = extractSalary(salaryText);
          if (parsed.minAmount != null) {
            compensation = {
              interval: parsed.interval,
              minAmount: parsed.minAmount,
              maxAmount: parsed.maxAmount,
              currency: parsed.currency ?? 'USD',
            };
          }
        }

        const id = `simplyhired-${Math.abs(this.hashCode(href))}`;

        jobs.push(new JobPostDto({
          id,
          title,
          companyName: company,
          jobUrl: href,
          location: location ? new LocationDto({ city: location }) : null,
          description: snippet,
          compensation: compensation as any,
          site: Site.SIMPLYHIRED,
        }));
      } catch {
        // Skip card errors
      }
    });

    return jobs;
  }

  async onModuleDestroy(): Promise<void> {
    await BrowserPool.close();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
