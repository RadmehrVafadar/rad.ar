import { Injectable } from '@nestjs/common';
import { NotificationProvider, NotificationResult } from '@rad-ar/models';
@Injectable()
export class TelegramNotificationProvider implements NotificationProvider {
  readonly type = "telegram";

  async send(): Promise<NotificationResult> {
    return {
      status: "suppressed",
      errorMessage: "Telegram provider is not enabled in this release",
      providerResponse: {
        category: "configuration_error",
        retryable: false,
      },
    };
  }
}
