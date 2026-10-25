# Continuous integration

Pull requests to prod run bounded validation jobs, with source fixtures separated from live scraping.

## How it works

Every workflow job has a timeout of at most 15 minutes.
New pushes cancel superseded runs on the same branch.
Source fixture tests run across 12 Jest shards, each with a 10-minute test-step limit and 15-second individual test limit.
They start alongside lint and documentation checks because they execute TypeScript directly and do not consume build artifacts.
All fixture shards run even if another shard fails and retain the source suite's existing non-blocking status.
The source test configuration transpiles files independently to avoid repeatedly constructing the entire TypeScript project for each suite.
Application type checking remains in the build job.

Live source E2E tests are excluded from the fixture configuration.
Run the Live source check workflow manually with a source package directory such as source-indeed.
It validates the package name, runs only that source's tests, and limits the test step to five minutes and the job to ten minutes.
Live API and CLI smoke checks retain their existing non-blocking PR behavior within the job timeout.

## Key files

- `.github/workflows/ci.yml` defines PR and prod validation.
- `.github/workflows/source-live.yml` defines targeted manual live source checks.
- `.github/workflows/docker-build-publish.yml` defines bounded production image publication.
- `jest.sources.config.js` selects source fixtures and uses isolated TypeScript transpilation.
- `scripts/__tests__/ci-contracts.spec.ts` guards timeouts, sharding, and manual live-source selection.

## Related

- [Project structure](project-structure.md)
- [Deployment](deployment.md)
