# Documentation changes

## 2026-10-24

Adopted global documentation conventions and removed the old Spec Kit artifacts at the owner's request.
Extracted feature ownership from application hosts and introduced enforceable architecture checks.

- [Project structure](project-structure.md)
- [Documentation conventions](documentation.md)
- [Historical records](archive/README.md)

The owner additionally requested a complete namespace migration to @rad-ar, RADAR variables, and radar metrics and service identifiers.
Existing deployments can explicitly select their current physical volumes and database credentials.

Final validation covered 81 backend suites and 982 tests, with the corrected circuit-breaker suites passing their targeted rerun.
The browser component suite passed 26 tests and the operator E2E flow passed.
All five production entrypoints built, lint and documentation checks passed, and the built API and MCP transports passed smoke checks.
Container builds and live database or upstream-source verification require an environment with those services; Docker was unavailable locally.
The completed cleanup specification was folded into the project structure and identifier migration documents.

## 2026-10-25

Recorded case-only documentation renames in Git so lowercase links resolve in Linux CI.
The MCP runtime image now includes its workspace-local dependencies to preserve Express 4 resolution alongside the API's Express 5.
CI source fixtures now run in 12 bounded shards with isolated transpilation, and live source checks run manually for a selected package.
Every job has a timeout of at most 15 minutes, and superseded runs are cancelled.
A complete local shard executed 129 suites in 291 seconds, with 128 suites passing.
The remaining Lever country-inference assertion also fails under the original Jest configuration and is unrelated to the CI changes.
Source checks retain their existing non-blocking status.
The subsequent full CI run identified stale Lever and Rippling assertions that predated shared location normalization.
Their expectations now preserve the inferred US country and normalized remote city, with added coverage for an unresolved country without geographic evidence.
Both source suites pass all 40 tests without runtime changes.
