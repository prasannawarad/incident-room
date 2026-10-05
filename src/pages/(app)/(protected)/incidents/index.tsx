/**
 * Incidents list — SPEC.md's (app)/(protected) incidents list: open +
 * resolved, newest first, create form, demo button.
 */

import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDisplayName, useMutations, useQuery, type RecordData } from 'deepspace'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@/components/ui'
import { formatTimestamp } from '@/lib/utils'
import { buildDemoIncident } from '@/lib/demo-incident'
import type { IncidentData, Severity, TimelineEntryData } from '@/lib/types'

const SEVERITY_BADGE: Record<Severity, 'sev1' | 'sev2' | 'sev3'> = {
  SEV1: 'sev1',
  SEV2: 'sev2',
  SEV3: 'sev3',
}

export default function IncidentsListPage() {
  const { records, status } = useQuery<IncidentData>('incidents', {
    orderBy: 'createdAt',
    orderDir: 'desc',
  })
  const incidentMutations = useMutations<IncidentData>('incidents')
  const entryMutations = useMutations<TimelineEntryData>('timeline-entries')
  const displayName = useDisplayName() ?? 'User'
  const navigate = useNavigate()
  const { error } = useToast()

  const [createOpen, setCreateOpen] = useState(false)
  const [seeding, setSeeding] = useState(false)
  // Synchronous re-entrancy guard — React's `seeding` state re-render isn't
  // guaranteed to land between two fast clicks, a ref read/write is.
  const seedingRef = useRef(false)

  const open = useMemo(() => records.filter((r) => r.data.status !== 'resolved'), [records])
  const resolved = useMemo(() => records.filter((r) => r.data.status === 'resolved'), [records])

  const demoReady = incidentMutations.ready && entryMutations.ready

  async function handleLoadDemo() {
    if (seedingRef.current || !demoReady) return
    seedingRef.current = true
    setSeeding(true)
    try {
      const { incident, entries } = buildDemoIncident()
      const incidentId = await incidentMutations.createConfirmed(incident)
      await Promise.all(
        entries.map((entry) =>
          entryMutations.create({ ...entry, incidentId, authorName: displayName }),
        ),
      )
      navigate(`/incidents/${incidentId}`)
    } catch {
      error('Could not load the demo incident', 'Try again in a moment.')
    } finally {
      seedingRef.current = false
      setSeeding(false)
    }
  }

  return (
    <div className="min-h-full text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleLoadDemo} disabled={seeding || !demoReady}>
              {seeding ? 'Loading demo…' : 'Load demo incident'}
            </Button>
            <Button onClick={() => setCreateOpen(true)}>New incident</Button>
          </div>
        </div>

        {status === 'loading' && <ListSkeleton />}

        {status === 'error' && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Could not load incidents. Try refreshing the page.
          </div>
        )}

        {status === 'ready' && records.length === 0 && (
          <EmptyState
            title="No incidents yet"
            description="Create one to start a live timeline, or load a demo to explore the app with a realistic outage."
            action={{ label: 'New incident', onClick: () => setCreateOpen(true) }}
            secondaryAction={{ label: 'Load demo incident', onClick: handleLoadDemo }}
          />
        )}

        {status === 'ready' && records.length > 0 && (
          <div className="space-y-10">
            <IncidentSection title="Open" incidents={open} emptyLabel="No open incidents." />
            <IncidentSection title="Resolved" incidents={resolved} emptyLabel="No resolved incidents." />
          </div>
        )}
      </div>

      <CreateIncidentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mutations={incidentMutations}
        onCreated={(id) => navigate(`/incidents/${id}`)}
      />
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-card" />
      ))}
    </div>
  )
}

function IncidentSection({
  title,
  incidents,
  emptyLabel,
}: {
  title: string
  incidents: RecordData<IncidentData>[]
  emptyLabel: string
}) {
  return (
    <section>
      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {title} ({incidents.length})
      </h2>
      {incidents.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {incidents.map((incident) => (
            <IncidentRow key={incident.recordId} incident={incident} />
          ))}
        </div>
      )}
    </section>
  )
}

function IncidentRow({ incident }: { incident: RecordData<IncidentData> }) {
  return (
    <Link
      to={`/incidents/${incident.recordId}`}
      className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-ring"
    >
      <Badge variant={SEVERITY_BADGE[incident.data.severity]}>{incident.data.severity}</Badge>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{incident.data.title}</p>
        <p className="truncate text-xs text-muted-foreground">{incident.data.system}</p>
      </div>
      <Badge variant="outline" className="shrink-0 capitalize">
        {incident.data.status}
      </Badge>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {formatTimestamp(incident.createdAt)}
      </span>
    </Link>
  )
}

function CreateIncidentDialog({
  open,
  onOpenChange,
  mutations,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mutations: ReturnType<typeof useMutations<IncidentData>>
  onCreated: (id: string) => void
}) {
  const [title, setTitle] = useState('')
  const [severity, setSeverity] = useState<Severity>('SEV2')
  const [system, setSystem] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const { error } = useToast()

  const canSubmit = mutations.ready && title.trim() !== '' && system.trim() !== '' && !submitting

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submittingRef.current || !canSubmit) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const id = await mutations.createConfirmed({
        title: title.trim(),
        severity,
        system: system.trim(),
        status: 'investigating',
      })
      onOpenChange(false)
      setTitle('')
      setSystem('')
      setSeverity('SEV2')
      onCreated(id)
    } catch {
      error('Could not create the incident', 'Try again in a moment.')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New incident</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="incident-title">Title</Label>
            <Input
              id="incident-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. sales_daily DAG failing"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="incident-severity">Severity</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
              <SelectTrigger id="incident-severity">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SEV1">SEV1</SelectItem>
                <SelectItem value="SEV2">SEV2</SelectItem>
                <SelectItem value="SEV3">SEV3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="incident-system">System</Label>
            <Input
              id="incident-system"
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              placeholder="e.g. airflow"
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? 'Creating…' : 'Create incident'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
