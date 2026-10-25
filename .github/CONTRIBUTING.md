# Contributing to rad.ar

Thank you for your interest in contributing! Here's how to get started.

## Getting Started

1. **Fork** the repository and clone your fork
2. **Install** dependencies: `npm install`
3. **Create a branch**: `git checkout -b feature/my-feature`
4. **Make changes** — follow the existing code style
5. **Test**: `npx jest --forceExit`
6. **Commit**: use clear, descriptive commit messages
7. **Push** and open a **Pull Request**

## Code Style

- **TypeScript** with strict mode
- **NestJS** conventions — modules, controllers, services, guards
- Use **Prettier** for formatting and **ESLint** for linting
- Document public APIs with **JSDoc** comments
- Follow the existing project structure (`apps/`, `packages/`)

## Adding a New Job Source

1. Create a new package in `packages/source-<name>/`
2. Implement the `IScraper` interface from `@rad-ar/models`
3. Register the module in `apps/api/src/jobs/jobs.module.ts`
4. Add the site to the `Site` enum in `@rad-ar/models`
5. Add the source mapping in `JobsService` constructor

## Pull Request Guidelines

- Reference any related issues
- Include a clear description of changes
- Add tests where applicable
- Ensure the build passes: `npm run build`

## Reporting Issues

Open a GitHub Issue with:

- Steps to reproduce
- Expected vs actual behaviour
- Environment details (Node version, OS)
