import { test, expect } from 'deepspace/testing'

// Runs against the local dev server only (tests/playwright.config.ts hardcodes
// baseURL to localhost, managed by `deepspace test run` — there is no code
// path here that can reach a deployed app). Records this test creates are
// real incidents/entries in that local database, not scratch rows a mock
// wipes away; there's no delete UI yet to drive (not built until a later
// phase), so every title is prefixed `[e2e]` to keep them identifiable
// and easy to filter or clear out separately from real data.
test('create incident: form submits and navigates to the new incident', async ({ users }) => {
  const [user] = await users(1)
  const title = `[e2e] Test outage ${Date.now()}`

  await user.page.goto('/incidents')
  await expect(user.page.getByRole('heading', { name: 'Incidents', exact: true })).toBeVisible({
    timeout: 15000,
  })

  // Header button, not the EmptyState's — both can render with the same name
  // when the account's incident list is empty.
  await user.page.getByRole('button', { name: 'New incident' }).first().click()

  const dialog = user.page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await dialog.getByLabel('Title').fill(title)
  await dialog.getByLabel('Severity').click()
  await user.page.getByRole('option', { name: 'SEV1' }).click()
  await dialog.getByLabel('System').fill('airflow')

  await dialog.getByRole('button', { name: 'Create incident' }).click()

  await expect(user.page).toHaveURL(/\/incidents\/.+/, { timeout: 15000 })
  await expect(user.page.getByTestId('incident-title')).toHaveText(title)
})
