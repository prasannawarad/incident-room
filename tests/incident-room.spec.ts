import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

const usableTestAccounts = loadAllTestAccounts().length
test.skip(
  usableTestAccounts < 2,
  `Needs 2 usable test accounts, found ${usableTestAccounts}. Create them with ` +
    '`npx deepspace test accounts create --email <name>@deepspace.test --name "<name>" ' +
    '--password-stdin`, or fetch existing pool accounts with `npx deepspace test accounts recover --all`.',
)

test('two users: B opens A\'s incident, live entries, presence, no status control for B', async ({
  users,
}) => {
  const [a, b] = await users(2)
  const title = `[e2e] Two-user room ${Date.now()}`

  // A creates the incident via the real create form.
  await a.page.goto('/incidents')
  await expect(a.page.getByRole('heading', { name: 'Incidents', exact: true })).toBeVisible({
    timeout: 15000,
  })
  await a.page.getByRole('button', { name: 'New incident' }).first().click()
  const createDialog = a.page.getByRole('dialog')
  await createDialog.getByLabel('Title').fill(title)
  await createDialog.getByLabel('System').fill('test-system')
  await createDialog.getByRole('button', { name: 'Create incident' }).click()
  await expect(a.page).toHaveURL(/\/incidents\/.+/, { timeout: 15000 })
  const incidentUrl = a.page.url()

  // B opens the same link.
  await b.page.goto(incidentUrl)
  await expect(b.page.getByTestId('incident-title')).toHaveText(title, { timeout: 15000 })

  // Presence: both pages see both people in the room.
  await expect(a.page.getByTestId('presence-count')).toHaveText('2 people in this room', {
    timeout: 15000,
  })
  await expect(b.page.getByTestId('presence-count')).toHaveText('2 people in this room', {
    timeout: 15000,
  })

  // B is not the creator: no status control for B, but A (the creator) has one.
  await expect(b.page.getByTestId('status-control')).toHaveCount(0)
  await expect(a.page.getByTestId('status-control')).toHaveCount(1)

  // A adds an entry; B sees it live, with no reload.
  const aEntryText = `A says hello ${Date.now()}`
  await a.page.getByLabel('Entry text').fill(aEntryText)
  await a.page.getByRole('button', { name: 'Add entry' }).click()
  await expect(b.page.getByText(aEntryText)).toBeVisible({ timeout: 15000 })

  // B can add an entry too (any signed-in user can).
  const bEntryText = `B says hi ${Date.now()}`
  await b.page.getByLabel('Entry text').fill(bEntryText)
  await b.page.getByRole('button', { name: 'Add entry' }).click()
  await expect(a.page.getByText(bEntryText)).toBeVisible({ timeout: 15000 })
})
