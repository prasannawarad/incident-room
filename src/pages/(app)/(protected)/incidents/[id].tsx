/**
 * Incident detail — minimal for Phase 3: just enough for the create and
 * demo flows to navigate somewhere real, with loading/not-found/error
 * states. Phase 4 adds the status control, live timeline, composer, and
 * presence avatars.
 */

import { useParams } from 'react-router-dom'
import { useQuery } from 'deepspace'
import { Badge } from '@/components/ui'
import { formatTimestamp } from '@/lib/utils'
import type { IncidentData, Severity } from '@/lib/types'

const SEVERITY_BADGE: Record<Severity, 'sev1' | 'sev2' | 'sev3'> = {
  SEV1: 'sev1',
  SEV2: 'sev2',
  SEV3: 'sev3',
}

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { records, status } = useQuery<IncidentData>('incidents')
  const incident = records.find((r) => r.recordId === id)

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="h-8 w-64 animate-pulse rounded-md bg-card" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-destructive">
        Could not load this incident. Try refreshing the page.
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-muted-foreground">
        <p>No incident found at this link.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-foreground">
      <div className="mb-6 flex items-center gap-3">
        <Badge variant={SEVERITY_BADGE[incident.data.severity]}>{incident.data.severity}</Badge>
        <h1 data-testid="incident-title" className="text-2xl font-bold tracking-tight">
          {incident.data.title}
        </h1>
      </div>
      <dl className="flex flex-wrap gap-6 text-sm">
        <div>
          <dt className="text-muted-foreground">System</dt>
          <dd className="text-foreground">{incident.data.system}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="capitalize text-foreground">{incident.data.status}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Created</dt>
          <dd className="font-mono text-foreground">{formatTimestamp(incident.createdAt)}</dd>
        </div>
      </dl>
      <p className="mt-10 text-sm text-muted-foreground">
        Timeline, status control, and postmortem generation arrive in the next phase.
      </p>
    </div>
  )
}
