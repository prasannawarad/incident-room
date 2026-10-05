# Incident Room — agent rules

Real-time incident room on DeepSpace. Teams log an incident timeline live; AI drafts a grounded postmortem.
Product spec: SPEC.md. Work order: docs/PROMPTS.md. Do not build anything not in SPEC.md.

## Source of truth for APIs
1. https://docs.deep.space/llms.txt → pick 1–2 pages → fetch as `<page>.md`.
2. Exact signatures: `node_modules/deepspace/dist/*.d.ts`. These win over docs and over memory.
3. Never guess an SDK export or hook name. If unsure, grep the .d.ts and say what you found.
4. Read /concepts/* before touching worker.ts, schemas, or sync.

## Hard rules
- Extend the scaffold. Schemas in src/schemas.ts + src/schemas/. Routes in src/pages/. Providers in src/pages/(app)/_layout.tsx. DO wiring in worker.ts.
- Data/auth hooks only inside the (app)/ provider boundary. Top-level pages are static.
- Records are envelopes: fields live on `record.data`.
- Disable write controls until `useMutations().ready`.
- Keep the `users` schema. Extend, don't rename.
- Caller identity only from verified JWT. Never trust client-sent userId.
- Secrets only via `npx deepspace secrets`. Never write keys to .dev.vars, code, logs, or commits.
- UI primitives from src/components/ui, not the SDK.
- Use platform primitives (RBAC, sync, presence, AI helpers). Don't reimplement them.
- Never run `deepspace push`. GitHub is the source authority.
- Never run `app undeploy`, `app transfer`, or `app init --new-id`.
- On a CLI refusal: read `code` + `action`. Run the shipped action only. No action → stop and tell me.

## Working style
- One phase at a time. At the end of each phase: list files changed, commands run, what you verified, open risks. Then stop.
- Small diffs. No speculative abstractions.
- Every RBAC rule gets a one-line reason in a comment.
- Run `npx deepspace test run` before saying a phase is done.
