# Jotplot Agent Guidelines

## Source of Truth
- Read `PROJECT.md` before planning or implementing product work. It defines the scope, acceptance criteria, architecture, and roadmap.
- Jotplot is a responsive web application. Do not add a native mobile app or expand scope without Seda's approval.
- Do not settle open product or provider decisions on the user's behalf. Record confirmed decisions in `DECISIONS.md`.

## Engineering
- Use Nuxt with Vue 3, Composition API, and strict TypeScript. Use `<script setup lang="ts">` in Vue components.
- Keep business logic for AI, speech-to-text, and RAG in Supabase Edge Functions; the browser must never receive provider API keys.
- Enable Row Level Security for every user-owned table. Validate LLM responses and API inputs with Zod.
- Keep code and commit messages in English; write user-facing interface text in Turkish.
- Follow existing project conventions. Check `package.json` before assuming available scripts or tools.
- Add or update focused tests for behavior changes. Report only checks that were actually run.
- Update `PROGRESS.md` when a roadmap task changes state and `DECISIONS.md` when a decision is confirmed.
- Do not commit or push unless Seda explicitly asks.

## Branches and Pull Requests
- Follow GitHub Flow. `main` is protected and must stay working; never commit directly to `main`.
- Start every task from an up-to-date `main` on its own branch named `<type>/<task-id>-<short-description>`, for example `feat/t0-1-nuxt-skeleton` or `fix/t1-2-zod-error`. Omit the task ID when there is none, for example `docs/branch-workflow`.
- Use these types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`.
- Keep one roadmap task per branch. Do not mix unrelated changes.
- Write commit messages in English using the same types as prefixes, for example `feat: add Nuxt skeleton`.
- Merge into `main` only through a pull request using a merge commit. Delete the branch after merging.
- Opening, updating, or merging a pull request needs Seda's explicit approval, like commits and pushes.

## Product and Privacy
- Design mobile-first and verify relevant desktop and mobile states.
- Show understandable loading and error states; do not silently discard user input.
- Treat recordings and personal notes as sensitive data. Follow the consent, retention, access-control, and deletion requirements in `PROJECT.md`.