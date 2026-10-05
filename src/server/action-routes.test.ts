/**
 * The action framework's own auth gate — generatePostmortem itself has no
 * auth check (nor should it: ctx.userId is already verified by the time an
 * ActionHandler runs). This confirms the real enforcement point:
 * registerActionRoutes rejects an unauthenticated call before any action,
 * including generatePostmortem, ever executes.
 */

import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import type { ActionContext } from 'deepspace/worker'
import type { AppContext, Env } from '../../worker'

const generatePostmortemSpy = vi.fn(async (_ctx: ActionContext<Env>) => ({
  success: true as const,
  data: {},
}))

vi.mock('../actions/index.js', () => ({
  actions: { generatePostmortem: generatePostmortemSpy },
}))

const { registerActionRoutes } = await import('./action-routes')

describe('registerActionRoutes auth gate', () => {
  it('rejects an unauthenticated call with 401 and never invokes the action', async () => {
    const app = new Hono<AppContext>()
    const resolveAuth = vi.fn().mockResolvedValue(null)
    registerActionRoutes(app, resolveAuth)

    const res = await app.request('/api/actions/generatePostmortem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId: 'inc_1' }),
    })

    expect(res.status).toBe(401)
    expect(generatePostmortemSpy).not.toHaveBeenCalled()
  })

  it('invokes the action once auth resolves', async () => {
    const app = new Hono<AppContext>()
    const resolveAuth = vi.fn().mockResolvedValue({ userId: 'u1', claims: {} })
    registerActionRoutes(app, resolveAuth)

    // createActionTools builds its stub from env.RECORD_ROOMS before the
    // action runs — the fake action never uses it, but the binding must
    // exist for that construction not to throw. Cast: a real Env has many
    // more required bindings this route never touches.
    const fakeEnv = {
      RECORD_ROOMS: {
        idFromName: () => 'fake-id',
        get: () => ({ fetch: async () => new Response('{}') }),
      },
      DEEPSPACE_APP_ID: 'app_fake',
    } as unknown as Env

    const res = await app.request(
      '/api/actions/generatePostmortem',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer faketoken' },
        body: JSON.stringify({ incidentId: 'inc_1' }),
      },
      fakeEnv,
    )

    expect(res.status).toBe(200)
    expect(generatePostmortemSpy).toHaveBeenCalledTimes(1)
    const ctx = generatePostmortemSpy.mock.calls[0]?.[0]
    expect(ctx?.userId).toBe('u1')
  })
})
