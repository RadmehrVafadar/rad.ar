import { Module } from '@nestjs/common';
import { DiscordNotificationProvider } from './discord-notification.provider';

@Module({
  providers: [DiscordNotificationProvider],
  exports: [DiscordNotificationProvider],
})
export class NotificationDiscordModule {}
