/**
 * Timeline Entries — Schema
 *
 * Live, ordered log of what happened during an incident. `authorId` is the
 * record envelope's built-in `createdBy` field (server-stamped from the
 * verified JWT) — not a data column; `update`/`delete: 'own'` checks it by
 * default. `authorName` IS a real column: a human-readable name can't be
 * derived from a JWT subject on the client, so the composer supplies the
 * signed-in user's display name at creation time.
 *
 * KNOWN GAP: the 500-char cap on `text` has no schema-level enforcement —
 * ColumnDefinition has no length/pattern validator and RecordRoom has no
 * beforeWrite hook (confirmed against worker.d.ts/worker.js). Enforced only
 * client-side (composer Textarea maxLength). Documented in README.md.
 */

import type { CollectionSchema } from 'deepspace/schema'

export const timelineEntriesSchema: CollectionSchema = {
  name: 'timeline-entries',
  columns: [
    { name: 'incidentId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'text', storage: 'text', interpretation: 'plain', required: true },
    {
      name: 'kind',
      storage: 'text',
      interpretation: { kind: 'select', options: ['event', 'action', 'note'] },
      required: true,
    },
    { name: 'occurredAt', storage: 'text', interpretation: { kind: 'datetime' }, required: true },
    { name: 'authorName', storage: 'text', interpretation: 'plain', required: true },
  ],
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    // SPEC: any signed-in user can read/create; only the entry's own author
    // can edit or delete it (not the incident's creator).
    member: { read: true, create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
