import { DynamicModule, Module, Type, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WATCH_REPOSITORY } from '@rad-ar/models';
import { JobFingerprintService } from './services/job-fingerprint.service';
import { GeographyClassificationService } from './services/geography-classification.service';
import { JobScoringService } from './services/job-scoring.service';
import {
  NOTIFICATION_DISPATCH_OPTIONS,
  NOTIFICATION_PROVIDERS,
  NotificationDispatcher,
} from './services/notification-dispatcher.service';
import {
  WATCH_EXECUTION_OPTIONS,
  WATCH_SOURCE_EXECUTOR,
  WatchExecutionService,
} from './services/watch-execution.service';
import { DailyDigestService } from './services/daily-digest.service';
import {
  JobsServiceWatchExecutor,
  WATCH_JOBS_SERVICE,
  WATCH_SOURCE_EXECUTION_OPTIONS,
} from './services/jobs-service-watch.executor';
import { WatchSourcePlanner } from './services/watch-source-planner.service';
import { WatchValidationService } from './services/watch-validation.service';
import { WatcherMetricsService } from '@rad-ar/common/runtime/watcher/watcher-metrics.service';
import { WatcherSchedulerService } from './services/watcher-scheduler.service';
import { DefaultWatchSeederService } from './services/default-watch-seeder.service';
import { WatchPresetService } from './services/watch-preset.service';
import { CompanyCoverageService } from './services/company-coverage.service';

export interface WatchEngineModuleOptions {
  imports?: DynamicModule['imports'];
  jobsServiceToken: string | symbol | Type<unknown>;
  enableScheduler?: boolean;
  repositoryProviders: Provider[];
  repositoryExports: Array<string | symbol | Type<unknown>>;
  notificationProviders?: Provider[];
  notificationProviderTokens?: Array<string | symbol | Type<unknown>>;
}

@Module({})
export class WatchEngineModule {
  static register(options: WatchEngineModuleOptions): DynamicModule {
    const schedulerProviders = options.enableScheduler
      ? [DefaultWatchSeederService, WatcherSchedulerService]
      : [];

    return {
      module: WatchEngineModule,
      imports: options.imports ?? [],
      providers: [
        ...options.repositoryProviders,

        JobFingerprintService,
        GeographyClassificationService,
        JobScoringService,
        WatchSourcePlanner,
        WatchValidationService,
        WatchPresetService,
        CompanyCoverageService,
        WatcherMetricsService,
        ...(options.notificationProviders ?? []),
        {
          provide: NOTIFICATION_PROVIDERS,
          useFactory: (...providers: unknown[]) => providers,
          inject: options.notificationProviderTokens ?? [],
        },
        {
          provide: NOTIFICATION_DISPATCH_OPTIONS,
          useFactory: (config: ConfigService) => ({
            maxAttempts: config.get<number>('watcher.retryAttempts', 3),
            retryBaseDelayMs: config.get<number>(
              'watcher.retryBaseDelayMs',
              500,
            ),
          }),
          inject: [ConfigService],
        },
        { provide: WATCH_JOBS_SERVICE, useExisting: options.jobsServiceToken },
        {
          provide: WATCH_SOURCE_EXECUTION_OPTIONS,
          useFactory: (config: ConfigService) => ({
            maxConcurrency: config.get<number>(
              'watcher.maxConcurrentSources',
              5,
            ),
            timeoutMs: config.get<number>('watcher.sourceTimeoutMs', 12_000),
            retryAttempts: config.get<number>('watcher.retryAttempts', 3),
            retryBaseDelayMs: config.get<number>(
              'watcher.retryBaseDelayMs',
              500,
            ),
          }),
          inject: [ConfigService],
        },
        JobsServiceWatchExecutor,
        {
          provide: WATCH_SOURCE_EXECUTOR,
          useExisting: JobsServiceWatchExecutor,
        },
        {
          provide: WATCH_EXECUTION_OPTIONS,
          useFactory: (config: ConfigService) => {
            const ownerId = config.get<string>('watcher.instanceId');
            return {
              ...(ownerId ? { ownerId } : {}),
              leaseTtlMs: config.get<number>(
                'watcher.schedulerLockTtlMs',
                180_000,
              ),
            };
          },
          inject: [ConfigService],
        },
        NotificationDispatcher,
        WatchExecutionService,
        DailyDigestService,
        ...schedulerProviders,
      ],
      exports: [
        WATCH_REPOSITORY,
        JobFingerprintService,
        GeographyClassificationService,
        JobScoringService,
        WatchSourcePlanner,
        WatchValidationService,
        WatchPresetService,
        CompanyCoverageService,
        WatcherMetricsService,
        JobsServiceWatchExecutor,
        ...options.repositoryExports,
        ...(options.notificationProviderTokens ?? []),
        NotificationDispatcher,
        WatchExecutionService,
        DailyDigestService,
        ...schedulerProviders,
      ],
    };
  }
}
