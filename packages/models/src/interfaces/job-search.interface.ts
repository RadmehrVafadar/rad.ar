import { JobPostDto } from '../dtos/job-post.dto';
import { ScraperInputDto } from '../dtos/scraper-input.dto';
import { Site } from '../enums/site.enum';
import { WatchSourceMode } from './watch.types';

export interface SearchSourceMetadata {
  site: Site | string;
  category?: string;
  isAts?: boolean;
  watchMode?: WatchSourceMode;
}
export interface JobSearchDetailedResult {
  jobs: JobPostDto[];
  sourcesRequested: string[];
  sourcesSucceeded: string[];
  sourcesFailed: Array<{ source: string; error: string }>;
  durationsMs: Record<string, number>;
}
export interface IJobSearch {
  searchJobs(input: ScraperInputDto): Promise<JobPostDto[]>;
  searchJobsDetailed?(input: ScraperInputDto): Promise<JobSearchDetailedResult>;
  listRegisteredSources?(): string[];
  listSourceMetadata?(): SearchSourceMetadata[];
}
