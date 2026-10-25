import { Module } from '@nestjs/common';
import { InMemoryWatchRepository } from './in-memory-watch.repository';
import { WATCH_REPOSITORY } from '@rad-ar/models';

@Module({
  providers: [
    InMemoryWatchRepository,
    { provide: WATCH_REPOSITORY, useExisting: InMemoryWatchRepository },
  ],
  exports: [InMemoryWatchRepository, WATCH_REPOSITORY],
})
export class StoreWatchMemoryModule {}
