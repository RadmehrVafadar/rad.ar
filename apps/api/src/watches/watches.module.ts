import { Module } from '@nestjs/common';
import { ConfiguredWatchModule as WatcherModule } from '../watch-composition';
import { NotificationSecretLocalModule } from '@rad-ar/notification-secret-local';
import { JobsModule } from '../jobs/jobs.module';
import { JobsService } from '@rad-ar/job-search/jobs.service';
import {
  NotificationsController,
  ObservedJobsController,
  WatchesController,
} from './watches.controller';
import { WatchApplyService } from '@rad-ar/watch-engine/management/watch-apply.service';

@Module({
  imports: [
    WatcherModule.register({
      imports: [JobsModule, NotificationSecretLocalModule],
      jobsServiceToken: JobsService,
      enableScheduler: false,
    }),
  ],
  controllers: [
    WatchesController,
    ObservedJobsController,
    NotificationsController,
  ],
  providers: [WatchApplyService],
  exports: [WatcherModule],
})
export class WatchesModule {}
