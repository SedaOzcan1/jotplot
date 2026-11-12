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

## Pending

- First release persona: employee or student.
- LLM and embedding providers.
- Speech-to-text provider, based on the planned Turkish quality comparison.
- Analytics provider.
- F4 integration scope and provider details.
- Faz 5 payment provider and pricing.