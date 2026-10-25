# Identifier migration

This release standardizes rad.ar code and operations on one namespace.

## Why

The owner requested removal of every retired product-name mention, including machine contracts.
This is a breaking identifier migration with no legacy aliases.

## How it works

| Surface | Current identifier |
| --- | --- |
| npm package scope | @rad-ar/* |
| Application-specific environment variables | RADAR_* |
| Prometheus metric prefix | radar_* |
| CLI and MCP executable | radar-mcp |
| Container services | radar-api, radar-watcher, radar-web |
| API image | ghcr.io/radmehrvafadar/radar |
| MCP image | ghcr.io/radmehrvafadar/radar-mcp |

## Deployment and data preservation

- Upgrade importers, environment files, MCP clients, service URLs, dashboards, and deployment manifests together.
- Preserve the existing SQLite file path in RADAR_SQLITE_PATH when using the SQLite store.
- Set COMPOSE_DATABASE_URL to the existing database connection string before starting the updated application containers.
- Inspect the existing database container mounts and set POSTGRES_VOLUME_NAME to the current physical volume name.
- Set POSTGRES_DB, POSTGRES_USER, and POSTGRES_PASSWORD to the existing database values.
- Set LOCAL_CONFIG_VOLUME_NAME to the existing notification-secret volume name.
- Keep the current volume contents and database schema; this change does not migrate or delete stored records.
- Run docker compose config to verify interpolation and volume selection before rollout.
- Publish the renamed images and configure registry pull access before applying deployment manifests.
- Apply the updated manifests and redirect clients only after health and authenticated API checks pass.
- Retire superseded services only after consumers use the new names; do not remove persistent volumes.

## Rollback

Redeploy the previous application images with their matching environment and service configuration.
Reuse the same physical volumes and database connection string.
No schema rollback is required because this change does not modify Prisma migrations or database records.
The PR itself does not deploy resources or alter local secret files.

## Related

- [Project structure](project-structure.md)
- [Deployment](deployment.md)
