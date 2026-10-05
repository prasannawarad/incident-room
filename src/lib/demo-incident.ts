import type { EntryKind, IncidentData } from './types'

export interface DemoEntry {
  kind: EntryKind
  occurredAt: string
  text: string
}

/**
 * Realistic Airflow outage: sales_daily DAG times out, root cause traced to
 * a Spark OOM, a retry that hits the same OOM, a rollback, and resolution.
 * Timestamps are spaced minutes apart ending a few minutes ago, so the demo
 * reads as a real incident instead of a synthetic burst.
 */
export function buildDemoIncident(): { incident: IncidentData; entries: DemoEntry[] } {
  const start = Date.now() - 90 * 60_000
  const at = (minutesOffset: number) => new Date(start + minutesOffset * 60_000).toISOString()

  const incident: IncidentData = {
    title: 'sales_daily DAG failing',
    severity: 'SEV2',
    system: 'airflow',
    status: 'investigating',
  }

  const entries: DemoEntry[] = [
    {
      kind: 'event',
      occurredAt: at(0),
      text: 'sales_daily DAG failed: task extract_orders timed out after 45m.',
    },
    {
      kind: 'action',
      occurredAt: at(5),
      text: 'Paged on-call; began reviewing the Airflow scheduler logs.',
    },
    {
      kind: 'event',
      occurredAt: at(15),
      text: 'Root cause narrowed to the transform_orders Spark step: executor OOM-killed mid-shuffle.',
    },
    {
      kind: 'action',
      occurredAt: at(25),
      text: 'Bumped executor memory and retried the DAG run.',
    },
    {
      kind: 'event',
      occurredAt: at(35),
      text: 'Retry failed again with the same OOM, this time on a different partition.',
    },
    {
      kind: 'action',
      occurredAt: at(50),
      text: "Rolled back yesterday's partitioning change and disabled it pending review.",
    },
    {
      kind: 'event',
      occurredAt: at(70),
      text: 'DAG run succeeded after rollback; sales_daily backfilled for the missed window.',
    },
    {
      kind: 'note',
      occurredAt: at(80),
      text: 'Root cause: the new partitioning change increased shuffle size past executor memory. Filed a follow-up to right-size executors before re-enabling it.',
    },
  ]

  return { incident, entries }
}
