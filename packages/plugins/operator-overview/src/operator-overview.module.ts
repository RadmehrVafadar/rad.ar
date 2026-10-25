import { DynamicModule, Module } from '@nestjs/common';
import {
  OperatorOverviewService,
  createWorkerHealthClient,
  WORKER_HEALTH_CLIENT,
} from './operator-overview.service';
@Module({
  providers: [
    OperatorOverviewService,
    { provide: WORKER_HEALTH_CLIENT, useFactory: createWorkerHealthClient },
  ],
  exports: [OperatorOverviewService],
})
export class OperatorOverviewModule {
  static register(
    imports: NonNullable<DynamicModule['imports']>,
  ): DynamicModule {
    return { module: OperatorOverviewModule, imports };
  }
}
