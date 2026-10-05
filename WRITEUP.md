# Incident Room

Live: https://<name>.app.space
Repo: https://github.com/<you>/<name>

## What it is
A shared, live incident timeline. Responders log what happened as it happens; when it's over, the app drafts a postmortem grounded only in that timeline, with every claim tied to an entry.

## DeepSpace pieces used
- Auth: sign-in; identity from verified JWT only.
- Records + RBAC: incidents (creator-only updates), timeline entries (own-only edits), postmortems (client create disabled; server-written only, so they can't be forged).
- Real-time sync: entries and postmortems appear for every viewer without reload.
- Presence: who's in the room.
- Server action + createDeepSpaceAI: postmortem generation.

## Left out, and why
- Payments, LiveKit, file uploads, AI chat panel: <one line each from SPEC.md>

## Main tradeoff
AI is owner-billed (no user token) so reviewers without DeepSpace credits can use the core feature. Cost: I pay. Control: 3 generations per incident, ≥3 entries required.

## What the agent did
<phases it implemented>

## What I verified or changed
<from VERIFY.md — be specific: bugs found, rules corrected, prompt edits>

## Unfinished / next
- <honest list>
- Yjs co-editing of the postmortem
- Slack webhook ingest of entries
- Scheduled reminder on incidents stuck in "investigating"

## Known gaps
- Timeline entry text (SPEC: ≤500 chars) has no server-side length enforcement. `ColumnDefinition` has no length/pattern validator and `RecordRoom` has no beforeWrite hook (checked `node_modules/deepspace/dist/worker.d.ts` and `worker.js`: no such hook exists). The cap is enforced client-side only (composer `Textarea maxLength={500}`) — a client that bypasses the UI could write a longer entry.
