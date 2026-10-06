# Incident Room

A shared incident timeline that updates live for everyone in the room.
When the incident is over, it drafts a postmortem from that timeline, and every claim cites a timeline entry.

Live: https://incident-room-pw.app.space | Repo: https://github.com/prasannawarad/incident-room

## Try it in 60 seconds

Sign in, click **Load demo incident**, open the incident, then click **Generate postmortem**. One account is enough. The demo button seeds an Airflow outage with 8 timeline entries, so you can see the whole flow without a second person.

## What I built and why

During an outage, updates end up spread across Slack threads, calls, and DMs. Afterwards someone rebuilds the timeline by hand to write the postmortem. Incident Room keeps one live timeline per incident that every responder writes to, and drafts the postmortem from that timeline when the incident is over.

## DeepSpace pieces I used

- **Auth.** `AuthGate` protects `/incidents` and `/incidents/:id`. A signed-out visitor gets a sign-in prompt in place.
- **Records + RBAC.** Three schemas in `src/schemas/`. Only an incident's creator can change its status. Only an entry's author can edit or delete it. No client role can create or update a postmortem, including admin.
- **Real-time sync.** `useQuery` on `timeline-entries` and `postmortems` pushes new entries and new postmortems to every open browser without a reload.
- **Presence.** ``usePresenceRoom(`incident:${id}`)`` shows who else has the incident open.
- **Server action + `createDeepSpaceAI`.** `generatePostmortem(incidentId)` in `src/actions/generate-postmortem.ts` loads the incident and its entries server-side, calls the model, checks the output, and writes the postmortem record.

## What I left out and why

- **Payments.** This is an evaluation build with nothing to sell.
- **LiveKit voice.** The product is a written timeline, and a call does not produce one.
- **File uploads.** Responders can paste log lines into an entry.
- **AI chat panel.** One structured generation with citations is easier to check than an open chat.
- **Yjs co-editing.** I wanted the core path solid first. It is the first item under Next.

I did not add more integrations. None of the ones available would improve a written, live timeline.

## The main tradeoff

The AI call is billed to me as the app owner. The server action calls `createDeepSpaceAI` without the caller's `authToken`. I did this so a reviewer with no DeepSpace credits can still use the core feature. The cost is mine, so I capped it:

- 3 generations per incident
- 30 generations per day across the whole app
- 1500 max output tokens per call
- The cheapest capable model, picked from the SDK's model catalog at runtime instead of a hardcoded list. Today that is Claude Haiku 4.5.

## How I used the agent

Claude Code built phases 0 to 5 from `SPEC.md` and one prompt per phase in `docs/PROMPTS.md`. Each prompt ends with "report, stop". I planned the phases, read every report before I approved the next phase, and set the working rules in `CLAUDE.md`: get SDK signatures from the `.d.ts` files, take caller identity only from the verified JWT, and never run `deepspace push`.

- `6c3a69f` Scaffold and agent kit (`CLAUDE.md`, `SPEC.md`, `docs/PROMPTS.md`).
- Phase 0: read the DeepSpace docs and type definitions and wrote a plan. No code, no commit.
- `25e6646` Phase 1: the three schemas with RBAC, plus an RBAC unit test that runs as two users.
- `13d9a21` Phase 2: static landing page, ops-console theme, first deploy.
- `c858fec` Phase 3: incidents list, create form, demo seed button.
- `533fdda` Polish: nav labels and e2e test data cleanup.
- `322e970` Phase 4: incident room with timeline, composer, presence, and creator-only status control.
- `4b10bc4` Phase 5: the `generatePostmortem` server action and the postmortem panel.

## What I verified or changed myself

**RBAC.** The RBAC unit test reads the default role from the real `users` schema (falling back to the SDK's `ROLE_DEFAULT`) instead of hardcoding it, so a fresh second account is tested with the role it actually gets. `createdBy` is the record envelope field the server stamps from the caller's JWT. The client never sends it.

**Structured output.** The code calls `generateText` with `Output.object` and a zod schema. `generateObject` is marked `@deprecated` in the installed `ai` package (7.0.107), with a note to use `generateText` with an `output` setting.

**The postmortem prompt.** The Phase 5 prompt required the agent to show me the prompt text before wiring the UI. After reading it, I required three changes:

- A global cap of 30 generations per day, on top of the per-incident cap of 3.
- The incident title, the system name, and every entry's text are fenced as untrusted data. Each is wrapped in `"""`, any `"""` inside it is replaced with `'''` first, and the system prompt tells the model not to follow instructions found inside entries.
- Every cited entry id is checked against the incident's real entries. Invented ids are dropped. A result with zero valid citations counts as a failed attempt and is retried once, never stored.

**Prompt injection.** I ran one real generation against an adversarial timeline with injected instructions in the entry text. The model treated them as incident narrative and did not follow them.

**Live two-account pass on production** (2026-10-05, raw results in [docs/VERIFY.md](docs/VERIFY.md)). Two test accounts, A and B, on https://incident-room-pw.app.space:

- The demo incident seeded exactly 8 entries in the right order.
- The first generation succeeded. All 7 cited entry ids exist among the incident's real entries.
- B opened A's link and saw the postmortem and A's new entry appear with no reload.
- B's page had zero status-control elements. The control is hidden for non-creators.
- Generations 2 and 3 succeeded. The UI then showed "3 of 3" and disabled the button.
- A 4th attempt sent straight to the server action was rejected with `generation_cap` before any model call, so it cost nothing.
- Signed out, `/incidents` shows the sign-in prompt in place.
- `npx deepspace logs` showed zero errors, warnings, or exceptions.
- `npx deepspace app usage` moved by exactly 6 ledger entries, which is 3 generations. No extra calls.

The full test suite passed at every phase. The last run was 34/34 (20 unit, 14 e2e). A secrets grep and the `.dev.vars` ignore check were clean.

**Polish commit** (`533fdda`). The nav said "Home" and linked an unused Settings page. It now says "Incidents" and the Settings link is gone. Test incidents are now prefixed `[e2e]` so they do not mix with real ones in the list.

**Limit of this verification.** I did not send a forged status change as B against production. That server-side denial is verified only in unit tests that call the SDK's own permission functions (`canUpdate` returns false for a non-creator). It has not been observed as a live request.

## Known gaps

- The 500-character entry limit is enforced only in the client. There is no server-side length check.
- Status can jump to any value (investigating, mitigated, resolved), backwards too. This is on purpose so a wrong status change can be undone.
- Two "Generate" clicks at the same moment can both read the same `genCount`, so the per-incident cap can be exceeded by one.
- Editing and deleting an entry are fire-and-forget. They rely on the app's global write-error toast. The status control uses confirmed mutations.
- The incident page finds its record by filtering the whole `incidents` collection in the client, not with a server-side lookup. That is fine at this scale.
- **Load demo incident** creates a new incident on every click.
- The `/settings` route still exists but nothing links to it. Sign-out moved to the account menu.

## Not deployed

A read-only status chip with a tooltip for non-creators is done but sits in `git stash`. It is not in the live app, where non-creators see no status control at all.

## Next

- Yjs co-editing of the generated postmortem.
- Slack webhook ingest of timeline entries.
- Reminders for incidents stuck in "investigating".

## Docs

- [SPEC.md](SPEC.md): product spec, data model, RBAC rules.
- [docs/PROMPTS.md](docs/PROMPTS.md): the per-phase prompts I gave the agent.
- [docs/VERIFY.md](docs/VERIFY.md): my verification checklist and the production pass results.
