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
- [ ] T0.7 Test and CI (pushed on `chore/t0-7-test-ci`; pull request deferred).
- [ ] T0.6 Layout (pushed on `feat/t0-6-layout`; pull request deferred).
- [ ] Complete T0.0–T0.7 as tracked in `PROJECT.md`.

## Latest Update

2026-11-12: T0.1 and T0.7 are pushed on stacked branches; pull requests are deferred. On `feat/t0-6-layout` (stacked on T0.7): responsive layout with a navy desktop sidebar, mobile top and bottom bars, a mode switch with student mode marked as coming soon, and empty states for Notes, New note, Board, Ask, and Settings. Locally `format:check`, `lint`, `typecheck`, `npm test` (8 tests), `build`, and `test:e2e` (21 passed, 3 device-specific skips) pass. The CI workflow has not run on GitHub yet. T0.3 waits for Docker.
