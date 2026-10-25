import { Module } from '@nestjs/common';
import { TelegramNotificationProvider } from './telegram-notification.provider';

@Module({
  providers: [TelegramNotificationProvider],
  exports: [TelegramNotificationProvider],
})
export class NotificationTelegramModule {}
