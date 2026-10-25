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
export interface ConfiguredWatchModuleOptions {
  imports?: DynamicModule['imports'];
  jobsServiceToken: string | symbol | Type<unknown>;
  enableScheduler?: boolean;
  useInMemoryRepository?: boolean;
}
@Module({})
export class ConfiguredWatchModule {
  static register(options: ConfiguredWatchModuleOptions): DynamicModule {
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
      module: ConfiguredWatchModule,
      imports: [engine],
      exports: [WatchEngineModule],
    };
  }
}
