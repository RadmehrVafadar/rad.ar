import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DEDUP_ENGINE_TOKEN } from '@rad-ar/models';
import { MetricsService } from '@rad-ar/common/runtime/metrics/metrics.service';
import { JobSearchModule } from '../job-search.module';
import { JobsAggregator } from '../jobs.aggregator';

const dedup = { dedup: jest.fn() };
@Module({
  providers: [{ provide: DEDUP_ENGINE_TOKEN, useValue: dedup }],
  exports: [DEDUP_ENGINE_TOKEN],
})
class FakeDedupModule {}

it('binds host-selected dedup inside the search module scope', async () => {
  const context = await Test.createTestingModule({
    imports: [JobSearchModule.register([FakeDedupModule])],
  })
    .useMocker((token) =>
      token === ConfigService
        ? { get: (_key: string, fallback: unknown) => fallback }
        : token === MetricsService
          ? { setTotalSources: jest.fn() }
          : undefined,
    )
    .compile();
  const aggregator = context.get(JobsAggregator);
  expect(context.get(DEDUP_ENGINE_TOKEN)).toBe(dedup);
  expect(await aggregator.aggregateRaw([])).toMatchObject({ deduped: true });
  expect(await aggregator.aggregateRaw([], { dedup: false })).toMatchObject({
    deduped: false,
  });
  await context.close();
});
