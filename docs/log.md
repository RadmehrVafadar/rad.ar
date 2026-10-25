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
