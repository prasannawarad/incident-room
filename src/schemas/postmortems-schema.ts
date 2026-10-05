/**
 * Postmortems — Schema
 *
 * Written only by the generatePostmortem server action, which bypasses RBAC
 * via `tools.create`/`tools.update` (the `X-App-Action` path) — see
 * src/actions/generate-postmortem.ts. No role, including admin, gets client
 * write access; that's the whole point of SPEC's "stops forged postmortems."
 *
 * Design choice: the action uses `incidentId` as the record's `recordId`
 * (one postmortem per incident, deterministic key), so upsert is a plain
 * get-then-create-or-update — no `uniqueOn` needed.
 */

import type { CollectionSchema } from 'deepspace/schema'

export const postmortemsSchema: CollectionSchema = {
  name: 'postmortems',
  columns: [
    { name: 'incidentId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'summary', storage: 'text', interpretation: 'plain' },
    { name: 'rootCause', storage: 'text', interpretation: 'plain' },
    { name: 'impact', storage: 'text', interpretation: 'plain' },
    { name: 'actionItems', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'sourceEntryIds', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'model', storage: 'text', interpretation: 'plain' },
    { name: 'genCount', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'generatedAt', storage: 'text', interpretation: { kind: 'datetime' } },
  ],
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    // SPEC: read by any signed-in user; create/update/delete false from
    // EVERY client role, including admin — only the server action writes.
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: false, update: false, delete: false },
  },
}
