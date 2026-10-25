import { DynamicModule, Module } from '@nestjs/common';
import { PluginModule, CircuitBreakerModule } from '@rad-ar/plugin';
import { AnalyticsModule } from '@rad-ar/analytics';
import { JobsService } from './jobs.service';
import { JobsAggregator } from './jobs.aggregator';
import { JobComparisonService } from './job-comparison.service';
import { HealthSnapshotCron } from './health-snapshot.cron';
import { MetricsCircuitBreakerBridge } from './metrics-circuit-breaker.bridge';
import { PluginPolicyBootstrapper } from './plugin-policy.bootstrapper';
@Module({
  imports: [PluginModule, CircuitBreakerModule, AnalyticsModule],
  providers: [
    JobsService,
    JobsAggregator,
    JobComparisonService,
    HealthSnapshotCron,
    MetricsCircuitBreakerBridge,
    PluginPolicyBootstrapper,
  ],
  exports: [
    JobsService,
    JobsAggregator,
    JobComparisonService,
    AnalyticsModule,
    CircuitBreakerModule,
  ],
})
export class JobSearchModule {
  static register(
    imports: NonNullable<DynamicModule['imports']> = [],
  ): DynamicModule {
    return { module: JobSearchModule, imports };
  }
}
