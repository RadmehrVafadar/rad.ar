import { Global, Module } from '@nestjs/common';
import { MetricsProvidersModule } from '@rad-ar/common/runtime/metrics/metrics.module';
import { MetricsController } from './metrics.controller';
export { MetricsProvidersModule } from '@rad-ar/common/runtime/metrics/metrics.module';
@Global()
@Module({
  imports: [MetricsProvidersModule],
  controllers: [MetricsController],
  exports: [MetricsProvidersModule],
})
export class MetricsModule {}
