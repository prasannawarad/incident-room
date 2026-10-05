# Incident Room

A shared, live incident timeline. Responders log what happened as it happens; when it's over, the app drafts a postmortem grounded only in that timeline, with every claim tied to an entry.

Live: https://incident-room-pw.app.space | Repo: https://github.com/prasannawarad/incident-room

## Try it in 60 seconds

Sign in → **Load demo incident** → open it → **Generate postmortem**. Works end to end for a single account — the demo button seeds a realistic 8-entry Airflow outage so you don't need a second person to see the whole flow.

## DeepSpace pieces used

- **Auth** — `AuthGate` gates `/incidents` and `/incidents/:id`; every write's `createdBy` comes from the verified JWT (`RecordRoom`'s own envelope field), never from client input.
- **Records + RBAC** — three schemas in `src/schemas/`: `incidents` (`update: 'own'` → creator-only status changes), `timeline-entries` (`update: 'own'` → author-only edits), `postmortems` (`create: false` / `update: false` for every client role — written only by the server action).
- **Real-time sync** — `useQuery` on `timeline-entries` and `postmortems` updates live across browsers with no reload (covered by a two-user e2e test).
- **Presence** — `usePresenceRoom(\`incident:${id}\`)` shows who else is viewing each incident's room.
- **Server action + `createDeepSpaceAI`** — `src/actions/generate-postmortem.ts`'s `generatePostmortem(incidentId)` runs server-side via `tools.*` (bypasses client RBAC) and calls `createDeepSpaceAI` with no `authToken`, so the app owner is billed, not the caller.

## Left out, and why

- **Payments** — no monetization in an eval build.
- **LiveKit/voice** — a written timeline is the product.
- **File uploads** — pasted log text covers it.
- **Full AI chat panel** — one structured generation fits better than open chat.
- **Yjs co-editing of the postmortem** — next step.
- **Slack webhook ingest, scheduled stale-incident reminders** — next steps.

## Main tradeoff

AI is owner-billed (no user token), so reviewers without DeepSpace credits can still use the core feature. Cost: I pay. Controls: 3 generations per incident, 30 generations per day across the whole app, 1500 max output tokens per call, and the cheapest capable model (resolved from the live SDK catalog, currently `claude-haiku-4-5`) — not hardcoded.

## Security notes

- Entry text, incident title, and system are fenced as untrusted data in the postmortem prompt (wrapped in `"""..."""`, with any literal `"""` inside them neutralized to `'''` first) — the model is told explicitly not to treat entry text as instructions.
- Every `sourceEntryId` the model returns is checked against the incident's real entry ids before being stored; anything invented is dropped, and a result with zero surviving citations is treated as a failed attempt and retried, never stored.
- Postmortems are written only by the server action (`tools.create`/`tools.update`) — client `create`/`update` is denied for every role, including admin.
- `createdBy`/`authorId` are never client-supplied columns — they're the record envelope's server-stamped field, verified against the caller's JWT.

## Known gaps

- The 500-char entry limit is enforced client-side only — no server-side length validator exists on `ColumnDefinition` or `RecordRoom`.
- Incident status can jump to any value (investigating/mitigated/resolved), not just forward — deliberate, so a mistaken status change can be corrected.
- Two concurrent "Generate" clicks can both read the same `genCount` before either writes, so the per-incident cap can be exceeded by one request under a race.
- Timeline entry edit/delete are fire-and-forget (rely on the app's global write-error toast), unlike the header's status control, which uses confirmed mutations.
- The incident detail page finds its record by filtering the whole `incidents` collection client-side, not a server-scoped lookup — fine at this app's scale.
- "Load demo incident" creates a new demo incident every click — no dedup against an existing one.
- `/settings` route still exists (sign-out moved to the account-menu dropdown) but has no nav link.

## Next steps

- Yjs co-editing of the generated postmortem.
- Slack webhook ingest of entries.
- Scheduled reminder on incidents stuck in "investigating."

## What the agent did

- **Phase 0** — read SPEC.md and the DeepSpace docs/`.d.ts`, planned the schema/RBAC approach and file layout. No code.
- **Phase 1** (`25e6646`) — `incidents`/`timeline-entries`/`postmortems` schemas + RBAC, two-user RBAC unit test, GitHub repo created and wired as source authority.
- **Phase 2** (`13d9a21`) — static landing page, own ops-console theme (replacing the slate/paper scaffold placeholders), first deploy.
- **Phase 3** (`c858fec`) — incidents list (open/resolved, newest first), create-incident dialog, demo-seed button (8-entry Airflow outage).
- **Polish** (`533fdda`) — nav cleanup (Home → Incidents, dropped unused Settings link), nav/content column alignment, e2e test data hygiene.
- **Phase 4** (`322e970`) — full incident room: header + creator-only status control, live timeline, composer, presence, postmortem placeholder; two-user e2e test (live sync, presence, RBAC-hidden status control).
- **Phase 5** (`4b10bc4`) — `generatePostmortem` server action (prompt-injection-resistant prompt, zod-validated structured output, per-incident + daily caps), wired into the real postmortem panel; mocked unit tests plus one real, credit-spending verification (normal case + an adversarial prompt-injection case the model correctly resisted).
- Two deploys to https://incident-room-pw.app.space, after Phase 2 and after Phase 5.

## What I verified or changed myself

<!-- TODO (author) -->

## Docs index

- [SPEC.md](./SPEC.md) — product spec.
- [docs/PROMPTS.md](./docs/PROMPTS.md) — the per-phase work order given to the agent.
- [docs/VERIFY.md](./docs/VERIFY.md) — manual verification checklist.
