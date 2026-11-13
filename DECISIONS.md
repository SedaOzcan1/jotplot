# Jotplot Decisions

Confirmed decisions are recorded here with their date and rationale. Pending questions remain in `PROJECT.md` until Seda confirms them.

## Confirmed

| Date | Decision | Rationale |
|---|---|---|
| 2026-11 | Nuxt (Vue 3) with strict TypeScript | Matches the existing project plan and Seda's Vue experience. |
| 2026-11 | Responsive web only; no native mobile app | Matches the product scope in `PROJECT.md`. |
| 2026-11-12 | Create `SedaOzcan1/jotplot` as a public GitHub repository | Seda selected public visibility for portfolio discoverability. The repository was created empty so no README, ignore rules, or license are chosen without her input. |
| 2026-11-12 | Commit to this repository as `Seda Ozcan <seda.ozcan73665@gmail.com>` (repo-local git config) | The global git identity is a work address; Seda chose her personal Gmail for public commit history. |
| 2026-11-12 | Add a short Turkish README; no `.gitignore` or license for now | Seda selected only the README for the first commit. Without a license, the public code remains all rights reserved. |
| 2026-11-12 | Use GitHub Flow with `<type>/<task-id>-<short-description>` branches | A single long-lived `main` with short task branches fits a solo project without the extra `develop` step. |
| 2026-11-12 | Merge pull requests with merge commits | Seda chose to keep each branch's full commit history in `main`. |
| 2026-11-12 | Protect `main`: pull request required, no direct or force pushes, no required approvals | Every change goes through a pull request; approvals are not required because Seda is the only developer. Required CI checks are added after T0.7. |
| 2026-11-12 | First release (MVP) focuses on employee mode | Seda chose Elif's meeting-notes-to-tasks flow as the first release focus. Student mode stays in the plan and follows after MVP. |
| 2026-11-12 | Draw rough wireframes in Figma | Seda chose Figma; the file link is kept in `docs/PRODUCT.md`. |
| 2026-11-12 | Use Nuxt UI as the component library | Tailwind-based official Nuxt library with accessible components and dark mode, the fastest path to the MVP. |
| 2026-11-12 | Color direction: navy, blue, and turquoise with gradient primary buttons | Seda asked for navy-blue-turquoise tones and gradient buttons. The palette is listed in `docs/PRODUCT.md`; typography, logo, and dark mode remain open. |
| 2026-11-12 | Node.js 24.15 for development, pinned in `.nvmrc` | Nuxt 4.6 requires Node `^22.22.3` or `^24.15.0`; 24.15.0 was already installed through nvm, so the global default stays untouched. |
| 2026-11-12 | Pin dependency versions exactly, choosing releases at least two weeks old | Reproducible installs and fewer surprises from brand-new releases. |
| 2026-11-12 | TypeScript 6.0.3 instead of 7.x | TypeScript 7 is the new native compiler; staying on 6.x avoids compatibility risk with `vue-tsc`. |
| 2026-11-12 | Prettier formats code; ESLint (`@nuxt/eslint`) checks code quality; Markdown docs are excluded from Prettier | Keeps formatting and linting separate and avoids reformatting Turkish prose documents. |
| 2026-11-12 | Vitest with `@nuxt/test-utils` (happy-dom) for unit and component tests; Playwright (Chromium) for E2E on desktop 1440 px and mobile Pixel 7 | Matches the planned test stack; Chromium-only keeps CI fast while still covering a real mobile viewport. |
| 2026-11-12 | E2E tests run against the production build | Tests the same output that will be deployed. |
| 2026-11-12 | CI runs on pull requests and pushes to `main`: format, lint, typecheck, unit tests, build, and E2E | Every change entering the protected `main` is checked. Required status checks are added to the ruleset after the first CI run on GitHub. |
| 2026-11-12 | Route paths in English (`/notes`, `/notes/new`, `/board`, `/ask`, `/settings`); `/` redirects to `/notes` | Keeps URLs consistent with code identifiers; all visible text stays Turkish. Can be revisited before launch. |
| 2026-11-12 | Light theme only for now (`ui.colorMode: false`) | Dark mode is still an open design decision; this avoids a half-styled dark theme on dark-mode devices. |
| 2026-11-12 | Selected mode is client state only until auth exists | `profiles.default_mode` will persist it after T0.4/T0.5; student mode is shown as "yakında" and cannot be selected in the MVP. |
| 2026-11-12 | Add `CLAUDE.md` that imports `AGENTS.md` with `@AGENTS.md`; the rules themselves stay only in `AGENTS.md` | Seda asked for a `CLAUDE.md`. Importing keeps a single source of truth so the two files cannot drift apart. |
| 2026-11-12 | Local Supabase through the Supabase CLI and Docker Desktop | Seda chose local development: free, no development data online, and safe for tests. A hosted project can follow for deployment. |
| 2026-11-12 | Supabase CLI as a pinned dev dependency (`supabase` 2.122.0), run with `npx` or the `db:*` scripts | No global install needed and everyone uses the same CLI version. 3.x is newer than two weeks. |
| 2026-11-12 | `@nuxtjs/supabase` 2.1.0 as the Supabase client in Nuxt; `@supabase/supabase-js` pinned to 2.118.0 through `overrides` | Seda chose the official Nuxt module for its composables, cookie-based sessions for SSR, and built-in route protection. The override keeps the transitive client within the two-week rule. |
| 2026-11-12 | Minimum password length is 8 characters, enforced in the sign-up form and in Supabase Auth (`minimum_password_length`) | Seda confirmed 8 instead of the Supabase default of 6. |
| 2026-11-12 | Initial schema has the 9 MVP tables; `subscriptions` and `payment_events` (Faz 5) and `integrations` (F4) are added in their own phases | Keeps the first migration to what the MVP uses. |
| 2026-11-12 | `chunks.embedding` has no fixed dimension or vector index yet | The embedding provider is still open; the dimension and index follow that choice. |
| 2026-11-12 | Note (`sources`) statuses are `pending`, `processing`, `ready`, `failed`; the default board created at sign-up is named "Panom" | Covers the processing states in US-1.2 and US-2.2. |
| 2026-11-12 | All app pages require sign-in; signed-out visitors go to `/login` and return to the requested page afterwards. `/login` and `/register` send signed-in users to `/notes` | Matches US-0.1. The return path is checked so it can only point inside Jotplot. |
| 2026-11-12 | "Çıkış yap" signs out the current browser only (`scope: 'local'`) | Signing out on one device should not end sessions on the user's other devices. |
| 2026-11-12 | E2E tests run against a local Supabase and create their own synthetic users; the local sign-in rate limit is raised from 30 to 100 per 5 minutes | Tests the real sign-in flow without shared or personal accounts. The higher limit applies only to local Supabase. CI starts only the database, auth, REST, and gateway services. |
| 2026-11-13 | After a note is saved, the user returns to the notes list, which shows the newest notes first with their title (or first line), a preview, and the date; search and filters follow in T1.8 | Seda chose the notes list so a saved note is visible right away (US-1.1). |
| 2026-11-13 | A text note is at most 20,000 characters, checked in the form and in the database; the title stays optional (at most 200 characters) | Seda chose 20,000 characters: enough for long meeting notes while keeping AI requests fast and cheap (T1.2, under 30 seconds). |
| 2026-11-13 | Claude Haiku 5.5 (`claude-haiku-5-5`) extracts summaries, decisions, and tasks from notes (T1.2); the model name is one setting so it can change after the T1.3 quality tests | Seda chose the lowest-cost model (about $0.10 / $0.50 per million input / output tokens; under one cent per note). Higher-quality options (Sonnet 5.5, Opus 5.5) stay available if the quality tests show a need. |

## Pending

- Embedding provider.
- Speech-to-text provider, based on the planned Turkish quality comparison.
- Analytics provider.
- F4 integration scope and provider details.
- Faz 5 payment provider and pricing.
