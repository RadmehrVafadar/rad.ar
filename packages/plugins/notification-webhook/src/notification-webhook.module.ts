import { Module } from '@nestjs/common';
import { WebhookNotificationProvider } from './webhook-notification.provider';

@Module({
  providers: [WebhookNotificationProvider],
  exports: [WebhookNotificationProvider],
})
export class NotificationWebhookModule {}
