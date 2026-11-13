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

## Project Structure
- `app/`: Nuxt application source (Nuxt 4 layout).
  - `pages/`: file-based routes. Route paths are English (`/notes`, `/board`); each page sets its Turkish title with `definePageMeta({ title })` and `useSeoMeta`.
  - `layouts/`: page shells. `default.vue` holds the sidebar, top bar, and bottom navigation.
  - `components/`: reusable Vue components, auto-imported.
  - `composables/`: `use*` functions for shared state and logic, auto-imported.
  - `utils/`: pure TypeScript helpers with no Vue or Nuxt dependency, auto-imported.
  - `assets/css/main.css`: Tailwind and Nuxt UI imports, brand color tokens, and the `bg-brand-gradient` utility.
  - `app.config.ts`: Nuxt UI theme colors.
- `supabase/`: added in T0.3 for local configuration, migrations, and Edge Functions. Until then there is no database code.
- `test/unit/`: Vitest tests for pure logic. `test/nuxt/`: Vitest component tests in the Nuxt environment. `test/e2e/`: Playwright tests.
- `docs/PRODUCT.md`: personas, user stories, acceptance criteria, screens, and the color palette.
- `.github/workflows/`: CI. `.github/agents/`: focused agent profiles.

## Naming
- Vue components: PascalCase file names. Prefix app-wide shell components with `App` (`AppSidebar.vue`).
- Composables: `useCamelCase.ts`, one composable per file, exported by the same name.
- Utilities, types, and other TypeScript files: camelCase file names; types and interfaces in PascalCase.
- Test files mirror the subject in kebab-case: `*.test.ts` for Vitest, `*.spec.ts` for Playwright.
- Database tables and columns: snake_case, as in `PROJECT.md` section 5.

## Libraries
- UI: Nuxt UI components (`U*`) and Tailwind utility classes. Use the brand colors from `main.css` (`navy-*`, `teal-*`) instead of raw hex values.
- Icons: Lucide through Iconify (`i-lucide-*`).
- Validation: Zod for API inputs and LLM output.
- Do not add a dependency for something the existing stack already covers. Ask Seda before adding a new library, and pin it to an exact version that is at least two weeks old.
- The Supabase client library is chosen in T0.3; do not add one before that.

## Testing and Checks
- Before reporting work as done, run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. For UI, routing, or layout changes also run `npm run test:e2e`, which needs a fresh build.
- Test behavior through public interfaces and accessible roles or labels, not CSS classes or implementation details.
- UI changes need a check at a narrow phone width (360 px) and at desktop width (1440 px).
- Never call real AI, speech-to-text, or Supabase services from tests; mock them. Use synthetic, non-personal fixture data.
- CI runs the same checks on every pull request and on pushes to `main`; a pull request is merged only when CI passes.

## Branches and Pull Requests
- Follow GitHub Flow. `main` is protected and must stay working; never commit directly to `main`.
- Start every task from an up-to-date `main` on its own branch named `<type>/<task-id>-<short-description>`, for example `feat/t0-1-nuxt-skeleton` or `fix/t1-2-zod-error`. Omit the task ID when there is none, for example `docs/branch-workflow`.
- Use these types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`.
- Keep one roadmap task per branch. Do not mix unrelated changes.
- Write commit messages in English using the same types as prefixes and an imperative, lowercase summary, for example `feat: add Nuxt skeleton`.
- Merge into `main` only through a pull request using a merge commit. Delete the branch after merging.
- Opening, updating, or merging a pull request needs Seda's explicit approval, like commits and pushes.

## Product and Privacy
- Design mobile-first and verify relevant desktop and mobile states.
- Show understandable loading and error states; do not silently discard user input.
- Treat recordings and personal notes as sensitive data. Follow the consent, retention, access-control, and deletion requirements in `PROJECT.md`.