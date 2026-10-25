import { Module } from '@nestjs/common';
import { NotificationSecretLocalModule } from '@rad-ar/notification-secret-local';
import { OperatorOverviewModule } from '@rad-ar/operator-overview';
import { WatchesModule } from '../watches/watches.module';
import { OperatorOverviewController } from './operator-overview.controller';
@Module({
  imports: [
    OperatorOverviewModule.register([
      WatchesModule,
      NotificationSecretLocalModule,
    ]),
  ],
  controllers: [OperatorOverviewController],
})
export class OperatorModule {}
