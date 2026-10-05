/**
 * Two-identity RBAC test for incidents / timeline-entries / postmortems.
 *
 * Exercises the SDK's own canRead/canCreate/canUpdate/canDelete against our
 * schemas directly — no browser, no WebSocket, no deployed app needed. This
 * is the Phase 1 "two-user test" PROMPTS.md asks for; Phase 4 extends it to
 * live multi-browser sync once the incident room UI exists.
 *
 * DEFAULT_ROLE is read from the actual users schema (falling back to the
 * SDK's ROLE_DEFAULT, matching RecordRoom.onConnect's own fallback) rather
 * than hardcoded, so this test tracks reality if that ever changes.
 */

import { describe, it, expect } from 'vitest'
import { canCreate, canDelete, canRead, canUpdate, ROLE_DEFAULT } from 'deepspace/worker'
import { usersSchema } from './users-schema'
import { incidentsSchema } from './incidents-schema'
import { timelineEntriesSchema } from './timeline-entries-schema'
import { postmortemsSchema } from './postmortems-schema'

const DEFAULT_ROLE = usersSchema.defaultRole ?? ROLE_DEFAULT

const userA = 'user-a'
// A freshly created second account has never been granted any special role,
// so it connects with exactly DEFAULT_ROLE — same as any other signed-in user.
const userB = 'user-b-fresh'

describe('incidents RBAC', () => {
  const incidentByA = {
    recordId: 'inc_1',
    createdBy: userA,
    data: { title: 'Airflow DAG failing', severity: 'SEV1', system: 'airflow', status: 'investigating' },
  }

  it('any signed-in user can read another user\'s incident', () => {
    expect(canRead(incidentsSchema, DEFAULT_ROLE, incidentByA, userB)).toBe(true)
  })

  it('any signed-in user can create an incident', () => {
    expect(canCreate(incidentsSchema, DEFAULT_ROLE)).toBe(true)
  })

  it('only the creator can update incident status', () => {
    expect(canUpdate(incidentsSchema, DEFAULT_ROLE, incidentByA, userA)).toBe(true)
    expect(canUpdate(incidentsSchema, DEFAULT_ROLE, incidentByA, userB)).toBe(false)
  })

  it('only the creator can delete', () => {
    expect(canDelete(incidentsSchema, DEFAULT_ROLE, incidentByA, userA)).toBe(true)
    expect(canDelete(incidentsSchema, DEFAULT_ROLE, incidentByA, userB)).toBe(false)
  })

  it('an anonymous connection (viewer role) is denied entirely', () => {
    expect(canRead(incidentsSchema, 'viewer', incidentByA, userB)).toBe(false)
    expect(canCreate(incidentsSchema, 'viewer')).toBe(false)
  })
})

describe('timeline-entries RBAC', () => {
  const entryByA = {
    recordId: 'entry_1',
    createdBy: userA,
    data: { incidentId: 'inc_1', text: 'Paged on-call', kind: 'event', occurredAt: '2026-10-05T10:00:00Z', authorName: 'A' },
  }

  it('a freshly created second account (default role) can create an entry on user A\'s incident', () => {
    // create has no existing record to check ownership against — this is
    // exactly what lets B post a new entry on an incident A created.
    expect(canCreate(timelineEntriesSchema, DEFAULT_ROLE)).toBe(true)
  })

  it('user B can read an entry authored by A', () => {
    expect(canRead(timelineEntriesSchema, DEFAULT_ROLE, entryByA, userB)).toBe(true)
  })

  it('only the entry\'s own author can edit or delete it (not the incident creator)', () => {
    expect(canUpdate(timelineEntriesSchema, DEFAULT_ROLE, entryByA, userA)).toBe(true)
    expect(canUpdate(timelineEntriesSchema, DEFAULT_ROLE, entryByA, userB)).toBe(false)
    expect(canDelete(timelineEntriesSchema, DEFAULT_ROLE, entryByA, userB)).toBe(false)
  })
})

describe('postmortems RBAC', () => {
  const postmortem = {
    recordId: 'inc_1',
    createdBy: 'server-action',
    data: { incidentId: 'inc_1', summary: 'Draft summary' },
  }

  it('no client role — including admin — can create, update, or delete a postmortem', () => {
    for (const role of [DEFAULT_ROLE, 'admin']) {
      expect(canCreate(postmortemsSchema, role)).toBe(false)
      expect(canUpdate(postmortemsSchema, role, postmortem, userA)).toBe(false)
      expect(canDelete(postmortemsSchema, role, postmortem, userA)).toBe(false)
    }
  })

  it('any signed-in user can read the generated postmortem', () => {
    expect(canRead(postmortemsSchema, DEFAULT_ROLE, postmortem, userB)).toBe(true)
  })
})
