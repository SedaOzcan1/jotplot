# Jotplot Progress

## Current Phase

Faz 0 — setup

## Status

- [x] Read the project plan in `PROJECT.md`.
- [x] Confirm public visibility for the planned GitHub repository.
- [x] Add project-wide agent guidelines and focused Copilot agent profiles.
- [x] Create the public GitHub repository and connect this workspace as `origin`.
- [x] Push the first commit and define the branch workflow.
- [x] T0.0 Product document and rough wireframes (PR #2).
- [ ] T0.1 Nuxt skeleton (committed on `feat/t0-1-nuxt-skeleton`; pull request deferred).
- [ ] T0.7 Test and CI (committed on `chore/t0-7-test-ci`; pull request deferred).
- [ ] Complete T0.0–T0.7 as tracked in `PROJECT.md`.

## Latest Update

2026-11-12: T0.1 committed on `feat/t0-1-nuxt-skeleton`; pull requests are deferred until a few tasks are ready. On `chore/t0-7-test-ci` (stacked on T0.1): Vitest with `@nuxt/test-utils`, Playwright E2E for desktop and mobile, and a GitHub Actions CI workflow. Locally, `format:check`, `lint`, `typecheck`, `npm test` (2 tests), `build`, and `test:e2e` (2 tests) pass. The CI workflow has not run on GitHub yet. T0.3 waits for Docker.
