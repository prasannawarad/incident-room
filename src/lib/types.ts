/** Shared record-data shapes for the three SPEC.md collections. */

export type Severity = 'SEV1' | 'SEV2' | 'SEV3'
export type IncidentStatus = 'investigating' | 'mitigated' | 'resolved'
export type EntryKind = 'event' | 'action' | 'note'

// `type`, not `interface`: ActionTools methods are generic over
// `T extends Record<string, unknown>`, and only object-literal type aliases
// (not interfaces) satisfy that constraint check in server actions.
export type IncidentData = {
  title: string
  severity: Severity
  system: string
  status: IncidentStatus
  resolvedAt?: string | null
}

export type TimelineEntryData = {
  incidentId: string
  text: string
  kind: EntryKind
  occurredAt: string
  authorName: string
}

export type ActionItem = {
  owner: string
  task: string
}

export type PostmortemData = {
  incidentId: string
  summary?: string
  rootCause?: string
  impact?: string
  actionItems?: ActionItem[]
  sourceEntryIds?: string[]
  model?: string
  genCount?: number
  generatedAt?: string
}
