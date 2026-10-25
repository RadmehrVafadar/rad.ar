# Documentation

Active documentation follows the global project conventions.

## Why

One active workflow avoids conflicting instructions and keeps historical tasks separate from current commitments.

## How it works

- AGENTS.md lists commands, repository conventions, and when to read concept docs.
- CLAUDE.md imports AGENTS.md and adds only applicable Claude-specific rules.
- README.md is the user-facing overview.
- Concept documents use lowercase kebab-case names under docs.
- Designed work uses one specification per feature under docs/specs, ordered by its roadmap.
- Completed specifications are folded into concept docs and removed from the active roadmap.
- Historical logs and questions remain under docs/archive.

## Decisions and gotchas

The owner requested deletion of the old Spec Kit artifacts and numbered spec mirrors.
Numeric spec allocation is retired; scaffolding writes a single descriptive specification.
Documentation lint checks links, active document indexing, filenames, and active spec structure.
Historical records preserve prose references to removed specifications without presenting them as working links.

## Related

- [Index](index.md)
- [Planned work](specs/roadmap.md)
- [Historical records](archive/README.md)
