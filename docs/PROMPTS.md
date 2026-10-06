# Phase prompts for Claude Code — paste one at a time. Don't skip the stop/report.

## Phase 0 — read + plan (no code) ~20 min
Read CLAUDE.md and SPEC.md. Fetch https://docs.deep.space/llms.txt, then as .md: concepts/data-model, concepts/permissions, concepts/realtime-sync, guides/presence-and-cursors, guides/server-actions, sdk-reference/worker/ai. Inspect node_modules/deepspace/dist/*.d.ts and the scaffold layout.
Output a plan only: (1) exact exports/hooks you'll use, each with its source file; (2) how to express each RBAC rule in SPEC.md, or which one can't be expressed; (3) files you'll create/edit per phase. Write no code.

## Phase 1 — schemas + RBAC ~45 min
Implement the three collections from SPEC.md in src/schemas/ and register them in src/schemas.ts. Comment the reason for each RBAC rule. Add a two-user test: user B can read A's incident and add an entry; B cannot update A's incident status; no client can create a postmortem. Run `npx deepspace test run all`. Report, stop.

## Phase 2 — first deploy ~20 min
Replace the starter home with the static landing from SPEC.md and create our own theme (deploy checklist). Commit and push to GitHub. Run `npx deepspace deploy`, then `npx deepspace logs --json` for one request. Report the URL. Stop.

## Phase 3 — incidents list + create + demo ~40 min
Build the protected list page, create form, and "Load demo incident" (realistic Airflow DAG outage, 8 entries, spaced timestamps). Disable writes until mutations are ready. Use confirmed mutation before navigating to the new incident. Report, stop.

## Phase 4 — incident room ~60 min
Build incidents/[id]: header, creator-only status control (hide for others AND rely on RBAC), live timeline ordered by occurredAt, composer (kind + text, 500 limit), presence avatars. Handle loading, empty, not-found, and RBAC-denied states. Extend the two-user test: an entry by A appears for B without reload. Report, stop.

## Phase 5 — postmortem server action ~60 min
Implement generatePostmortem per SPEC.md exactly: JWT check, ≥3 entries, genCount cap 3, owner-billed createDeepSpaceAI (no authToken), model resolved from SDK catalog, grounding prompt with entry-id citations, zod validation + one retry, upsert. Panel shows summary, root cause, impact, action items, cited entry ids, remaining generations, error state. Tests: cap enforced; <3 entries rejected. Show me the prompt text before wiring the UI. Report, stop.

## Phase 6 — ship + check ~30 min
Run `npx deepspace test run all`, commit, push, deploy. Then `npx deepspace logs --follow --json` while I click the core path. Run `npx deepspace app usage`. Run `git grep -nE "(sk-|api[_-]?key|secret)"` and `git check-ignore .dev.vars`. Report anything odd. Do not edit README.md; I write it.
