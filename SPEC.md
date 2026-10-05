# Incident Room — spec

## Problem
During an outage (e.g. an Airflow DAG failure), people scatter updates across Slack, calls, and DMs. Afterwards someone rebuilds the timeline by hand to write a postmortem. Incident Room is one shared live timeline, and the postmortem is drafted from it.

## Core path (must work on the live URL)
1. User signs in.
2. Creates an incident: title, severity (SEV1|SEV2|SEV3), affected system.
3. Copies the incident link. Second user opens it and appears in presence.
4. Either user adds timeline entries; both see them live, ordered by occurredAt.
5. Creator changes status: investigating → mitigated → resolved.
6. Anyone clicks "Generate postmortem" (needs ≥3 entries). Worker drafts it; result appears live for both.

Also: "Load demo incident" button on the list page creates a sample incident with ~8 entries, so a reviewer with one account can test steps 4–6.

## Data model (confirm exact schema/RBAC syntax in docs before writing)

incidents
- title (string, required), severity (SEV1|SEV2|SEV3), system (string), status (investigating|mitigated|resolved), createdBy (from JWT), resolvedAt (nullable)
- read: any signed-in user | create: any signed-in user | update: creator only | delete: creator only

timeline-entries
- incidentId (required), text (required, ≤500 chars), kind (event|action|note), occurredAt (required), authorId (from JWT), authorName
- read: any signed-in user | create: any signed-in user | update/delete: own

postmortems
- incidentId, summary, rootCause, impact, actionItems (array of {owner, task}), sourceEntryIds (array), model, genCount, generatedAt
- read: any signed-in user | create/update/delete: false from client. Written only by the server action (stops forged postmortems).

## Server action: generatePostmortem(incidentId)
- Verify JWT. Load incident + entries.
- Reject if <3 entries. Reject if genCount ≥ 3 (cost cap).
- AI via createDeepSpaceAI WITHOUT authToken → app owner pays. Reason: reviewers may have no DeepSpace credits; the core feature must work for them. Cap protects my credits.
- Model: cheapest capable from the SDK catalog (resolve via SDK, don't hardcode a list).
- Prompt: use ONLY the provided entries; every claim must cite entry ids; say "unknown" instead of inventing a root cause.
- Validate output with zod. On invalid JSON: one retry, then return a clear error.
- Upsert postmortem record, increment genCount.

## Pages
- / (static landing): one-line pitch, sign-in CTA.
- (app)/(protected) incidents list: open + resolved, create form, demo button.
- (app)/(protected) incidents/[id]: header (title, severity, status control for creator), presence avatars, timeline + composer, postmortem panel.

## Design
Own theme (deploy checklist requires replacing slate/paper + starter home). Ops-console feel: dense, monospace timestamps, severity colors, dark default. No gradients/emoji decoration.

## Out of scope (write these into WRITEUP.md)
- Payments: no monetization in an eval build.
- LiveKit/voice: a written timeline is the product.
- File uploads: pasted log text covers it.
- Full AI chat panel: one structured generation fits better than open chat.
- Yjs co-editing of postmortem: next step.
- Slack webhook ingest, scheduled stale-incident reminders: next steps.
