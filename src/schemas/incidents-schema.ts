/**
 * Incidents — Schema
 *
 * One shared timeline per outage. `createdBy` is the record envelope's
 * built-in creator field (RecordRoom stamps it server-side from the verified
 * JWT on insert — see worker.js INSERT path) — not duplicated as a data
 * column. `update`/`delete: 'own'` evaluates against that same envelope
 * field by default, so "creator only" needs no extra `ownerField`.
 */

import type { CollectionSchema } from 'deepspace/schema'

export const incidentsSchema: CollectionSchema = {
  name: 'incidents',
  columns: [
    { name: 'title', storage: 'text', interpretation: 'plain', required: true },
    {
      name: 'severity',
      storage: 'text',
      interpretation: { kind: 'select', options: ['SEV1', 'SEV2', 'SEV3'] },
      required: true,
    },
    { name: 'system', storage: 'text', interpretation: 'plain', required: true },
    {
      name: 'status',
      storage: 'text',
      interpretation: { kind: 'select', options: ['investigating', 'mitigated', 'resolved'] },
      required: true,
      default: 'investigating',
    },
    // Nullable: unset until the creator resolves the incident.
    { name: 'resolvedAt', storage: 'text', interpretation: { kind: 'datetime' } },
  ],
  permissions: {
    // Anonymous connections (RecordProvider allowAnonymous) get this role —
    // deny everything; incidents require sign-in per SPEC.
    viewer: { read: false, create: false, update: false, delete: false },
    // SPEC: "any signed-in user can read incidents" / can create; only the
    // creator can change status or delete (status control is creator-only).
    member: { read: true, create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
