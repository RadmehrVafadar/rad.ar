import { Type } from '@nestjs/common';
import { ERR_STORE_NOT_FOUND, IJobStore } from '@rad-ar/models';
import { StoreRegistryError } from '@rad-ar/plugin';
import { InMemoryJobStore } from '@rad-ar/store-memory';
import { SqliteDrizzleJobStore } from '@rad-ar/store-sqlite-drizzle';
import { PostgresPrismaJobStore } from '@rad-ar/store-postgres-prisma';

/**
 * Spec 004 / T12 — `RADAR_STORE` env-var bootstrap factory.
 *
 * Reads `RADAR_STORE` synchronously and resolves the single
 * `@StorePlugin()`-decorated backend class to pass to
 * `StoreModule.forActive(...)`. Choice of "lazy resolve by id" over
 * "eager declare every backend" is locked in by Q-019 (Option C):
 *
 *   1. Cold-start cost is proportional to the active backend
 *      (NFR-4 budgets 750 ms; eager-all would pay for
 *      `better-sqlite3` native bindings even in `memory` mode).
 *   2. Unknown id surfaces an `ERR_STORE_NOT_FOUND` whose message
 *      names the three known ids literally — better operator UX
 *      than the registry's generic `Registered ids: [...]` payload
 *      when the typo is close to a real id (e.g. `postres`).
 *   3. The fail-fast happens BEFORE NestJS module construction,
 *      mirroring `StoreModule.forActive`'s own pre-validation of
 *      empty / undecorated backends. Spec 004 §7.3 places
 *      `ERR_STORE_NOT_FOUND` at bootstrap, not at request time —
 *      this factory is where that contract is honoured.
 *
 * Postgres opt-in is by *config*, not by *code*. The stock build
 * recognises `RADAR_STORE=postgres` and selects
 * `PostgresPrismaJobStore`, but the service constructor fails fast
 * if `STORE_POSTGRES_PRISMA_CONFIG` is unbound (Spec 004 / T10
 * decision 2). The operator wires that config in their own root
 * module / `.env` at the same time they set
 * `RADAR_STORE=postgres`.
 *
 * @see {@link KNOWN_STORE_IDS} — the literal set of recognised ids.
 * @see {@link DEFAULT_STORE_ID} — fallback when env-var is absent.
 * @see {@link resolveStoreBootstrap} — the factory itself.
 */

/**
 * Environment-variable name read by {@link resolveStoreBootstrap}.
 * Exported for testability — tests pass a synthetic `env` map and
 * key off the same constant the production code reads.
 */
export const RADAR_STORE_ENV_VAR = 'RADAR_STORE';

/**
 * Fallback store id when `RADAR_STORE` is unset or an empty
 * string. Picks `memory` because (a) zero-config / zero-deps,
 * (b) every existing test that doesn't care about persistence keeps
 * working, (c) Spec 004 §10's "in-memory store always available
 * for tests" decision is honoured by the bootstrap path itself.
 */
export const DEFAULT_STORE_ID = 'memory';

/**
 * Literal set of store ids the stock build recognises. Each maps to
 * exactly one `@StorePlugin()`-decorated class via {@link STORE_BACKEND_BY_ID}.
 * Operator-facing error messages enumerate these ids so a typo like
 * `RADAR_STORE=postres` returns "did you mean memory / sqlite /
 * postgres?" rather than the registry's generic listing.
 *
 * Exported as a `readonly` tuple so a future admin endpoint
 * (`GET /api/storage/backends`) can render the same source of truth
 * without re-deriving it from the keys of {@link STORE_BACKEND_BY_ID}.
 */
export const KNOWN_STORE_IDS = ['memory', 'sqlite', 'postgres'] as const;

/**
 * Type alias for any of the recognised store ids. Narrows the
 * factory's return value so downstream callers can switch
 * exhaustively at compile time.
 */
export type KnownStoreId = (typeof KNOWN_STORE_IDS)[number];

/**
 * Map of recognised store id → `@StorePlugin()`-decorated backend
 * class. The map is the single source of truth for the
 * "id → class" relationship; if a future spec adds a fourth
 * backend, this is the only place to wire it (and append to
 * {@link KNOWN_STORE_IDS}).
 *
 * Each value MUST be a class decorated with `@StorePlugin({ id })`
 * where the decorator's `id` matches the map key — otherwise
 * `StoreModule.forActive` will raise `ERR_STORE_BACKEND_NOT_DECORATED`
 * at boot. We don't double-check that invariant here because the
 * decorator's metadata is the contract `StoreModule` validates;
 * adding a redundant runtime check would just hide a real wiring
 * bug behind a friendlier error.
 */
const STORE_BACKEND_BY_ID: Readonly<Record<KnownStoreId, Type<IJobStore>>> = {
  memory: InMemoryJobStore,
  sqlite: SqliteDrizzleJobStore,
  postgres: PostgresPrismaJobStore,
};

/**
 * Result of {@link resolveStoreBootstrap}. The factory hands back
 * the *resolved* id (after defaulting) plus the single backend
 * class to wire into `StoreModule.forActive(id, { backends: [class] })`.
 */
export interface ResolvedStoreBootstrap {
  /** Resolved id — equals the env-var value when set, else
   *  {@link DEFAULT_STORE_ID}. Always a member of
   *  {@link KNOWN_STORE_IDS} (unknown ids throw before this is
   *  returned). */
  readonly id: KnownStoreId;
  /** `@StorePlugin()`-decorated backend class corresponding to
   *  `id`. Pass as the sole element of `StoreModule.forActive`'s
   *  `backends:` option. */
  readonly backendClass: Type<IJobStore>;
}

/**
 * Resolve the active store backend from `RADAR_STORE`.
 *
 * Behaviour:
 *
 *   - Env-var unset / empty / whitespace-only → resolves to
 *     {@link DEFAULT_STORE_ID} (`memory`). Mirrors Spec 004 §10's
 *     "in-memory store always available for tests" decision.
 *   - Env-var matches one of {@link KNOWN_STORE_IDS} → resolves to
 *     the corresponding backend class.
 *   - Env-var matches no known id → throws
 *     {@link StoreRegistryError} with code
 *     {@link ERR_STORE_NOT_FOUND} and a message naming the
 *     recognised ids verbatim. Operator dashboards / log alerts
 *     grep `ERR_STORE_NOT_FOUND` literally.
 *
 * The factory is pure: same input env → same output. `env`
 * defaults to `process.env` so production code calls
 * `resolveStoreBootstrap()` with no argument; tests pass a
 * synthetic record so the suite never mutates the global env.
 *
 * @param env — environment map; defaults to `process.env`.
 * @returns the resolved id + backend class.
 * @throws {@link StoreRegistryError} (`ERR_STORE_NOT_FOUND`) on
 *         unrecognised id.
 */
export function resolveStoreBootstrap(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedStoreBootstrap {
  const raw = env[RADAR_STORE_ENV_VAR];
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  const id = trimmed.length === 0 ? DEFAULT_STORE_ID : trimmed;

  if (!isKnownStoreId(id)) {
    throw new StoreRegistryError(
      `${RADAR_STORE_ENV_VAR}=${JSON.stringify(raw)} does not match any built-in store id. ` +
        `Known ids: [${KNOWN_STORE_IDS.join(', ')}]. ` +
        `Set ${RADAR_STORE_ENV_VAR} to one of those, or unset it to use the default ('${DEFAULT_STORE_ID}').`,
      ERR_STORE_NOT_FOUND,
    );
  }

  return {
    id,
    backendClass: STORE_BACKEND_BY_ID[id],
  };
}

/**
 * Type-guard for {@link KnownStoreId}. Avoids `(KNOWN_STORE_IDS as readonly string[]).includes(id)`
 * gymnastics at every call-site.
 */
function isKnownStoreId(id: string): id is KnownStoreId {
  return (KNOWN_STORE_IDS as readonly string[]).includes(id);
}
