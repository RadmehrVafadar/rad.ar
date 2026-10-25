import { JobsRuntimeModule as JobSearchModule } from './jobs-composition';
import { Module } from '@nestjs/common';
import { AnalyticsModule } from '@rad-ar/analytics';
import { JobsService } from '@rad-ar/job-search/jobs.service';
import { AppConfigModule } from '@rad-ar/common/runtime/config/config.module';
import { AppCacheModule } from '@rad-ar/common/runtime/cache/cache.module';
import { MetricsProvidersModule } from '@rad-ar/common/runtime/metrics/metrics.module';
import { SearchCommand } from './commands/search.command';
import { WatchCommand } from './commands/watch.command';
import { ConfiguredWatchModule as WatcherModule } from './watch-composition';
import { CompareCommand } from './commands/compare.command';

@Module({
  imports: [
    AppConfigModule,
    AppCacheModule,
    MetricsProvidersModule,
    JobSearchModule,
    WatcherModule.register({
      imports: [JobSearchModule],
      jobsServiceToken: JobsService,
      enableScheduler: false,
    }),
    // Analytics
    AnalyticsModule,
  ],
  providers: [SearchCommand, WatchCommand, CompareCommand],
})
export class CliModule {}
