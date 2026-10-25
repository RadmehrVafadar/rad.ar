import { Injectable, Logger } from '@nestjs/common';
import { SourcePlugin } from '@rad-ar/plugin';
import {
  IScraper,
  JobPostDto,
  JobResponseDto,
  LocationDto,
  ScraperInputDto,
  Site,
} from '@rad-ar/models';
import { createHttpClient } from '@rad-ar/common';
import {
  GEM_API_ENDPOINT,
  GEM_BASE_URL,
  GEM_DEFAULT_RESULTS_WANTED,
  GEM_HEADERS,
  GEM_JOB_BOARD_LIST_QUERY,
  GEM_JOB_BOARD_THEME_QUERY,
} from './gem.constants';
import {
  GemBatchEnvelope,
  GemJobPosting,
} from './gem.types';

/**
 * Spec 006 / T05 — Gem GraphQL-batch implementation.
 *
 * Issues a single batched POST to
 * `https://jobs.gem.com/api/public/graphql/batch` carrying both
 * `JobBoardTheme` and `JobBoardList` operations (matching the
 * upstream Python reference exactly). Picks the response array
 * entry whose `data.oatsExternalJobPostings` is defined — the
 * server is allowed to reorder operations, so a strict index lookup
 * (`data[1]`) would be brittle. Maps each `jobPostings[i]` to a
 * canonical `JobPostDto`.
 *
 * Behavioural parity with `OTHERS/Ats-scrapers/gem/scripts/gem_jobs_scraper/api_client.py`:
 *   - Both operations sent in one POST (the `batch: 'true'` header
 *     is required server-side; the `GEM_HEADERS` constant carries
 *     it).
 *   - Same field set on `JobBoardList` (`oatsExternalJobPostings`
 *     plus filters plus `jobBoardExternal` for company name).
 *   - Same `boardId = input.companySlug` mapping.
 *   - HTTP errors caught and surfaced as an empty `JobResponseDto`
 *     — the scrape never throws.
 *
 * Departures from upstream Python (intentional, all per Q-022 / FR-4):
 *   - We don't expose a separate `get_company_info` / `get_jobs_by_department`
 *     surface; the canonical `JobPostDto.companyName` is populated
 *     from `jobBoardExternal.teamDisplayName` when available, falling
 *     back to `companySlug`.
 *   - `posting.id` becomes `gem-${extId ?? id}` — same `<vendor>-<id>`
 *     prefix convention as `avature-`, `greenhouse-`, etc.
 *   - No `export_to_json` helper — `JobPostDto` IS the canonical
 *     export shape for downstream consumers.
 */
@SourcePlugin({
  site: Site.GEM,
  name: 'Gem',
  category: 'ats',
  isAts: true,
})
@Injectable()
export class GemService implements IScraper {
  private readonly logger = new Logger(GemService.name);

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const slug = input.companySlug?.trim();
    if (!slug) {
      this.logger.warn('Gem scrape requires `companySlug` — unset');
      return new JobResponseDto([]);
    }

    const resultsWanted = input.resultsWanted ?? GEM_DEFAULT_RESULTS_WANTED;

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(GEM_HEADERS);

    const payload = [
      {
        operationName: 'JobBoardTheme',
        variables: { boardId: slug },
        query: GEM_JOB_BOARD_THEME_QUERY,
      },
      {
        operationName: 'JobBoardList',
        variables: { boardId: slug },
        query: GEM_JOB_BOARD_LIST_QUERY,
      },
    ];

    let envelopes: ReadonlyArray<GemBatchEnvelope>;
    try {
      const response = await client.post<ReadonlyArray<GemBatchEnvelope>>(
        GEM_API_ENDPOINT,
        payload,
      );
      // Defensive: an upstream redirect can return a single envelope
      // (non-batched response) — coerce to an array so the index
      // walk below still works.
      const raw = response.data;
      envelopes = Array.isArray(raw) ? raw : raw ? [raw] : [];
    } catch (err: any) {
      this.logger.warn(
        `Gem GraphQL batch failed for ${slug}: ${err.message ?? String(err)}`,
      );
      return new JobResponseDto([]);
    }

    const list = this.pickJobBoardListEnvelope(envelopes);
    if (!list) {
      this.logger.warn(
        `Gem response for ${slug} carried no JobBoardList envelope (empty / errored / wrong shape)`,
      );
      return new JobResponseDto([]);
    }

    const postings = list.data?.oatsExternalJobPostings?.jobPostings ?? [];
    const companyName =
      list.data?.jobBoardExternal?.teamDisplayName ?? slug;

    const jobs: JobPostDto[] = [];
    for (const posting of postings) {
      if (jobs.length >= resultsWanted) break;
      const mapped = this.toJobPost(posting, slug, companyName);
      if (mapped) jobs.push(mapped);
    }

    this.logger.log(
      `Gem: ${jobs.length} jobs for ${slug} (resultsWanted=${resultsWanted})`,
    );
    return new JobResponseDto(jobs);
  }

  /**
   * Walk the batched response and return the envelope whose
   * `data.oatsExternalJobPostings` is defined. Tolerates either
   * order from the server (Theme first vs List first) — the
   * upstream Python relies on `data[1]` which would break under
   * the rare reorder.
   */
  private pickJobBoardListEnvelope(
    envelopes: ReadonlyArray<GemBatchEnvelope>,
  ): GemBatchEnvelope | null {
    for (const env of envelopes) {
      if (env?.data?.oatsExternalJobPostings !== undefined) {
        return env;
      }
    }
    return null;
  }

  /**
   * Map a single `GemJobPosting` to a canonical `JobPostDto`.
   * Returns `null` when the posting has no usable id (skipped
   * rather than emitted with a synthetic id, which would break
   * downstream dedup keying).
   */
  private toJobPost(
    posting: GemJobPosting,
    slug: string,
    companyName: string,
  ): JobPostDto | null {
    const id = posting.extId ?? posting.id;
    if (!id) return null;
    const title = posting.title?.trim();
    if (!title) return null;

    const firstLocation = posting.locations?.[0];
    const locationName = firstLocation?.name?.trim() ?? null;
    const location = locationName
      ? new LocationDto({ city: locationName })
      : null;
    const isRemote =
      firstLocation?.isRemote === true ||
      (locationName?.toLowerCase().includes('remote') ?? false) ||
      posting.job?.locationType?.toLowerCase().includes('remote') === true;

    const department = posting.job?.department?.name ?? null;

    return new JobPostDto({
      id: `gem-${id}`,
      title,
      companyName,
      jobUrl: `${GEM_BASE_URL}/${slug}/jobs/${id}`,
      location,
      isRemote,
      site: Site.GEM,
      atsId: id,
      atsType: 'gem',
      department,
    });
  }
}
