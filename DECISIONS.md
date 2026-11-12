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

## Pending

- LLM and embedding providers.
- Speech-to-text provider, based on the planned Turkish quality comparison.
- Analytics provider.
- F4 integration scope and provider details.
- Faz 5 payment provider and pricing.