/**
 * Incident detail — header + creator-only status control, live timeline,
 * composer, presence, and the postmortem panel (triggers the
 * generatePostmortem server action; src/actions/generate-postmortem.ts).
 */

import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import {
  getAuthToken,
  getUserColor,
  useAuth,
  useDisplayName,
  useMutations,
  usePresenceRoom,
  useQuery,
  type RecordData,
} from 'deepspace'
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  ConfirmModal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from '@/components/ui'
import { formatTimestamp } from '@/lib/utils'
import type {
  EntryKind,
  IncidentData,
  IncidentStatus,
  PostmortemData,
  Severity,
  TimelineEntryData,
} from '@/lib/types'

const MIN_ENTRIES_FOR_POSTMORTEM = 3
const MAX_GENERATIONS = 3

const SEVERITY_BADGE: Record<Severity, 'sev1' | 'sev2' | 'sev3'> = {
  SEV1: 'sev1',
  SEV2: 'sev2',
  SEV3: 'sev3',
}

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const incidentId = id ?? ''
  const { userId } = useAuth()
  const displayName = useDisplayName() ?? 'User'

  const { records: incidents, status: incidentStatus } = useQuery<IncidentData>('incidents')
  const incident = incidents.find((r) => r.recordId === incidentId)

  const { records: entries, status: entriesStatus } = useQuery<TimelineEntryData>(
    'timeline-entries',
    { where: { incidentId }, orderBy: 'occurredAt', orderDir: 'asc' },
  )

  const { peers } = usePresenceRoom(`incident:${incidentId}`)

  if (incidentStatus === 'loading') {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="h-8 w-64 animate-pulse rounded-md bg-card" />
      </div>
    )
  }

  if (incidentStatus === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-destructive">
        Could not load this incident. You may not have permission to view it, or there was a
        connection problem — try refreshing the page.
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

  const isCreator = incident.createdBy === userId

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 text-foreground">
      <Header incident={incident} isCreator={isCreator} />

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-8">
          <Timeline entries={entries} status={entriesStatus} currentUserId={userId} />
          <Composer incidentId={incidentId} displayName={displayName} />
        </div>

        <div className="space-y-6">
          <PresencePanel peers={peers} currentUserId={userId} displayName={displayName} />
          <PostmortemPanel incidentId={incidentId} entryCount={entries.length} />
        </div>
      </div>
    </div>
  )
}

function Header({
  incident,
  isCreator,
}: {
  incident: RecordData<IncidentData>
  isCreator: boolean
}) {
  const mutations = useMutations<IncidentData>('incidents')
  const { error, success } = useToast()
  const [updating, setUpdating] = useState(false)

  async function handleStatusChange(next: IncidentStatus) {
    if (next === incident.data.status) return
    setUpdating(true)
    try {
      await mutations.putConfirmed(incident.recordId, {
        status: next,
        ...(next === 'resolved' ? { resolvedAt: new Date().toISOString() } : {}),
      })
    } catch (e) {
      // The server's denial text ("Permission denied: ...") is safe to show
      // directly — it's exactly what SPEC means by "RBAC is the real gate".
      error('Could not update status', e instanceof Error ? e.message : 'Try again in a moment.')
    } finally {
      setUpdating(false)
    }
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href)
    success('Link copied', 'Anyone signed in can open it.')
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant={SEVERITY_BADGE[incident.data.severity]}>{incident.data.severity}</Badge>
          <Badge variant="outline" data-testid="status-badge" className="capitalize">
            {incident.data.status}
          </Badge>
        </div>
        <h1 data-testid="incident-title" className="text-2xl font-bold tracking-tight">
          {incident.data.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{incident.data.system}</p>
      </div>

      <div className="flex items-center gap-2">
        {isCreator && (
          <Select
            value={incident.data.status}
            onValueChange={(v) => handleStatusChange(v as IncidentStatus)}
          >
            <SelectTrigger
              data-testid="status-control"
              className="w-40"
              disabled={updating || !mutations.ready}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="mitigated">Mitigated</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Button variant="secondary" onClick={handleCopyLink}>
          Copy link
        </Button>
      </div>
    </div>
  )
}

function Timeline({
  entries,
  status,
  currentUserId,
}: {
  entries: RecordData<TimelineEntryData>[]
  status: 'loading' | 'ready' | 'error'
  currentUserId: string | null
}) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Timeline</h2>

      {status === 'loading' && (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Could not load the timeline. Try refreshing the page.
        </div>
      )}

      {status === 'ready' && entries.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No entries yet. Add the first one below.
        </p>
      )}

      {status === 'ready' && entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry) => (
            <TimelineEntryRow key={entry.recordId} entry={entry} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </section>
  )
}

function TimelineEntryRow({
  entry,
  currentUserId,
}: {
  entry: RecordData<TimelineEntryData>
  currentUserId: string | null
}) {
  const mutations = useMutations<TimelineEntryData>('timeline-entries')
  const isOwn = entry.createdBy === currentUserId
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(entry.data.text)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function handleSave() {
    const trimmed = text.trim()
    if (trimmed === '' || trimmed === entry.data.text) {
      setEditing(false)
      setText(entry.data.text)
      return
    }
    mutations.put(entry.recordId, { text: trimmed })
    setEditing(false)
  }

  function handleDelete() {
    mutations.remove(entry.recordId)
    setConfirmingDelete(false)
  }

  return (
    <div
      data-testid="timeline-entry"
      data-record-id={entry.recordId}
      className="flex gap-3 rounded-lg border border-border bg-card p-3"
    >
      <span className="shrink-0 pt-0.5 font-mono text-xs text-muted-foreground">
        {formatTimestamp(entry.data.occurredAt)}
      </span>
      <Badge variant="outline" className="h-fit shrink-0 capitalize">
        {entry.data.kind}
      </Badge>

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              maxLength={500}
              className="text-sm"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">{text.length}/500</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false)
                    setText(entry.data.text)
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p data-testid="timeline-entry-text" className="text-sm text-foreground">
            {entry.data.text}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{entry.data.authorName}</p>
      </div>

      {isOwn && !editing && (
        <div className="flex shrink-0 items-start gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)}>
            Delete
          </Button>
        </div>
      )}

      <ConfirmModal
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={handleDelete}
        title="Delete this entry?"
        description="This can't be undone."
        confirmText="Delete"
      />
    </div>
  )
}

function Composer({ incidentId, displayName }: { incidentId: string; displayName: string }) {
  const mutations = useMutations<TimelineEntryData>('timeline-entries')
  const [kind, setKind] = useState<EntryKind>('event')
  const [text, setText] = useState('')

  const canSubmit = mutations.ready && text.trim() !== ''

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    mutations.create({
      incidentId,
      text: text.trim(),
      kind,
      occurredAt: new Date().toISOString(),
      authorName: displayName,
    })
    setText('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex gap-2">
        <Select value={kind} onValueChange={(v) => setKind(v as EntryKind)}>
          <SelectTrigger className="w-32 shrink-0" disabled={!mutations.ready}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="event">Event</SelectItem>
            <SelectItem value="action">Action</SelectItem>
            <SelectItem value="note">Note</SelectItem>
          </SelectContent>
        </Select>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 500))}
          maxLength={500}
          placeholder="What happened?"
          className="flex-1"
          disabled={!mutations.ready}
          aria-label="Entry text"
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground">{text.length}/500</span>
        <Button type="submit" disabled={!canSubmit}>
          Add entry
        </Button>
      </div>
    </form>
  )
}

function PresencePanel({
  peers,
  currentUserId,
  displayName,
}: {
  peers: { userId: string; userName: string }[]
  currentUserId: string | null
  displayName: string
}) {
  const count = peers.length + 1

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">Presence</h2>
      <p data-testid="presence-count" className="mb-3 text-xs text-muted-foreground">
        {count} {count === 1 ? 'person' : 'people'} in this room
      </p>
      <div className="flex flex-wrap gap-2">
        <PresenceChip userId={currentUserId ?? 'self'} name={displayName} self />
        {peers.map((peer) => (
          <PresenceChip key={peer.userId} userId={peer.userId} name={peer.userName} />
        ))}
      </div>
    </section>
  )
}

function PresenceChip({
  userId,
  name,
  self = false,
}: {
  userId: string
  name: string
  self?: boolean
}) {
  const color = getUserColor(userId)
  return (
    <div
      data-testid={self ? 'presence-self' : 'presence-peer'}
      className="flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-1 pr-2.5 text-xs"
    >
      <Avatar className="h-5 w-5">
        <AvatarFallback style={{ backgroundColor: color, color: '#fff' }} className="text-[10px]">
          {name[0]?.toUpperCase() ?? '?'}
        </AvatarFallback>
      </Avatar>
      <span className="text-foreground">
        {name}
        {self ? ' (you)' : ''}
      </span>
    </div>
  )
}

function scrollToEntry(entryId: string) {
  document.querySelector(`[data-record-id="${entryId}"]`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

function PostmortemPanel({
  incidentId,
  entryCount,
}: {
  incidentId: string
  entryCount: number
}) {
  const { records } = useQuery<PostmortemData>('postmortems', { where: { incidentId } })
  const postmortem = records[0]
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const genCount = postmortem?.data.genCount ?? 0
  const disabledReason =
    entryCount < MIN_ENTRIES_FOR_POSTMORTEM
      ? `Needs at least 3 entries (${entryCount}/3).`
      : genCount >= MAX_GENERATIONS
        ? `Generation limit reached (${MAX_GENERATIONS} of ${MAX_GENERATIONS} used).`
        : null

  async function handleGenerate() {
    if (disabledReason || generating) return
    setGenerating(true)
    setGenerateError(null)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/actions/generatePostmortem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ incidentId }),
      })
      const result = (await res.json()) as { success: boolean; error?: string }
      if (!result.success) {
        setGenerateError(result.error ?? 'Could not generate the postmortem.')
      }
      // On success the write goes through tools.* on the server, which
      // broadcasts the same as a client write — the useQuery above picks
      // it up live, for both users, with no manual refetch here.
    } catch {
      setGenerateError('Could not reach the server. Try again in a moment.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Postmortem</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {genCount} of {MAX_GENERATIONS} generations used
        </span>
      </div>

      {postmortem ? (
        <div className="mb-4 space-y-3 text-sm">
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Summary
            </h3>
            <p className="text-foreground">{postmortem.data.summary}</p>
          </div>
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Root cause
            </h3>
            <p className="text-foreground">{postmortem.data.rootCause}</p>
          </div>
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Impact
            </h3>
            <p className="text-foreground">{postmortem.data.impact}</p>
          </div>
          {postmortem.data.actionItems && postmortem.data.actionItems.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Action items
              </h3>
              <ul className="space-y-1 text-foreground">
                {postmortem.data.actionItems.map((item, i) => (
                  <li key={i}>
                    <span className="font-medium">{item.owner}:</span> {item.task}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {postmortem.data.sourceEntryIds && postmortem.data.sourceEntryIds.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cited entries
              </h3>
              <div className="flex flex-wrap gap-1">
                {postmortem.data.sourceEntryIds.map((entryId, i) => (
                  <button
                    key={entryId}
                    type="button"
                    onClick={() => scrollToEntry(entryId)}
                    className="rounded-md border border-border px-1.5 py-0.5 font-mono text-xs text-muted-foreground hover:border-ring hover:text-foreground"
                  >
                    [{i + 1}]
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="font-mono text-xs text-muted-foreground">{postmortem.data.model}</p>
        </div>
      ) : (
        <p className="mb-3 text-sm text-muted-foreground">No postmortem generated yet.</p>
      )}

      <Button
        onClick={handleGenerate}
        disabled={generating || !!disabledReason}
        loading={generating}
        className="w-full"
      >
        {postmortem ? 'Regenerate' : 'Generate postmortem'}
      </Button>
      {disabledReason && <p className="mt-2 text-xs text-muted-foreground">{disabledReason}</p>}
      {generateError && <p className="mt-2 text-sm text-destructive">{generateError}</p>}
    </section>
  )
}
