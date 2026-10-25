import 'reflect-metadata';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AnalyticsService } from '@rad-ar/analytics';
import { MetricsService } from '@rad-ar/common/runtime/metrics/metrics.service';
import { CacheService } from '@rad-ar/common/runtime/cache/cache.service';
import { JobsModule } from '../../src/jobs/jobs.module';
import { JobsController } from '../../src/jobs/jobs.controller';
import { SourcesHealthController } from '../../src/jobs/health.controller';
import { Site } from '@rad-ar/models';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: { get: (_key: string, fallback: unknown) => fallback },
    },
    { provide: MetricsService, useValue: { setTotalSources: jest.fn() } },
    { provide: CacheService, useValue: { get: jest.fn(), set: jest.fn() } },
  ],
  exports: [ConfigService, MetricsService, CacheService],
})
class HostProvidersModule {}

it('resolves API transport dependencies through the configured search feature', async () => {
  const context = await Test.createTestingModule({
    imports: [HostProvidersModule, JobsModule],
  }).compile();
  expect(context.get(JobsController)).toBeInstanceOf(JobsController);
  expect(context.get(AnalyticsService)).toBeInstanceOf(AnalyticsService);
  expect(
    context.get(SourcesHealthController).forceOpen(Site.LINKEDIN),
  ).toMatchObject({
    ok: true,
    site: Site.LINKEDIN,
  });
  await context.close();
});
