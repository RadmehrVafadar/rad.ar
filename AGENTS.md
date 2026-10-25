# rad.ar

rad.ar is a modular TypeScript monorepo for job scraping, analysis, and watch notifications.
Stack: NestJS, React, npm workspaces, Nx, Jest, Prisma.

## Commands

```bash
npm ci                                      # Install the locked workspace dependencies.
npm run build                               # Build all application entrypoints.
npm run lint                                # Check TypeScript source without rewriting it.
npm test -- --runInBand                      # Run backend tests.
npm test -- --runInBand --testPathPatterns jobs.service.spec # Run a single test.
npm run lint:docs                           # Validate documentation.
npm run test --workspace @rad-ar/web      # Run component tests.
npm run test:e2e --workspace @rad-ar/web   # Run browser E2E tests.
npm run start:dev                           # Start the API in watch mode.
npm run gui:dev                             # Start the local operator stack.
```

## Repo map

```text
apps/                 Entrypoints, transport adapters, and composition.
packages/models/      Shared data contracts and injection tokens.
packages/plugin/      Plugin discovery, registries, and contracts.
packages/common/      Shared HTTP, configuration, cache, metrics, and utilities.
packages/analytics/   Shared analytics.
packages/plugins/     Source, business, persistence, notification, and UI features.
packages/watcher/     Compatibility facade for the former watcher package.
prisma/               Existing database schema and migrations.
scripts/              TypeScript development and operations tooling.
docs/specs/           Active specifications and roadmap.
docs/archive/         Historical logs and reference material.
```

## Conventions

- Use TypeScript for runtime code, tests, and scripts.
- Applications host and compose features; reusable behavior belongs in packages.
- Plugins depend on shared contracts, never on another plugin implementation.
- Route server-side HTTP through the common client for retries, timeouts, and redaction.
- Use @rad-ar package scopes, RADAR environment variables, and radar metrics and service identifiers.
- Keep tests with their owning package and application E2E tests with their application.
- Write a spec in docs/specs before changes requiring design; Spec Kit numbering and .specify artifacts are retired.
- Use lowercase kebab-case active docs, one concept per file, and one sentence per line.
- Preserve historical authored material in the archive; unchecked historical tasks are not automatically active work.
- Run lint, build, relevant tests, and documentation checks for changes.
- Leave commits and merges to the owner unless explicitly authorized for the task.

## Docs

- Before changing package ownership, read [Project structure](docs/project-structure.md).
- Before updating documentation, read [Documentation](docs/documentation.md).
- Before changing a subsystem, locate its reference in [the docs index](docs/index.md).
- Before consulting historical records, read [the archive guide](docs/archive/README.md).
- Before changing deployment identifiers, read [Identifier migration](docs/identifier-migration.md).
