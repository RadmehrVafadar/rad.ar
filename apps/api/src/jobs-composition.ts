import { Module } from '@nestjs/common';
import { ALL_SOURCE_MODULES } from '@rad-ar/plugin-sources';
import { JobSearchModule } from '@rad-ar/job-search';
import { DedupHybridModule } from '@rad-ar/dedup-hybrid';
import { MergeDefaultModule } from '@rad-ar/merge-default';
import { LivenessHttpModule } from '@rad-ar/liveness-http';
import { LegitimacyDetectorModule } from '@rad-ar/legitimacy-detector';
@Module({
  imports: [
    ...ALL_SOURCE_MODULES,
    LivenessHttpModule,
    LegitimacyDetectorModule,
    JobSearchModule.register([DedupHybridModule, MergeDefaultModule]),
  ],
  exports: [JobSearchModule, LivenessHttpModule, LegitimacyDetectorModule],
})
export class JobsRuntimeModule {}
