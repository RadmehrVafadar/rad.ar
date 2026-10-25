import { JobPostDto } from '@rad-ar/models';

/**
 * One raw input enriched with its precomputed canonical key + id and original
 * input index (so callers can map results back to their input array).
 *
 * Computing this once up front lets every strategy run in O(1) per pair
 * instead of recomputing the canonical key for both sides of each comparison.
 */
export interface PreparedJob {
  readonly index: number;
  readonly canonicalJobId: string;
  readonly canonicalKey: string;
  readonly raw: JobPostDto;
}

/**
 * Result of a single strategy stage. Each strategy produces a partition of
 * the input set into clusters of `PreparedJob.index` values; the service
 * unions the partitions (via Union-Find) into the final clusters.
 */
export interface ClusterPartition {
  /** Each inner array holds prepared-job indices that belong to one cluster. */
  readonly clusters: ReadonlyArray<ReadonlyArray<number>>;
}

/**
 * Pluggable dedup strategy contract. A `DedupHybridService` runs strategies
 * in order; each strategy further merges clusters produced by the previous
 * stage. Strategies MUST be pure (no I/O, no global state).
 */
export interface IDedupStrategy {
  readonly name: string;
  cluster(input: ReadonlyArray<PreparedJob>): ClusterPartition;
}

/**
 * Configuration knobs for the hybrid engine. All fields optional — sensible
 * defaults are documented next to each option.
 */
export interface DedupHybridOptions {
  /**
   * If a raw job is missing both `companyName` and `title`, it is rejected
   * with `ERR_DEDUP_INVALID_INPUT`. Set to `false` to surface a softer
   * outcome (the job is kept as its own cluster). Default: `true`.
   */
  readonly rejectInvalid?: boolean;
}
