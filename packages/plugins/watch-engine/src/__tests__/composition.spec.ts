import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { WATCH_REPOSITORY } from '@rad-ar/models';
import { WatchEngineModule } from '../watch-engine.module';
import {
  WatchExecutionService,
  WATCH_EXECUTION_OPTIONS,
} from '../services/watch-execution.service';
import { WATCH_EXECUTION_OPTIONS as SHARED_EXECUTION_OPTIONS } from '@rad-ar/plugin/feature-tokens';
import {
  WatcherModule,
  WATCH_REPOSITORY as LEGACY_REPOSITORY,
} from '@rad-ar/watcher';
import { InMemoryWatchRepository } from '@rad-ar/store-watch-memory';
import { TelegramNotificationProvider } from '@rad-ar/notification-telegram';

const JOBS = Symbol('test-jobs');
@Module({
  providers: [{ provide: JOBS, useValue: { searchJobs: async () => [] } }],
  exports: [JOBS],
})
class FakeJobsModule {}

it('boots the generic engine with host-selected adapters and no notification providers', async () => {
  const context = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true }),
      WatchEngineModule.register({
        imports: [FakeJobsModule],
        jobsServiceToken: JOBS,
        repositoryProviders: [
          InMemoryWatchRepository,
          { provide: WATCH_REPOSITORY, useExisting: InMemoryWatchRepository },
        ],
        repositoryExports: [InMemoryWatchRepository],
      }),
    ],
  }).compile();
  expect(context.get(WatchExecutionService)).toBeInstanceOf(
    WatchExecutionService,
  );
  expect(context.get(WATCH_REPOSITORY)).toBeInstanceOf(InMemoryWatchRepository);
  await context.close();
});

it('preserves facade defaults, contract identity, and disabled Telegram behavior', async () => {
  expect(LEGACY_REPOSITORY).toBe(WATCH_REPOSITORY);
  expect(WATCH_EXECUTION_OPTIONS).toBe(SHARED_EXECUTION_OPTIONS);
  const context = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true }),
      WatcherModule.register({
        imports: [FakeJobsModule],
        jobsServiceToken: JOBS,
        useInMemoryRepository: true,
      }),
    ],
  }).compile();
  expect(context.get(WATCH_REPOSITORY)).toBeInstanceOf(InMemoryWatchRepository);
  expect(await context.get(TelegramNotificationProvider).send()).toMatchObject({
    status: 'suppressed',
  });
  await context.close();
});
