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

## Product and Privacy
- Design mobile-first and verify relevant desktop and mobile states.
- Show understandable loading and error states; do not silently discard user input.
- Treat recordings and personal notes as sensitive data. Follow the consent, retention, access-control, and deletion requirements in `PROJECT.md`.