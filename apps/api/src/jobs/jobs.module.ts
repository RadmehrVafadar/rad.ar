import { Module } from '@nestjs/common';
import { JobsRuntimeModule } from '../jobs-composition';
import { JobsController } from './jobs.controller';
import { JobsResolver } from './jobs.resolver';
import { SourcesHealthController } from './health.controller';
@Module({
  imports: [JobsRuntimeModule],
  controllers: [JobsController, SourcesHealthController],
  providers: [JobsResolver],
  exports: [JobsRuntimeModule],
})
export class JobsModule {}
