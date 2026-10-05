/** Shared record-data shapes for the three SPEC.md collections. */

export type Severity = 'SEV1' | 'SEV2' | 'SEV3'
export type IncidentStatus = 'investigating' | 'mitigated' | 'resolved'
export type EntryKind = 'event' | 'action' | 'note'

export interface IncidentData {
  title: string
  severity: Severity
  system: string
  status: IncidentStatus
  resolvedAt?: string | null
}

export interface TimelineEntryData {
  incidentId: string
  text: string
  kind: EntryKind
  occurredAt: string
  authorName: string
}

export interface ActionItem {
  owner: string
  task: string
}

export interface PostmortemData {
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
