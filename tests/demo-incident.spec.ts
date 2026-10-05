import { test, expect } from 'deepspace/testing'

// Exercises the real "Load demo incident" button, so the resulting incident
// always carries its real, fixed title ("sales_daily DAG failing") — there's
// no way to prefix it `[e2e]` without changing the actual demo content. This
// accumulates one extra demo incident per run in local dev storage for
// whichever test account runs it; harmless (never touches the deployed app
// — see tests/playwright.config.ts) but a known gap until an incident-delete
// UI exists.
const EXPECTED_TEXTS = [
  'sales_daily DAG failed: task extract_orders timed out after 45m.',
  'Paged on-call; began reviewing the Airflow scheduler logs.',
  'Root cause narrowed to the transform_orders Spark step: executor OOM-killed mid-shuffle.',
  'Bumped executor memory and retried the DAG run.',
  'Retry failed again with the same OOM, this time on a different partition.',
  "Rolled back yesterday's partitioning change and disabled it pending review.",
  'DAG run succeeded after rollback; sales_daily backfilled for the missed window.',
  'Root cause: the new partitioning change increased shuffle size past executor memory. Filed a follow-up to right-size executors before re-enabling it.',
]

test('demo incident creates exactly 8 entries, shown in chronological order', async ({ users }) => {
  const [user] = await users(1)
  await user.page.goto('/incidents')
  await expect(user.page.getByRole('heading', { name: 'Incidents', exact: true })).toBeVisible({
    timeout: 15000,
  })

  await user.page.getByRole('button', { name: 'Load demo incident' }).click()
  await expect(user.page).toHaveURL(/\/incidents\/.+/, { timeout: 15000 })
  await expect(user.page.getByTestId('incident-title')).toHaveText('sales_daily DAG failing')

  const rows = user.page.getByTestId('timeline-entry-text')
  await expect(rows).toHaveCount(8, { timeout: 15000 })
  await expect(rows).toHaveText(EXPECTED_TEXTS)
})
