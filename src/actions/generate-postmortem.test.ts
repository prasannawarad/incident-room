/**
 * Unit tests for generatePostmortem's logic, with the AI call mocked so no
 * credits are spent. The real, credit-spending verification (normal +
 * adversarial prompt-injection cases) was run manually once and reported
 * separately — this suite never calls a real model.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActionResult, ActionTools } from 'deepspace/worker'

const generateTextMock = vi.fn()

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
  Output: { object: (opts: unknown) => opts },
}))

vi.mock('deepspace/worker', async (importOriginal) => {
  const actual = await importOriginal<typeof import('deepspace/worker')>()
  return {
    ...actual,
    // Real listDeepSpaceAgentModels/resolveDeepSpaceAgentModel are pure
    // catalog lookups — kept real. Only the network-calling factory is faked.
    createDeepSpaceAI: vi.fn(() => (modelId: string) => ({ modelId })),
  }
})

const { generatePostmortem } = await import('./generate-postmortem')

type FakeRecord = {
  recordId: string
  createdBy: string
  createdAt: string
  updatedAt: string
  data: Record<string, unknown>
}

function makeFakeRecord(recordId: string, data: Record<string, unknown>): FakeRecord {
  const now = new Date().toISOString()
  return { recordId, createdBy: 'tester', createdAt: now, updatedAt: now, data }
}

function makeFakeTools() {
  const db = {
    incidents: new Map<string, FakeRecord>(),
    'timeline-entries': new Map<string, FakeRecord>(),
    postmortems: new Map<string, FakeRecord>(),
  }
  let nextId = 1

  function mapFor(collection: string): Map<string, FakeRecord> {
    const map = (db as Record<string, Map<string, FakeRecord>>)[collection]
    if (!map) throw new Error(`unknown collection ${collection}`)
    return map
  }

  // Not `: ActionTools` — each real method is generic over its own call-site
  // T, but these fakes always resolve to concrete FakeRecord data, so they
  // can't satisfy that generic signature structurally. Asserting the whole
  // object below is the standard escape for faking a generic interface.
  const tools = {
    async get(collection: string, recordId: string) {
      const record = mapFor(collection).get(recordId)
      if (!record) return { success: false, error: 'Not found', code: 'not_found' }
      return { success: true, data: { record } }
    },
    async query(
      collection: string,
      options?: { where?: Record<string, unknown>; orderBy?: string; orderDir?: 'asc' | 'desc'; limit?: number },
    ) {
      let records = Array.from(mapFor(collection).values())
      if (options?.where) {
        const where = options.where
        records = records.filter((r) => Object.entries(where).every(([k, v]) => r.data[k] === v))
      }
      if (options?.orderBy) {
        const key = options.orderBy
        const dir = options.orderDir === 'desc' ? -1 : 1
        records = [...records].sort((a, b) => {
          const av = String(a.data[key] ?? '')
          const bv = String(b.data[key] ?? '')
          return av < bv ? -dir : av > bv ? dir : 0
        })
      }
      if (options?.limit) records = records.slice(0, options.limit)
      return { success: true, data: { records, count: records.length } }
    },
    async create(collection: string, data: Record<string, unknown>, recordId?: string) {
      const id = recordId ?? `rec_${nextId++}`
      mapFor(collection).set(id, makeFakeRecord(id, data))
      return { success: true, data: { recordId: id } }
    },
    async update(collection: string, recordId: string, data: Record<string, unknown>) {
      const map = mapFor(collection)
      const existing = map.get(recordId)
      if (!existing) return { success: false, error: 'Not found', code: 'not_found' }
      map.set(recordId, {
        ...existing,
        data: { ...existing.data, ...data },
        updatedAt: new Date().toISOString(),
      })
      return { success: true, data: { recordId } }
    },
    async remove() {
      return { success: true, data: { recordId: '' } }
    },
    async deleteWhere() {
      return { success: true, data: { deleted: 0 } }
    },
    async integration() {
      return { success: false, error: 'not implemented in test fakes' } as ActionResult<never>
    },
    async registerUser() {
      return { success: false, error: 'not implemented in test fakes' } as ActionResult<never>
    },
  } as ActionTools

  function seedIncident(recordId: string, overrides: Record<string, unknown> = {}) {
    db.incidents.set(
      recordId,
      makeFakeRecord(recordId, {
        title: 'Test incident',
        severity: 'SEV2',
        system: 'test-system',
        status: 'investigating',
        ...overrides,
      }),
    )
  }

  function seedEntries(incidentId: string, count: number, startMinutesAgo = count) {
    const ids: string[] = []
    for (let i = 0; i < count; i++) {
      const id = `entry_${incidentId}_${i}`
      ids.push(id)
      db['timeline-entries'].set(
        id,
        makeFakeRecord(id, {
          incidentId,
          text: `Entry ${i} happened.`,
          kind: 'event',
          occurredAt: new Date(Date.now() - (startMinutesAgo - i) * 60_000).toISOString(),
          authorName: 'Tester',
        }),
      )
    }
    return ids
  }

  function seedPostmortem(incidentId: string, overrides: Record<string, unknown> = {}) {
    db.postmortems.set(
      incidentId,
      makeFakeRecord(incidentId, {
        incidentId,
        genCount: 0,
        generatedAt: new Date().toISOString(),
        ...overrides,
      }),
    )
  }

  return { tools, db, seedIncident, seedEntries, seedPostmortem }
}

const fakeEnv = { APP_OWNER_JWT: 'fake-owner-jwt' } as unknown as Parameters<
  typeof generatePostmortem
>[0]['env']

function validOutput(sourceEntryIds: string[]) {
  return {
    output: {
      summary: 'Summary.',
      rootCause: 'Root cause.',
      impact: 'Impact.',
      actionItems: [],
      sourceEntryIds,
    },
  }
}

beforeEach(() => {
  generateTextMock.mockReset()
})

describe('generatePostmortem', () => {
  it('rejects fewer than 3 entries', async () => {
    const { tools, seedIncident, seedEntries } = makeFakeTools()
    seedIncident('inc_1')
    seedEntries('inc_1', 2)

    const result = await generatePostmortem({
      userId: 'u1',
      params: { incidentId: 'inc_1' },
      tools,
      env: fakeEnv,
      callerJwt: 'jwt',
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('insufficient_entries')
    expect(generateTextMock).not.toHaveBeenCalled()
  })

  it('returns 404 for a missing incident', async () => {
    const { tools } = makeFakeTools()
    const result = await generatePostmortem({
      userId: 'u1',
      params: { incidentId: 'does-not-exist' },
      tools,
      env: fakeEnv,
      callerJwt: 'jwt',
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('not_found')
  })

  it('allows the 3rd generation but blocks the 4th (per-incident cap)', async () => {
    const { tools, seedIncident, seedEntries, seedPostmortem } = makeFakeTools()
    seedIncident('inc_1')
    const entryIds = seedEntries('inc_1', 3)
    seedPostmortem('inc_1', { genCount: 2 })
    generateTextMock.mockResolvedValue(validOutput(entryIds))

    const third = await generatePostmortem({
      userId: 'u1',
      params: { incidentId: 'inc_1' },
      tools,
      env: fakeEnv,
      callerJwt: 'jwt',
    })
    expect(third.success).toBe(true)
    if (third.success) {
      expect((third.data as { postmortem: { genCount: number } }).postmortem.genCount).toBe(3)
    }

    const fourth = await generatePostmortem({
      userId: 'u1',
      params: { incidentId: 'inc_1' },
      tools,
      env: fakeEnv,
      callerJwt: 'jwt',
    })
    expect(fourth.success).toBe(false)
    if (!fourth.success) expect(fourth.code).toBe('generation_cap')
  })

  it('drops hallucinated sourceEntryIds but keeps the real ones', async () => {
    const { tools, seedIncident, seedEntries } = makeFakeTools()
    seedIncident('inc_1')
    const entryIds = seedEntries('inc_1', 3)
    generateTextMock.mockResolvedValue(validOutput([...entryIds, 'entry_made_up_by_the_model']))

    const result = await generatePostmortem({
      userId: 'u1',
      params: { incidentId: 'inc_1' },
      tools,
      env: fakeEnv,
      callerJwt: 'jwt',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      const postmortem = (result.data as { postmortem: { sourceEntryIds: string[] } }).postmortem
      expect(postmortem.sourceEntryIds.sort()).toEqual([...entryIds].sort())
      expect(postmortem.sourceEntryIds).not.toContain('entry_made_up_by_the_model')
    }
  })

  it('treats an all-hallucinated result as a failed attempt, retries once, then errors without writing', async () => {
    const { tools, db, seedIncident, seedEntries } = makeFakeTools()
    seedIncident('inc_1')
    seedEntries('inc_1', 3)
    // Every attempt returns only ids that don't exist — zero survivors both times.
    generateTextMock.mockResolvedValue(validOutput(['entry_fake_1', 'entry_fake_2']))

    const result = await generatePostmortem({
      userId: 'u1',
      params: { incidentId: 'inc_1' },
      tools,
      env: fakeEnv,
      callerJwt: 'jwt',
    })

    expect(generateTextMock).toHaveBeenCalledTimes(2) // one retry
    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('generation_failed')
    expect(db.postmortems.has('inc_1')).toBe(false) // never written, genCount never touched
  })

  it('enforces the global daily cap across incidents', async () => {
    const { tools, seedIncident, seedEntries, db } = makeFakeTools()
    seedIncident('inc_today')
    seedEntries('inc_today', 3)
    for (let i = 0; i < 30; i++) {
      db.postmortems.set(
        `other_${i}`,
        makeFakeRecord(`other_${i}`, {
          incidentId: `other_${i}`,
          genCount: 1,
          generatedAt: new Date().toISOString(),
        }),
      )
    }

    const result = await generatePostmortem({
      userId: 'u1',
      params: { incidentId: 'inc_today' },
      tools,
      env: fakeEnv,
      callerJwt: 'jwt',
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('daily_cap')
    expect(generateTextMock).not.toHaveBeenCalled()
  })

  it('does not count generations older than 24h against the daily cap', async () => {
    const { tools, seedIncident, seedEntries, db } = makeFakeTools()
    seedIncident('inc_today')
    const entryIds = seedEntries('inc_today', 3)
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    for (let i = 0; i < 30; i++) {
      db.postmortems.set(
        `old_${i}`,
        makeFakeRecord(`old_${i}`, { incidentId: `old_${i}`, genCount: 1, generatedAt: twoDaysAgo }),
      )
    }
    generateTextMock.mockResolvedValue(validOutput(entryIds))

    const result = await generatePostmortem({
      userId: 'u1',
      params: { incidentId: 'inc_today' },
      tools,
      env: fakeEnv,
      callerJwt: 'jwt',
    })

    expect(result.success).toBe(true)
  })
})
