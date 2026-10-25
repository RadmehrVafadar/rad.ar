# Project structure

Applications host transport adapters and compose feature packages through shared contracts.

## Why

Reusable behavior must be usable by the API, CLI, and worker without importing another application's source.
Concrete integrations must remain replaceable without coupling plugins to one another.

## How it works

- Applications own bootstrap, HTTP and GraphQL controllers, CLI commands, authentication, and concrete feature composition.
- The job-search plugin owns source execution, aggregation, comparison, and search lifecycle services.
- The watch-engine plugin owns execution, schedules, scoring, presets, management, and delivery orchestration.
- Store-watch adapters own memory and Prisma repositories; notification plugins own Discord, webhook, and Telegram implementations.
- Operator-overview owns status aggregation; ui-operator exposes browser-only pages, contexts, API helpers, and components.
- Common owns reusable configuration, cache, metrics, and HTTP providers.
- Models and plugin infrastructure own shared contracts and DI tokens.

## Key files

- [API composition](../apps/api/src/jobs-composition.ts)
- [Watch composition](../apps/api/src/watch-composition.ts)
- [UI browser entrypoint](../packages/plugins/ui-operator/src/browser/index.ts)
- [Architecture checks](../scripts/__tests__/project-structure.spec.ts)

## Decisions and gotchas

The former watcher package remains a deprecated compatibility facade until the next breaking package release.
Source registration uses the canonical source inventory and preserves disabled-source configuration.
The Prisma schema and migrations remain unchanged.
The Telegram provider retains its existing suppressed behavior.
Browser exports must never load the NestJS package entrypoint.
Package scopes, application environment variables, metrics, and service names use the rad.ar namespace.
See the identifier migration guide before upgrading existing deployments.

## Related

- [Documentation](documentation.md)
- [Plugin architecture](plugin-architecture.md)
