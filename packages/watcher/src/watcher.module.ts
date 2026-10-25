import { DynamicModule, Module, Type } from '@nestjs/common';
import { WATCH_REPOSITORY } from '@rad-ar/models';
import { WatchEngineModule } from '@rad-ar/watch-engine';
import { InMemoryWatchRepository } from '@rad-ar/store-watch-memory';
import {
  PrismaWatchRepository,
  WatcherPrismaService,
  WATCHER_PRISMA_EAGER_CONNECT,
} from '@rad-ar/store-watch-prisma';
import { DiscordNotificationProvider } from '@rad-ar/notification-discord';
import { WebhookNotificationProvider } from '@rad-ar/notification-webhook';
import { TelegramNotificationProvider } from '@rad-ar/notification-telegram';
export interface WatcherModuleOptions {
  imports?: DynamicModule['imports'];
  jobsServiceToken: string | symbol | Type<unknown>;
  enableScheduler?: boolean;
  useInMemoryRepository?: boolean;
}
/** @deprecated Compose WatchEngineModule with adapters in the application; remove in the next breaking package release. */
@Module({})
export class WatcherModule {
  static register(options: WatcherModuleOptions): DynamicModule {
    const repository = options.useInMemoryRepository
      ? InMemoryWatchRepository
      : PrismaWatchRepository;
    const engine = WatchEngineModule.register({
      ...options,
      repositoryProviders: [
        ...(options.useInMemoryRepository
          ? []
          : [
              WatcherPrismaService,
              {
                provide: WATCHER_PRISMA_EAGER_CONNECT,
                useValue: Boolean(options.enableScheduler),
              },
            ]),
        repository,
        { provide: WATCH_REPOSITORY, useExisting: repository },
      ],
      repositoryExports: [repository],
      notificationProviders: [
        WebhookNotificationProvider,
        DiscordNotificationProvider,
        TelegramNotificationProvider,
      ],
      notificationProviderTokens: [
        WebhookNotificationProvider,
        DiscordNotificationProvider,
        TelegramNotificationProvider,
      ],
    });
    return {
      module: WatcherModule,
      imports: [engine],
      exports: [WatchEngineModule],
    };
  }
}
