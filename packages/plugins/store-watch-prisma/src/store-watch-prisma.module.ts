import { Module } from '@nestjs/common';
import { PrismaWatchRepository } from './prisma-watch.repository';
import { WATCH_REPOSITORY } from '@rad-ar/models';
import { WatcherPrismaService } from './watcher-prisma.service';
@Module({
  providers: [
    WatcherPrismaService,
    PrismaWatchRepository,
    { provide: WATCH_REPOSITORY, useExisting: PrismaWatchRepository },
  ],
  exports: [PrismaWatchRepository, WATCH_REPOSITORY, WatcherPrismaService],
})
export class StoreWatchPrismaModule {}
