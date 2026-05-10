# Domain Docs

This is a single-context repo. Engineering skills should use the root domain docs before making architectural or implementation decisions.

## Before Exploring, Read These

- `CONTEXT.md` at the repo root
- Relevant files under `docs/`
- `docs/adr/`, if it exists and touches the area being changed

If one of these files does not exist, proceed silently. Do not create new domain docs upfront unless the active skill asks for it or a decision needs to be recorded.

## Current Layout

```text
/
|-- CONTEXT.md
|-- docs/
`-- shared/
```

There is no `CONTEXT-MAP.md`, so do not assume multiple bounded contexts.

## Use The Domain Vocabulary

When output names a domain concept in an issue title, refactor proposal, hypothesis, or test name, use the term as defined in `CONTEXT.md`.

If the concept is missing from `CONTEXT.md`, treat that as a signal. Either the work is drifting away from the project's language, or the glossary needs to be expanded through `grill-with-docs`.

## Flag ADR Conflicts

If a proposed change contradicts an existing ADR, surface the conflict explicitly instead of silently overriding it.
