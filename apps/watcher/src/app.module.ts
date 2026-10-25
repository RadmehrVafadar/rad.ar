import { Module } from '@nestjs/common';
import { ConfiguredWatchModule as WatcherModule } from './watch-composition';
import { NotificationSecretLocalModule } from '@rad-ar/notification-secret-local';
import { AppConfigModule } from '@rad-ar/common/runtime/config/config.module';
import { AppCacheModule } from '@rad-ar/common/runtime/cache/cache.module';
import { JobsRuntimeModule as JobsModule } from './jobs-composition';
import { JobsService } from '@rad-ar/job-search/jobs.service';
import { MetricsProvidersModule } from '@rad-ar/common/runtime/metrics/metrics.module';
import { WatcherHealthController } from './watcher-health.controller';

@Module({
  imports: [
    AppConfigModule,
    AppCacheModule,
    MetricsProvidersModule,
    WatcherModule.register({
      imports: [JobsModule, NotificationSecretLocalModule],
      jobsServiceToken: JobsService,
      enableScheduler: true,
    }),
  ],
  controllers: [WatcherHealthController],
})
export class WatcherAppModule {}
