# Jotplot Progress

## Current Phase

Faz 1 — from note to tasks (complete). Next: Faz 2 (audio).

## Status

- [x] Read the project plan in `PROJECT.md`.
- [x] Confirm public visibility for the planned GitHub repository.
- [x] Add project-wide agent guidelines and focused Copilot agent profiles.
- [x] Create the public GitHub repository and connect this workspace as `origin`.
- [x] Push the first commit and define the branch workflow.
- [x] T0.0 Product document and rough wireframes (PR #2).
- [x] T0.1 Nuxt skeleton (PR #3).
- [x] T0.7 Test and CI (PR #4).
- [x] T0.6 Layout (PR #5).
- [x] T0.2 Agent rules and `CLAUDE.md` (PR #7).
- [x] T0.3 Local Supabase with the Nuxt module (PR #8).
- [x] T0.4 Database schema with RLS and pgTAP tests (PR #9).
- [x] T0.5 Email and Google sign-in, protected pages (PR #10).
- [x] Complete T0.0–T0.7 as tracked in `PROJECT.md`.
- [x] T1.1 Note creation screen and notes list (PR #12).
- [x] T1.2 Note analysis Edge Function with Claude Haiku 5.5 (PR #13).
- [x] T1.5 Saving the analysis with proposed tasks (PR #14).
- [x] T1.6 Result screen to review and approve tasks (PR #15).
- [x] T1.7 Kanban board with drag and drop (PR #16).
- [x] T1.4 Monthly AI usage limit (PR #17).
- [x] T1.9 End-to-end test from note to board (PR #19).
- [x] T1.8 Note search and type filters (PR #18).
- [x] T1.3 AI quality check and manual test guide (PR #20).
- [x] Complete T1.1–T1.9 as tracked in `PROJECT.md`.

## Latest Update

2026-11-18: Faz 1 is complete. T1.1–T1.9 are merged into `main` (PRs #12–#20). The full flow works: write a note, extract a summary, decisions, and tasks with Claude Haiku 5.5, review and edit them, add them to the board, and track them there. Free users can process 50 notes a month. `npm run eval:ai` checks the AI on ten synthetic notes (10/10 passing, about $0.013 per run), and `docs/MANUAL_TESTS.md` is the guide for testing by hand. Next: Faz 2 starts with T2.1, comparing speech-to-text providers on Turkish recordings; the provider is still an open decision.
